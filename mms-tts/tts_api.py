"""API HTTP FastAPI pour la synthèse MMS-TTS."""

import io
import hmac
import logging
import os
from typing import Dict, List

import soundfile as sf
from fastapi import Depends, FastAPI, Header, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from config import DEFAULT_LANGUAGES, LANG_ALIASES, LANG_FALLBACK, TTS_ALLOWED_ORIGINS
from tts_service import LanguageNotConfiguredError, TTSModelError, TTSService

logger = logging.getLogger(__name__)
app = FastAPI(title="MMS-TTS interne", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=TTS_ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)
tts_service = TTSService()


def require_tts_api_key(x_tts_api_key: str = Header(default="", alias="X-TTS-API-Key")) -> None:
    expected_key = os.getenv("TTS_API_KEY", "").strip()
    if not expected_key:
        raise HTTPException(status_code=503, detail="TTS API key is not configured")
    if not x_tts_api_key or not hmac.compare_digest(x_tts_api_key, expected_key):
        raise HTTPException(status_code=401, detail="Invalid TTS API key")


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    lang_iso: str = Field(..., min_length=2, max_length=20)


@app.get("/health")
def health() -> Dict[str, object]:
    """Vérification légère, sans chargement de modèle."""
    return {
        "status": "ok",
        "service": "mms-tts",
        "device": str(tts_service.device),
        "cached_models": sorted(tts_service.models),
    }


@app.get("/languages")
def languages() -> Dict[str, object]:
    """Expose les langues autorisées et leurs règles de fallback."""
    return {
        "languages": sorted(DEFAULT_LANGUAGES),
        "fallbacks": LANG_FALLBACK,
        "aliases": LANG_ALIASES,
    }


@app.post("/tts", response_class=Response)
def synthesize(
    request: TTSRequest,
    _api_key: None = Depends(require_tts_api_key),
) -> Response:
    """Génère un fichier WAV à partir du texte fourni."""
    try:
        audio, sample_rate = tts_service.synthesize(request.text, request.lang_iso)
        output = io.BytesIO()
        sf.write(output, audio, sample_rate, format="WAV", subtype="PCM_16")
        return Response(content=output.getvalue(), media_type="audio/wav")
    except LanguageNotConfiguredError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except TTSModelError as exc:
        logger.exception("Échec de synthèse MMS-TTS")
        raise HTTPException(status_code=503, detail=str(exc)) from exc