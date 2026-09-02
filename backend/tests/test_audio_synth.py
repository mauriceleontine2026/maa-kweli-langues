import asyncio
import os
import sys
from types import SimpleNamespace

from backend.app.routers.audio import SynthesizeRequest, synthesize_audio
from backend.app.services.mms_cache import MMSAudioCache
from backend.app.services.tts_providers import MMSTtsProvider


def test_synthesize_audio_blocks_unreliable_language_without_forced_french(monkeypatch):
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

    assert captured == {}
    assert result["audio_url"] is None
    assert result["provider"] is None
    assert "prononciation fiable" in result["note"]


def test_mms_cache_returns_data_url_when_disk_is_unavailable(monkeypatch):
    cache = MMSAudioCache(redis_url="redis://localhost:6379/0", audio_dir=None)

    def fail_write(self, data):
        raise OSError("Read-only file system")

    monkeypatch.setattr("pathlib.Path.write_bytes", fail_write)

    result = asyncio.run(cache.cache_audio("fr", "Bonjour", b"fake-audio"))

    assert result.startswith("data:audio/mpeg;base64,")
    assert result.endswith("ZmFrZS1hdWRpbw==")


def test_mms_provider_uses_exact_model_for_language(monkeypatch):
    captured = {}

    class FakeResponse:
        status_code = 200
        content = b"ok-audio"
        text = "ok"

    async def fake_post(self, url, json):
        captured["url"] = url
        captured["json"] = json
        return FakeResponse()

    monkeypatch.setattr("httpx.AsyncClient.post", fake_post)

    provider = MMSTtsProvider(coqui_server_url="http://localhost:5000")
    audio = asyncio.run(provider.synthesize("Bonjour", "bam"))

    assert audio == b"ok-audio"
    assert captured["url"] == "http://localhost:5000/tts"
    assert captured["json"]["language"] == "bam"
    assert captured["json"]["model"] == "facebook/mms-tts-bam"
