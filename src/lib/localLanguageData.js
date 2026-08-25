const LEVEL_META = {
  "Débutant": { id: "niveau-debutant", label: "Débutant", range: "A1 - A2" },
  "Intermédiaire": { id: "niveau-intermediaire", label: "Intermédiaire", range: "B1 - B2" },
  "Avancé": { id: "niveau-avance", label: "Avancé", range: "C1 - C2" },
};

const LOCAL_LANGUAGE_META_OVERRIDES = {
  soussou: {
    code: "soussou",
    name: "Soussou",
    name_fr: "Soussou",
    region: "Afrique de l'Ouest",
    family: "Mande",
    status: "active",
    flag_emoji: "🌍",
    color: "#0f766e",
    description: "Langue Soussou",
  },
  pular: {
    code: "pular",
    name: "Pular",
    name_fr: "Pular",
    region: "Afrique de l'Ouest",
    family: "Fula",
    status: "active",
    flag_emoji: "🌍",
    color: "#1d4ed8",
    description: "Langue Pular",
  },
  malinke: {
    code: "malinke",
    name: "Malinké",
    name_fr: "Malinké",
    region: "Afrique de l'Ouest",
    family: "Mande",
    status: "active",
    flag_emoji: "🌍",
    color: "#a16207",
    description: "Langue Malinké",
  },
  kissi: {
    code: "kissi",
    name: "Kissi",
    name_fr: "Kissi",
    region: "Afrique de l'Ouest",
    family: "Kru",
    status: "active",
    flag_emoji: "🌍",
    color: "#047857",
    description: "Langue Kissi",
  },
  guerze: {
    code: "guerze",
    name: "Guerzé (Kpelé)",
    name_fr: "Guerzé",
    region: "Guinée Forestière",
    family: "Mandé",
    status: "active",
    flag_emoji: "🌍",
    color: "#7B3E8A",
    description: "Langue Guerzé (Kpelé)",
  },
  "chinois-mandarin": {
    code: "chinois-mandarin",
    name: "中文",
    name_fr: "Chinois (mandarin)",
    region: "Monde",
    family: "Sino-tibétain",
    status: "active",
    flag_emoji: "🇨🇳",
    color: "#DE2910",
    description: "Langue sino-tibétaine",
  },
  allemand: {
    code: "allemand",
    name: "Deutsch",
    name_fr: "Allemand",
    region: "Monde",
    family: "Germanique",
    status: "active",
    flag_emoji: "🇩🇪",
    color: "#E3C100",
    description: "Langue germanique",
  },
  anglais: {
    code: "anglais",
    name: "English",
    name_fr: "Anglais",
    region: "Monde",
    family: "Germanique",
    status: "active",
    flag_emoji: "🇬🇧",
    color: "#0052CC",
    description: "Langue germanique internationale",
  },
  arabe: {
    code: "arabe",
    name: "العربية",
    name_fr: "Arabe",
    region: "Monde",
    family: "Sémitique",
    status: "active",
    flag_emoji: "🇸🇦",
    color: "#006C35",
    description: "Langue sémitique",
  },
  espagnol: {
    code: "espagnol",
    name: "Español",
    name_fr: "Espagnol",
    region: "Monde",
    family: "Romane",
    status: "active",
    flag_emoji: "🇪🇸",
    color: "#FFC400",
    description: "Langue romane ibérique",
  },
  francais: {
    code: "francais",
    name: "Français",
    name_fr: "Français",
    region: "Monde",
    family: "Romane",
    status: "active",
    flag_emoji: "🇫🇷",
    color: "#0085C7",
    description: "Langue romane internationale",
  },
  hindi: {
    code: "hindi",
    name: "हिन्दी",
    name_fr: "Hindi",
    region: "Monde",
    family: "Indo-aryenne",
    status: "active",
    flag_emoji: "🇮🇳",
    color: "#FF9933",
    description: "Langue indo-aryenne",
  },
  italien: {
    code: "italien",
    name: "Italiano",
    name_fr: "Italien",
    region: "Monde",
    family: "Romane",
    status: "active",
    flag_emoji: "🇮🇹",
    color: "#009246",
    description: "Langue romane méditerranéenne",
  },
  japonais: {
    code: "japonais",
    name: "日本語",
    name_fr: "Japonais",
    region: "Monde",
    family: "Japonic",
    status: "active",
    flag_emoji: "🇯🇵",
    color: "#BC002D",
    description: "Langue japonaise",
  },
  portugais: {
    code: "portugais",
    name: "Português",
    name_fr: "Portugais",
    region: "Monde",
    family: "Romane",
    status: "active",
    flag_emoji: "🇵🇹",
    color: "#006600",
    description: "Langue romane lusophone",
  },
  russe: {
    code: "russe",
    name: "Русский",
    name_fr: "Russe",
    region: "Monde",
    family: "Slave",
    status: "active",
    flag_emoji: "🇷🇺",
    color: "#0039A6",
    description: "Langue slave",
  },
  // Guinée - Nationales (déjà couvertes au-dessus)
  // Guinée - Régionales
  badiaranke: {
    code: "badiaranke",
    name: "Badiaranké",
    name_fr: "Badiaranké",
    region: "Guinée (Régionales)",
    family: "Atlantique",
    status: "active",
    flag_emoji: "🇬🇳",
    color: "#CE1126",
    description: "Langue des régions de Kindia et Mamou",
  },
  baga: {
    code: "baga",
    name: "Baga",
    name_fr: "Baga",
    region: "Guinée (Régionales)",
    family: "Niger-Congo",
    status: "active",
    flag_emoji: "🇬🇳",
    color: "#FCD116",
    description: "Langue de la côte guinéenne",
  },
  bassari: {
    code: "bassari",
    name: "Bassari",
    name_fr: "Bassari (Oniyah)",
    region: "Guinée (Régionales)",
    family: "Kru",
    status: "active",
    flag_emoji: "🇬🇳",
    color: "#007A5E",
    description: "Langue des hauts plateaux",
  },
  bedik: {
    code: "bedik",
    name: "Bedik",
    name_fr: "Bedik",
    region: "Guinée (Régionales)",
    family: "Kru",
    status: "active",
    flag_emoji: "🇬🇳",
    color: "#B83C3C",
    description: "Langue des montagnes du Fouta-Djallon",
  },
  koniagui: {
    code: "koniagui",
    name: "Koniagui",
    name_fr: "Koniagui (Wamey)",
    region: "Guinée (Régionales)",
    family: "Niger-Congo",
    status: "active",
    flag_emoji: "🇬🇳",
    color: "#3D8B40",
    description: "Langue du Fouta-Djallon",
  },
  konyanka: {
    code: "konyanka",
    name: "Konyanka",
    name_fr: "Konyanka",
    region: "Guinée (Régionales)",
    family: "Atlantique",
    status: "active",
    flag_emoji: "🇬🇳",
    color: "#FFB81C",
    description: "Langue de la région centrale",
  },
  kuranko: {
    code: "kuranko",
    name: "Kuranko",
    name_fr: "Kuranko",
    region: "Guinée (Régionales)",
    family: "Mande",
    status: "active",
    flag_emoji: "🇬🇳",
    color: "#D42426",
    description: "Langue du nord-est de la Guinée",
  },
  landuma: {
    code: "landuma",
    name: "Landuma",
    name_fr: "Landuma",
    region: "Guinée (Régionales)",
    family: "Atlantique",
    status: "active",
    flag_emoji: "🇬🇳",
    color: "#6A994E",
    description: "Langue des îles de Guinée",
  },
  lele: {
    code: "lele",
    name: "Lele",
    name_fr: "Lele",
    region: "Guinée (Régionales)",
    family: "Kru",
    status: "active",
    flag_emoji: "🇬🇳",
    color: "#BC4749",
    description: "Langue de la région forestière",
  },
  mani: {
    code: "mani",
    name: "Mani",
    name_fr: "Mani",
    region: "Guinée (Régionales)",
    family: "Kru",
    status: "active",
    flag_emoji: "🇬🇳",
    color: "#F4A460",
    description: "Langue du sud-est de la Guinée",
  },
  nalu: {
    code: "nalu",
    name: "Nalu",
    name_fr: "Nalu",
    region: "Guinée (Régionales)",
    family: "Atlantique",
    status: "active",
    flag_emoji: "🇬🇳",
    color: "#DAA520",
    description: "Langue côtière de Guinée",
  },
  sankaran: {
    code: "sankaran",
    name: "Sankaran",
    name_fr: "Sankaran",
    region: "Guinée (Régionales)",
    family: "Mande",
    status: "active",
    flag_emoji: "🇬🇳",
    color: "#8B4513",
    description: "Langue du sud-est de la Guinée",
  },
  yalunka: {
    code: "yalunka",
    name: "Yalunka",
    name_fr: "Yalunka (Jalonké)",
    region: "Guinée (Régionales)",
    family: "Mande",
    status: "active",
    flag_emoji: "🇬🇳",
    color: "#A0522D",
    description: "Langue du Fouta-Djallon",
  },
  // Guinée - Forestières
  kono: {
    code: "kono",
    name: "Kono",
    name_fr: "Kono",
    region: "Guinée Forestière",
    family: "Kru",
    status: "active",
    flag_emoji: "🇬🇳",
    color: "#7B3E8A",
    description: "Langue de la Guinée Forestière",
  },
  mano: {
    code: "mano",
    name: "Mano",
    name_fr: "Mano",
    region: "Guinée Forestière",
    family: "Kru",
    status: "active",
    flag_emoji: "🇬🇳",
    color: "#9932CC",
    description: "Langue du Libéria et Guinée",
  },
  toma: {
    code: "toma",
    name: "Toma",
    name_fr: "Toma",
    region: "Guinée Forestière",
    family: "Kru",
    status: "active",
    flag_emoji: "🇬🇳",
    color: "#8A2BE2",
    description: "Langue de la région forestière",
  },
  // Afrique - Centrale-Est
  lingala: {
    code: "lingala",
    name: "Lingala",
    name_fr: "Lingala",
    region: "Afrique (Centrale-Est)",
    family: "Bantoue",
    status: "active",
    flag_emoji: "🇨🇩",
    color: "#007FFF",
    description: "Langue du Congo-Kinshasa",
  },
  swahili: {
    code: "swahili",
    name: "Kiswahili",
    name_fr: "Swahili",
    region: "Afrique (Centrale-Est)",
    family: "Bantoue",
    status: "active",
    flag_emoji: "🇹🇿",
    color: "#007A5E",
    description: "Langue d'Afrique de l'Est",
  },
  // Afrique - Ouest
  bissa: {
    code: "bissa",
    name: "Bissa",
    name_fr: "Bissa",
    region: "Afrique (Ouest)",
    family: "Gur",
    status: "active",
    flag_emoji: "🇧🇫",
    color: "#CE1126",
    description: "Langue du Burkina Faso",
  },
  moore: {
    code: "moore",
    name: "Mooré",
    name_fr: "Mooré",
    region: "Afrique (Ouest)",
    family: "Gur",
    status: "active",
    flag_emoji: "🇧🇫",
    color: "#1e3a8a",
    description: "Langue mooré du Burkina Faso",
  },
  dioula: {
    code: "dioula",
    name: "Dioula",
    name_fr: "Dioula",
    region: "Afrique (Ouest)",
    family: "Mande",
    status: "active",
    flag_emoji: "🇨🇮",
    color: "#FF7400",
    description: "Langue de Côte d'Ivoire et Burkina",
  },
  igbo: {
    code: "igbo",
    name: "Igbo",
    name_fr: "Igbo",
    region: "Afrique (Ouest)",
    family: "Niger-Congo",
    status: "active",
    flag_emoji: "🇳🇬",
    color: "#000000",
    description: "Langue du Nigeria",
  },
  yoruba: {
    code: "yoruba",
    name: "Yoruba",
    name_fr: "Yoruba",
    region: "Afrique (Ouest)",
    family: "Niger-Congo",
    status: "active",
    flag_emoji: "🇳🇬",
    color: "#007749",
    description: "Langue du Nigeria et Bénin",
  },
};

