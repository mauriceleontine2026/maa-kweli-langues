"""
tts_providers.py
Interfaces abstraites et implémentations pour fournisseurs TTS
"""

from abc import ABC, abstractmethod
from enum import Enum
import os
from pathlib import Path
import uuid
import asyncio
import httpx
import logging

logger = logging.getLogger(__name__)


class TTSProvider(ABC):
    """Interface abstraite pour tous les fournisseurs TTS"""

    @abstractmethod
    async def synthesize(self, text: str, language_code: str) -> bytes | None:
        """
        Synthétise du texte en audio.

        Args:
            text: Texte à synthétiser (max 1000 chars)
            language_code: Code langue (ISO 639-3 ou BCP-47)

        Returns:
            bytes: Audio MP3/WAV ou None si erreur/non-supporté
        """
        pass

    @abstractmethod
    def supports_language(self, language_code: str) -> bool:
        """Vérifie si le fournisseur supporte cette langue"""
        pass

    @abstractmethod
    def get_priority(self) -> int:
        """Priorité du fournisseur (0 = plus haute)"""
        pass


class MMSTtsProvider(TTSProvider):
    """
    TTS via Meta MMS + Coqui XTTS-v2 wrapper
    Modèles Fairseq/MMS hébergés sur Coqui server ou API externe

    Supporte ~10 langues guinéennes:
    - sus, mnk, bam, kss, kek, yal, kno, mev, tom, mos
    """

    SUPPORTED_LANGUAGES = {
        "sus",  # Soussou
        "mnk",  # Malinké
        "bam",  # Bambara
        "kss",  # Kissi
        "kek",  # Kuranko
        "yal",  # Yalunka
        "kno",  # Kono
        "mev",  # Mano
        "tom",  # Toma
        "mos",  # Mossi/Moore
        "fra",  # Français
        "eng",  # English
        "spa",  # Spanish
        "ara",  # Arabic
        "por",  # Portuguese
    }

    def __init__(self, coqui_server_url: str | None = None, cache=None):
        """
        Args:
            coqui_server_url: URL du serveur Coqui TTS (ex: http://localhost:5000)
                             Si None, utilise variable d'env COQUI_TTS_URL
            cache: Cache Redis optionnel pour mémorisation des résultats
        """
        self.coqui_server_url = coqui_server_url or os.getenv(
            "COQUI_TTS_URL", "http://localhost:5000"
        )
        self.cache = cache
        self.timeout = 30.0  # 30 secondes de timeout

    async def synthesize(self, text: str, language_code: str) -> bytes | None:
        """Synthétise via Coqui server (MMS models)"""
        if not self.supports_language(language_code):
            return None

        if not text or not text.strip():
            return None

        # Normaliser code langue
        lang_code = language_code.strip().lower().split("-")[0]

        # Essayer cache
        if self.cache:
            cache_key = f"mms:{lang_code}:{hash(text)}"
            try:
                cached = await self.cache.get(cache_key)
                if cached:
                    logger.debug(f"[MMS] Cache hit: {lang_code}")
                    return cached
            except Exception as e:
                logger.warning(f"[MMS] Cache read error: {e}")

        # Appeler Coqui API
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.coqui_server_url}/tts",
                    json={
                        "text": text,
                        "speaker_idx": "random",  # Voix aléatoire
                        "language": lang_code,  # ISO 639-3 pour MMS
                    },
                )

                if response.status_code >= 300:
                    logger.warning(
                        f"[MMS] Error {response.status_code}: {response.text[:100]}"
                    )
                    return None

                audio_bytes = response.content

                # Cacher résultat
                if self.cache and audio_bytes:
                    try:
                        await self.cache.setex(
                            cache_key, 86400 * 30, audio_bytes
                        )  # 30 jours
                    except Exception as e:
                        logger.warning(f"[MMS] Cache write error: {e}")

                logger.debug(f"[MMS] Synthesized {len(audio_bytes)} bytes")
                return audio_bytes

        except asyncio.TimeoutError:
            logger.error(f"[MMS] Timeout for {lang_code}")
            return None
        except Exception as e:
            logger.error(f"[MMS] Error: {e}")
            return None

    def supports_language(self, language_code: str) -> bool:
        lang_code = language_code.strip().lower().split("-")[0]
        return lang_code in self.SUPPORTED_LANGUAGES

    def get_priority(self) -> int:
        return 0  # Priorité 0 = plus haute


