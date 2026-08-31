import base64
import time
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Request
from pydantic import BaseModel, Field
import tempfile
import os
import uuid
from pathlib import Path
import httpx
import unicodedata


def validate_audio_upload_bytes(filename: str, contents: bytes) -> str:
    if not filename:
        raise ValueError("No file provided")
    suffix = Path(filename).suffix.lower()
    if suffix not in ALLOWED_AUDIO_EXTENSIONS:
        raise ValueError("Unsupported audio file type")
    if len(contents) > MAX_UPLOAD_BYTES:
        raise ValueError("Audio file too large")
    if len(contents) < 12:
        raise ValueError("Audio file is too small to be valid")

    header = contents[:16]
    if suffix == ".mp3":
        mp3_valid = contents.startswith(b"ID3") or contents.startswith(b"\xff\xfb") or contents.startswith(b"\xff\xf3") or contents.startswith(b"\xff\xf2")
        if not mp3_valid:
            raise ValueError("Invalid MP3 header")
    elif suffix == ".wav":
        if not (header.startswith(b"RIFF") and b"WAVE" in header[:8]):
            raise ValueError("Invalid WAV header")
    elif suffix == ".ogg":
        if not header.startswith(b"OggS"):
            raise ValueError("Invalid OGG header")
    elif suffix == ".webm":
        if not header.startswith(b"\x1aE\xdf\xa3"):
            raise ValueError("Invalid WEBM header")
    elif suffix == ".flac":
        if not header.startswith(b"fLaC"):
            raise ValueError("Invalid FLAC header")
    elif suffix in {".m4a", ".aac"}:
        if not (header.startswith(b"ftyp") or header.startswith(b"\xff\xf1") or header.startswith(b"\xff\xf9")):
            raise ValueError("Invalid M4A/AAC header")
    return suffix

from ..services.security import RateLimiter, get_current_user, get_current_user_optional

router = APIRouter()

TTS_LANGUAGE_MAP = {
    "fr": "fr",
    "fra": "fr",
    "francais": "fr",
    "french": "fr",
    "en": "en",
    "eng": "en",
    "anglais": "en",
    "english": "en",
    "es": "es",
    "spa": "es",
    "espagnol": "es",
    "spanish": "es",
    "de": "de",
    "deu": "de",
    "allemand": "de",
    "german": "de",
    "ar": "ar",
    "ara": "ar",
    "arabe": "ar",
    "arabic": "ar",
    "pt": "pt",
    "por": "pt",
    "portugais": "pt",
    "portuguese": "pt",
    "it": "it",
    "ita": "it",
    "italien": "it",
    "italian": "it",
    "ja": "ja",
    "jpn": "ja",
    "japonais": "ja",
    "japanese": "ja",
    "ru": "ru",
    "rus": "ru",
    "russe": "ru",
    "russian": "ru",
    "hi": "hi",
    "hin": "hi",
    "hindi": "hi",
    "sw": "sw",
    "swa": "sw",
    "swahili": "sw",
    "yo": "yo",
    "yor": "yo",
    "yoruba": "yo",
    "ig": "ig",
    "igb": "ig",
    "igbo": "ig",
    "ha": "ha",
    "hau": "ha",
    "hausa": "ha",
    "zh": "zh-cn",
    "zho": "zh-cn",
    "chinois": "zh-cn",
    "chinois-mandarin": "zh-cn",
    "mandarin": "zh-cn",
    "chinese": "zh-cn",
    "lingala": "fr",
    "bissa": "fr",
    "dioula": "fr",
    "moore": "fr",
    "soussou": "fr",
    "pular": "fr",
    "malinke": "fr",
    "kissi": "fr",
    "guerze": "fr",
    "koniagui": "fr",
    "konyanka": "fr",
    "kuranko": "fr",
    "landuma": "fr",
    "lele": "fr",
    "mani": "fr",
    "nalu": "fr",
    "sankaran": "fr",
    "yalunka": "fr",
    "kono": "fr",
    "mano": "fr",
    "toma": "fr",
    "badiaranke": "fr",
    "baga": "fr",
    "bassari": "fr",
    "bedik": "fr",
    "wolof": "fr",
    "mossi": "fr",
    "peul": "fr",
    "fulfulde": "fr",
    "bambara": "fr",
}


