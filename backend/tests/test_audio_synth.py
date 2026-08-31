import asyncio
import os
import sys
from types import SimpleNamespace

from backend.app.routers.audio import SynthesizeRequest, synthesize_audio
from backend.app.services.mms_cache import MMSAudioCache


def test_synthesize_audio_normalizes_language_for_gtts(monkeypatch):
    captured = {}

    class FakeGTTS:
        def __init__(self, text, lang):
            captured["text"] = text
            captured["lang"] = lang

        def save(self, path):
            with open(path, "wb") as fh:
                fh.write(b"fake-audio")

    monkeypatch.delenv("ELEVENLABS_API_KEY", raising=False)
    monkeypatch.setitem(sys.modules, "gtts", SimpleNamespace(gTTS=FakeGTTS))

    result = asyncio.run(synthesize_audio(SynthesizeRequest(text="Mbote", language_code="lingala")))

    assert captured["text"] == "Mbote"
    assert captured["lang"] == "fr"
    assert result["audio_url"].startswith("/static/audio/")


def test_mms_cache_returns_data_url_when_disk_is_unavailable(monkeypatch):
    cache = MMSAudioCache(redis_url="redis://localhost:6379/0", audio_dir=None)

    def fail_write(self, data):
        raise OSError("Read-only file system")

    monkeypatch.setattr("pathlib.Path.write_bytes", fail_write)

    result = asyncio.run(cache.cache_audio("fr", "Bonjour", b"fake-audio"))

    assert result.startswith("data:audio/mpeg;base64,")
    assert result.endswith("ZmFrZS1hdWRpbw==")
