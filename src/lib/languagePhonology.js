// Profils phonologiques et adaptation accent/prononciation par langue
import { getCountryForLanguage } from "@/lib/localLanguageData";

// Mapping BCP-47 pour TTS/STT (avec fallback français)
const TTS_LOCALES = {
  fr: "fr-FR", fra: "fr-FR", french: "fr-FR",
  en: "en-US", eng: "en-US", english: "en-US",
  es: "es-ES", spa: "es-ES", spanish: "es-ES",
  de: "de-DE", deu: "de-DE", german: "de-DE",
  ar: "ar-SA", ara: "ar-SA", arabic: "ar-SA",
  pt: "pt-BR", por: "pt-BR", portuguese: "pt-BR",
  sw: "sw-KE", swa: "sw-KE", swahili: "sw-KE",
  am: "am-ET", amh: "am-ET", amharic: "am-ET",
  ha: "ha-NG", hau: "ha-NG", hausa: "ha-NG",
  yo: "yo-NG", yor: "yo-NG", yoruba: "yo-NG",
  ig: "ig-NG", igb: "ig-NG", igbo: "ig-NG",
  it: "it-IT", ita: "it-IT", italian: "it-IT",
  zh: "zh-CN", zho: "zh-CN", chinese: "zh-CN",
  ja: "ja-JP", jpn: "ja-JP", japanese: "ja-JP",
  ru: "ru-RU", rus: "ru-RU", russian: "ru-RU",
  nl: "nl-NL", nld: "nl-NL", dutch: "nl-NL",
  hi: "hi-IN", hin: "hi-IN", hindi: "hi-IN",
  chinois: "zh-CN", "chinois-mandarin": "zh-CN", mandarin: "zh-CN",
  francais: "fr-FR", portugais: "pt-BR", allemand: "de-DE", anglais: "en-US",
  arabe: "ar-SA", espagnol: "es-ES", italien: "it-IT", japonais: "ja-JP", russe: "ru-RU",
  bambara: "fr-FR", dioula: "fr-FR", bissa: "fr-FR", moore: "fr-FR",
  mossi: "fr-FR", soussou: "fr-FR", pular: "fr-FR", peul: "fr-FR", fulfulde: "fr-FR",
  kissi: "fr-FR", guerze: "fr-FR", koniagui: "fr-FR", konyanka: "fr-FR", kuranko: "fr-FR",
  landuma: "fr-FR", lele: "fr-FR", mani: "fr-FR", nalu: "fr-FR", sankaran: "fr-FR",
  yalunka: "fr-FR", kono: "fr-FR", mano: "fr-FR", toma: "fr-FR", badiaranke: "fr-FR",
  baga: "fr-FR", bassari: "fr-FR", bedik: "fr-FR", lingala: "fr-FR", wolof: "fr-FR",
  malinke: "fr-FR", "chinese": "zh-CN", "mandarin": "zh-CN",
  "swahili": "sw-KE", "arabe": "ar-SA", "anglais": "en-US", "francais": "fr-FR",
  "espagnol": "es-ES", "allemand": "de-DE", "italien": "it-IT",
  "japonais": "ja-JP", "portugais": "pt-BR", "russe": "ru-RU",
  "hindi": "hi-IN", "yoruba": "yo-NG", "igbo": "ig-NG", "hausa": "ha-NG",
  "swahili": "sw-KE", "lingala": "fr-FR", "bissa": "fr-FR", "moore": "fr-FR",
  "dioula": "fr-FR", "soussou": "fr-FR", "pular": "fr-FR", "malinke": "fr-FR",
  "kissi": "fr-FR", "guerze": "fr-FR", "konyanka": "fr-FR", "kuranko": "fr-FR",
  "landauma": "fr-FR", "landuma": "fr-FR", "lele": "fr-FR", "mani": "fr-FR",
  "nalu": "fr-FR", "sankaran": "fr-FR", "yalunka": "fr-FR", "kono": "fr-FR",
  "mano": "fr-FR", "toma": "fr-FR", "badiaranke": "fr-FR", "baga": "fr-FR",
  "bassari": "fr-FR", "bedik": "fr-FR", "koniagui": "fr-FR",
};