def normalize_tts_language_code(code: str | None) -> str:
    if not code:
        return "fr"
    key = str(code).strip().lower()
    key = unicodedata.normalize("NFKD", key)
    key = "".join(ch for ch in key if not unicodedata.combining(ch))
    key = key.replace("_", "-").replace(" ", "-")
    key = "".join(ch for ch in key if ch.isascii() and (ch.isalnum() or ch == "-"))
    normalized = TTS_LANGUAGE_MAP.get(key)
    if normalized:
        return normalized
    return TTS_LANGUAGE_MAP.get(key.split("-")[0], "fr")


STATIC_DIR = Path(os.environ.get("MBAARA_STATIC_DIR", "/tmp/mbaara/static"))
if os.access(Path(__file__).resolve().parents[2], os.W_OK):
    STATIC_DIR = Path(__file__).resolve().parents[1] / "static"
UPLOAD_DIR = STATIC_DIR / "audio"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".ogg", ".webm", ".aac", ".flac"}
STALE_FILE_MAX_AGE_SECONDS = 24 * 60 * 60  # 24h

_transcribe_rate_limiter = RateLimiter(name="audio-transcribe", max_attempts=5, window_seconds=60)
_synthesize_rate_limiter = RateLimiter(name="audio-synthesize", max_attempts=10, window_seconds=60)
_upload_rate_limiter = RateLimiter(name="audio-upload", max_attempts=10, window_seconds=60)


async def _read_upload_with_limit(file: UploadFile, max_bytes: int) -> bytes:
    chunks = []
    total = 0
    while True:
        chunk = await file.read(min(1024 * 1024, max_bytes - total + 1))
        if not chunk:
            break
        chunks.append(chunk)
        total += len(chunk)
        if total > max_bytes:
            raise ValueError("Audio file too large")
    return b"".join(chunks)


def _purge_stale_audio_files(directory: Path) -> None:
    now = time.time()
    try:
        for path in directory.iterdir():
            try:
                if path.is_file() and now - path.stat().st_mtime > STALE_FILE_MAX_AGE_SECONDS:
                    path.unlink()
            except OSError:
                continue
    except OSError:
        pass


class SynthesizeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000)
    language_code: str | None = None

# Optional faster-whisper model (lazy-loaded)
_whisper_model = None
_whisper_available = False
try:
    from faster_whisper import WhisperModel
    _whisper_available = True
except Exception:
    _whisper_available = False


def get_whisper_model():
    global _whisper_model
    if not _whisper_available:
        return None
    if _whisper_model is None:
        # default to a small CPU-friendly model; users can change to larger models
        _whisper_model = WhisperModel("small", device="cpu")
    return _whisper_model


@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    _rate_limit=Depends(_transcribe_rate_limiter),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    try:
        contents = await _read_upload_with_limit(file, MAX_UPLOAD_BYTES)
        suffix = validate_audio_upload_bytes(file.filename, contents)
    except ValueError as exc:
        detail = str(exc)
        status_code = 413 if "too large" in detail.lower() else 400
        raise HTTPException(status_code=status_code, detail=detail)
    if not _whisper_available:
        openai_key = os.getenv("OPENAI_API_KEY")
        if not openai_key:
            raise HTTPException(status_code=501, detail="No speech-to-text provider is configured")
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {openai_key}"},
                files={"file": (file.filename or f"audio{suffix}", contents, file.content_type or "application/octet-stream")},
                data={"model": os.getenv("OPENAI_TRANSCRIPTION_MODEL", "whisper-1")},
            )
        if response.status_code >= 300:
            raise HTTPException(status_code=502, detail="Speech-to-text provider request failed")
        return {"text": response.json().get("text", ""), "language": None, "confidence": None}

    model = get_whisper_model()
    if model is None:
        raise HTTPException(status_code=500, detail="Failed to initialize Whisper model")

    # save upload to a temp file
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        tmp.write(contents)
        tmp.flush()
        tmp.close()

        segments, info = model.transcribe(tmp.name, beam_size=5)
        text = "".join([s.text for s in segments]) if segments else ""
        return {"text": text, "language": info.language if hasattr(info, 'language') else None, "confidence": None}
    finally:
        try:
            os.unlink(tmp.name)
        except Exception:
            pass


