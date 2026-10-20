import asyncio
import importlib
import sys
from pathlib import Path

import httpx
import pytest
from fastapi import FastAPI, HTTPException

sys.path.append(str(Path(__file__).resolve().parents[1]))

ai_module = importlib.import_module("app.routers.ai")
from app.routers.ai import router as ai_router
from app.services.security import get_current_user


def _make_client(monkeypatch, *, nllb_url=None, openai_key="test-openai-key"):
    monkeypatch.delenv("NLLB_API_URL", raising=False)
    monkeypatch.setenv("OPENAI_API_KEY", openai_key)
    monkeypatch.setenv("OPENAI_MODEL", "gpt-4o-mini")
    if nllb_url is not None:
        monkeypatch.setenv("NLLB_API_URL", nllb_url)

    app = FastAPI()
    app.dependency_overrides[get_current_user] = lambda: {"id": 1, "email": "test@example.com"}
    app.include_router(ai_router, prefix="/api/ai")
    return app


def test_translation_uses_openai_when_nllb_is_not_configured(monkeypatch):
    captured = {}

    async def fake_openai(prompt, temperature=0.7, response_json_schema=None):
        captured["prompt"] = prompt
        return "hello"

    monkeypatch.setattr(ai_module, "call_openai", fake_openai)

    app = _make_client(monkeypatch)
    transport = httpx.ASGITransport(app=app)

    async def request():
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            return await client.post(
                "/api/ai/translate",
                json={"text": "bonjour", "source_language": "fr", "target_language": "en"},
                headers={"Authorization": "Bearer test-token"},
            )

    response = asyncio.run(request())

    assert response.status_code == 200
    assert response.json()["translation"] == "hello"
    assert response.json()["provider"] == "openai"
    assert "bonjour" in captured["prompt"]


def test_translation_uses_nllb_when_configured(monkeypatch):
    async def fake_post(self, url, headers=None, json=None):
        class Response:
            status_code = 200

            @staticmethod
            def json():
                return [{"translation_text": "hello"}]

        return Response()

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)
    monkeypatch.setenv("NLLB_API_URL", "https://example.com/translate")

    result = asyncio.run(
        ai_module.translate(
            ai_module.TranslationRequest(
                text="bonjour",
                source_language="fr",
                target_language="en",
            )
        )
    )

    assert result["translation"] == "hello"
    assert result["provider"] == "nllb-200"


def test_translation_returns_503_when_no_provider_is_configured(monkeypatch):
    monkeypatch.delenv("NLLB_API_URL", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("PERPLEXITY_API_KEY", raising=False)

    app = FastAPI()
    app.dependency_overrides[get_current_user] = lambda: {"id": 1, "email": "test@example.com"}
    app.include_router(ai_router, prefix="/api/ai")
    transport = httpx.ASGITransport(app=app)

    async def request():
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            return await client.post(
                "/api/ai/translate",
                json={"text": "bonjour", "source_language": "fr", "target_language": "en"},
                headers={"Authorization": "Bearer test-token"},
            )

    response = asyncio.run(request())

    assert response.status_code == 503
    assert "configured" in response.json()["detail"].lower()


def test_anthropic_request_uses_messages_api_even_with_agent_id(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-anthropic-key")
    monkeypatch.setenv("ANTHROPIC_AGENT_ID", "test-agent-id")
    monkeypatch.setenv("ANTHROPIC_MODEL", "claude-sonnet-4-6")

    url, headers, payload = ai_module.build_anthropic_request("Pronunciation feedback")

    assert url == "https://api.anthropic.com/v1/messages"
    assert headers["x-api-key"] == "test-anthropic-key"
    assert payload["model"] == "claude-sonnet-4-6"
    assert payload["messages"] == [{"role": "user", "content": "Pronunciation feedback"}]
    assert "temperature" not in payload


def test_anthropic_request_error_includes_upstream_reason(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-anthropic-key")

    async def fake_post(self, url, headers=None, json=None):
        class Response:
            status_code = 404

            @staticmethod
            def json():
                return {"error": {"message": "model not found"}}

        return Response()

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    with pytest.raises(HTTPException) as error:
        asyncio.run(ai_module.call_anthropic("test prompt"))

    assert error.value.status_code == 502
    assert "HTTP 404" in error.value.detail
    assert "model not found" in error.value.detail
