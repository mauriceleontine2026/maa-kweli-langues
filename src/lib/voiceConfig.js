/**
 * voiceConfig.js
 * Catalogue centralisé de toutes les langues avec capabilités TTS
 * 
 * Structure:
 * - displayName: Nom pour l'UI
 * - iso6393: Code ISO 639-3 officiel
 * - bcp47: Code BCP-47 si applicable
 * - country: Région principale
 * - tts: Configuration du fournisseur TTS
 *   - primaryProvider: "mms" | "gtts" | "premium" | null
 *   - modelId: Identifiant exact du modèle (ex: facebook/mms-tts-sus)
 *   - backendIntegration: "coqui-server" | "gtts" | "elevenlabs" | null
 *   - status: "validated" | "experimental" | "fallback-only" | "unavailable"
 *   - commercialUseAllowed: true | false | "to-be-verified"
 *   - nativeValidated: true | false (audio humain validé par locuteur natif?)
 *   - allowBrowserFallback: true | false (autoriser Web Speech API comme dernier recours?)
 * - uiNotice: Message discret pour l'utilisateur (optionnel)
 */

const createGttsProfile = (displayName, iso6393, bcp47, country) => ({
  displayName,
  iso6393,
  bcp47,
  country,
  tts: {
    primaryProvider: "gtts",
    modelId: null,
    backendIntegration: "gtts",
    status: "fallback-only",
    commercialUseAllowed: "to-be-verified",
    nativeValidated: false,
    allowBrowserFallback: true,
  },
  uiNotice: "Voix gTTS provisoire; accent et conditions d'utilisation à vérifier.",
});

const createUnavailableProfile = (displayName, iso6393, bcp47, country) => ({
  displayName,
  iso6393,
  bcp47,
  country,
  tts: {
    primaryProvider: null,
    modelId: null,
    backendIntegration: null,
    status: "unavailable",
    commercialUseAllowed: null,
    nativeValidated: false,
    allowBrowserFallback: true,
  },
  uiNotice: "Le cours est disponible, mais aucun audio validé n’est encore ajouté pour cette langue.",
});

const createRestrictedMmsProfile = (displayName, iso6393, bcp47, country, modelId) => ({
  displayName,
  iso6393,
  bcp47,
  country,
  tts: {
    primaryProvider: null,
    modelId,
    backendIntegration: null,
    status: "unavailable",
    commercialUseAllowed: false,
    nativeValidated: false,
    allowBrowserFallback: true,
  },
  uiNotice: "⚫ Modèle MMS sous licence CC-BY-NC 4.0; non activé pour ce service.",
});

