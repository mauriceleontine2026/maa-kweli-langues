import asyncio
import os
import sys
from types import SimpleNamespace

from fastapi import FastAPI, HTTPException
import httpx

from backend.app.routers.audio import SynthesizeRequest, synthesize_audio
from backend.app.routers.mms_audio import router as mms_audio_router
from backend.app.services.mms_cache import MMSAudioCache
from backend.app.services.mms_cache import get_mms_cache
from backend.app.services.security import get_current_user
from backend.app.services.tts_providers import GttsTtsProvider, MMSTtsProvider


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


def test_mms_cache_preserves_wav_content_type_when_disk_is_unavailable(monkeypatch):
    cache = MMSAudioCache(redis_url="redis://localhost:6379/0", audio_dir=None)

    def fail_write(self, data):
        raise OSError("Read-only file system")

    monkeypatch.setattr("pathlib.Path.write_bytes", fail_write)
    wav_bytes = b"RIFF\x04\x00\x00\x00WAVEdata"

    result = asyncio.run(cache.cache_audio("fra", "Bonjour", wav_bytes))

    assert result.startswith("data:audio/wav;base64,")


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


def test_mms_provider_calls_internal_service_with_server_key(monkeypatch):
    captured = {}

    class FakeResponse:
        status_code = 200
        content = b"wav-audio"
        text = "ok"

    async def fake_post(self, url, json, headers=None):
        captured.update(url=url, json=json, headers=headers)
        return FakeResponse()

    monkeypatch.setattr("httpx.AsyncClient.post", fake_post)

    provider = MMSTtsProvider(
        mms_tts_url="https://mbaara-mms-tts.vercel.app/",
        api_key="test-only-secret",
    )
    audio = asyncio.run(provider.synthesize("Bonjour", "fr"))

    assert audio == b"wav-audio"
    assert captured == {
        "url": "https://mbaara-mms-tts.vercel.app/tts",
        "json": {"text": "Bonjour", "lang_iso": "fra"},
        "headers": {"X-TTS-API-Key": "test-only-secret"},
    }


def test_mms_synthesis_requires_an_authenticated_user(monkeypatch):
    app = FastAPI()
    app.include_router(mms_audio_router, prefix="/api/audio")

    async def check_route():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            return await client.post(
                "/api/audio/synthesize-mms",
                json={"text": "Bonjour", "language_code": "fra"},
            )

    response = asyncio.run(check_route())

    assert response.status_code == 401


def test_mms_synthesis_is_rate_limited(monkeypatch):
    import importlib

    mms_audio = importlib.import_module("backend.app.routers.mms_audio")

    monkeypatch.setenv("ENABLE_TTS_GENERATION", "false")
    mms_audio._mms_synthesize_rate_limiter._buckets.clear()
    app = FastAPI()
    app.include_router(mms_audio_router, prefix="/api/audio")
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=1)

    async def check_routes():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            return [
                await client.post(
                    "/api/audio/synthesize-mms",
                    json={"text": "Bonjour", "language_code": "fra"},
                )
                for _ in range(11)
            ]

    responses = asyncio.run(check_routes())

    assert [response.status_code for response in responses[:10]] == [200] * 10
    assert responses[10].status_code == 429
    mms_audio._mms_synthesize_rate_limiter._buckets.clear()


def test_gtts_provider_reports_only_installed_locales(tmp_path):
    provider = GttsTtsProvider(storage_dir=str(tmp_path))

    assert all(provider.supports_language(code) for code in (
        "francais", "deu", "eng", "spa", "ara", "por", "ita", "jpn", "rus", "hin", "zho", "swa", "hau"
    ))
    assert all(not provider.supports_language(code) for code in (
        "lingala", "yor", "igb", "ff", "wol", "sus", "mnk", "bam", "dyu"
    ))


def test_mms_cache_management_requires_admin(monkeypatch):
    class FakeCache:
        invalidated_language = None
        cleared = False

        async def invalidate_language(self, language_code):
            self.invalidated_language = language_code

        async def clear_cache(self):
            self.cleared = True

        async def get_cache_stats(self):
            return {"total_cached_phrases": 1}

    cache = FakeCache()
    app = FastAPI()
    app.include_router(mms_audio_router, prefix="/api/audio")
    app.dependency_overrides[get_mms_cache] = lambda: cache

    for role, expected_status in [(None, 401), ("user", 403), ("admin", 200)]:
        if role is None:
            def get_user():
                raise HTTPException(status_code=401, detail="Not authenticated")
        else:
            def get_user(role=role):
                return SimpleNamespace(role=role)
        app.dependency_overrides[get_current_user] = get_user

        async def check_routes():
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
                responses = await asyncio.gather(
                    client.get("/api/audio/cache-stats"),
                    client.post("/api/audio/cache-invalidate/fr"),
                    client.post("/api/audio/cache-clear"),
                )
                return [response.status_code for response in responses]

        assert asyncio.run(check_routes()) == [expected_status] * 3

    assert cache.invalidated_language == "fr"
    assert cache.cleared is True
