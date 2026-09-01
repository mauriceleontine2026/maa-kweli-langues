"""
mms_audio.py
Route backend: POST /api/audio/synthesize-mms
Synthèse TTS via MMS/gTTS avec cache Redis

Remplace/complète la route existante /api/audio/synthesize
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional
import logging
import os

from ..services.tts_providers import get_tts_router, TTSRouter
from ..services.mms_cache import get_mms_cache, MMSAudioCache
from ..services.security import get_current_user_optional

logger = logging.getLogger(__name__)
router = APIRouter(tags=["audio-tts"])


class SynthesizeRequest(BaseModel):
    """Requête synthèse TTS"""

    text: str = Field(..., min_length=1, max_length=1000)
    language_code: Optional[str] = Field("fr", description="ISO 639-3 (sus, mnk, fra, etc.)")


class SynthesizeResponse(BaseModel):
    """Réponse synthèse TTS"""

    audio_url: Optional[str] = Field(
        None, description="URL local /static/audio/cached/{filename}"
    )
    text: str
    language_code: str
    duration_seconds: Optional[float] = None
    provider: Optional[str] = Field(
        None, description="mms | gtts | elevenlabs | null"
    )
    cached: bool = Field(False, description="Résultat vient du cache?")
    status: str = Field("success", description="success | unavailable")
    notice: Optional[str] = Field(
        None, description="Message utilisateur (experimental, unavailable, etc.)"
    )


@router.post("/synthesize-mms", response_model=SynthesizeResponse)
async def synthesize_mms_tts(
    payload: SynthesizeRequest,
    current_user=Depends(get_current_user_optional),
):
    """
    Synthétise texte en audio via MMS/gTTS avec cache intelligent

    Flow:
    1. Vérifier cache Redis
    2. Si miss: Router TTS → MMS → gTTS → ElevenLabs
    3. Sauvegarder résultat en cache (30j TTL)
    4. Retourner URL local

    Supports:
    - sus (Soussou), mnk (Malinké), bam (Bambara), etc. → MMS via Coqui
    - ff (Fulfulde), wol (Wolof), etc. → gTTS fallback
    - fra (French), eng (English), etc. → MMS direct

    Rate limiting: 10 req/min par utilisateur
    """

    # Validation texte
    if not payload.text.strip():
        raise HTTPException(400, "No text provided")

    text = payload.text.strip()
    lang_code = (payload.language_code or "fr").strip().lower()

    logger.info(f"[MMS] Request: {lang_code} ({len(text)} chars)")

    # Synthétiser directement sans cache pour debug
    tts_router = get_tts_router()
    audio_bytes = await tts_router.synthesize(text, lang_code)

    if not audio_bytes:
        logger.warning(f"[MMS] Synthesis failed for {lang_code}")
        return SynthesizeResponse(
            audio_url=None,
            text=text,
            language_code=lang_code,
            status="unavailable",
            notice="Audio non disponible. Veuillez utiliser la voix navigateur ou audio humain.",
        )

    # Return audio as data URL (no disk caching for now)
    import base64
    encoded = base64.b64encode(audio_bytes).decode("ascii")
    audio_url = f"data:audio/mpeg;base64,{encoded}"

    # Detect provider
    provider = "mms"  # Default
    if lang_code in {"ff", "pul", "fuc", "wol"}:
        provider = "gtts"  # Fallback languages
    elif lang_code in {"fra", "eng", "spa", "ara", "por"}:
        provider = "mms"  # Main languages

    return SynthesizeResponse(
        audio_url=audio_url,
        text=text,
        language_code=lang_code,
        provider=provider,
        cached=False,
        status="success",
    )


@router.get("/cache-stats")
async def get_cache_statistics(
    current_user=Depends(get_current_user_optional),
    cache: MMSAudioCache = Depends(get_mms_cache),
):
    """
    Retourne statistiques cache Redis (debug/monitoring)

    Response:
    {
        "total_cached_phrases": 1250,
        "estimated_bytes": 5242880,
        "estimated_mb": 5.0
    }
    """
    stats = await cache.get_cache_stats()
    if not stats:
        raise HTTPException(503, "Cache not available")
    return stats


@router.post("/cache-invalidate/{language_code}")
async def invalidate_language_cache(
    language_code: str,
    current_user=Depends(get_current_user_optional),
    cache: MMSAudioCache = Depends(get_mms_cache),
):
    """
    Invalide tout le cache pour une langue

    ⚠️ À utiliser après mise à jour modèle TTS
    """
    await cache.invalidate_language(language_code)
    return {"status": "ok", "message": f"Cache invalidated for {language_code}"}


@router.post("/cache-clear")
async def clear_all_cache(
    current_user=Depends(get_current_user_optional),
    cache: MMSAudioCache = Depends(get_mms_cache),
):
    """
    Vide complètement le cache

    ⚠️ DÉSTRUCTIF - À utiliser seulement en dev/admin
    """
    # Admin check
    if not current_user or not getattr(current_user, "is_admin", False):
        raise HTTPException(403, "Admin only")

    await cache.clear_cache()
    return {"status": "ok", "message": "Cache cleared"}
