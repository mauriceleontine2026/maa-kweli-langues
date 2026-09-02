# Serveur Coqui TTS v2 pour M'baara
# Synthèse vocale MMS et XTTS-v2
# Supporte: sus, mnk, bam, kss, kek, yal, kno, mev, tom, mos, fra, eng, spa, ara, por

from fastapi import FastAPI, HTTPException, Response
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
    print("❌ Coqui TTS library is unavailable")
    TTS = None

try:
    import torch
    from transformers import AutoTokenizer, VitsModel
except ImportError:
    torch = None
    AutoTokenizer = None
    VitsModel = None

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
tts_instance_model = None
mms_instances = {}
DEVICE = "cuda" if os.getenv("USE_CUDA", "false").lower() == "true" else "cpu"
TTS_MODEL = os.getenv("TTS_MODEL", "tts_models/multilingual/multi-dataset/xtts_v2")

# ═══════════════════════════════════════════════════════════════

class SynthesizeRequest(BaseModel):
    """Requête synthèse TTS"""
    text: str = Field(..., min_length=1, max_length=500, description="Texte à synthétiser")
    language: str = Field("fra", description="Code langue ISO 639-3 (sus, mnk, bam, fra, eng, etc.)")
    speaker_idx: Optional[str] = Field("random", description="Indice du haut-parleur (random ou numérique)")
    model: Optional[str] = Field(None, description="Modèle exact à charger, ex: facebook/mms-tts-bam")


class SynthesizeResponse(BaseModel):
    """Réponse synthèse (audio en WAV/MP3)"""
    status: str = Field("success", description="success | error")
    text: str
    language: str
    provider: str = Field("coqui-xtts", description="Modèle utilisé")
    error: Optional[str] = None


# ═══════════════════════════════════════════════════════════════

def get_tts(model_name: Optional[str] = None):
    """Lazy-load the requested TTS model, reloading if the model changes."""
    global tts_instance, tts_instance_model
    selected_model = model_name or TTS_MODEL
    if tts_instance is None or tts_instance_model != selected_model:
        if not TTS:
            raise RuntimeError("TTS library not available")
        logger.info(f"🔄 Loading {selected_model} on {DEVICE}...")
        try:
            tts_instance = TTS(model_name=selected_model, gpu=(DEVICE == "cuda"), progress_bar=True)
        except TypeError:
            tts_instance = TTS(model_name=selected_model, gpu=(DEVICE == "cuda"), progress_bar=True)
        tts_instance_model = selected_model
        logger.info(f"✅ TTS model loaded: {selected_model}")
    return tts_instance


def get_mms(model_name: str):
    """Load a Meta MMS model directly from Hugging Face."""
    if model_name not in mms_instances:
        if not torch or not AutoTokenizer or not VitsModel:
            raise RuntimeError("Transformers MMS runtime is unavailable")
        logger.info(f"Loading MMS model {model_name} on {DEVICE}...")
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        model = VitsModel.from_pretrained(model_name).to(DEVICE)
        model.eval()
        mms_instances[model_name] = (tokenizer, model)
    return mms_instances[model_name]


@app.on_event("startup")
async def startup():
    """Start server. Model will load on first /tts request (lazy loading on demand)."""
    logger.info("✅ Coqui TTS server starting...")
    logger.info("🔄 Model will lazy-load on first /tts request (Coqui XTTS v2 requires significant RAM)")


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


@app.post("/tts", response_class=Response)
async def synthesize_text(request: SynthesizeRequest):
    """
    Synthétise du texte en audio WAV
    
    Retourne directement des bytes WAV (pas de JSON)
    
    Langues supportées:
    - MMS: sus, mnk, bam, kss, kek, yal, kno, mev, tom, mos, fra, eng, spa, ara, por, + 130+
    - XTTS: tous (multilingual)
    """
    try:
        # Normaliser la langue
        lang = request.language.strip().lower()
        if not lang:
            lang = "fra"

        exact_model = request.model or (
            {
                "sus": "facebook/mms-tts-sus",
                "mnk": "facebook/mms-tts-mnk",
                "bam": "facebook/mms-tts-bam",
                "kss": "facebook/mms-tts-kss",
                "kek": "facebook/mms-tts-kek",
                "yal": "facebook/mms-tts-yal",
                "kno": "facebook/mms-tts-kno",
                "mev": "facebook/mms-tts-mev",
                "tom": "facebook/mms-tts-tom",
                "mos": "facebook/mms-tts-mos",
                "ff": "tts_models/multilingual/multi-dataset/xtts_v2",
                "pul": "tts_models/multilingual/multi-dataset/xtts_v2",
                "fuc": "tts_models/multilingual/multi-dataset/xtts_v2",
                "fra": "facebook/mms-tts-fra",
                "eng": "facebook/mms-tts-eng",
                "spa": "facebook/mms-tts-spa",
                "ara": "facebook/mms-tts-ara",
                "por": "facebook/mms-tts-por",
            }.get(lang, TTS_MODEL)
        )

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

        logger.info(f"[Coqui] Synthesizing: {lang} with model={exact_model} ({len(request.text)} chars)")

        if exact_model.startswith("facebook/mms-tts-"):
            tokenizer, mms_model = get_mms(exact_model)
            inputs = tokenizer(request.text, return_tensors="pt")
            inputs = {key: value.to(DEVICE) for key, value in inputs.items()}
            with torch.no_grad():
                waveform = mms_model(**inputs).waveform.squeeze().cpu().numpy()

            from scipy.io.wavfile import write as write_wav
            import tempfile

            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
                write_wav(f.name, mms_model.config.sampling_rate, waveform)
                audio_bytes = Path(f.name).read_bytes()
            Path(f.name).unlink()
            logger.info(f"[MMS] Generated {len(audio_bytes)} bytes")
            return Response(content=audio_bytes, media_type="audio/wav")

        # Charge le bon modèle exact pour cette langue / ce request
        tts = get_tts(exact_model)

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
        
        return Response(content=audio_bytes, media_type="audio/wav")
        
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
        audio_response = await synthesize_text(request)
        audio_bytes = audio_response.body
        
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