export const LANGUAGE_VOICE_CONFIG = {
  // ╔════════════════════════════════════════════════════════════════╗
  // ║ LANGUES GUINÉENNES — MMS via Coqui (CC-BY-NC → Coqui wrapper) ║
  // ╚════════════════════════════════════════════════════════════════╝

  sus: createRestrictedMmsProfile("Soussou", "sus", "sus-GN", "Guinea (Préfecture de Kindia)", "facebook/mms-tts-sus"),

  mnk: createRestrictedMmsProfile("Malinké / Mandinka", "mnk", "mnk-GN", "Guinea (Préfecture de Kindia, Mamou)", "facebook/mms-tts-mnk"),

  bam: createRestrictedMmsProfile("Bambara / Bamanankan", "bam", "bam-ML", "Mali (connecté Guinée)", "facebook/mms-tts-bam"),

  kss: createRestrictedMmsProfile("Kissi du Sud", "kss", "kss-GN", "Guinea (Sud-Est)", "facebook/mms-tts-kss"),

  kek: createRestrictedMmsProfile("Q’eqchi’", "kek", "kek-GT", "Guatemala", "facebook/mms-tts-kek"),

  yal: createRestrictedMmsProfile("Yalunka", "yal", "yal-GN", "Guinea (Préfecture de Mamou)", "facebook/mms-tts-yal"),

  kno: createRestrictedMmsProfile("Kono", "kno", "kno-SL", "Sierra Leone (connexion Guinée)", "facebook/mms-tts-kno"),

  mev: createRestrictedMmsProfile("Mano / Maan", "mev", "mev-GN", "Guinea/Liberia", "facebook/mms-tts-mev"),

  tom: createRestrictedMmsProfile("Tombulu", "tom", "tom-ID", "Indonesia (North Sulawesi)", "facebook/mms-tts-tom"),

  mos: createRestrictedMmsProfile("Mooré", "mos", "mos-BF", "Burkina Faso", "facebook/mms-tts-mos"),

  // ╔════════════════════════════════════════════════════════════════╗
  // ║ LANGUES GUINÉENNES — PAS DE MODÈLE TTS OUVERT TROUVÉ          ║
  // ║ Fallback: gTTS (suboptimal) + Web Speech API                  ║
  // ╚════════════════════════════════════════════════════════════════╝

  ff: createUnavailableProfile("Fulfulde", "ff", "ff-GN", "Guinea"),

  pul: createUnavailableProfile("Pular", "pul", "pul-GN", "Guinea/Sénégal"),

  fuc: createUnavailableProfile("Fulfulde (Maaco)", "fuc", "fuc-GN", "Guinea"),

  gxx: {
    displayName: "Guerze",
    iso6393: "gxx",
    bcp47: "gxx-GN",
    country: "Guinea (Ouest)",
    tts: {
      primaryProvider: null,
      modelId: null,
      backendIntegration: null,
      status: "unavailable",
      commercialUseAllowed: null,
      nativeValidated: false,
      allowBrowserFallback: true
    },
    uiNotice: "⚫ Audio non disponible. Prononciation via voix navigateur si supportée."
  },

  kxp: {
    displayName: "Koniagui",
    iso6393: "kxp",
    bcp47: "kxp-GN",
    country: "Guinea (Nord-Ouest)",
    tts: {
      primaryProvider: null,
      modelId: null,
      backendIntegration: null,
      status: "unavailable",
      commercialUseAllowed: null,
      nativeValidated: false,
      allowBrowserFallback: true
    },
    uiNotice: "⚫ Audio non disponible. Prononciation via voix navigateur si supportée."
  },

  ldu: {
    displayName: "Landuma",
    iso6393: "ldu",
    bcp47: "ldu-GN",
    country: "Guinea (Côte)",
    tts: {
      primaryProvider: null,
      modelId: null,
      backendIntegration: null,
      status: "unavailable",
      commercialUseAllowed: null,
      nativeValidated: false,
      allowBrowserFallback: true
    },
    uiNotice: "⚫ Audio non disponible."
  },

  lle: {
    displayName: "Lélé",
    iso6393: "lle",
    bcp47: "lle-GN",
    country: "Guinea",
    tts: {
      primaryProvider: null,
      modelId: null,
      backendIntegration: null,
      status: "unavailable",
      commercialUseAllowed: null,
      nativeValidated: false,
      allowBrowserFallback: true
    },
    uiNotice: "⚫ Audio non disponible."
  },

  mni: {
    displayName: "Mani",
    iso6393: "mni",
    bcp47: "mni-GN",
    country: "Guinea",
    tts: {
      primaryProvider: null,
      modelId: null,
      backendIntegration: null,
      status: "unavailable",
      commercialUseAllowed: null,
      nativeValidated: false,
      allowBrowserFallback: true
    },
    uiNotice: "⚫ Audio non disponible."
  },

  nlu: createUnavailableProfile("Nalu", "nlu", "nlu-GN", "Guinea"),

  snk: {
    displayName: "Sankaran",
    iso6393: "snk",
    bcp47: "snk-GN",
    country: "Guinea",
    tts: {
      primaryProvider: null,
      modelId: null,
      backendIntegration: null,
      status: "unavailable",
      commercialUseAllowed: null,
      nativeValidated: false,
      allowBrowserFallback: true
    },
    uiNotice: "⚫ Audio non disponible."
  },

  bsc: {
    displayName: "Badiaranke",
    iso6393: "bsc",
    bcp47: "bsc-GN",
    country: "Guinea",
    tts: {
      primaryProvider: null,
      modelId: null,
      backendIntegration: null,
      status: "unavailable",
      commercialUseAllowed: null,
      nativeValidated: false,
      allowBrowserFallback: true
    },
    uiNotice: "⚫ Audio non disponible."
  },

  bgo: {
    displayName: "Baga",
    iso6393: "bgo",
    bcp47: "bgo-GN",
    country: "Guinea (Côte)",
    tts: {
      primaryProvider: null,
      modelId: null,
      backendIntegration: null,
      status: "unavailable",
      commercialUseAllowed: null,
      nativeValidated: false,
      allowBrowserFallback: true
    },
    uiNotice: "⚫ Audio non disponible."
  },

  bsq: {
    displayName: "Bassari",
    iso6393: "bsq",
    bcp47: "bsq-GN",
    country: "Guinea",
    tts: {
      primaryProvider: null,
      modelId: null,
      backendIntegration: null,
      status: "unavailable",
      commercialUseAllowed: null,
      nativeValidated: false,
      allowBrowserFallback: true
    },
    uiNotice: "⚫ Audio non disponible."
  },

  bif: {
    displayName: "Bédik",
    iso6393: "bif",
    bcp47: "bif-GN",
    country: "Guinea",
    tts: {
      primaryProvider: null,
      modelId: null,
      backendIntegration: null,
      status: "unavailable",
      commercialUseAllowed: null,
      nativeValidated: false,
      allowBrowserFallback: true
    },
    uiNotice: "⚫ Audio non disponible."
  },

  kpe: {
    displayName: "Kpèlè",
    iso6393: "kpe",
    bcp47: "kpe-LR",
    country: "Liberia (connexion Guinée)",
    tts: {
      primaryProvider: null,
      modelId: null,
      backendIntegration: null,
      status: "unavailable",
      commercialUseAllowed: null,
      nativeValidated: false,
      allowBrowserFallback: true
    },
    uiNotice: "⚫ Audio non disponible."
  },

  bib: createUnavailableProfile("Bissa", "bib", "bib-BF", "Burkina Faso"),
  dyu: createUnavailableProfile("Dioula / Jula", "dyu", "dyu-BF", "Burkina Faso / Côte d'Ivoire"),
  lin: createUnavailableProfile("Lingala", "lin", "lin-CD", "Congo / RDC"),
  konyanka: createUnavailableProfile("Konyanka", null, null, "Guinea / Côte d'Ivoire"),
  kuranko: createUnavailableProfile("Kuranko", null, null, "Guinea / Sierra Leone"),
  toma: createUnavailableProfile("Toma", null, null, "Guinea / Liberia"),

  // ╔════════════════════════════════════════════════════════════════╗
  // ║ LANGUES RÉGIONALES CONNECTÉES — MMS via Coqui                ║
  // ╚════════════════════════════════════════════════════════════════╝

  wol: createUnavailableProfile("Wolof", "wol", "wo-SN", "Sénégal"),

  // ╔════════════════════════════════════════════════════════════════╗
  // ║ LANGUES MAJEURES — VALIDÉES                                   ║
  // ╚════════════════════════════════════════════════════════════════╝

  fra: {
    ...createGttsProfile("Français", "fra", "fr-FR", "France / Afrique Francophone"),
  },

  eng: {
    ...createGttsProfile("English", "eng", "en-US", "International"),
  },

  spa: {
    ...createGttsProfile("Español", "spa", "es-ES", "Spain / Spanish-speaking world"),
  },

  ara: {
    ...createGttsProfile("العربية (Arabe)", "ara", "ar-SA", "Arab regions"),
  },

  por: {
    ...createGttsProfile("Português", "por", "pt-BR", "Brazil / Portugal"),
  },

  deu: createGttsProfile("Deutsch", "deu", "de-DE", "Germany"),
  ita: createGttsProfile("Italiano", "ita", "it-IT", "Italy"),
  rus: createGttsProfile("Русский", "rus", "ru-RU", "Russia"),
  hin: createGttsProfile("हिन्दी", "hin", "hi-IN", "India"),
  zho: createGttsProfile("中文", "zho", "zh-CN", "China"),
  jpn: createGttsProfile("日本語", "jpn", "ja-JP", "Japan"),

  // ╔════════════════════════════════════════════════════════════════╗
  // ║ LANGUES AFRICAINES — FUTURES EXPANSIONS (pas dans app encore) ║
  // ╚════════════════════════════════════════════════════════════════╝

  yor: createUnavailableProfile("Yorùbá", "yor", "yo-NG", "Nigeria"),

  igb: createUnavailableProfile("Igbo", "igb", "ig-NG", "Nigeria"),

  hau: createGttsProfile("Hausa", "hau", "ha-NG", "Nigeria"),

  swa: createGttsProfile("Kiswahili", "swa", "sw-KE", "Kenya / East Africa"),
};

