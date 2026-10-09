"""Chargement et inférence des modèles Meta MMS-TTS."""

import logging
import threading
from typing import Any, Dict, List, Optional, Set, Tuple

import torch
from transformers import AutoTokenizer, VitsModel

from config import DEFAULT_LANGUAGES, LANG_ALIASES, LANG_FALLBACK

logger = logging.getLogger(__name__)


class LanguageNotConfiguredError(ValueError):
    """La langue demandée n'est ni activée ni associée à un fallback."""


class TTSModelError(RuntimeError):
    """Un modèle MMS n'a pas pu être chargé ou utilisé."""


class TTSService:
    """Service MMS avec chargement à la demande et cache mémoire."""

    def __init__(
        self,
        languages: Optional[List[str]] = None,
        lang_fallback: Optional[Dict[str, str]] = None,
    ) -> None:
        self.languages: Set[str] = set(languages or DEFAULT_LANGUAGES)
        self.lang_fallback = dict(LANG_FALLBACK if lang_fallback is None else lang_fallback)
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.models: Dict[str, Dict[str, Any]] = {}
        self._model_lock = threading.RLock()
        self._inference_lock = threading.Lock()

        invalid_fallbacks = {
            source: target
            for source, target in self.lang_fallback.items()
            if target not in self.languages
        }
        if invalid_fallbacks:
            raise ValueError(
                "Les langues de secours doivent être activées dans DEFAULT_LANGUAGES: "
                f"{invalid_fallbacks}"
            )

    def _normalize_language(self, lang_iso: str) -> str:
        language = lang_iso.strip().lower()
        language = LANG_ALIASES.get(language, language)
        if language not in self.languages and language not in self.lang_fallback:
            available = ", ".join(sorted(self.languages))
            raise LanguageNotConfiguredError(
                f"Langue '{lang_iso}' non configurée. Langues activées: {available}"
            )
        return language

    def _load_model(self, lang_iso: str) -> Dict[str, Any]:
        with self._model_lock:
            if lang_iso in self.models:
                return self.models[lang_iso]

            model_id = f"facebook/mms-tts-{lang_iso}"
            logger.info("Chargement du modèle %s sur %s", model_id, self.device)
            try:
                tokenizer = AutoTokenizer.from_pretrained(model_id)
                model = VitsModel.from_pretrained(model_id).to(self.device)
                model.eval()
                entry = {
                    "model": model,
                    "tokenizer": tokenizer,
                    "device": self.device,
                    "sampling_rate": int(model.config.sampling_rate),
                }
            except Exception as exc:
                raise TTSModelError(
                    f"Impossible de charger '{model_id}'. Vérifiez que le dépôt existe "
                    "et que Hugging Face est accessible."
                ) from exc

            self.models[lang_iso] = entry
            return entry

    def _language_candidates(self, requested: str) -> List[str]:
        candidates: List[str] = []
        visited: Set[str] = set()
        current = requested
        while current not in visited:
            visited.add(current)
            candidates.append(current)
            next_language = self.lang_fallback.get(current)
            if next_language is None:
                break
            current = next_language
        return candidates

    def synthesize(self, text: str, lang_iso: str) -> Tuple[Any, int]:
        """Retourne l'onde audio NumPy et sa fréquence d'échantillonnage."""
        if not text or not text.strip():
            raise ValueError("Le texte à synthétiser ne peut pas être vide.")

        requested = self._normalize_language(lang_iso)
        load_errors: List[str] = []

        for language in self._language_candidates(requested):
            try:
                entry = self._load_model(language)
            except TTSModelError as exc:
                load_errors.append(str(exc))
                logger.warning("Échec du modèle %s: %s", language, exc)
                continue

            try:
                inputs = entry["tokenizer"](text, return_tensors="pt")
                inputs = {key: value.to(entry["device"]) for key, value in inputs.items()}
                with self._inference_lock, torch.inference_mode():
                    waveform = entry["model"](**inputs).waveform
                audio = waveform.squeeze().detach().cpu().numpy()
                return audio, entry["sampling_rate"]
            except Exception as exc:
                raise TTSModelError(
                    f"Erreur pendant la synthèse avec le modèle "
                    f"'facebook/mms-tts-{language}'."
                ) from exc

        attempted = " ; ".join(load_errors)
        raise TTSModelError(
            f"Aucun modèle n'a pu être chargé pour '{requested}' ou ses fallbacks. {attempted}"
        )