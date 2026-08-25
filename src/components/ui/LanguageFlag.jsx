import { getFlagForLanguage } from "@/lib/localLanguageData";

const FLAG_EMOJIS = {
  gn: "🇬🇳",
  sn: "🇸🇳",
  ci: "🇨🇮",
  ml: "🇲🇱",
  bf: "🇧🇫",
  mr: "🇲🇷",
  cm: "🇨🇲",
  sl: "🇸🇱",
  gm: "🇬🇲",
  cd: "🇨🇩",
  tz: "🇹🇿",
  fr: "🇫🇷",
  ng: "🇳🇬",
  ne: "🇳🇪",
  us: "🇺🇸",
  gb: "🇬🇧",
  es: "🇪🇸",
  ar: "🇸🇦",
  sa: "🇸🇦",
  default: "🏳️",
};

const normalizeCode = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export default function LanguageFlag({ language, className = "", size = "md" }) {
  const sizeMap = {
    sm: "24px",
    md: "32px",
    lg: "40px",
    xl: "48px",
  };
  const resolvedSize = sizeMap[size] || size;

  const emoji = (() => {
    const explicitEmoji = [
      language?.flag_emoji,
      language?.flagEmoji,
      language?.emoji,
      language?.country_flag,
      language?.countryFlag,
      language?.flag,
    ].find((value) => typeof value === "string" && value.trim());

    if (typeof explicitEmoji === "string") {
      const normalizedEmoji = explicitEmoji.trim();
      if (normalizedEmoji && normalizedEmoji !== "🌍" && normalizedEmoji !== "🌐" && normalizedEmoji !== "🗺️") {
        return normalizedEmoji;
      }
    }

    const countryCode = normalizeCode(
      language?.country_code || language?.countryCode || language?.flag_code || language?.flagCode || language?.country || language?.nationality
    );
    if (countryCode && FLAG_EMOJIS[countryCode]) return FLAG_EMOJIS[countryCode];

    const countryFlag = getFlagForLanguage(language);
    if (countryFlag) return countryFlag;

    const languageCode = normalizeCode(
      language?.code || language?.language_code || language?.languageCode || language?.slug || language?.id || language?.name_fr || language?.name || ""
    );

    const map = {
      guerze: "gn",
      soussou: "gn",
      pular: "gn",
      malinke: "gn",
      malinké: "gn",
      kissi: "gn",
      wolof: "sn",
      lingala: "cd",
      swahili: "tz",
      french: "fr",
      francais: "fr",
      anglais: "gb",
      english: "gb",
      espanol: "es",
      spanish: "es",
      arabe: "sa",
      arabic: "sa",
      toma: "ci",
      tomaa: "ci",
      maninka: "gn",
      mandinka: "gn",
      susu: "gn",
      soso: "gn",
      dyula: "ci",
      bambara: "ml",
      soninke: "ml",
      moore: "bf",
      mooré: "bf",
      hausa: "ng",
      yoruba: "ng",
      fulfulde: "ne",
      fula: "ne",
    };

    return FLAG_EMOJIS[map[languageCode]] || FLAG_EMOJIS.default;
  })();

  return (
    <span
      className={`inline-flex items-center justify-center rounded-md border border-border/70 bg-background/80 shadow-sm ${className}`.trim()}
      style={{ width: resolvedSize, height: resolvedSize, minWidth: resolvedSize, minHeight: resolvedSize, fontSize: `calc(${resolvedSize} * 0.7)`, fontFamily: "Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, Twemoji Mozilla, sans-serif", lineHeight: 1 }}
      aria-label={language?.name_fr || language?.name || "Langue"}
    >
      {emoji}
    </span>
  );
}