const PROFILE_ALIASES = {
  soussou: "sus",
  malinke: "mnk",
  bambara: "bam",
  dioula: "bam",
  bissa: "bam",
  moore: "hau",
  mossi: "hau",
  pular: "fuc",
  peul: "fuc",
  fulfulde: "fuc",
  swahili: "swa",
  lingala: "lin",
  francais: "fra",
  anglais: "eng",
  arabe: "ara",
  espagnol: "es",
  allemand: "de",
  italien: "it",
  japonais: "ja",
  russe: "ru",
  yoruba: "yor",
  igbo: "igb",
};

// Profils phonologiques détaillés
const PROFILES = {
  wol: {
    name: "Wolof",
    family: "Niger-Congo (Atlantique Nord)",
    tones: "non tonal",
    consonants: [
      "Implosives /ɓ/ /ɗ/ — prononcées avec un léger influx d'air",
      "Préglottalisées /ʔb/ /ʔd/ /ʔj/ /ʔw/ — avec coup de glotte",
      "Consonnes tendues (géminées) en intervocalique : bb, dd, gg, jj, qq, tt",
      "/x/ — fricative vélaire sourde (proche du 'j' espagnol)",
      "/q/ — occlusive uvulaire sourde (plus arrière que /k/)",
      "/ɲ/ — nasale palatale (comme 'gn' français)",
      "/ŋ/ — nasale vélaire (comme 'ng' anglais)",
    ],
    vowels: "7 voyelles orales : a, e, ɛ (é), ə (ë), i, o, ɔ (ó), u — distinction long/court",
    accent: "Sénégal — intonation chantante, montante en fin de phrase. Articulation tendue des consonnes géminées.",
    pitfalls: [
      "Confondre /e/ (fermé) et /ɛ/ (ouvert)",
      "Oublier la tension des consonnes géminées (bax vs baxx)",
      "Confondre /x/ (fricative) et /k/ (occlusive)",
      "Ne pas réaliser l'implosion de /ɓ/ /ɗ/",
    ],
  },
  sus: {
    name: "Soussou",
    family: "Niger-Congo (Mande)",
    tones: "non tonal (intonation distinctive)",
    consonants: [
      "Implosives /ɓ/ /ɗ/ — avec influx d'air",
      "/ɲ/ — nasale palatale (gn)",
      "/ŋ/ — nasale vélaire",
      "/y/ — semi-voyelle très fréquente",
      "Absence de /p/ dans les mots natifs (remplacé par /f/)",
    ],
    vowels: "7 voyelles : a, e, ɛ, i, o, ɔ, u — avec opposition orale/nasale",
    accent: "Guinée — articulation douce et fluide, rythme syllabique régulier, intonation descendante en fin d'énoncé.",
    pitfalls: [
      "Confondre /e/ et /ɛ/",
      "Confondre /o/ et /ɔ/",
      "Mal percevoir les voyelles nasales",
      "Oublier l'implosion de /ɓ/ /ɗ/",
    ],
  },
  mnk: {
    name: "Malinké / Mandinka",
    family: "Niger-Congo (Mande)",
    tones: "tonal (3 niveaux : haut, bas, modulé)",
    consonants: [
      "Implosives /ɓ/ /ɗ/",
      "/ɲ/ — nasale palatale",
      "/ŋ/ — nasale vélaire",
      "Absence de /p/ /v/ /z/ dans les mots natifs",
      "/h/ — fricative glottale",
    ],
    vowels: "7 voyelles : a, e, ɛ, i, o, ɔ, u + voyelles nasales (an, ɛn, in, ɔn, un)",
    accent: "Guinée/Mali — tons essentiels au sens. Rythme régulier, syllabes isochrones. Les tons montent et descendent comme une mélodie.",
    pitfalls: [
      "Négliger les tons (changent le sens des mots)",
      "Confondre voyelles fermées /e/ /o/ et ouvertes /ɛ/ /ɔ/",
      "Oublier l'implosion de /ɓ/ /ɗ/",
      "Confondre /ŋ/ et /n/",
    ],
  },
  bam: {
    name: "Bambara",
    family: "Niger-Congo (Mande)",
    tones: "tonal (haut, bas, modulé)",
    consonants: [
      "Implosives /ɓ/ /ɗ/",
      "/ɲ/ — nasale palatale (ny)",
      "/ŋ/ — nasale vélaire (ng)",
      "/j/ — semi-voyelle (y)",
      "Consonnes géminées : mm, nn, ll",
    ],
    vowels: "7 voyelles : a, e, ɛ, i, o, ɔ, u + nasales",
    accent: "Mali — tons importants. Articulation claire, débit modéré. Le bambara est très lié au malinké.",
    pitfalls: [
      "Négliger les tons",
      "Confondre /e/ et /ɛ/",
      "Oublier la gémination des consonnes",
    ],
  },
  yor: {
    name: "Yoruba",
    family: "Niger-Congo (Benue-Congo)",
    tones: "tonal (3 tons : haut ′, bas `, modulé ̄)",
    consonants: [
      "/kp/ — occlusive labio-vélaire sourde (p + k simultanés)",
      "/gb/ — occlusive labio-vélaire voisée (b + g simultanés)",
      "/ʃ/ — fricative palato-alvéolaire (orthographié ṣ)",
      "/f/ /s/ /h/ — fricatives",
      "/j/ — semi-voyelle (y)",
    ],
    vowels: "7 voyelles orales (a, e, ɛ, i, o, ɔ, u) + 5 nasales (an, ɛn, in, ɔn, un)",
    accent: "Nigeria/Bénin — tons essentiels au sens. Les voyelles nasales sont marquées par un 'n' final. Intonation mélodique.",
    pitfalls: [
      "Confondre les 3 tons (haut/bas/modulé) — changent le sens",
      "Confondre /kp/ et /p/",
      "Confondre /gb/ et /b/",
      "Oublier les voyelles nasales",
      "Confondre /s/ et /ṣ/ (ʃ)",
    ],
  },
  hau: {
    name: "Hausa",
    family: "Afro-asiatique (Tchadique)",
    tones: "tonal (haut, bas, modulé)",
    consonants: [
      "Éjectives /kʼ/ /sʼ/ /tʼ/ — prononcées avec coup de glotte",
      "Implosives /ɓ/ /ɗ/",
      "/ɓ/ — implosive bilabiale",
      "/j/ — approximante palatale (y)",
      "/ƙ/ /ʃ/ /ts/ — sons spécifiques",
    ],
    vowels: "5 voyelles : a, e, i, o, u + longues et nasales",
    accent: "Nigeria/Niger — tons importants. Présence d'éjectives uniques. Articulation énergique.",
    pitfalls: [
      "Confondre les tons",
      "Mal réaliser les éjectives /kʼ/ /sʼ/ /tʼ/",
      "Confondre /ɓ/ et /b/",
      "Oublier la distinction voyelles longues/courtes",
    ],
  },
  fuc: {
    name: "Peul / Fulfulde / Pulaar",
    family: "Niger-Congo (Atlantique)",
    tones: "non tonal (mais intonation distinctive)",
    consonants: [
      "Implosives /ɓ/ /ɗ/",
      "Préglottalisées /ʔb/ /ʔd/ /ʔj/ /ʔw/",
      "/ɲ/ — nasale palatale",
      "/ŋ/ — nasale vélaire",
      "Consonnes géminées tendues",
    ],
    vowels: "5 voyelles courtes + 5 longues : a/aa, e/ee, i/ii, o/oo, u/uu",
    accent: "Sahel (Guinée, Mali, Sénégal, Niger) — articulation précise, distinction stricte long/court. Intonation douce.",
    pitfalls: [
      "Confondre voyelles courtes et longues (changent le sens)",
      "Oublier l'implosion de /ɓ/ /ɗ/",
      "Confondre /ʔb/ et /b/",
    ],
  },
  swa: {
    name: "Swahili",
    family: "Niger-Congo (Bantou)",
    tones: "non tonal (accent d'intensité)",
    consonants: [
      "/ɓ/ — implosive bilabiale (orthographié b)",
      "/ɗ/ — implosive dentale (orthographié d)",
      "/ɡ/ — occlusive vélaire (orthographié g)",
      "/ʃ/ — fricative (sh)",
      "/tʃ/ — affriquée (ch)",
      "/ɲ/ — nasale palatale (ny)",
      "/ŋ/ — nasale vélaire (ng')",
    ],
    vowels: "5 voyelles : a, e, i, o, u — toujours claires, jamais nasales",
    accent: "Afrique de l'Est (Kenya, Tanzanie) — accent sur l'avant-dernière syllabe. Articulation claire, débit régulier.",
    pitfalls: [
      "Mal placer l'accent (toujours avant-dernière syllabe)",
      "Confondre /ɓ/ et /b/",
      "Prononcer les voyelles à la française (le 'e' n'est jamais muet)",
    ],
  },
  lin: {
    name: "Lingala",
    family: "Niger-Congo (Bantou)",
    tones: "tonal (haut, bas)",
    consonants: [
      "/p/ /b/ /t/ /d/ /k/ /ɡ/ — occlusives",
      "/s/ /z/ — fricatives",
      "/m/ /n/ /ɲ/ — nasales",
      "/l/ — latérale",
    ],
    vowels: "7 voyelles : a, ɛ, e, i, ɔ, o, u — distinction ouverte/fermée",
    accent: "Congo (RDC) — tons importants. Articulation claire, débit rapide.",
    pitfalls: [
      "Confondre /e/ et /ɛ/",
      "Confondre /o/ et /ɔ/",
      "Négliger les tons",
    ],
  },
  fra: {
    name: "Français",
    family: "Indo-européen (Roman)",
    tones: "non tonal (intonation de phrase)",
    consonants: [
      "R uvulaire /ʁ/ — fricative ou trill",
      "Nasales /ɲ/ (gn), /ŋ/ rare",
      "/ɥ/ — semi-voyelle (ui)",
    ],
    vowels: "Voyelles orales + 4 nasales : ɑ̃ (an), ɛ̃ (in), ɔ̃ (on), œ̃ (un)",
    accent: "France/Afrique francophone — R uvulaire, voyelles nasales, liaison et enchaînement.",
    pitfalls: [
      "Oublier les voyelles nasales",
      "Confondre /u/ et /y/ (u vs ü)",
      "Mal réaliser le R uvulaire",
    ],
  },
  eng: {
    name: "Anglais",
    family: "Indo-européen (Germanique)",
    tones: "non tonal (accent d'intensité)",
    consonants: [
      "/θ/ /ð/ — dentales (th)",
      "/ŋ/ — nasale vélaire (ng)",
      "/ɹ/ — R post-alvéolaire",
      "/h/ — fricative glottale",
    ],
    vowels: "12+ voyelles : distinction courte/longue (i/ɪ, u/ʊ), diphtongues (eɪ, aɪ, ɔɪ)",
    accent: "Anglais international — accent d'intensité variable, réduction des voyelles inaccentuées.",
    pitfalls: [
      "Confondre /θ/ et /s/ (think vs sink)",
      "Confondre /ð/ et /d/ (the vs de)",
      "Oublier la réduction vocalique",
      "Mal placer l'accent des mots",
    ],
  },
  igb: {
    name: "Igbo",
    family: "Niger-Congo (Benue-Congo)",
    tones: "tonal (haut, bas et contour)",
    consonants: [
      "/ɲ/ — nasale palatale (ny)",
      "/ŋ/ — nasale vélaire (ng)",
      "/ɣ/ — fricative vélaire voisée dans certaines variétés",
      "/kp/ et /gb/ — consonnes labio-vélaires articulées simultanément",
      "/ʃ/ — fricative palato-alvéolaire (sh)",
    ],
    vowels: "Voyelles à harmonie ATR : séries avancée et rétractée, avec voyelles orales et nasales selon le contexte",
    accent: "Nigeria — tons lexicaux essentiels, rythme syllabique régulier et articulation nette des consonnes doubles",
    pitfalls: [
      "Négliger les tons, qui peuvent changer le sens",
      "Séparer /kp/ ou /gb/ au lieu de les articuler ensemble",
      "Confondre les voyelles avancées et rétractées",
      "Remplacer /ʃ/ par /s/",
    ],
  },
  ara: {
    name: "Arabe",
    family: "Afro-asiatique (Sémitique)",
    tones: "non tonal",
    consonants: [
      "Emphatiques /tˤ/ /dˤ/ /sˤ/ /ðˤ/ — consonnes pharyngalisées",
      "/q/ — occlusive uvulaire",
      "/ɣ/ — fricative uvulaire voisée (gh)",
      "/x/ — fricative uvulaire sourde (kh)",
      "/ħ/ — fricative pharyngale sourde (h profond)",
      "/ʔ/ — coup de glotte (hamza)",
      "/ʕ/ — fricative pharyngale voisée",
    ],
    vowels: "3 voyelles courtes (a, i, u) + 3 longues (ā, ī, ū)",
    accent: "Monde arabe — articulation des emphatiques avec constriction pharyngale. Distinction stricte court/long.",
    pitfalls: [
      "Confondre /h/ et /ħ/",
      "Confondre /k/ et /q/",
      "Mal réaliser les emphatiques",
      "Oublier la distinction voyelles courtes/longues",
    ],
  },
};

