import httpx
import pytest

from backend.app.services import contribution_storage


def _response(status_code=200, *, payload=None, content=b""):
    response_args = {"content": content} if content else {"json": payload if payload is not None else {}}
    return httpx.Response(status_code, **response_args, request=httpx.Request("GET", "https://storage.example.test"))


def _configure_storage(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://project.example.test")
    monkeypatch.setenv("SUPABASE_SERVICE_KEY", "server-only-secret")
    monkeypatch.setenv("SUPABASE_CONTRIBUTIONS_BUCKET", "voice-contributions")


def test_store_audio_uses_private_bucket_and_keeps_service_key_off_url(monkeypatch):
    _configure_storage(monkeypatch)
    calls = []

    def fake_request(method, url, **kwargs):
        calls.append((method, url, kwargs))
        if method == "GET":
            return _response(payload={"public": False})
        return _response()

    monkeypatch.setattr(contribution_storage.httpx, "request", fake_request)
    contribution_storage.store_audio("contributions/17/test.m4a", b"audio", "audio/mp4")

    upload = calls[-1]
    assert upload[0] == "POST"
    assert "/voice-contributions/contributions/17/test.m4a" in upload[1]
    assert "server-only-secret" not in upload[1]
    assert upload[2]["headers"]["Authorization"] == "Bearer server-only-secret"
    assert upload[2]["headers"]["x-upsert"] == "false"


def test_store_audio_rejects_public_bucket(monkeypatch):
    _configure_storage(monkeypatch)
    monkeypatch.setattr(
        contribution_storage.httpx,
        "request",
        lambda *_args, **_kwargs: _response(payload={"public": True}),
    )

    with pytest.raises(contribution_storage.ContributionStorageError, match="must be private"):
        contribution_storage.store_audio("contributions/17/test.webm", b"audio", "audio/webm")


def test_signed_url_is_relative_to_storage_api(monkeypatch):
    _configure_storage(monkeypatch)

    def fake_request(method, url, **_kwargs):
        if method == "GET":
            return _response(payload={"public": False})
        return _response(payload={"signedURL": "/object/sign/voice-contributions/key?token=temporary"})

    monkeypatch.setattr(contribution_storage.httpx, "request", fake_request)

    assert contribution_storage.create_audio_signed_url("key") == (
        "https://project.example.test/storage/v1/object/sign/voice-contributions/key?token=temporary"
    )