const LOCAL_LANGUAGE_SOURCE_OVERRIDES = {
  lingala: [{ label: "Wikipédia — Lingala (présentation et classification)", url: "https://fr.wikipedia.org/wiki/Lingala" }, { label: "Glottolog — Lingala", url: "https://glottolog.org/resource/languoid/id/ling1263" }],
  swahili: [{ label: "Wikipédia — Swahili (présentation et classification)", url: "https://fr.wikipedia.org/wiki/Swahili" }, { label: "Glottolog — Swahili", url: "https://glottolog.org/resource/languoid/id/swah1253" }],
  bissa: [{ label: "Wikipédia — Bissa (présentation et classification)", url: "https://fr.wikipedia.org/wiki/Bissa_(langue)" }, { label: "Glottolog — Bissa", url: "https://glottolog.org/resource/languoid/id/bisa1260" }],
  dioula: [{ label: "Wikipédia — Dioula (présentation et classification)", url: "https://fr.wikipedia.org/wiki/Dioula_(langue)" }, { label: "Glottolog — Dyula", url: "https://glottolog.org/resource/languoid/id/dyul1238" }],
  igbo: [{ label: "Wikipédia — Igbo (présentation et classification)", url: "https://fr.wikipedia.org/wiki/Igbo" }, { label: "Glottolog — Igbo", url: "https://glottolog.org/resource/languoid/id/igbo1252" }],
  moore: [{ label: "Wikipédia — Mooré (présentation et classification)", url: "https://fr.wikipedia.org/wiki/Moor%C3%A9" }, { label: "Glottolog — Mossi", url: "https://glottolog.org/resource/languoid/id/moss1236" }],
  yoruba: [{ label: "Wikipédia — Yoruba (présentation et classification)", url: "https://fr.wikipedia.org/wiki/Yoruba" }, { label: "Glottolog — Yoruba", url: "https://glottolog.org/resource/languoid/id/yoru1245" }],
  allemand: [{ label: "Wikipédia — Allemand (présentation et classification)", url: "https://fr.wikipedia.org/wiki/Allemand" }, { label: "Glottolog — German", url: "https://glottolog.org/resource/languoid/id/stan1287" }],
  anglais: [{ label: "Wikipédia — Anglais (présentation et classification)", url: "https://fr.wikipedia.org/wiki/Anglais" }, { label: "Glottolog — English", url: "https://glottolog.org/resource/languoid/id/stan1293" }],
  arabe: [{ label: "Wikipédia — Arabe (présentation et classification)", url: "https://fr.wikipedia.org/wiki/Arabe" }, { label: "Glottolog — Arabic", url: "https://glottolog.org/resource/languoid/id/arab1394" }],
  "chinois-mandarin": [{ label: "Wikipédia — Mandarin (présentation et classification)", url: "https://fr.wikipedia.org/wiki/Mandarin_(langue)" }, { label: "Glottolog — Mandarin Chinese", url: "https://glottolog.org/resource/languoid/id/mand1415" }],
  espagnol: [{ label: "Wikipédia — Espagnol (présentation et classification)", url: "https://fr.wikipedia.org/wiki/Espagnol" }, { label: "Glottolog — Spanish", url: "https://glottolog.org/resource/languoid/id/span1283" }],
  francais: [{ label: "Wikipédia — Français (présentation et classification)", url: "https://fr.wikipedia.org/wiki/Fran%C3%A7ais" }, { label: "Glottolog — French", url: "https://glottolog.org/resource/languoid/id/stan1290" }],
  hindi: [{ label: "Wikipédia — Hindi (présentation et classification)", url: "https://fr.wikipedia.org/wiki/Hindi" }, { label: "Glottolog — Hindi", url: "https://glottolog.org/resource/languoid/id/hind1269" }],
  italien: [{ label: "Wikipédia — Italien (présentation et classification)", url: "https://fr.wikipedia.org/wiki/Italien" }, { label: "Glottolog — Italian", url: "https://glottolog.org/resource/languoid/id/ital1282" }],
  japonais: [{ label: "Wikipédia — Japonais (présentation et classification)", url: "https://fr.wikipedia.org/wiki/Japonais" }, { label: "Glottolog — Japanese", url: "https://glottolog.org/resource/languoid/id/japn1248" }],
  portugais: [{ label: "Wikipédia — Portugais (présentation et classification)", url: "https://fr.wikipedia.org/wiki/Portugais" }, { label: "Glottolog — Portuguese", url: "https://glottolog.org/resource/languoid/id/port1283" }],
  russe: [{ label: "Wikipédia — Russe (présentation et classification)", url: "https://fr.wikipedia.org/wiki/Russe" }, { label: "Glottolog — Russian", url: "https://glottolog.org/resource/languoid/id/russ1263" }],
};

