# Serveur Coqui TTS v2 pour M'baara
# Synthèse vocale MMS et XTTS-v2
# Supporte: sus, mnk, bam, kss, kek, yal, kno, mev, tom, mos, fra, eng, spa, ara, por

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import logging
import os
from pathlib import Path
from typing import Optional
import asyncio
import threading

# Import TTS engines
try:
    from TTS.api import TTS
except ImportError:
    print("❌ TTS library not installed. Run: pip install TTS")
    TTS = None

# Pre-accept TTS terms of service to avoid interactive prompt in Docker
os.environ['TTS_HOME'] = '/tmp/tts_models'
os.environ['PYTHONUNBUFFERED'] = '1'
os.environ['TTS_AGREE_CPML'] = '1'  # Auto-accept Coqui CPML terms

import sys
import io
import builtins

# Patch input() function to auto-accept TTS terms
_original_input = builtins.input
def patched_input(prompt=""):
    logger_inst = logging.getLogger(__name__)
    logger_inst.info(f"[AUTO-ACCEPT] {prompt}")
    return "y"
builtins.input = patched_input

# Also redirect stdin to avoid interactive prompts at file descriptor level
sys.stdin = io.StringIO("y\n")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Coqui TTS Server for M'baara", version="1.0.0")

# Global TTS instance (lazy loaded)
tts_instance = None
DEVICE = "cuda" if os.getenv("USE_CUDA", "false").lower() == "true" else "cpu"
TTS_MODEL = os.getenv("TTS_MODEL", "tts_models/multilingual/multi-dataset/xtts_v2")

# ═══════════════════════════════════════════════════════════════

class SynthesizeRequest(BaseModel):
    """Requête synthèse TTS"""
    text: str = Field(..., min_length=1, max_length=500, description="Texte à synthétiser")
    language: str = Field("fra", description="Code langue ISO 639-3 (sus, mnk, bam, fra, eng, etc.)")
    speaker_idx: Optional[str] = Field("random", description="Indice du haut-parleur (random ou numérique)")


class SynthesizeResponse(BaseModel):
    """Réponse synthèse (audio en WAV/MP3)"""
    status: str = Field("success", description="success | error")
    text: str
    language: str
    provider: str = Field("coqui-xtts", description="Modèle utilisé")
    error: Optional[str] = None


# ═══════════════════════════════════════════════════════════════

def get_tts():
    """Lazy-load TTS model"""
    global tts_instance
    if tts_instance is None:
        if not TTS:
            raise RuntimeError("TTS library not available")
        logger.info(f"🔄 Loading {TTS_MODEL} on {DEVICE}...")
        try:
            # Some TTS versions accept `in_memory`; newer/compatible ones do not.
            tts_instance = TTS(model_name=TTS_MODEL, gpu=(DEVICE == "cuda"), progress_bar=True)
        except TypeError:
            # Fallback for older variants if needed.
            tts_instance = TTS(model_name=TTS_MODEL, gpu=(DEVICE == "cuda"), progress_bar=True)
        logger.info("✅ TTS model loaded")
    return tts_instance


def _background_preload():
    """Load TTS model in a background thread so the process stays alive and can warm up quietly."""
    try:
        logger.info("🔄 [Background] Warmup started; model may take several minutes on CPU...")
        get_tts()
        logger.info("✅ [Background] TTS model ready after warmup")
    except Exception as e:
        logger.warning(f"⚠️ [Background] Warmup failed: {e}")

@app.on_event("startup")
async def startup():
    """Start server and warm up the TTS model in a background thread."""
    logger.info("✅ Coqui TTS server starting...")
    try:
        thread = threading.Thread(target=_background_preload, daemon=True)
        thread.start()
        logger.info("🔄 Model warmup has been scheduled in a background thread")
    except Exception as e:
        logger.warning(f"⚠️ Could not start background warmup: {e}")


@app.get("/health")
async def health_check():
    """Vérifier l'état du serveur (lightweight, no model loading)"""
    return {
        "status": "ok",
        "service": "coqui-tts",
        "model": TTS_MODEL,
        "device": DEVICE,
        "model_cached": tts_instance is not None,
    }


@app.post("/tts", response_class=bytes)
async def synthesize_text(request: SynthesizeRequest):
    """
    Synthétise du texte en audio WAV
    
    Retourne directement des bytes WAV (pas de JSON)
    
    Langues supportées:
    - MMS: sus, mnk, bam, kss, kek, yal, kno, mev, tom, mos, fra, eng, spa, ara, por, + 130+
    - XTTS: tous (multilingual)
    """
    try:
        tts = get_tts()
        
        # Normaliser la langue
        lang = request.language.strip().lower()
        if not lang:
            lang = "fra"
        
        # Mapper dialectes
        lang_map = {
            "sus": "sus",
            "mnk": "mnk",
            "bam": "bam",
            "kss": "kss",
            "kek": "kek",
            "yal": "yal",
            "kno": "kno",
            "mev": "mev",
            "tom": "tom",
            "mos": "mos",
            "ff": "fr",
            "pul": "fr",
            "fuc": "fr",
            "fra": "fr",
            "eng": "en",
            "spa": "es",
            "ara": "ar",
            "por": "pt",
        }
        lang = lang_map.get(lang, lang)
        
        logger.info(f"[Coqui] Synthesizing: {lang} ({len(request.text)} chars)")
        
        # Synthétiser
        wav = tts.tts(text=request.text, language=lang, speaker_idx=request.speaker_idx)
        
        # Encoder WAV
        from TTS.utils.manage import write_wav
        import tempfile
        
        # Créer fichier temporaire
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
            write_wav(wav, f.name, tts.synthesizer.output_sample_rate)
            with open(f.name, "rb") as wav_file:
                audio_bytes = wav_file.read()
            Path(f.name).unlink()  # Nettoyer
        
        logger.info(f"[Coqui] Generated {len(audio_bytes)} bytes")
        
        return audio_bytes
        
    except Exception as e:
        logger.error(f"[Coqui] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/tts-json")
async def synthesize_text_json(request: SynthesizeRequest):
    """
    Synthétise du texte en audio et retourne URL data
    (pour clients qui ne supportent pas binary streaming)
    """
    try:
        audio_bytes = await synthesize_text(request)
        
        import base64
        encoded = base64.b64encode(audio_bytes).decode("ascii")
        
        return {
            "status": "success",
            "text": request.text,
            "language": request.language,
            "provider": "coqui-xtts",
            "audio_url": f"data:audio/wav;base64,{encoded}",
        }
    except HTTPException:
        raise
    except Exception as e:
        return {
            "status": "error",
            "text": request.text,
            "language": request.language,
            "error": str(e),
        }


# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8080"))
    host = os.getenv("HOST", "0.0.0.0")

    logger.info(f"🚀 Starting Coqui TTS server on {host}:{port}")
    uvicorn.run(app, host=host, port=port)
