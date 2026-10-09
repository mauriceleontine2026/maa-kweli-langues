import csv
import hashlib
import hmac
import io
import io
import json
import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

from sqlalchemy.orm import Session

from ..models.contribution import Contribution
from ..models.voice_contribution import ContributorConsent, ContributionPrompt, VoiceRecording
from .contribution_storage import ContributionStorageError, download_audio


class DatasetExportError(RuntimeError):
    pass


def select_exportable_recordings(db: Session, scope: str):
    scope_column = {
        "internal_tts": ContributorConsent.tts_internal,
        "public_dataset": ContributorConsent.public_dataset,
    }.get(scope)
    if scope_column is None:
        raise DatasetExportError("Export scope must be internal_tts or public_dataset.")

    return (
        db.query(VoiceRecording, Contribution, ContributorConsent, ContributionPrompt)
        .join(Contribution, Contribution.id == VoiceRecording.contribution_id)
        .join(ContributorConsent, ContributorConsent.id == VoiceRecording.consent_id)
        .join(ContributionPrompt, ContributionPrompt.id == VoiceRecording.prompt_id)
        .filter(
            VoiceRecording.status == "approved",
            VoiceRecording.reviewer_native_verified.is_(True),
            Contribution.status == "approved",
            ContributorConsent.withdrawn_at.is_(None),
            scope_column.is_(True),
            ContributionPrompt.status == "approved",
            ContributionPrompt.native_verified.is_(True),
            VoiceRecording.iso639_3.is_not(None),
            VoiceRecording.variant.is_not(None),
            VoiceRecording.variant != "",
            Contribution.word != "",
        )
        .order_by(VoiceRecording.id.asc())
        .all()
    )


def _speaker_id(contributor_id: str) -> str:
    salt = os.getenv("VOICE_DATASET_SPEAKER_SALT") or os.getenv("SUPABASE_SERVICE_KEY")
    if not salt:
        raise DatasetExportError("Set VOICE_DATASET_SPEAKER_SALT before exporting speaker-grouped data.")
    return hmac.new(salt.encode("utf-8"), contributor_id.encode("utf-8"), hashlib.sha256).hexdigest()[:20]


def _speaker_split(speaker_id: str) -> str:
    bucket = int(hashlib.sha256(speaker_id.encode("ascii")).hexdigest()[:2], 16) % 100
    if bucket < 80:
        return "train"
    if bucket < 90:
        return "validation"
    return "test"


