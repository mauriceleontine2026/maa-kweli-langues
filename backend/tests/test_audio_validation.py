import json
import io
import sys
import wave
from types import SimpleNamespace

import pytest

from backend.app.services import audio_validation
from backend.app.services.audio_validation import AudioMetadataError


def test_inspect_audio_metadata_reads_duration_rate_and_channels(monkeypatch):
    monkeypatch.setattr(audio_validation.shutil, "which", lambda _name: "ffprobe")
    monkeypatch.setattr(
        audio_validation.subprocess,
        "run",
        lambda *_args, **_kwargs: SimpleNamespace(
            stdout=json.dumps(
                {
                    "format": {"duration": "3.25"},
                    "streams": [{"sample_rate": "48000", "channels": 1}],
                }
            )
        ),
    )

    assert audio_validation.inspect_audio_metadata(b"test", "webm") == {
        "duration_seconds": 3.25,
        "sample_rate_hz": 48000,
        "channels": 1,
    }


def test_inspect_audio_metadata_rejects_out_of_range_duration(monkeypatch):
    monkeypatch.setattr(audio_validation.shutil, "which", lambda _name: "ffprobe")
    monkeypatch.setattr(
        audio_validation.subprocess,
        "run",
        lambda *_args, **_kwargs: SimpleNamespace(
            stdout=json.dumps(
                {"format": {"duration": "31"}, "streams": [{"sample_rate": "48000", "channels": 1}]}
            )
        ),
    )

    with pytest.raises(AudioMetadataError, match="between 0.5 and 30"):
        audio_validation.inspect_audio_metadata(b"test", "webm")


def test_inspect_audio_metadata_requires_ffprobe(monkeypatch):
    monkeypatch.setattr(audio_validation.shutil, "which", lambda _name: None)
    monkeypatch.setitem(sys.modules, "av", None)

    with pytest.raises(AudioMetadataError, match="ffprobe or PyAV"):
        audio_validation.inspect_audio_metadata(b"test", "webm")


def test_inspect_audio_metadata_uses_pyav_when_ffprobe_is_unavailable(monkeypatch):
    audio_buffer = io.BytesIO()
    with wave.open(audio_buffer, "wb") as audio_file:
        audio_file.setparams((1, 2, 22050, 22050, "NONE", "not compressed"))
        audio_file.writeframes(b"\x00\x00" * 22050)
    monkeypatch.setattr(audio_validation.shutil, "which", lambda _name: None)

    metadata = audio_validation.inspect_audio_metadata(audio_buffer.getvalue(), "wav")

    assert metadata["duration_seconds"] == pytest.approx(1.0)
    assert metadata["sample_rate_hz"] == 22050
    assert metadata["channels"] == 1