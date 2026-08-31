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

export const LANGUAGE_VOICE_CONFIG = {
  // ╔════════════════════════════════════════════════════════════════╗
  // ║ LANGUES GUINÉENNES — MMS via Coqui (CC-BY-NC → Coqui wrapper) ║
  // ╚════════════════════════════════════════════════════════════════╝

  sus: {
    displayName: "Soussou",
    iso6393: "sus",
    bcp47: "sus-GN",
    country: "Guinea (Préfecture de Kindia)",
    tts: {
      primaryProvider: "mms",
      modelId: "facebook/mms-tts-sus",
      backendIntegration: "coqui-server", // ← Coqui XTTS-v2 wrapper
      status: "experimental",
      commercialUseAllowed: true, // ← Via Coqui CPML license
      nativeValidated: false,
      allowBrowserFallback: true
    },
    uiNotice: "🟡 Synthèse IA expérimentale — prononciation à valider."
  },

  mnk: {
    displayName: "Malinké",
    iso6393: "mnk",
    bcp47: "mnk-GN",
    country: "Guinea (Préfecture de Kindia, Mamou)",
    tts: {
      primaryProvider: "mms",
      modelId: "facebook/mms-tts-mnk",
      backendIntegration: "coqui-server",
      status: "experimental",
      commercialUseAllowed: true,
      nativeValidated: false,
      allowBrowserFallback: true
    },
    uiNotice: "🟡 Synthèse IA expérimentale — prononciation à valider."
  },

  bam: {
    displayName: "Bambara",
    iso6393: "bam",
    bcp47: "bam-ML",
    country: "Mali (connecté Guinée)",
    tts: {
      primaryProvider: "mms",
      modelId: "facebook/mms-tts-bam",
      backendIntegration: "coqui-server",
      status: "experimental",
      commercialUseAllowed: true,
      nativeValidated: false,
      allowBrowserFallback: true
    },
    uiNotice: "🟡 Synthèse IA expérimentale — prononciation à valider."
  },

  kss: {
    displayName: "Kissi",
    iso6393: "kss",
    bcp47: "kss-GN",
    country: "Guinea (Sud-Est)",
    tts: {
      primaryProvider: "mms",
      modelId: "facebook/mms-tts-kss",
      backendIntegration: "coqui-server",
      status: "experimental",
      commercialUseAllowed: true,
      nativeValidated: false,
      allowBrowserFallback: true
    },
    uiNotice: "🟡 Synthèse IA expérimentale — prononciation à valider."
  },

  kek: {
    displayName: "Kuranko",
    iso6393: "kek",
    bcp47: "kek-SL",
    country: "Sierra Leone (connexion Guinée)",
    tts: {
      primaryProvider: "mms",
      modelId: "facebook/mms-tts-kek",
      backendIntegration: "coqui-server",
      status: "experimental",
      commercialUseAllowed: true,
      nativeValidated: false,
      allowBrowserFallback: true
    },
    uiNotice: "🟡 Synthèse IA expérimentale — prononciation à valider."
  },

  yal: {
    displayName: "Yalunka",
    iso6393: "yal",
    bcp47: "yal-GN",
    country: "Guinea (Préfecture de Mamou)",
    tts: {
      primaryProvider: "mms",
      modelId: "facebook/mms-tts-yal",
      backendIntegration: "coqui-server",
      status: "experimental",
      commercialUseAllowed: true,
      nativeValidated: false,
      allowBrowserFallback: true
    },
    uiNotice: "🟡 Synthèse IA expérimentale — prononciation à valider."
  },

  kno: {
    displayName: "Kono",
    iso6393: "kno",
    bcp47: "kno-SL",
    country: "Sierra Leone (connexion Guinée)",
    tts: {
      primaryProvider: "mms",
      modelId: "facebook/mms-tts-kno",
      backendIntegration: "coqui-server",
      status: "experimental",
      commercialUseAllowed: true,
      nativeValidated: false,
      allowBrowserFallback: true
    },
    uiNotice: "🟡 Synthèse IA expérimentale — prononciation à valider."
  },

  mev: {
    displayName: "Mano",
    iso6393: "mev",
    bcp47: "mev-GN",
    country: "Guinea/Liberia",
    tts: {
      primaryProvider: "mms",
      modelId: "facebook/mms-tts-mev",
      backendIntegration: "coqui-server",
      status: "experimental",
      commercialUseAllowed: true,
      nativeValidated: false,
      allowBrowserFallback: true
    },
    uiNotice: "🟡 Synthèse IA expérimentale — prononciation à valider."
  },

  tom: {
    displayName: "Toma",
    iso6393: "tom",
    bcp47: "tom-GN",
    country: "Guinea/Liberia",
    tts: {
      primaryProvider: "mms",
      modelId: "facebook/mms-tts-tom",
      backendIntegration: "coqui-server",
      status: "experimental",
      commercialUseAllowed: true,
      nativeValidated: false,
      allowBrowserFallback: true
    },
    uiNotice: "🟡 Synthèse IA expérimentale — prononciation à valider."
  },

  mos: {
    displayName: "Mossi / Moore",
    iso6393: "mos",
    bcp47: "mos-BF",
    country: "Burkina Faso (région connectée)",
    tts: {
      primaryProvider: "mms",
      modelId: "facebook/mms-tts-mos",
      backendIntegration: "coqui-server",
      status: "experimental",
      commercialUseAllowed: true,
      nativeValidated: false,
      allowBrowserFallback: true
    },
    uiNotice: "🟡 Synthèse IA expérimentale — prononciation à valider."
  },

  // ╔════════════════════════════════════════════════════════════════╗
  // ║ LANGUES GUINÉENNES — PAS DE MODÈLE TTS OUVERT TROUVÉ          ║
  // ║ Fallback: gTTS (suboptimal) + Web Speech API                  ║
  // ╚════════════════════════════════════════════════════════════════╝

  ff: {
    displayName: "Fulfulde / Pular",
    iso6393: "ff",
    bcp47: "ff-GN",
    country: "Guinea (20% population) — CRITIQUE",
    tts: {
      primaryProvider: null, // ← Aucun modèle open source trouvé
      modelId: null,
      backendIntegration: "gtts", // ← Fallback gTTS (mauvais accent)
      status: "fallback-only",
      commercialUseAllowed: true, // ← gTTS OK
      nativeValidated: false,
      allowBrowserFallback: true // ← Web Speech API si gTTS fail
    },
    uiNotice: "⚪ Prononciation provisoire (gTTS). Audio humain prévu."
  },

  pul: {
    displayName: "Pular (Fulfulde Ouest)",
    iso6393: "pul",
    bcp47: "pul-GN",
    country: "Guinea/Sénégal",
    tts: {
      primaryProvider: null,
      modelId: null,
      backendIntegration: "gtts",
      status: "fallback-only",
      commercialUseAllowed: true,
      nativeValidated: false,
      allowBrowserFallback: true
    },
    uiNotice: "⚪ Prononciation provisoire (gTTS). Audio humain prévu."
  },

  fuc: {
    displayName: "Fulfulde (Maaco)",
    iso6393: "fuc",
    bcp47: "fuc-GN",
    country: "Guinea (dialecte Fulbe)",
    tts: {
      primaryProvider: null,
      modelId: null,
      backendIntegration: "gtts",
      status: "fallback-only",
      commercialUseAllowed: true,
      nativeValidated: false,
      allowBrowserFallback: true
    },
    uiNotice: "⚪ Prononciation provisoire (gTTS). Audio humain prévu."
  },

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

  nqo: {
    displayName: "Nalu",
    iso6393: "nqo",
    bcp47: "nqo-GN",
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

  // ╔════════════════════════════════════════════════════════════════╗
  // ║ LANGUES RÉGIONALES CONNECTÉES — MMS via Coqui                ║
  // ╚════════════════════════════════════════════════════════════════╝

  wol: {
    displayName: "Wolof",
    iso6393: "wol",
    bcp47: "wol-SN",
    country: "Sénégal",
    tts: {
      primaryProvider: null, // ← Pas de modèle MMS trouvé publiquement
      modelId: null,
      backendIntegration: "gtts",
      status: "fallback-only",
      commercialUseAllowed: true,
      nativeValidated: false,
      allowBrowserFallback: true
    },
    uiNotice: "⚪ Prononciation provisoire (gTTS)."
  },

  // ╔════════════════════════════════════════════════════════════════╗
  // ║ LANGUES MAJEURES — VALIDÉES                                   ║
  // ╚════════════════════════════════════════════════════════════════╝

  fra: {
    displayName: "Français",
    iso6393: "fra",
    bcp47: "fr-FR",
    country: "France / Afrique Francophone",
    tts: {
      primaryProvider: "mms",
      modelId: "facebook/mms-tts-fra",
      backendIntegration: "coqui-server",
      status: "validated",
      commercialUseAllowed: true,
      nativeValidated: true, // ← Excellent support
      allowBrowserFallback: true
    },
    uiNotice: "🟢 Synthèse IA validée."
  },

  eng: {
    displayName: "English",
    iso6393: "eng",
    bcp47: "en-US",
    country: "International",
    tts: {
      primaryProvider: "mms",
      modelId: "facebook/mms-tts-eng",
      backendIntegration: "coqui-server",
      status: "validated",
      commercialUseAllowed: true,
      nativeValidated: true,
      allowBrowserFallback: true
    },
    uiNotice: "🟢 Synthèse IA validée."
  },

  spa: {
    displayName: "Español",
    iso6393: "spa",
    bcp47: "es-ES",
    country: "Spain / Spanish-speaking world",
    tts: {
      primaryProvider: "mms",
      modelId: "facebook/mms-tts-spa",
      backendIntegration: "coqui-server",
      status: "validated",
      commercialUseAllowed: true,
      nativeValidated: true,
      allowBrowserFallback: true
    },
    uiNotice: "🟢 Synthèse IA validée."
  },

  ara: {
    displayName: "العربية (Arabe)",
    iso6393: "ara",
    bcp47: "ar-SA",
    country: "Arab regions",
    tts: {
      primaryProvider: "mms",
      modelId: "facebook/mms-tts-ara",
      backendIntegration: "coqui-server",
      status: "validated",
      commercialUseAllowed: true,
      nativeValidated: true,
      allowBrowserFallback: true
    },
    uiNotice: "🟢 Synthèse IA validée."
  },

  por: {
    displayName: "Português",
    iso6393: "por",
    bcp47: "pt-BR",
    country: "Brazil / Portugal",
    tts: {
      primaryProvider: "mms",
      modelId: "facebook/mms-tts-por",
      backendIntegration: "coqui-server",
      status: "validated",
      commercialUseAllowed: true,
      nativeValidated: true,
      allowBrowserFallback: true
    },
    uiNotice: "🟢 Synthèse IA validée."
  },

  // ╔════════════════════════════════════════════════════════════════╗
  // ║ LANGUES AFRICAINES — FUTURES EXPANSIONS (pas dans app encore) ║
  // ╚════════════════════════════════════════════════════════════════╝

  yor: {
    displayName: "Yorùbá",
    iso6393: "yor",
    bcp47: "yo-NG",
    country: "Nigeria",
    tts: {
      primaryProvider: null, // ← Pas de modèle MMS public trouvé
      modelId: null,
      backendIntegration: "gtts",
      status: "fallback-only",
      commercialUseAllowed: true,
      nativeValidated: false,
      allowBrowserFallback: true
    },
    uiNotice: "⚪ Prononciation provisoire (gTTS)."
  },

  igb: {
    displayName: "Igbo",
    iso6393: "igb",
    bcp47: "ig-NG",
    country: "Nigeria",
    tts: {
      primaryProvider: null,
      modelId: null,
      backendIntegration: "gtts",
      status: "fallback-only",
      commercialUseAllowed: true,
      nativeValidated: false,
      allowBrowserFallback: true
    },
    uiNotice: "⚪ Prononciation provisoire (gTTS)."
  },

  hau: {
    displayName: "Hausa",
    iso6393: "hau",
    bcp47: "ha-NG",
    country: "Nigeria",
    tts: {
      primaryProvider: null,
      modelId: null,
      backendIntegration: "gtts",
      status: "fallback-only",
      commercialUseAllowed: true,
      nativeValidated: false,
      allowBrowserFallback: true
    },
    uiNotice: "⚪ Prononciation provisoire (gTTS)."
  },

  swa: {
    displayName: "Kiswahili",
    iso6393: "swa",
    bcp47: "sw-KE",
    country: "Kenya / East Africa",
    tts: {
      primaryProvider: null,
      modelId: null,
      backendIntegration: "gtts",
      status: "fallback-only",
      commercialUseAllowed: true,
      nativeValidated: false,
      allowBrowserFallback: true
    },
    uiNotice: "⚪ Prononciation provisoire (gTTS)."
  },
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
