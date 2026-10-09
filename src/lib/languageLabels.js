const decoder = new TextDecoder("utf-8", { fatal: true });

function decodeUtf8Mojibake(text) {
  const bytes = Uint8Array.from(text, (character) => character.codePointAt(0));

  try {
    const decoded = decoder.decode(bytes);
    return decoded === text ? text : decoded;
  } catch {
    return text;
  }
}

export function normalizeLanguageText(value) {
  return decodeUtf8Mojibake(String(value ?? ""));
}

export function getLanguageLabel(language) {
  if (!language) return "";

  const nativeName = normalizeLanguageText(language.name || "").trim();
  const frenchName = normalizeLanguageText(language.name_fr || "").trim();

  if (!nativeName) return frenchName || language.code || "";
  if (!frenchName || nativeName.toLocaleLowerCase() === frenchName.toLocaleLowerCase()) {
    return nativeName;
  }

  return `${nativeName} · ${frenchName}`;
}
