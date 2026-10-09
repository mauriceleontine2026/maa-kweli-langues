const TRANSLATION_CACHE = new Map();
const MAX_TRANSLATION_CHARS = 4000;

const normalizeText = (value) => String(value || "").trim();

const shouldTranslate = (sourceLanguage, targetLanguage) =>
  sourceLanguage !== targetLanguage && targetLanguage === "en";

const cloneLessonContent = (lesson) => {
  if (!lesson || typeof lesson !== "object") return lesson;

  return {
    ...lesson,
    learning_objectives: Array.isArray(lesson.learning_objectives)
      ? [...lesson.learning_objectives]
      : lesson.learning_objectives,
    common_phrases: Array.isArray(lesson.common_phrases)
      ? lesson.common_phrases.map((phrase) => ({ ...phrase }))
      : lesson.common_phrases,
    grammar_points: Array.isArray(lesson.grammar_points)
      ? lesson.grammar_points.map((point) => ({ ...point, rules: [...(point.rules || [])], examples: [...(point.examples || [])] }))
      : lesson.grammar_points,
    dialogue: Array.isArray(lesson.dialogue)
      ? lesson.dialogue.map((line) => ({ ...line }))
      : lesson.dialogue,
    cultural_notes: Array.isArray(lesson.cultural_notes)
      ? [...lesson.cultural_notes]
      : lesson.cultural_notes,
    exercises: Array.isArray(lesson.exercises)
      ? lesson.exercises.map((exercise) => ({ ...exercise, options: [...(exercise.options || [])] }))
      : lesson.exercises,
  };
};

export async function translateTextWithCache(value, sourceLanguage, targetLanguage, translateFn) {
  const text = normalizeText(value);
  if (!text || !shouldTranslate(sourceLanguage, targetLanguage)) return value;

  const cacheKey = `${sourceLanguage}->${targetLanguage}:${text}`;
  if (TRANSLATION_CACHE.has(cacheKey)) return TRANSLATION_CACHE.get(cacheKey);

  try {
    const translated = await translateFn(text);
    const safeTranslation = normalizeText(translated);
    if (!safeTranslation) return value;

    TRANSLATION_CACHE.set(cacheKey, safeTranslation);
    return safeTranslation;
  } catch (error) {
    console.warn("Lesson content translation failed:", error);
    return value;
  }
}

export async function translateLessonContent(lesson, sourceLanguage = "fr", targetLanguage = "en", translateFn = null) {
  if (!lesson || !shouldTranslate(sourceLanguage, targetLanguage)) return lesson;

  const translationFunction = typeof translateFn === "function"
    ? translateFn
    : async () => {
        throw new Error("No translation function provided");
      };

  const translatedLesson = cloneLessonContent(lesson);
  const fieldsToTranslate = [
    ["title", "title"],
    ["introduction", "introduction"],
    ["learning_objectives", "learning_objectives"],
    ["common_phrases", "common_phrases"],
    ["grammar_points", "grammar_points"],
    ["dialogue", "dialogue"],
    ["cultural_notes", "cultural_notes"],
    ["exercises", "exercises"],
  ];

  for (const [sourceField, targetField] of fieldsToTranslate) {
    if (sourceField === "title" || sourceField === "introduction") {
      const value = translatedLesson[sourceField];
      if (typeof value === "string") {
        translatedLesson[targetField] = await translateTextWithCache(value, sourceLanguage, targetLanguage, translationFunction);
      }
      continue;
    }

    const items = Array.isArray(translatedLesson[sourceField]) ? translatedLesson[sourceField] : [];
    if (!items.length) continue;

    if (sourceField === "learning_objectives" || sourceField === "cultural_notes") {
      translatedLesson[targetField] = await Promise.all(items.map(async (value) => {
        const text = normalizeText(value);
        if (!text || text.length > MAX_TRANSLATION_CHARS) return value;
        return translateTextWithCache(value, sourceLanguage, targetLanguage, translationFunction);
      }));
      continue;
    }

    if (sourceField === "common_phrases") {
      translatedLesson[targetField] = await Promise.all(items.map(async (phrase) => {
        if (!phrase || typeof phrase !== "object") return phrase;
        const translatedPhrase = { ...phrase };
        translatedPhrase.translation = await translateTextWithCache(phrase.translation || phrase.original, sourceLanguage, targetLanguage, translationFunction);
        translatedPhrase.context = phrase.context ? await translateTextWithCache(phrase.context, sourceLanguage, targetLanguage, translationFunction) : phrase.context;
        return translatedPhrase;
      }));
      continue;
    }

    if (sourceField === "grammar_points") {
      translatedLesson[targetField] = await Promise.all(items.map(async (point) => {
        if (!point || typeof point !== "object") return point;
        const translatedPoint = { ...point };
        translatedPoint.concept = point.concept ? await translateTextWithCache(point.concept, sourceLanguage, targetLanguage, translationFunction) : point.concept;
        translatedPoint.explanation = point.explanation ? await translateTextWithCache(point.explanation, sourceLanguage, targetLanguage, translationFunction) : point.explanation;
        translatedPoint.rules = await Promise.all((point.rules || []).map(async (rule) =>
          translateTextWithCache(rule, sourceLanguage, targetLanguage, translationFunction)
        ));
        translatedPoint.examples = await Promise.all((point.examples || []).map(async (example) => ({
          ...example,
          meaning: example.meaning ? await translateTextWithCache(example.meaning, sourceLanguage, targetLanguage, translationFunction) : example.meaning,
        })));
        return translatedPoint;
      }));
      continue;
    }

    if (sourceField === "dialogue") {
      translatedLesson[targetField] = await Promise.all(items.map(async (line) => {
        if (!line || typeof line !== "object") return line;
        const translatedLine = { ...line };
        translatedLine.translation = line.translation ? await translateTextWithCache(line.translation, sourceLanguage, targetLanguage, translationFunction) : line.translation;
        return translatedLine;
      }));
      continue;
    }

    if (sourceField === "exercises") {
      translatedLesson[targetField] = await Promise.all(items.map(async (exercise) => {
        if (!exercise || typeof exercise !== "object") return exercise;
        const translatedExercise = { ...exercise };
        translatedExercise.question = exercise.question ? await translateTextWithCache(exercise.question, sourceLanguage, targetLanguage, translationFunction) : exercise.question;
        translatedExercise.instruction = exercise.instruction ? await translateTextWithCache(exercise.instruction, sourceLanguage, targetLanguage, translationFunction) : exercise.instruction;
        translatedExercise.sentence_with_blank = exercise.sentence_with_blank ? await translateTextWithCache(exercise.sentence_with_blank, sourceLanguage, targetLanguage, translationFunction) : exercise.sentence_with_blank;
        translatedExercise.options = await Promise.all((exercise.options || []).map(async (option) =>
          translateTextWithCache(option, sourceLanguage, targetLanguage, translationFunction)
        ));
        return translatedExercise;
      }));
    }
  }

  return translatedLesson;
}
