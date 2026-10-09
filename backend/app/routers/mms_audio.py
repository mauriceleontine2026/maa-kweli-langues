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
from ..services.security import RateLimiter, get_current_user, require_admin

logger = logging.getLogger(__name__)
router = APIRouter(tags=["audio-tts"])
_mms_synthesize_rate_limiter = RateLimiter(
    name="mms-audio-synthesize", max_attempts=10, window_seconds=60
)

UNAVAILABLE_LANGUAGE_CODES = {
    "lin", "lingala", "bsa", "bib", "bissa", "dyu", "dioula", "mos", "moore", "mossi",
    "sus", "soussou", "ff", "fuc", "pular", "peul", "fulfulde", "mnk", "malinke", "maninka",
    "kss", "kissi", "gxx", "guerze", "kno", "koniagui", "konyanka", "kek", "kuranko", "ldu",
    "landuma", "lle", "lele", "mni", "mani", "nlu", "nalu", "snk", "sankaran", "yal", "yalunka",
    "mev", "mano", "tom", "toma", "bsc", "badiaranke", "bgo", "baga", "bsq", "bassari", "bdf",
    "bedik", "wo", "wolof", "bam", "bambara", "kpe", "kpele",
}


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
    current_user=Depends(get_current_user),
    _rate_limit=Depends(_mms_synthesize_rate_limiter),
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

    Accès réservé aux utilisateurs connectés, avec limite de 10 requêtes/minute.
    """

    # Validation texte
    if not payload.text.strip():
        raise HTTPException(400, "No text provided")

    text = payload.text.strip()
    lang_code = (payload.language_code or "fr").strip().lower()
    language_key = lang_code.split("-")[0]
    generation_enabled = str(os.getenv("ENABLE_TTS_GENERATION", "false")).strip().lower() in {
        "1", "true", "yes", "on"
    }
    if not generation_enabled:
        return SynthesizeResponse(
            audio_url=None,
            text=text,
            language_code=lang_code,
            status="unavailable",
            notice="La synthèse audio n'est pas activée. Utilisez un audio humain validé ou la voix locale disponible.",
        )

    if language_key in UNAVAILABLE_LANGUAGE_CODES:
        return SynthesizeResponse(
            audio_url=None,
            text=text,
            language_code=lang_code,
            status="unavailable",
            notice="Aucun moteur TTS validé n'est disponible pour cette langue.",
        )

    logger.info(f"[MMS] Request: {lang_code} ({len(text)} chars)")

    cache = get_mms_cache()
    cached_url = await cache.get_audio_or_none(lang_code, text)
    if cached_url:
        return SynthesizeResponse(
            audio_url=cached_url,
            text=text,
            language_code=lang_code,
            provider="cache",
            cached=True,
            status="success",
        )

    tts_router = get_tts_router()
    audio_bytes, selected_provider = await tts_router.synthesize_with_provider(text, lang_code)

    if not audio_bytes:
        logger.warning(f"[MMS] Synthesis failed for {lang_code}")
        return SynthesizeResponse(
            audio_url=None,
            text=text,
            language_code=lang_code,
            status="unavailable",
            notice="Audio non disponible. Veuillez utiliser la voix navigateur ou audio humain.",
        )

    audio_url = await cache.cache_audio(lang_code, text, audio_bytes)
    if not audio_url:
        return SynthesizeResponse(
            audio_url=None,
            text=text,
            language_code=lang_code,
            status="unavailable",
            notice="Audio synthétisé non disponible dans le stockage courant.",
        )

    # Detect provider
    provider = "mms" if selected_provider.__class__.__name__ == "MMSTtsProvider" else "gtts"

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
    _admin=Depends(require_admin),
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
    _admin=Depends(require_admin),
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
    _admin=Depends(require_admin),
    cache: MMSAudioCache = Depends(get_mms_cache),
):
    """
    Vide complètement le cache

    ⚠️ DÉSTRUCTIF - À utiliser seulement en dev/admin
    """
    await cache.clear_cache()
    return {"status": "ok", "message": "Cache cleared"}
