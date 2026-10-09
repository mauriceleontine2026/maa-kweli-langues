import { describe, expect, it } from "vitest";
import { getLanguageLabel, normalizeLanguageText } from "./languageLabels";

describe("getLanguageLabel", () => {
  it("displays the native name and French name", () => {
    expect(getLanguageLabel({ name: "Bambara", name_fr: "Bambara", code: "bm" })).toBe("Bambara");
    expect(getLanguageLabel({ name: "Akuapem Twi", name_fr: "Twi akua", code: "tw" })).toBe("Akuapem Twi · Twi akua");
  });

  it("falls back to the available name or code", () => {
    expect(getLanguageLabel({ name: "Bambara", code: "bm" })).toBe("Bambara");
    expect(getLanguageLabel({ name_fr: "Bambara", code: "bm" })).toBe("Bambara");
    expect(getLanguageLabel({ code: "bm" })).toBe("bm");
  });

  it("restores UTF-8 text that was previously encoded as Latin-1", () => {
    expect(normalizeLanguageText("BadiarankÃ©")).toBe("Badiaranké");
    expect(normalizeLanguageText("EspaÃ±ol")).toBe("Español");
    expect(normalizeLanguageText("FranÃ§ais")).toBe("Français");
    expect(normalizeLanguageText("JalonkÃ©")).toBe("Jalonké");
  });

  it("restores additional UTF-8 mojibake sequences", () => {
    expect(normalizeLanguageText("Ð¸Ð¹")).toBe("ий");
    expect(normalizeLanguageText("Bassa-ri")).toBe("Bassa-ri");
  });

  it("preserves valid Unicode and ordinary text", () => {
    expect(normalizeLanguageText("Badiaranké")).toBe("Badiaranké");
    expect(normalizeLanguageText("Bassa-ri")).toBe("Bassa-ri");
  });
});
