import { describe, expect, it } from "vitest";
import { translateLessonContent } from "./lessonTranslation";

describe("translateLessonContent", () => {
  it("translates lesson dialogue text in English without losing the original content", async () => {
    const lesson = {
      title: "Bonjour",
      dialogue: [{ speaker: "A", text: "Bonjour !", translation: "Bonjour !" }],
    };

    const translated = await translateLessonContent(lesson, "fr", "en", async (text) => {
      if (text === "Bonjour !") return "Hello!";
      return text;
    });

    expect(translated.dialogue[0].translation).toBe("Hello!");
    expect(lesson.dialogue[0].translation).toBe("Bonjour !");
  });

  it("keeps the original text when the translation request fails", async () => {
    const lesson = { dialogue: [{ translation: "Bonjour" }] };

    const translated = await translateLessonContent(lesson, "fr", "en", async () => {
      throw new Error("translation unavailable");
    });

    expect(translated.dialogue[0].translation).toBe("Bonjour");
  });
});