/**
 * Utilitaires pour requêtes
 */

export function getLanguageConfig(languageCode) {
  const normalized = normalizeLanguageCode(languageCode || "");
  return LANGUAGE_VOICE_CONFIG[normalized] || null;
}

export function normalizeLanguageCode(code) {
  if (!code) return "";
  const lower = String(code).trim().toLowerCase();
  const aliases = {
    fr: "fra",
    francais: "fra",
    french: "fra",
    français: "fra",
    en: "eng",
    anglais: "eng",
    english: "eng",
    es: "spa",
    espagnol: "spa",
    spanish: "spa",
    de: "deu",
    allemand: "deu",
    german: "deu",
    ar: "ara",
    arabe: "ara",
    arabic: "ara",
    pt: "por",
    portugais: "por",
    portuguese: "por",
    it: "ita",
    italien: "ita",
    italian: "ita",
    ja: "jpn",
    japonais: "jpn",
    japanese: "jpn",
    ru: "rus",
    russe: "rus",
    russian: "rus",
    hi: "hin",
    hindi: "hin",
    zh: "zho",
    zho: "zho",
    chinois: "zho",
    "chinois-mandarin": "zho",
    mandarin: "zho",
    chinese: "zho",
    swahili: "swa",
    kiswahili: "swa",
    hausa: "hau",
    badiaranke: "bsc",
    baga: "bgo",
    bassari: "bsq",
    bedik: "bif",
    bissa: "bib",
    dioula: "dyu",
    guerze: "gxx",
    igbo: "igb",
    koniagui: "kxp",
    kono: "kno",
    konyanka: "konyanka",
    kuranko: "kuranko",
    landuma: "ldu",
    lele: "lle",
    lingala: "lin",
    malinke: "mnk",
    mani: "mni",
    mano: "mev",
    moore: "mos",
    nalu: "nlu",
    pular: "pul",
    peul: "ff",
    fulfulde: "ff",
    sankaran: "snk",
    soussou: "sus",
    toma: "toma",
    yalunka: "yal",
    yoruba: "yor",
    wolof: "wol",
  };
  if (aliases[lower]) return aliases[lower];
  // Essayer match exact d'abord
  if (LANGUAGE_VOICE_CONFIG[lower]) return lower;
  // Essayer 2-letter code
  const twoLetter = lower.split("-")[0];
  return LANGUAGE_VOICE_CONFIG[twoLetter] ? twoLetter : lower;
}

