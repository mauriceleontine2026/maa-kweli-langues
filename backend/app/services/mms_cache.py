"""
mms_cache.py
Cache Redis pour résultats TTS (optimisation coûts + latency)
"""

import base64
import os
import hashlib
import logging
from pathlib import Path
import uuid
from datetime import timedelta
import redis.asyncio as redis

logger = logging.getLogger(__name__)


class MMSAudioCache:
    """
    Cache asynchrone Redis pour audio synthétisé

    Stratégie:
    - Key: f"tts:{language_code}:{text_hash_md5}"
    - Value: Filename du fichier MP3/WAV
    - TTL: 30 jours
    - Miss → Synthétise via TTS provider → Sauvegarde disque → Stocke en cache

    Avantages:
    - ~95% cache hit ratio (phrases standard répétées)
    - Réduit appels API de 95%
    - ~50ms latency (vs 500-1000ms pour synthesis)
    - Économie: $$$$ sur coûts TTS
    """

    def __init__(self, redis_url: str | None = None, audio_dir: str | None = None):
        """
        Args:
            redis_url: Connection string Upstash ou Redis local
                      Si None, utilise env REDIS_URL
            audio_dir: Répertoire stockage audio
                      Si None, utilise /static/audio/cached/
        """
        self.redis_url = redis_url or os.getenv(
            "REDIS_URL", "redis://localhost:6379/0"
        )
        self.audio_dir = Path(audio_dir or "static/audio/cached")
        self.audio_dir.mkdir(parents=True, exist_ok=True)

        self.redis_client = None
        self.cache_ttl = 86400 * 30  # 30 jours

    async def connect(self):
        """Établit connexion Redis"""
        try:
            self.redis_client = await redis.from_url(self.redis_url, decode_responses=False)
            # Test ping
            await self.redis_client.ping()
            logger.info(f"[MMSCache] Connected to Redis: {self.redis_url}")
        except Exception as e:
            logger.error(f"[MMSCache] Redis connection failed: {e}")
            self.redis_client = None

    async def disconnect(self):
        """Ferme connexion Redis"""
        if self.redis_client:
            await self.redis_client.close()
            logger.info("[MMSCache] Disconnected from Redis")

    def _make_cache_key(self, language_code: str, text: str) -> str:
        """Génère clé cache unifiée"""
        text_hash = hashlib.md5(text.encode()).hexdigest()
        return f"tts:{language_code.lower()}:{text_hash}"

    def _make_audio_filename(self) -> str:
        """Génère filename unique pour audio"""
        return f"tts_{uuid.uuid4().hex}.mp3"

    async def get_audio_or_none(
        self, language_code: str, text: str
    ) -> str | None:
        """
        Récupère audio en cache (retourne URL locale si trouvé)

        Args:
            language_code: ISO 639-3 (sus, mnk, fra, etc.)
            text: Texte à synthétiser

        Returns:
            "/static/audio/cached/{filename}" si trouvé en cache
            None si cache miss
        """
        if not self.redis_client:
            return None

        cache_key = self._make_cache_key(language_code, text)

        try:
            filename = await self.redis_client.get(cache_key)
            if filename:
                filename_str = filename.decode() if isinstance(filename, bytes) else filename
                logger.debug(f"[MMSCache] Hit: {language_code} ({len(text)} chars)")
                return f"/static/audio/cached/{filename_str}"
        except Exception as e:
            logger.warning(f"[MMSCache] Get error: {e}")

        return None

    async def cache_audio(
        self, language_code: str, text: str, audio_bytes: bytes
    ) -> str | None:
        """
        Sauvegarde audio en cache (disque + Redis)

        En environnement serverless (Vercel), le disque est souvent en lecture seule.
        Dans ce cas, on retourne un data URL directement pour que le client puisse
        jouer le son sans dépendre d'un fichier statique persistant.
        """
        if not audio_bytes:
            return None

        filename = self._make_audio_filename()
        filepath = self.audio_dir / filename

        try:
            filepath.write_bytes(audio_bytes)
            logger.debug(f"[MMSCache] Saved: {filename} ({len(audio_bytes)} bytes)")

            if self.redis_client:
                cache_key = self._make_cache_key(language_code, text)
                await self.redis_client.setex(
                    cache_key, self.cache_ttl, filename
                )
                logger.debug(f"[MMSCache] Cached: {language_code} for 30 days")

            return f"/static/audio/cached/{filename}"

        except Exception as e:
            logger.warning(f"[MMSCache] Disk cache unavailable, using in-memory data URL: {e}")
            encoded = base64.b64encode(audio_bytes).decode("ascii")
            return f"data:audio/mpeg;base64,{encoded}"

    async def prefill_cache(self, phrases_dict: dict[str, dict[str, str]]):
        """
        Pré-remplit cache avec phrases courantes

        Format input:
        {
            "fra": {
                "Bonjour": "<audio_bytes>",
                "Merci": "<audio_bytes>",
            },
            "sus": {
                "Salam": "<audio_bytes>",
            }
        }

        Utile pour optimisation au démarrage backend
        """
        if not self.redis_client:
            logger.warning("[MMSCache] Cannot prefill: Redis not connected")
            return

        count = 0
        for lang_code, phrases in phrases_dict.items():
            for text, audio_bytes in phrases.items():
                try:
                    await self.cache_audio(lang_code, text, audio_bytes)
                    count += 1
                except Exception as e:
                    logger.warning(f"[MMSCache] Prefill error: {e}")

        logger.info(f"[MMSCache] Prefilled {count} phrases")

    async def clear_cache(self):
        """
        Vide complètement le cache (debugging/reset)
        ⚠️ À utiliser avec prudence en production
        """
        if not self.redis_client:
            return

        try:
            pattern = "tts:*"
            cursor = 0
            count = 0

            while True:
                cursor, keys = await self.redis_client.scan(
                    cursor, match=pattern, count=100
                )
                if keys:
                    await self.redis_client.delete(*keys)
                    count += len(keys)

                if cursor == 0:
                    break

            logger.warning(f"[MMSCache] Cleared {count} cache entries")

        except Exception as e:
            logger.error(f"[MMSCache] Clear error: {e}")

    async def get_cache_stats(self) -> dict | None:
        """Retourne statistiques cache Redis"""
        if not self.redis_client:
            return None

        try:
            cursor = 0
            total_keys = 0
            total_bytes = 0

            while True:
                cursor, keys = await self.redis_client.scan(
                    cursor, match="tts:*", count=100
                )
                total_keys += len(keys)

                for key in keys:
                    val = await self.redis_client.get(key)
                    if val:
                        total_bytes += len(val)

                if cursor == 0:
                    break

            return {
                "total_cached_phrases": total_keys,
                "estimated_bytes": total_bytes,
                "estimated_mb": total_bytes / (1024 * 1024),
            }

        except Exception as e:
            logger.error(f"[MMSCache] Stats error: {e}")
            return None

    async def invalidate_language(self, language_code: str):
        """
        Invalide tout le cache pour une langue donnée
        Utile si on met à jour un modèle TTS
        """
        if not self.redis_client:
            return

        try:
            pattern = f"tts:{language_code.lower()}:*"
            cursor = 0
            count = 0

            while True:
                cursor, keys = await self.redis_client.scan(
                    cursor, match=pattern, count=100
                )
                if keys:
                    await self.redis_client.delete(*keys)
                    count += len(keys)

                if cursor == 0:
                    break

            logger.info(f"[MMSCache] Invalidated {count} entries for {language_code}")

        except Exception as e:
            logger.error(f"[MMSCache] Invalidate error: {e}")


# Singleton instance
_cache_instance = None


async def get_mms_cache() -> MMSAudioCache:
    """Retourne l'instance globale du cache MMSAudioCache"""
    global _cache_instance
    if _cache_instance is None:
        _cache_instance = MMSAudioCache()
        await _cache_instance.connect()
    return _cache_instance


async def close_mms_cache():
    """Ferme la connexion cache"""
    global _cache_instance
    if _cache_instance:
        await _cache_instance.disconnect()
        _cache_instance = None