@router.post("/synthesize")
async def synthesize_audio(
    payload: SynthesizeRequest,
    current_user=Depends(get_current_user_optional),
    _rate_limit=Depends(_synthesize_rate_limiter),
):
    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="No text provided")

    normalized_language = normalize_tts_language_code(payload.language_code)

    allow_premium_tts = str(os.getenv("ENABLE_PREMIUM_TTS", "false")).strip().lower() in {"1", "true", "yes", "on"}
    elevenlabs_key = os.getenv("ELEVENLABS_API_KEY")
    if allow_premium_tts and elevenlabs_key:
        voice_id = os.getenv("ELEVENLABS_VOICE_ID")
        if voice_id:
            try:
                async with httpx.AsyncClient(timeout=60.0) as client:
                    response = await client.post(
                        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
                        headers={"xi-api-key": elevenlabs_key, "Accept": "audio/mpeg", "Content-Type": "application/json"},
                        json={"text": payload.text, "model_id": os.getenv("ELEVENLABS_MODEL", "eleven_multilingual_v2")},
                    )
                if response.status_code < 300:
                    try:
                        out_dir = Path(__file__).resolve().parents[1] / "static" / "audio"
                        out_dir.mkdir(parents=True, exist_ok=True)
                        _purge_stale_audio_files(out_dir)
                        fname = f"tts_{uuid.uuid4().hex}.mp3"
                        (out_dir / fname).write_bytes(response.content)
                        return {"audio_url": f"/static/audio/{fname}", "text": payload.text, "language_code": payload.language_code or "fr", "duration_seconds": None, "provider": "elevenlabs"}
                    except OSError:
                        encoded = base64.b64encode(response.content).decode("ascii")
                        return {"audio_url": f"data:audio/mpeg;base64,{encoded}", "text": payload.text, "language_code": payload.language_code or "fr", "duration_seconds": None, "provider": "elevenlabs"}
            except httpx.HTTPError:
                pass

    # Fallback to gTTS for low-cost speech synthesis.
    try:
        from gtts import gTTS
        out_dir = Path(__file__).resolve().parents[1] / "static" / "audio"
        out_dir.mkdir(parents=True, exist_ok=True)
        _purge_stale_audio_files(out_dir)
        fname = f"tts_{uuid.uuid4().hex}.mp3"
        out_path = out_dir / fname
        tts = gTTS(text=payload.text, lang=normalized_language)
        try:
            tts.save(str(out_path))
            audio_url = f"/static/audio/{fname}"
        except OSError:
            import io
            buffer = io.BytesIO()
            tts.write_to_fp(buffer)
            encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
            audio_url = f"data:audio/mpeg;base64,{encoded}"
        return {"audio_url": audio_url, "text": payload.text, "language_code": normalized_language, "duration_seconds": None}
    except Exception:
        # Fallback: suggest client-side synthesis via Expo
        return {"audio_url": None, "text": payload.text, "language_code": normalized_language, "duration_seconds": None, "note": "gTTS unavailable; client should use local TTS (expo-speech)"}


@router.post("/upload")
async def upload_audio(
    request: Request,
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    _rate_limit=Depends(_upload_rate_limiter),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    try:
        contents = await _read_upload_with_limit(file, MAX_UPLOAD_BYTES)
        suffix = validate_audio_upload_bytes(file.filename, contents)
    except ValueError as exc:
        detail = str(exc)
        status_code = 413 if "too large" in detail.lower() else 400
        raise HTTPException(status_code=status_code, detail=detail)

    filename = f"upload_{uuid.uuid4().hex}{suffix}"
    save_path = UPLOAD_DIR / filename

    try:
        _purge_stale_audio_files(UPLOAD_DIR)
        save_path.write_bytes(contents)
        base_url = request.url_for("static", path=f"audio/{filename}")
        return {"file_url": str(base_url)}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Upload failed. Please retry later.")
