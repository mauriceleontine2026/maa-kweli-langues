import os
import re
import json
import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator

from ..services.security import RateLimiter, get_current_user

router = APIRouter()

_ai_rate_limiter = RateLimiter(name="ai", max_attempts=10, window_seconds=60)


def _sanitize_text(value: str | None, *, max_length: int, allow_newlines: bool = True) -> str | None:
    if value is None:
        return None
    text = value.strip()
    text = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", "", text)
    if not allow_newlines:
        text = text.replace("\n", " ").replace("\r", " ")
    if len(text) > max_length:
        raise ValueError(f"Text exceeds maximum length of {max_length} characters")
    return text


class LLMRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=4000)
    response_json_schema: dict | None = None
    temperature: float | None = Field(default=0.7, ge=0.0, le=2.0)

    @field_validator("prompt")
    @classmethod
    def validate_prompt(cls, value: str) -> str:
        return _sanitize_text(value, max_length=4000) or ""

    @field_validator("response_json_schema")
    @classmethod
    def validate_response_json_schema(cls, value: dict | None) -> dict | None:
        if value is None:
            return None
        schema_text = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
        if len(schema_text) > 4000:
            raise ValueError("response_json_schema is too large")
        return value


class TranslationRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)
    source_language: str = Field(..., min_length=2, max_length=20)
    target_language: str = Field(..., min_length=2, max_length=20)

    @field_validator("text", "source_language", "target_language")
    @classmethod
    def sanitize_translation_value(cls, value: str) -> str:
        return _sanitize_text(value, max_length=2000, allow_newlines=False) or ""


def _get_env_value(*names: str) -> str | None:
    for name in names:
        value = os.getenv(name)
        if value is not None and value.strip():
            return value.strip()
    return None


OPENAI_API_KEY = _get_env_value("OPENAI_API_KEY", "OPENAI_KEY")
OPENAI_API_BASE = _get_env_value("OPENAI_API_BASE", "OPENAI_BASE_URL") or "https://api.openai.com"
ANTHROPIC_API_KEY = _get_env_value("ANTHROPIC_API_KEY", "ANTHROPIC_KEY")
ANTHROPIC_AGENT_ID = _get_env_value("ANTHROPIC_AGENT_ID", "CLAUDE_AGENT_ID")
GEMINI_API_KEY = _get_env_value("GEMINI_API_KEY", "GOOGLE_AI_API_KEY", "GEMINI_KEY")


def _get_anthropic_config() -> tuple[str | None, str | None]:
    return (
        _get_env_value("ANTHROPIC_API_KEY", "ANTHROPIC_KEY"),
        _get_env_value("ANTHROPIC_AGENT_ID", "CLAUDE_AGENT_ID"),
    )


def build_anthropic_request(prompt: str, temperature: float = 0.7):
    api_key, agent_id = _get_anthropic_config()
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    model = os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-latest")

    if agent_id:
        url = f"https://api.anthropic.com/v1/agents/{agent_id}/messages"
        payload = {
            "max_tokens": 700,
            "temperature": temperature,
            "messages": [{"role": "user", "content": prompt}],
        }
    else:
        url = "https://api.anthropic.com/v1/messages"
        payload = {
            "model": model,
            "max_tokens": 700,
            "temperature": temperature,
            "messages": [{"role": "user", "content": prompt}],
        }

    return url, headers, payload


async def call_anthropic(prompt: str, temperature: float = 0.7) -> str:
    api_key, _ = _get_anthropic_config()
    if not api_key:
        raise HTTPException(status_code=501, detail="Anthropic provider is not configured")
    url, headers, payload = build_anthropic_request(prompt, temperature)
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, headers=headers, json=payload)
    if response.status_code >= 300:
        raise HTTPException(status_code=502, detail="Anthropic provider request failed")
    body = response.json()
    if isinstance(body.get("content"), list) and body["content"]:
        return body["content"][0].get("text", "").strip()
    return str(body.get("output_text", "")).strip()


async def call_gemini(prompt: str, temperature: float = 0.7) -> str:
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=501, detail="Gemini provider is not configured")
    model = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
            params={"key": GEMINI_API_KEY},
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": temperature, "maxOutputTokens": 700},
            },
        )
    if response.status_code >= 300:
        raise HTTPException(status_code=502, detail="Gemini provider request failed")
    return response.json()["candidates"][0]["content"]["parts"][0]["text"].strip()