def _normalize_audio(contents: bytes, extension: str, destination: Path) -> None:
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        _normalize_audio_with_pyav(contents, destination)
        return
    source_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=f".{extension}", delete=False) as source:
            source.write(contents)
            source_path = source.name
        subprocess.run(
            [ffmpeg, "-v", "error", "-y", "-i", source_path, "-ac", "1", "-ar", "22050", "-c:a", "pcm_s16le", str(destination)],
            capture_output=True,
            check=True,
            timeout=60,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        raise DatasetExportError("An approved recording could not be normalized.") from exc
    finally:
        if source_path:
            Path(source_path).unlink(missing_ok=True)


def _normalize_audio_with_pyav(contents: bytes, destination: Path) -> None:
    try:
        import av
    except ImportError as exc:
        raise DatasetExportError("Audio normalization is unavailable. Install ffmpeg or PyAV on the backend.") from exc

    try:
        with av.open(io.BytesIO(contents)) as source, av.open(str(destination), mode="w", format="wav") as output:
            if not source.streams.audio:
                raise DatasetExportError("The approved recording has no audio stream.")
            output_stream = output.add_stream("pcm_s16le", rate=22050)
            output_stream.layout = "mono"
            resampler = av.AudioResampler(format="s16", layout="mono", rate=22050)
            for frame in source.decode(audio=0):
                for normalized_frame in resampler.resample(frame):
                    for packet in output_stream.encode(normalized_frame):
                        output.mux(packet)
            for normalized_frame in resampler.resample(None):
                for packet in output_stream.encode(normalized_frame):
                    output.mux(packet)
            for packet in output_stream.encode(None):
                output.mux(packet)
    except DatasetExportError:
        raise
    except Exception as exc:
        raise DatasetExportError("An approved recording could not be normalized by PyAV.") from exc


def build_dataset_export(db: Session, scope: str) -> tuple[str, str]:
    rows = select_exportable_recordings(db, scope)
    if not rows:
        raise DatasetExportError("No approved recordings with matching active consent are available.")

    license_name = "CC BY 4.0" if scope == "public_dataset" else "Internal TTS training only"
    digest_input = "\n".join(f"{recording.id}:{recording.checksum_sha256}" for recording, *_ in rows)
    dataset_version = f"voice-v1-{scope}-{hashlib.sha256(digest_input.encode()).hexdigest()[:12]}"
    temp_dir = Path(tempfile.mkdtemp(prefix="mbaara-voice-export-"))
    archive_path = temp_dir / f"{dataset_version}.zip"
    manifest_rows = []
    csv_rows = []
    stats = {"recordings": len(rows), "languages": {}, "splits": {"train": 0, "validation": 0, "test": 0}}

    try:
        with ZipFile(archive_path, "w", compression=ZIP_DEFLATED) as archive:
            for recording, contribution, consent, _prompt in rows:
                try:
                    audio_contents = download_audio(recording.storage_key)
                except ContributionStorageError as exc:
                    raise DatasetExportError("An approved recording could not be downloaded from private storage.") from exc
                wav_path = temp_dir / f"{recording.id}.wav"
                _normalize_audio(audio_contents, recording.file_extension, wav_path)

                speaker_id = _speaker_id(recording.contributor_id)
                split = _speaker_split(speaker_id)
                audio_path = f"audio/{recording.id}.wav"
                archive.write(wav_path, audio_path)
                wav_path.unlink(missing_ok=True)
                manifest = {
                    "audio_filepath": audio_path,
                    "text": contribution.word,
                    "text_fr": contribution.translation_fr,
                    "language_code": recording.language_code,
                    "iso639_3": recording.iso639_3,
                    "tts_model_id": recording.tts_model_id,
                    "variant": recording.variant,
                    "speaker_id": speaker_id,
                    "split": split,
                    "duration_seconds": recording.duration_seconds,
                    "sample_rate_hz": 22050,
                    "channels": 1,
                    "checksum_sha256": recording.checksum_sha256,
                    "consent_version": consent.version,
                    "license": consent.dataset_license if scope == "public_dataset" else license_name,
                    "recording_id": recording.id,
                }
                manifest_rows.append(json.dumps(manifest, ensure_ascii=False))
                csv_rows.append(
                    [audio_path, contribution.word, contribution.translation_fr or "", recording.language_code,
                     recording.iso639_3, recording.tts_model_id or "", recording.variant, recording.duration_seconds,
                     recording.checksum_sha256, consent.version,
                     manifest["license"], split, recording.id, speaker_id]
                )
                stats["languages"][recording.language_code] = stats["languages"].get(recording.language_code, 0) + 1
                stats["splits"][split] += 1

            archive.writestr("manifest.jsonl", "\n".join(manifest_rows) + "\n")
            csv_buffer = io.StringIO(newline="")
            writer = csv.writer(csv_buffer)
            writer.writerow(["audio_filepath", "text", "text_fr", "language_code", "iso639_3", "tts_model_id", "variant", "duration_seconds", "checksum_sha256", "consent_version", "license", "split", "recording_id", "speaker_id"])
            writer.writerows(csv_rows)
            archive.writestr("metadata.csv", csv_buffer.getvalue())
            archive.writestr("stats.json", json.dumps(stats, ensure_ascii=False, indent=2))
            archive.writestr(
                "dataset.json",
                json.dumps(
                    {
                        "version": dataset_version,
                        "scope": scope,
                        "license": license_name,
                        "audio_format": "WAV PCM signed 16-bit, mono, 22050 Hz",
                        "consent_version": "voice-consent-v1",
                    },
                    ensure_ascii=False,
                    indent=2,
                ),
            )
    except Exception:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise
    return str(archive_path), archive_path.name