const LANGUAGE_COUNTRIES = {
  soussou: "Guinée", pular: "Guinée", malinke: "Guinée", kissi: "Guinée", guerze: "Guinée",
  badiaranke: "Guinée", baga: "Guinée", bassari: "Guinée", bedik: "Guinée", koniagui: "Guinée",
  konyanka: "Guinée", kuranko: "Guinée", landuma: "Guinée", lele: "Guinée", mani: "Guinée",
  nalu: "Guinée", sankaran: "Guinée", yalunka: "Guinée", kono: "Guinée", mano: "Guinée", toma: "Guinée",
  "chinois-mandarin": "Chine", allemand: "Allemagne", anglais: "Royaume-Uni", arabe: "Arabie saoudite",
  espagnol: "Espagne", francais: "France", hindi: "Inde", italien: "Italie", japonais: "Japon",
  portugais: "Portugal", russe: "Russie", lingala: "République démocratique du Congo", swahili: "Tanzanie",
  bissa: "Burkina Faso", moore: "Burkina Faso", dioula: "Côte d'Ivoire", igbo: "Nigeria", yoruba: "Nigeria",
};

const COUNTRY_FLAGS = {
  "Guinée": "🇬🇳", "Chine": "🇨🇳", "Allemagne": "🇩🇪", "Royaume-Uni": "🇬🇧",
  "Arabie saoudite": "🇸🇦", "Espagne": "🇪🇸", "France": "🇫🇷", "Inde": "🇮🇳",
  "Italie": "🇮🇹", "Japon": "🇯🇵", "Portugal": "🇵🇹", "Russie": "🇷🇺",
  "République démocratique du Congo": "🇨🇩", "Tanzanie": "🇹🇿", "Burkina Faso": "🇧🇫",
  "Côte d'Ivoire": "🇨🇮", "Nigeria": "🇳🇬",
};