async def call_openai(prompt: str, temperature: float = 0.7, response_json_schema: dict | None = None) -> str:
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=501, detail="OpenAI API key not configured")

    request_body = {
        "model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        "messages": [
            {"role": "system", "content": "Tu es un assistant utile, concis et sûr."},
            {"role": "user", "content": prompt},
        ],
        "temperature": temperature,
        "max_tokens": 700,
    }
    if response_json_schema:
        request_body["response_format"] = {
            "type": "json_schema",
            "json_schema": {"name": "structured_response", "strict": True, "schema": response_json_schema},
        }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{OPENAI_API_BASE.rstrip('/')}/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json=request_body,
        )

    if response.status_code >= 300:
        raise HTTPException(status_code=502, detail="OpenAI provider request failed")

    payload = response.json()
    return payload["choices"][0]["message"]["content"].strip()


@router.post("/chat")
async def chat(
    payload: LLMRequest,
    current_user=Depends(get_current_user),
    _rate_limit=Depends(_ai_rate_limiter),
):
    prompt = payload.prompt
    if payload.response_json_schema:
        schema_text = json.dumps(payload.response_json_schema, ensure_ascii=False)
        if len(schema_text) > 4000:
            raise HTTPException(status_code=400, detail="response_json_schema is too large")
        prompt = (
            f"{prompt}\n\nRéponds uniquement en JSON valide qui correspond au schéma suivant :\n{schema_text}"
            + "\nNe renvoie que du JSON."
        )

    temperature = payload.temperature or 0.7
    provider = (os.getenv("AI_PROVIDER") or "auto").strip().lower()
    openai_api_key = _get_env_value("OPENAI_API_KEY", "OPENAI_KEY")
    anthropic_api_key, _ = _get_anthropic_config()
    gemini_api_key = _get_env_value("GEMINI_API_KEY", "GOOGLE_AI_API_KEY", "GEMINI_KEY")
    providers = {
        "openai": lambda: call_openai(prompt, temperature, payload.response_json_schema),
        "anthropic": lambda: call_anthropic(prompt, temperature),
        "gemini": lambda: call_gemini(prompt, temperature),
    }
    if provider == "auto":
        order = [name for name, configured in (("openai", openai_api_key), ("anthropic", anthropic_api_key), ("gemini", gemini_api_key)) if configured]
    else:
        if provider not in providers:
            raise HTTPException(status_code=400, detail="Unsupported AI provider")
        if provider == "openai" and not openai_api_key:
            raise HTTPException(status_code=503, detail="OpenAI provider is not configured")
        if provider == "anthropic" and not anthropic_api_key:
            raise HTTPException(status_code=503, detail="Anthropic provider is not configured")
        if provider == "gemini" and not gemini_api_key:
            raise HTTPException(status_code=503, detail="Gemini provider is not configured")
        order = [provider]
    if not order:
        raise HTTPException(status_code=503, detail="No AI provider is configured")

    content = None
    used_provider = None
    last_error = None
    for name in order:
        try:
            content = await providers[name]()
            used_provider = name
            break
        except HTTPException as error:
            last_error = error
            if provider != "auto":
                raise
        except Exception as error:
            last_error = HTTPException(status_code=502, detail=f"{name.title()} provider failed")
            if provider != "auto":
                raise last_error from error
    if content is None:
        raise last_error or HTTPException(status_code=503, detail="AI providers are unavailable")

    if payload.response_json_schema:
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            return {"content": content}

    return {"content": content, "provider": used_provider}


@router.post("/translate")
async def translate(
    payload: TranslationRequest,
    current_user=Depends(get_current_user),
    _rate_limit=Depends(_ai_rate_limiter),
):
    """Translate rare/local languages through a separately hosted NLLB model."""
    nllb_url = os.getenv("NLLB_API_URL")
    if not nllb_url:
        raise HTTPException(status_code=501, detail="NLLB translation provider is not configured")
    headers = {"Content-Type": "application/json"}
    if os.getenv("HF_API_TOKEN"):
        headers["Authorization"] = f"Bearer {os.getenv('HF_API_TOKEN')}"
    async with httpx.AsyncClient(timeout=45.0) as client:
        response = await client.post(
            nllb_url,
            headers=headers,
            json={"inputs": payload.text, "parameters": {"src_lang": payload.source_language, "tgt_lang": payload.target_language}},
        )
    if response.status_code >= 300:
        raise HTTPException(status_code=502, detail="Translation provider request failed")
    result = response.json()
    if isinstance(result, list) and result and isinstance(result[0], dict):
        translated_text = result[0].get("translation_text", "")
    else:
        translated_text = result.get("translation_text", "") if isinstance(result, dict) else ""
    return {"translation": translated_text, "source_language": payload.source_language, "target_language": payload.target_language, "provider": "nllb-200"}