export const getPhonologyProfile = (code) => {
  if (!code) return null;
  const key = code.toLowerCase();
  return PROFILES[key] || PROFILES[PROFILE_ALIASES[key]] || null;
};

const normalizeLanguageLookupKey = (value) => {
  if (!value) return "";
  return String(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
};

export const normalizeTtsLanguageCode = (code) => {
  if (!code) return "fr";

  const key = normalizeLanguageLookupKey(code);
  const africanTtsCodes = {
    lingala: "lin",
    swahili: "swa",
    bissa: "bib",
    moore: "mos",
    dioula: "dyu",
    soussou: "sus",
    pular: "ff",
    fulfulde: "ff",
    malinke: "mnk",
    kissi: "kss",
    guerze: "gxx",
    konyanka: "kno",
    kuranko: "kek",
    landuma: "ldu",
    lele: "lle",
    mani: "mni",
    nalu: "nlu",
    sankaran: "snk",
    yalunka: "yal",
    kono: "kno",
    mano: "mev",
    toma: "tom",
    badiaranke: "bsc",
    baga: "bgo",
    bassari: "bsq",
    bedik: "bdf",
    koniagui: "kno",
    igbo: "ibo",
    yoruba: "yor",
    hausa: "hau",
    wolof: "wol",
    bambara: "bam",
  };
  if (africanTtsCodes[key]) return africanTtsCodes[key];

  const direct = TTS_LOCALES[key] || TTS_LOCALES[key.split("-")[0]];
  if (direct) {
    return direct.split("-")[0];
  }

  const appLanguageAliases = {
    lingala: "lin",
    swahili: "swa",
    bissa: "bib",
    moore: "mos",
    dioula: "dyu",
    soussou: "sus",
    pular: "ff",
    malinke: "mnk",
    kissi: "kss",
    guerze: "gxx",
    konyanka: "kno",
    kuranko: "kek",
    landuma: "ldu",
    lele: "lle",
    mani: "mni",
    nalu: "nlu",
    sankaran: "snk",
    yalunka: "yal",
    kono: "kno",
    mano: "mev",
    toma: "tom",
    badiaranke: "bsc",
    baga: "bgo",
    bassari: "bsq",
    bedik: "bdf",
    koniagui: "kno",
    igbo: "ibo",
    yoruba: "yor",
    hausa: "hau",
    wolof: "wol",
    bambara: "bam",
    peul: "ff",
    fulfulde: "ff",
    "chinois-mandarin": "zho",
    chinois: "zho",
    mandarin: "zho",
    allemand: "de",
    anglais: "en",
    arabe: "ar",
    espagnol: "es",
    francais: "fr",
    hindi: "hi",
    italien: "it",
    japonais: "ja",
    portugais: "pt",
    russe: "ru",
    english: "en",
    french: "fr",
    spanish: "es",
    german: "de",
    portuguese: "pt",
    italian: "it",
    japanese: "ja",
    russian: "ru",
    arabic: "ar",
    chinese: "zho",
  };

  return appLanguageAliases[key] || key.split("-")[0] || "fr";
};

const PROVISIONAL_TTS_CODES = {
  pular: "ff-Latn-FR",
  fulfulde: "ff-Latn-FR",
  soussou: "sus-Latn-GN",
  malinke: "mnk-Latn-GN",
  maninka: "mnk-Latn-GN",
  mandinka: "mnk-Latn-GN",
  bambara: "bm-Latn-ML",
  dioula: "bm-Latn-ML",
  moore: "mos-Latn-BF",
  mossi: "mos-Latn-BF",
  wolof: "wo-Latn-SN",
  kissi: "kss-Latn-GN",
  guerze: "gxx-Latn-GN",
  koniagui: "kxp-Latn-GN",
  konyanka: "kxp-Latn-GN",
  kuranko: "kek-Latn-GN",
  landuma: "ldu-Latn-GN",
  lele: "lle-Latn-GN",
  mani: "mni-Latn-GN",
  nalu: "nqo-Latn-GN",
  sankaran: "snk-Latn-GN",
  yalunka: "yal-Latn-GN",
  kono: "kno-Latn-GN",
  mano: "mev-Latn-GN",
  toma: "tom-Latn-GN",
  badiaranke: "bsc-Latn-GN",
  baga: "bgo-Latn-GN",
  bassari: "bsq-Latn-GN",
  bedik: "bif-Latn-GN",
  kpele: "kpe-Latn-GN",
};

const UNSUPPORTED_TTS_CODES = new Set([
  "lingala", "bissa", "dioula", "moore", "mossi", "soussou", "pular", "peul", "fulfulde", "malinke", "maninka", "mandinka",
  "bambara", "wolof", "kissi", "guerze", "koniagui", "konyanka", "kuranko", "landuma", "lele", "mani", "nalu",
  "sankaran", "yalunka", "kono", "mano", "toma", "badiaranke", "baga", "bassari", "bedik", "kpele",
]);

export const getTTSLocale = (code) => {
  if (!code) return "fr-FR";
  const key = String(code).trim().toLowerCase();
  const normalizedKey = normalizeLanguageLookupKey(key);

  if (PROVISIONAL_TTS_CODES[normalizedKey]) {
    return PROVISIONAL_TTS_CODES[normalizedKey];
  }

  return TTS_LOCALES[normalizedKey] || TTS_LOCALES[normalizedKey.split("-")[0]] || "fr-FR";
};

export const isProvisionalSyntheticLanguage = (code) => {
  const key = normalizeLanguageLookupKey(code || "");
  return Boolean(key && (UNSUPPORTED_TTS_CODES.has(key) || PROVISIONAL_TTS_CODES[key]));
};

// Trouve la meilleure voix TTS disponible pour une langue
export const getBestVoice = (code) => {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;

  const normalizedCode = String(code || "").trim();
  const isUnsupported = isProvisionalSyntheticLanguage(normalizedCode);
  if (isUnsupported) {
    return null;
  }

  const locale = getTTSLocale(normalizedCode);
  const voices = window.speechSynthesis.getVoices() || [];

  if (!locale || !voices.length) return null;

  const normalizedLocale = locale.toLowerCase();
  const prefix = locale.split("-")[0].toLowerCase();

  const getVoiceScore = (voice) => {
    if (!voice || !voice.lang) return -Infinity;

    const name = (voice.name || "").toLowerCase();
    const lang = voice.lang.toLowerCase();
    let score = 0;

    if (lang === normalizedLocale) score += 120;
    else if (lang.startsWith(prefix)) score += 85;
    else if (lang.startsWith(normalizedLocale.split("-")[0])) score += 65;

    if (/(google|natural|premium|studio|neural|voice)/i.test(name)) score += 35;
    if (/(france|canada|united states|united kingdom|nigeria|kenya|india|germany|spain|brazil|japan|china|russia|arab|international)/i.test(`${name} ${lang}`)) score += 10;
    if (/(default|generic|system|browser|desktop|speech)/i.test(name)) score -= 40;

    return score;
  };

  const candidates = [...voices].filter((voice) => {
    if (!voice || !voice.lang) return false;
    const lang = voice.lang.toLowerCase();
    if (isUnsupported) {
      return lang === normalizedLocale || lang.startsWith(prefix + "-") || lang.startsWith(prefix);
    }
    return lang === normalizedLocale || lang.startsWith(prefix + "-") || lang.startsWith(prefix);
  });

  if (!candidates.length) {
    return null;
  }

  const best = [...candidates].sort((a, b) => getVoiceScore(b) - getVoiceScore(a))[0];
  return best || null;
};

// Construit le contexte phonologique pour le prompt IA
export const buildPhonologyContext = (code, langObj) => {
  const profile = getPhonologyProfile(code);
  const country = getCountryForLanguage(langObj || code);

  if (!profile) {
    return `\n\nPROFIL PHONOLOGIQUE (${langObj?.name_fr || code}):
Famille: ${langObj?.family || "non spécifiée"}
Pays principal: ${country}
Système d'écriture: ${langObj?.writing_system || "non spécifié"}

INSTRUCTIONS D'ADAPTATION:
- Réponds dans cette langue avec un registre, une syntaxe et des expressions idiomatiques naturels pour un locuteur natif.
- Adapte tes conseils de prononciation aux particularités de cette langue et à son usage au ${country}.
- Utilise les phonétiques du dictionnaire de référence.
- N'invente jamais une prononciation lorsque le dictionnaire ne fournit pas de donnée fiable.
- Explique les sons difficiles par comparaison avec le français.
- Donne des conseils d'accent basés sur l'usage attesté au ${country}.
- Si tu connais les caractéristiques phonologiques de cette langue, utilise-les.`;
  }

  return `\n\nPROFIL PHONOLOGIQUE (${profile.name}):
Famille: ${profile.family}
Système tonal: ${profile.tones}

CONSONNES PARTICULIÈRES:
${profile.consonants.map(c => `• ${c}`).join("\n")}

SYSTÈME VOYELLIQUE:
${profile.vowels}

CARACTÉRISTIQUES DE L'ACCENT:
${profile.accent}

ERREURS FRÉQUENTES À CORRIGER:
${profile.pitfalls.map(p => `• ${p}`).join("\n")}

INSTRUCTIONS D'ADAPTATION À L'ACCENT:
- Adapte TOUS tes conseils de prononciation à CE profil phonologique précis.
- Pour chaque mot de la langue cible, explique comment articuler les sons spécifiques (implosives, tons, nasales, emphatiques, etc.).
- Compare chaque son difficile avec le son français le plus proche.
- Si la langue est TONALE, indique TOUJOURS le ton de chaque mot et explique comment le réaliser (monte, descend, stable).
- Corrige activement les erreurs fréquentes listées ci-dessus quand l'apprenant s'exerce.
- Donne des conseils d'accent associés au pays principal ${country}: ${profile.accent}.`;
};