export function isExperimentalSynthesis(languageCode) {
  const config = getLanguageConfig(languageCode);
  return config?.tts?.status === "experimental";
}

export function isFallbackOnly(languageCode) {
  const config = getLanguageConfig(languageCode);
  return config?.tts?.status === "fallback-only";
}

export function isUnavailable(languageCode) {
  const config = getLanguageConfig(languageCode);
  return config?.tts?.status === "unavailable";
}

export function isValidated(languageCode) {
  const config = getLanguageConfig(languageCode);
  return config?.tts?.status === "validated";
}

export function getTtsProvider(languageCode) {
  const config = getLanguageConfig(languageCode);
  return config?.tts?.backendIntegration || null;
}

export function getUiNotice(languageCode) {
  const config = getLanguageConfig(languageCode);
  return config?.uiNotice || null;
}

export function getAllLanguages() {
  return Object.entries(LANGUAGE_VOICE_CONFIG).map(([code, config]) => ({
    code,
    ...config,
  }));
}

export function getLanguagesByStatus(status) {
  return getAllLanguages().filter((lang) => lang.tts.status === status);
}

/**
 * Retourne un audit complet du support TTS par statut
 */
export function getTtsAudit() {
  const all = getAllLanguages();
  const statuses = ["validated", "experimental", "fallback-only", "unavailable"];
  const audit = {};
  
  for (const status of statuses) {
    audit[status] = all
      .filter((lang) => lang.tts.status === status)
      .map((lang) => ({
        code: lang.code,
        displayName: lang.displayName,
        provider: lang.tts.backendIntegration,
        notice: lang.uiNotice,
      }));
  }
  
  return audit;
}

/**
 * Export constants pour routing
 */
export const EXPERIMENTAL_LANGUAGES = getLanguagesByStatus("experimental");
export const VALIDATED_LANGUAGES = getLanguagesByStatus("validated");
export const FALLBACK_LANGUAGES = getLanguagesByStatus("fallback-only");
export const UNAVAILABLE_LANGUAGES = getLanguagesByStatus("unavailable");