class GttsTtsProvider(TTSProvider):
    """
    TTS via gTTS (Google Text-to-Speech)
    Fallback gratuit pour langues sans MMS

    Supporte ~100+ langues (mais qualité variable)
    """

    def __init__(self, storage_dir: str | None = None):
        """
        Args:
            storage_dir: Répertoire pour sauvegarder MP3
                        Si None, utilise /static/audio/
        """
        self.storage_dir = Path(storage_dir or "static/audio")
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.timeout = 10.0

    async def synthesize(self, text: str, language_code: str) -> bytes | None:
        """Synthétise via gTTS (nécessite connexion internet)"""
        if not text or not text.strip():
            return None

        lang_code = self._normalize_lang_code(language_code)

        try:
            from gtts import gTTS

            tts = gTTS(text=text, lang=lang_code, slow=False)

            import io

            fp = io.BytesIO()
            tts.write_to_fp(fp)
            audio_bytes = fp.getvalue()

            if audio_bytes and self.storage_dir.exists():
                try:
                    filename = f"gtts_{uuid.uuid4().hex}.mp3"
                    filepath = self.storage_dir / filename
                    filepath.write_bytes(audio_bytes)
                    logger.debug(f"[gTTS] Saved temp file: {filepath.name} ({len(audio_bytes)} bytes)")
                except Exception as e:
                    logger.warning(f"[gTTS] Disk persistence unavailable; continuing in-memory: {e}")

            logger.debug(f"[gTTS] Synthesized {lang_code}: {len(audio_bytes)} bytes")
            return audio_bytes

        except ImportError:
            logger.error("[gTTS] gTTS library not installed")
            return None
        except Exception as e:
            logger.error(f"[gTTS] Error: {e}")
            return None

    def supports_language(self, language_code: str) -> bool:
        """gTTS supporte pratiquement toutes les langues"""
        return bool(language_code and language_code.strip())

    def get_priority(self) -> int:
        return 1  # Priorité 1 = après MMS

    def _normalize_lang_code(self, code: str) -> str:
        """Normalise code pour gTTS (use 2-letter ISO 639-1)"""
        # Mapping spécifique gTTS
        mapping = {
            "sus": "fr",  # Soussou → French (pas mieux)
            "mnk": "fr",  # Malinké → French
            "bam": "fr",  # Bambara → French
            "kss": "fr",  # Kissi → French
            "ff": "fr",  # Fulfulde → French
            "wol": "fr",  # Wolof → French
            "yor": "yo",  # Yoruba OK
            "igb": "ig",  # Igbo OK
            "hau": "ha",  # Hausa OK
            "swa": "sw",  # Swahili OK
        }

        lower = code.strip().lower()
        if lower in mapping:
            return mapping[lower]

        # Essayer 2-letter code
        two_letter = lower.split("-")[0]
        return two_letter if len(two_letter) == 2 else "en"

    def _purge_old_files(self):
        """Supprime fichiers audio > 24h"""
        import time

        now = time.time()
        for filepath in self.storage_dir.glob("gtts_*.mp3"):
            mtime = filepath.stat().st_mtime
            if now - mtime > 86400:  # 24 heures
                try:
                    filepath.unlink()
                    logger.debug(f"[gTTS] Purged: {filepath.name}")
                except Exception as e:
                    logger.warning(f"[gTTS] Purge error: {e}")


