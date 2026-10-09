import json
import io
import math
import shutil
import subprocess
import tempfile
from pathlib import Path


class AudioMetadataError(RuntimeError):
    pass


def _inspect_with_pyav(contents: bytes) -> dict:
    try:
        import av
    except ImportError as exc:
        raise AudioMetadataError("Server audio validation is unavailable. Install ffprobe or PyAV.") from exc

    try:
        with av.open(io.BytesIO(contents)) as container:
            if not container.streams.audio:
                raise AudioMetadataError("Audio stream metadata could not be verified.")
            stream = container.streams.audio[0]
            sample_rate = int(stream.codec_context.sample_rate or 0)
            channels = int(stream.codec_context.channels or 0)
            if stream.duration is not None and stream.time_base is not None:
                duration = float(stream.duration * stream.time_base)
            elif container.duration is not None:
                duration = float(container.duration / av.time_base)
            else:
                duration = 0.0
                for frame in container.decode(stream):
                    frame_rate = int(frame.sample_rate or sample_rate)
                    if frame_rate <= 0:
                        raise AudioMetadataError("Audio sample rate could not be verified.")
                    duration += frame.samples / frame_rate
                    sample_rate = frame_rate
                    if not channels and frame.layout:
                        channels = len(frame.layout.channels)
            if not math.isfinite(duration) or sample_rate <= 0 or channels <= 0:
                raise AudioMetadataError("Audio duration or stream metadata could not be verified.")
            if duration < 0.5 or duration > 30:
                raise AudioMetadataError("Audio duration must be between 0.5 and 30 seconds.")
            return {
                "duration_seconds": duration,
                "sample_rate_hz": sample_rate,
                "channels": channels,
            }
    except AudioMetadataError:
        raise
    except Exception as exc:
        raise AudioMetadataError("The audio file could not be inspected by PyAV.") from exc


def inspect_audio_metadata(contents: bytes, extension: str) -> dict:
    ffprobe = shutil.which("ffprobe")
    if not ffprobe:
        return _inspect_with_pyav(contents)

    try:
        with tempfile.NamedTemporaryFile(suffix=f".{extension}") as audio_file:
            audio_file.write(contents)
            audio_file.flush()
            result = subprocess.run(
                [
                    ffprobe,
                    "-v",
                    "error",
                    "-select_streams",
                    "a:0",
                    "-show_entries",
                    "format=duration:stream=sample_rate,channels",
                    "-of",
                    "json",
                    audio_file.name,
                ],
                capture_output=True,
                check=True,
                text=True,
                timeout=15,
            )
        metadata = json.loads(result.stdout)
        audio_streams = metadata.get("streams") or []
        duration = float((metadata.get("format") or {}).get("duration", "nan"))
        if not audio_streams or not math.isfinite(duration):
            raise AudioMetadataError("Audio duration or stream metadata could not be verified.")
        stream = audio_streams[0]
        sample_rate = int(stream.get("sample_rate", 0))
        channels = int(stream.get("channels", 0))
        if sample_rate <= 0 or channels <= 0:
            raise AudioMetadataError("Audio sample rate or channel count could not be verified.")
        if duration < 0.5 or duration > 30:
            raise AudioMetadataError("Audio duration must be between 0.5 and 30 seconds.")
        return {
            "duration_seconds": duration,
            "sample_rate_hz": sample_rate,
            "channels": channels,
        }
    except AudioMetadataError:
        raise
    except (OSError, ValueError, KeyError, subprocess.SubprocessError, json.JSONDecodeError) as exc:
        raise AudioMetadataError("The audio file could not be inspected by the server.") from exc