export const getCountryForLanguage = (language) => {
  const languageObject = typeof language === "object" && language !== null ? language : null;
  const code = normalizeText(typeof language === "string" ? language : language?.code)
    .toLowerCase()
    .replace(/é/g, "e")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const region = normalizeText(languageObject?.region).toLowerCase();
  if (region.includes("guinée") || region.includes("guinee") || languageObject?.flag_emoji === "🇬🇳") {
    return "Guinée";
  }
  return LANGUAGE_COUNTRIES[code] || languageObject?.country || "Guinée";
};

export const getFlagForLanguage = (language) => COUNTRY_FLAGS[getCountryForLanguage(language)] || "🇬🇳";

const normalizeText = (value) => String(value || "").trim();

const normalizeLanguageCode = (value) =>
  normalizeText(value)
    .toLowerCase()
    .replace(/é/g, "e")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const getPathSegments = (filePath) => String(filePath || "").split(/[\\/]/).filter(Boolean);

const getLanguageFolderFromPath = (filePath) => {
  const normalized = String(filePath || "")
    .replace(/\\/g, "/")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // List of folder names that are not languages (categories/regions)
  const excludedFolders = [
    "Internationales", "Regionales", "Nationales", "Forestieres",
    "Guinee", "Afrique", "Centrale_Est", "Ouest", "data",
    "Niveau", "Module", "Leçon"
  ];

  // Try to extract language from Internationales subfolder.
  const internationalMatch = normalized.match(/(?:^|\/)(?:\.\.\/)?data(?:_langues)?\/Internationales\/([^/]+)\//i);
  if (internationalMatch) {
    return internationalMatch[1];
  }

  // Try to extract language from Guinean and African region subfolders.
  const regionMatch = normalized.match(/(?:^|\/)(?:\.\.\/)?data(?:_langues)?\/(?:Guinee|Afrique)\/(?:[^/]+\/)?([^/]+)\//i);
  if (regionMatch) {
    return regionMatch[1];
  }

  // Fallback: don't load anything else
  return null;
};

const getLanguageMetaFromFolder = (folderName) => {
  const code = normalizeLanguageCode(folderName);
  const override = LOCAL_LANGUAGE_META_OVERRIDES[code];
  if (override) return { ...override };
  const name = folderName.trim();
  return {
    code,
    name,
    name_fr: name,
    region: "Afrique",
    family: "",
    status: "active",
    flag_emoji: "🌍",
    color: "#0f766e",
    description: `Langue ${name}`,
  };
};

const dataFiles = import.meta.glob("../data_langues/**/*.{json,JSON,Json}", {
  query: "?raw",
  import: "default",
});

const localLanguageData = new Map();
const curriculumByLanguage = new Map();
let localLanguageDataInitialized = false;
let localLanguageDataInitializationPromise = null;

const registerLanguageEntryFromPath = (filePath) => {
  const folderName = getLanguageFolderFromPath(filePath);
  if (!folderName) return;

  const languageCode = normalizeLanguageCode(folderName);
  if (!languageCode) return;

  if (!localLanguageData.has(languageCode)) {
    localLanguageData.set(languageCode, {
      meta: getLanguageMetaFromFolder(folderName),
      lessons: [],
    });
  }
};

Object.keys(dataFiles).forEach(registerLanguageEntryFromPath);

const rebuildCurriculumCache = () => {
  curriculumByLanguage.clear();
  localLanguageData.forEach((languageEntry, languageCode) => {
    const curriculum = buildCurriculum(languageEntry.lessons);
    curriculumByLanguage.set(languageCode, { levels: curriculum });
  });
};

const buildFileTitleFromPath = (filePath) => {
  const fileName = String(filePath || "").split(/[\\/]/).pop() || "Leçon";
  const cleanName = fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
  const withoutPrefix = cleanName.replace(/^Le[çc]on\s*/i, "").trim();
  return withoutPrefix || "Leçon";
};

const buildSeedLessonEntry = (languageCode, filePath, index) => {
  const lessonNumber = index + 1;
  const title = buildFileTitleFromPath(filePath);
  const sampleVocab = [
    { word: `${normalizeLanguageCode(languageCode)}-${lessonNumber}-bonjour`, translation_fr: "bonjour", phonetic: "", example_target: "", example_fr: "" },
    { word: `${normalizeLanguageCode(languageCode)}-${lessonNumber}-merci`, translation_fr: "merci", phonetic: "", example_target: "", example_fr: "" },
  ];

  return {
    filePath,
    content: {
      niveau: "Débutant",
      titre_cours: title,
      title,
      introduction: `Leçon ${lessonNumber} en ${languageCode}.`,
      learning_objectives: [`Apprendre les bases de ${languageCode}.`],
      common_phrases: ["Bonjour", "Merci", "Au revoir"],
      modules: [{
        id_module: lessonNumber,
        titre_module: `Module ${lessonNumber}`,
        chapitres: [{
          vocabulaire_cles: sampleVocab,
          exemples: ["Bonjour", "Merci"],
          exercices: [],
        }],
      }],
      vocabulary: sampleVocab,
      exercises: [],
    },
  };
};

const seedLanguageLessonData = (languageCode) => {
  const normalized = normalizeLanguageCode(languageCode);
  const languageEntry = localLanguageData.get(normalized);
  if (!languageEntry) return [];

  const files = getLocalizedFilesForLanguage(normalized).sort();
  const seededLessons = files.map((filePath, index) => buildSeedLessonEntry(normalized, filePath, index));
  languageEntry.lessons = seededLessons;
  languageEntry.lessonsLoaded = false;
  return seededLessons;
};

const getLocalizedFilesForLanguage = (languageCode) => {
  const normalized = normalizeLanguageCode(languageCode);
  if (!normalized) return [];

  return Object.keys(dataFiles).filter((filePath) => {
    const folderName = getLanguageFolderFromPath(filePath);
    return Boolean(folderName) && normalizeLanguageCode(folderName) === normalized;
  });
};

const loadLanguageLessonData = async (languageCode) => {
  const normalized = normalizeLanguageCode(languageCode);
  const languageEntry = localLanguageData.get(normalized);
  if (!languageEntry) return [];
  if (languageEntry.lessonsLoaded) return languageEntry.lessons;
  if (languageEntry.loadingLessons) return await languageEntry.loadingLessons;

  languageEntry.loadingLessons = (async () => {
    const files = getLocalizedFilesForLanguage(normalized);
    const parsedFiles = await Promise.all(
      files.map(async (filePath) => {
        try {
          const importer = dataFiles[filePath];
          const content = importer ? await importer() : null;
          if (typeof content !== "string") {
            return null;
          }

          return { filePath, content: JSON.parse(content) };
        } catch (error) {
          console.error(`Unable to parse local data file: ${filePath}`, error);
          return null;
        }
      })
    );

    const nextLessons = [];
    parsedFiles.filter((item) => item && item.content && typeof item.content === "object").forEach(({ filePath, content }) => {
      nextLessons.push({ filePath, content });
    });

    if (nextLessons.length > 0) {
      const seeded = seedLanguageLessonData(normalized);
      const seededMap = new Map(seeded.map((lesson) => [String(lesson.filePath), lesson]));
      nextLessons.forEach(({ filePath, content }) => {
        if (seededMap.has(String(filePath))) {
          seededMap.get(String(filePath)).content = content;
        }
      });
      languageEntry.lessons = [...seededMap.values()];
    }

    languageEntry.lessonsLoaded = true;
    delete languageEntry.loadingLessons;
    rebuildCurriculumCache();
    return languageEntry.lessons;
  })();

  return await languageEntry.loadingLessons;
};

const initializeLocalLanguageData = async () => {
  if (localLanguageDataInitialized) {
    return true;
  }

  if (localLanguageDataInitializationPromise) {
    return await localLanguageDataInitializationPromise;
  }

  Array.from(localLanguageData.keys()).forEach((languageCode) => seedLanguageLessonData(languageCode));
  localLanguageDataInitializationPromise = Promise.resolve(true);
  localLanguageDataInitialized = true;
  return true;
};

const ensureLocalLanguageDataForLanguage = async (languageCode) => {
  if (!languageCode) return [];
  const normalized = normalizeLanguageCode(languageCode);
  if (!normalized || !isLocalLanguage(normalized)) {
    return [];
  }

  await initializeLocalLanguageData();
  const languageEntry = localLanguageData.get(normalized);
  if (!languageEntry) return [];
  if (!languageEntry.lessons || languageEntry.lessons.length === 0) {
    seedLanguageLessonData(normalized);
  }
  return await loadLanguageLessonData(normalized);
};

const parseLevelMeta = (value) => {
  const raw = String(value || "").trim();
  const match = raw.match(/^(.+?)\s*\(([^)]+)\)/);
  const label = match ? match[1].trim() : raw;
  const range = match ? match[2].trim() : "";
  const normalized = normalizeText(label).toLowerCase();
  if (normalized.includes("débutant") || normalized.includes("a1") || normalized.includes("a2")) return { ...LEVEL_META["Débutant"], range: range || LEVEL_META["Débutant"].range };
  if (normalized.includes("intermédiaire") || normalized.includes("b1") || normalized.includes("b2")) return { ...LEVEL_META["Intermédiaire"], range: range || LEVEL_META["Intermédiaire"].range };
  if (normalized.includes("avancé") || normalized.includes("c1") || normalized.includes("c2")) return { ...LEVEL_META["Avancé"], range: range || LEVEL_META["Avancé"].range };
  const meta = LEVEL_META[label] || { id: `niveau-${normalizeText(label).replace(/[^a-z0-9]+/gi, "-")}`, label: label || "Débutant", range };
  return { ...meta, range: range || meta.range };
};

const parseLessonOrder = (filePath, title) => {
  const candidate = `${String(filePath || "")} ${String(title || "")}`;
  const match = candidate.match(/Le[çc]on[\s_\-]*([0-9]+)/i);
  if (match) {
    const parsed = Number(match[1]);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  const numberMatch = candidate.match(/([0-9]{1,2})/);
  if (numberMatch) {
    const parsed = Number(numberMatch[1]);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  return 1;
};

const getModuleInfoFromPath = (filePath) => {
  const normalizedPath = String(filePath || "").replace(/\\/g, "/");
  const moduleSegment = normalizedPath.match(/(?:^|\/)Module\s*([0-9]+)\s*([^/]*)\//i);
  const levelSegment = normalizedPath.match(/(?:^|\/)Niveau\s+([^/]+)\//i);

  const moduleMatch = moduleSegment;
  const moduleNumber = moduleMatch ? Number(moduleMatch[1]) : 0;
  const moduleTitle = moduleMatch?.[2]?.trim() || "";
  const levelTitle = levelSegment?.[1]?.trim() || "";

  return { moduleNumber, moduleTitle, levelTitle };
};

const getModuleTitle = (moduleData, filePath) => {
  const { moduleTitle } = getModuleInfoFromPath(filePath);
  if (moduleTitle) return moduleTitle;
  if (moduleData?.titre_module) return String(moduleData.titre_module).trim();
  const match = String(filePath || "").match(/Module\s*([0-9]+)/i);
  if (match) return `Module ${match[1]}`;
  return "Module";
};

const buildCurriculum = (lessons) => {
  const levelMap = new Map();

  lessons.forEach(({ filePath, content }) => {
    const entries = Array.isArray(content) ? content : [content];
    entries.forEach((entry) => {
      if (!entry || typeof entry !== "object") return;

      let moduleData = Array.isArray(entry.modules) ? entry.modules[0] : entry.modules;
      if (!moduleData && (Array.isArray(entry.vocabulary) || Array.isArray(entry.exercises))) {
        moduleData = {
          id_module: entry.module_number,
          titre_module: entry.module_title,
          chapitres: [
            {
              vocabulaire_cles: (entry.vocabulary || []).map((item) => ({
                word_id: item.word_id,
                terme: item.term,
                traduction_ou_definition: item.translation,
                phonetic: item.phonetic_api || item.phonetic_simple || "",
                phonetic_simple: item.phonetic_simple || "",
                example_target: item.example_sentence || "",
                example_phonetic: item.example_phonetic || "",
                example_fr: item.example_translation || "",
              })),
              exemples: entry.common_phrases || [],
              exercices: entry.exercises || [],
            },
          ],
        };
      }
      if (!moduleData || typeof moduleData !== "object") return;

      const sourceLanguageCode = normalizeLanguageCode(getLanguageFolderFromPath(filePath));
      const { moduleNumber, levelTitle } = getModuleInfoFromPath(filePath);
      const levelInfo = parseLevelMeta(levelTitle || entry.niveau || entry.level || "Débutant");
      const levelKey = levelInfo.label;
      const moduleIdNumber = moduleNumber > 0 ? moduleNumber : Number(entry.module_number || moduleData.id_module) || 0;
      const moduleLabel = getModuleTitle(moduleData, filePath);
      const lessonOrder = parseLessonOrder(filePath, entry.titre_cours || entry.titre_cour || entry.title || "Leçon 1");
      const lessonTitle = String(entry.titre_cours || entry.titre_cour || entry.title || `Leçon ${lessonOrder}`).trim();
      const chapters = Array.isArray(moduleData.chapitres) ? moduleData.chapitres : [];
      const lessonExercises = Array.isArray(entry.exercises)
        ? entry.exercises
        : chapters.flatMap((chapter) => (Array.isArray(chapter.exercices) ? chapter.exercices : []));

      if (!levelMap.has(levelKey)) {
        levelMap.set(levelKey, {
          meta: levelInfo,
          modules: new Map(),
        });
      }

      const levelEntry = levelMap.get(levelKey);
      const moduleKey = String(moduleIdNumber);
      if (!levelEntry.modules.has(moduleKey)) {
        levelEntry.modules.set(moduleKey, {
          id: `${levelInfo.id}-module-${moduleIdNumber}`,
          label: `Module ${moduleIdNumber} : ${moduleLabel}`,
          rawTitle: moduleLabel,
          lessons: [],
          exerciseSeries: [],
          moduleData,
        });
      }

      const moduleEntry = levelEntry.modules.get(moduleKey);
      moduleEntry.lessons.push({
        filePath,
        sourceFile: filePath,
        rawData: entry,
        lessonOrder,
        title: lessonTitle,
        title_fr: lessonTitle,
        introduction: String(entry.introduction || entry.learning_objectives?.join(" ") || "").trim(),
        learning_objectives: Array.isArray(entry.learning_objectives) ? entry.learning_objectives : [],
        phonetic_focus: entry.phonetic_focus || null,
        common_phrases: Array.isArray(entry.common_phrases) ? entry.common_phrases : [],
        grammar_points: Array.isArray(entry.grammar_points) ? entry.grammar_points : [],
        dialogue: Array.isArray(entry.dialogue) ? entry.dialogue : [],
        cultural_notes: Array.isArray(entry.cultural_notes) ? entry.cultural_notes : [],
        sources: Array.isArray(entry.sources) && entry.sources.length ? entry.sources : (LOCAL_LANGUAGE_SOURCE_OVERRIDES[sourceLanguageCode] || []),
        confidence: entry.confidence || (LOCAL_LANGUAGE_SOURCE_OVERRIDES[sourceLanguageCode] ? "références générales" : null),
        confidence_note: entry.confidence_note || (LOCAL_LANGUAGE_SOURCE_OVERRIDES[sourceLanguageCode] ? "Références générales de classification et de présentation linguistique. Elles documentent la langue et son contexte ; les détails pédagogiques sont conservés dans le fichier JSON de cette leçon." : ""),
        exercises: lessonExercises,
        chapitres: chapters,
        content: {
          vocabulary: Array.isArray(chapters)
            ? chapters.flatMap((chapter) =>
                Array.isArray(chapter.vocabulaire_cles)
                  ? chapter.vocabulaire_cles.map((v) => ({
                      word_id: v.word_id,
                      word: v.terme,
                      translation_fr: v.traduction_ou_definition,
                      phonetic: v.phonetic || "",
                      phonetic_simple: v.phonetic_simple || "",
                      example_target: v.example_target || "",
                      example_phonetic: v.example_phonetic || "",
                      example_fr: v.example_fr || "",
                    }))
                  : []
              )
            : [],
          exercises: lessonExercises,
          examples: Array.isArray(chapters)
            ? chapters.flatMap((chapter) => (Array.isArray(chapter.exemples) ? chapter.exemples : []))
            : [],
        },
      });
    });
  });

  const levels = [...levelMap.values()]
    .sort((a, b) => {
      const orderA = Object.keys(LEVEL_META).indexOf(a.meta.label);
      const orderB = Object.keys(LEVEL_META).indexOf(b.meta.label);
      return orderA - orderB;
    })
    .map((levelEntry) => {
      const sortedModules = [...levelEntry.modules.values()].sort((a, b) => {
        const aNum = Number(a.id.match(/module-([0-9]+)/)?.[1] || 0);
        const bNum = Number(b.id.match(/module-([0-9]+)/)?.[1] || 0);
        return aNum - bNum;
      });

      return {
        id: levelEntry.meta.id,
        label: levelEntry.meta.label,
        range: levelEntry.meta.range,
        modules: sortedModules.map((moduleEntry) => {
          const sortedLessons = moduleEntry.lessons.sort((a, b) => a.lessonOrder - b.lessonOrder);
          return {
            ...moduleEntry,
            lessons: sortedLessons.map((lessonEntry) => ({
              id: `${moduleEntry.id}-lesson-${lessonEntry.lessonOrder}`,
              title: lessonEntry.title,
              title_fr: lessonEntry.title_fr,
              lesson_number: 0,
              content: {
                vocabulary: lessonEntry.content.vocabulary,
                exercises: lessonEntry.content.exercises,
                examples: lessonEntry.content.examples,
              },
              introduction: lessonEntry.introduction,
              learning_objectives: lessonEntry.learning_objectives,
              phonetic_focus: lessonEntry.phonetic_focus,
              common_phrases: lessonEntry.common_phrases,
              grammar_points: lessonEntry.grammar_points,
              dialogue: lessonEntry.dialogue,
              cultural_notes: lessonEntry.cultural_notes,
              sources: lessonEntry.sources,
              confidence: lessonEntry.confidence,
              confidence_note: lessonEntry.confidence_note,
              source_file: lessonEntry.sourceFile,
              exercises: lessonEntry.exercises,
              raw_data: lessonEntry.rawData,
              module: {
                id: moduleEntry.id,
                theme: moduleEntry.label,
                niveau: levelEntry.meta.label,
                description: lessonEntry.introduction,
              },
              chapitreData: lessonEntry.chapitres,
            })),
            rawLessons: sortedLessons,
          };
        }),
      };
    });

  let nextLessonNumber = 1;
  levels.forEach((level) => {
    level.modules.forEach((module) => {
      module.lessons.forEach((lesson) => {
        lesson.lesson_number = nextLessonNumber;
        nextLessonNumber += 1;
      });
    });
  });

  levels.forEach((level) => {
    level.modules.forEach((module) => {
      const exerciseSeries = module.lessons.flatMap((lesson) =>
        (Array.isArray(lesson.exercises) ? lesson.exercises : []).map((exercise, index) => ({
          ...exercise,
          title: String(exercise.question || exercise.sentence_with_blank || `Exercice ${index + 1}`).trim(),
          type: String(exercise.type || "texte").trim(),
          goal: exercise.type === "multiple_choice" || exercise.type === "QCM"
            ? "Choisis la bonne réponse."
            : exercise.type === "fill_in_the_blanks" || exercise.type === "texte_a_trous"
            ? "Complète la phrase."
            : "Réponds à la consigne.",
        }))
      );
      module.exerciseSeries = exerciseSeries;
    });
  });

  return levels;
};

const getLocalLanguageMeta = (code) => {
  const normalized = normalizeLanguageCode(code);
  return localLanguageData.get(normalized)?.meta ?? null;
};

const getLocalLanguages = () => [...localLanguageData.values()].map((entry) => entry.meta);

const getCurriculumForLanguage = (code) => {
  const normalized = normalizeLanguageCode(code);
  const languageEntry = localLanguageData.get(normalized);
  if (languageEntry && Array.isArray(languageEntry.lessons) && languageEntry.lessons.length > 0) {
    if (!curriculumByLanguage.has(normalized)) {
      const curriculum = buildCurriculum(languageEntry.lessons);
      curriculumByLanguage.set(normalized, { levels: curriculum });
    }
    return curriculumByLanguage.get(normalized) || { levels: [] };
  }
  return curriculumByLanguage.get(normalized) || { levels: [] };
};

const getLessonMetadataForLanguage = (code) => {
  const curriculum = getCurriculumForLanguage(code);
  return curriculum.levels.flatMap((level) =>
    level.modules.flatMap((module) =>
      module.lessons.map((lesson) => ({
        lesson_number: lesson.lesson_number,
        title: lesson.title,
        title_fr: lesson.title_fr,
        level: level.label,
        learning_objectives: lesson.learning_objectives,
        phonetic_focus: lesson.phonetic_focus,
        common_phrases: lesson.common_phrases,
        grammar_points: lesson.grammar_points,
        dialogue: lesson.dialogue,
        cultural_notes: lesson.cultural_notes,
        sources: lesson.sources,
        confidence: lesson.confidence,
        confidence_note: lesson.confidence_note,
        source_file: lesson.source_file,
          exercises: lesson.exercises,
        raw_data: lesson.raw_data,
        module: {
          theme: module.label,
          niveau: level.label,
          description: lesson.introduction || module.label,
        },
      }))
    )
  );
};

const getVocabularyForLesson = (code, lessonNumber) => {
  const curriculum = getCurriculumForLanguage(code);
  const lesson = curriculum.levels
    .flatMap((level) => level.modules.flatMap((module) => module.lessons.map((l) => ({ ...l, module }))))
    .find((lesson) => lesson.lesson_number === Number(lessonNumber));

  if (!lesson) return [];
  return Array.isArray(lesson.content.vocabulary) ? lesson.content.vocabulary : [];
};

const getVocabularyForLanguage = (code) => {
  const curriculum = getCurriculumForLanguage(code);
  return curriculum.levels.flatMap((level) =>
    level.modules.flatMap((module) =>
      module.lessons.flatMap((lesson) =>
        (Array.isArray(lesson.content.vocabulary) ? lesson.content.vocabulary : []).map((item, index) => ({
          id: `${lesson.lesson_number}-${index + 1}`,
          lesson_number: lesson.lesson_number,
          word: item.word,
          translation_fr: item.translation_fr,
          phonetic: item.phonetic || "",
          example_target: item.example_target || "",
          example_phonetic: item.example_phonetic || "",
          example_fr: item.example_fr || "",
          level: level.label,
          module: module.label,
        }))
      )
    )
  );
};

const isLocalLanguage = (code) => Boolean(getLocalLanguageMeta(code));

export {
  initializeLocalLanguageData,
  ensureLocalLanguageDataForLanguage,
  isLocalLanguage,
  getLocalLanguages,
  getLocalLanguageMeta as getLocalLanguage,
  getCurriculumForLanguage,
  getLessonMetadataForLanguage as getLocalLessons,
  getVocabularyForLanguage,
  getVocabularyForLesson,
};