class ElevenLabsTtsProvider(TTSProvider):
    """
    TTS via ElevenLabs (Premium)
    Optionnel, désactivé par défaut (ENABLE_PREMIUM_TTS=false)
    """

    def __init__(self, api_key: str | None = None, voice_id: str | None = None):
        """
        Args:
            api_key: Clé API ElevenLabs (ou env ELEVENLABS_API_KEY)
            voice_id: ID voix (ou env ELEVENLABS_VOICE_ID)
        """
        self.api_key = api_key or os.getenv("ELEVENLABS_API_KEY")
        self.voice_id = voice_id or os.getenv("ELEVENLABS_VOICE_ID")
        self.model = os.getenv("ELEVENLABS_MODEL", "eleven_multilingual_v2")
        self.enabled = (
            str(os.getenv("ENABLE_PREMIUM_TTS", "false")).lower() in {"1", "true", "yes"}
            and bool(self.api_key)
            and bool(self.voice_id)
        )
        self.timeout = 60.0

    async def synthesize(self, text: str, language_code: str) -> bytes | None:
        """Synthétise via ElevenLabs"""
        if not self.enabled:
            return None

        if not text or not text.strip():
            return None

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"https://api.elevenlabs.io/v1/text-to-speech/{self.voice_id}",
                    headers={
                        "xi-api-key": self.api_key,
                        "Accept": "audio/mpeg",
                        "Content-Type": "application/json",
                    },
                    json={"text": text, "model_id": self.model},
                )

                if response.status_code >= 300:
                    logger.warning(f"[ElevenLabs] Error {response.status_code}")
                    return None

                logger.debug(f"[ElevenLabs] Synthesized: {len(response.content)} bytes")
                return response.content

        except asyncio.TimeoutError:
            logger.error("[ElevenLabs] Timeout")
            return None
        except Exception as e:
            logger.error(f"[ElevenLabs] Error: {e}")
            return None

    def supports_language(self, language_code: str) -> bool:
        """ElevenLabs support ~30+ langues"""
        return self.enabled and bool(language_code)

    def get_priority(self) -> int:
        return 2  # Priorité 2 = après gTTS (optionnel)


class TTSRouter:
    """
    Routeur central pour sélection du meilleur fournisseur TTS
    
    Priorité:
    1. MMS via Coqui (experimental languages)
    2. gTTS (fallback)
    3. ElevenLabs (optionnel premium)
    4. None (fallback client-side Web Speech API)
    """

    def __init__(self):
        self.providers: list[TTSProvider] = []

    def add_provider(self, provider: TTSProvider):
        """Ajoute un fournisseur (sera trié par priorité)"""
        self.providers.append(provider)
        self.providers.sort(key=lambda p: p.get_priority())

    async def synthesize(self, text: str, language_code: str) -> bytes | None:
        """
        Tente synthèse avec fournisseurs dans l'ordre de priorité
        """
        for provider in self.providers:
            if not provider.supports_language(language_code):
                continue

            try:
                audio = await provider.synthesize(text, language_code)
                if audio:
                    logger.info(f"[Router] Success with {provider.__class__.__name__}")
                    return audio
            except Exception as e:
                logger.warning(f"[Router] Provider error: {e}")
                continue

        logger.warning(f"[Router] No provider available for {language_code}")
        return None


# Singleton instance
_router = None


def get_tts_router() -> TTSRouter:
    """Retourne l'instance globale du routeur TTS"""
    global _router
    if _router is None:
        _router = TTSRouter()
        # URL Coqui TTS - Railway deployment
        coqui_url = os.getenv(
            "COQUI_TTS_URL",
            "https://mbaara-coqui-tts-production.up.railway.app"
        )
        # Ajouter fournisseurs par défaut
        _router.add_provider(
            MMSTtsProvider(coqui_server_url=coqui_url)
        )  # MMS (priorité 0)
        _router.add_provider(
            GttsTtsProvider()
        )  # gTTS (priorité 1)
        _router.add_provider(
            ElevenLabsTtsProvider()
        )  # ElevenLabs (priorité 2, optionnel)
    return _router
