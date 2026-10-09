"""Configuration du service MMS-TTS."""

import os

TTS_HOST = os.getenv("TTS_HOST", "0.0.0.0")
TTS_PORT = int(os.getenv("TTS_PORT", "8000"))
TTS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("TTS_ALLOWED_ORIGINS", "*").split(",")
    if origin.strip()
]

# Utilisez les codes ISO 639-3 employés dans les identifiants des modèles MMS.
# Un code dans cette liste est autorisé, mais son modèle doit aussi exister sur Hugging Face.
DEFAULT_LANGUAGES = [
    "fra", "eng", "jpn", "spa", "deu", "ita", "por", "rus", "ara", "zho", "hin",
    "yal", "sus", "man", "bsc", "fuf", "mnk", "bam",
]

# Chaque valeur doit aussi figurer dans DEFAULT_LANGUAGES.
# Choisissez une langue de secours réellement compréhensible pour vos utilisateurs.
LANG_FALLBACK = {
    # "yal": "sus",
    # "bss": "bsc",
}

# Alias courants acceptés par l'API; les modèles sont toujours chargés avec le code ISO 639-3.
LANG_ALIASES = {
    "fr": "fra",
    "en": "eng",
    "ja": "jpn",
    "es": "spa",
    "de": "deu",
    "it": "ita",
    "pt": "por",
    "ru": "rus",
    "ar": "ara",
    "zh": "zho",
    "hi": "hin",
    "pular": "fuf",
}