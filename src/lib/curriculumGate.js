import lessonCurriculum from "@/data_langues/lessonCurriculum";
import { getCurriculumForLanguage as getLocalCurriculum, isLocalLanguage } from "@/lib/localLanguageData";

const normalizeText = (value) => String(value || "").trim().toLowerCase();
const getCurriculumForLanguage = (langCode) => (isLocalLanguage(langCode) ? getLocalCurriculum(langCode) : lessonCurriculum);
export const getCurriculumForLanguageExport = (langCode) => getCurriculumForLanguage(langCode);

export const getModuleLessonNumbers = (module) => {
  return Array.isArray(module?.lessons)
    ? module.lessons
        .map((lesson) => Number(lesson.lesson_number))
        .filter((n) => Number.isFinite(n) && n > 0)
    : [];
};

export const getModuleById = (moduleId, langCode) => {
  if (!moduleId) return null;
  const curriculum = getCurriculumForLanguage(langCode);
  for (let levelIndex = 0; levelIndex < curriculum.levels.length; levelIndex += 1) {
    const level = curriculum.levels[levelIndex];
    for (let moduleIndex = 0; moduleIndex < level.modules.length; moduleIndex += 1) {
      const module = level.modules[moduleIndex];
      if (module.id === moduleId) {
        return { level, module, levelIndex, moduleIndex };
      }
    }
  }
  return null;
};

export const findModuleByLessonNumber = (lessonNumber, niveauLabel = "", langCode) => {
  const lessonNum = Number(lessonNumber);
  if (!Number.isFinite(lessonNum) || lessonNum <= 0) return null;

  const curriculum = getCurriculumForLanguage(langCode);
  const normalizedNiveau = normalizeText(niveauLabel);
  const candidates = normalizedNiveau
    ? curriculum.levels.filter(
        (level) =>
          normalizeText(level.label).includes(normalizedNiveau) ||
          normalizeText(level.id).includes(normalizedNiveau.replace(/é/g, "e"))
      )
    : curriculum.levels;

  for (let levelIndex = 0; levelIndex < candidates.length; levelIndex += 1) {
    const level = candidates[levelIndex];
    for (let moduleIndex = 0; moduleIndex < level.modules.length; moduleIndex += 1) {
      const module = level.modules[moduleIndex];
      if (getModuleLessonNumbers(module).includes(lessonNum)) {
        return { level, module, levelIndex, moduleIndex };
      }
    }
  }

  for (let levelIndex = 0; levelIndex < curriculum.levels.length; levelIndex += 1) {
    const level = curriculum.levels[levelIndex];
    for (let moduleIndex = 0; moduleIndex < level.modules.length; moduleIndex += 1) {
      const module = level.modules[moduleIndex];
      if (getModuleLessonNumbers(module).includes(lessonNum)) {
        return { level, module, levelIndex, moduleIndex };
      }
    }
  }

  return null;
};

export const getModuleCompletionState = (module, completedLessons, exerciseRecords = {}) => {
  const lessonNumbers = getModuleLessonNumbers(module);
  const moduleLessonsDone = lessonNumbers.length > 0 && lessonNumbers.every((n) => completedLessons.includes(n));
  const exerciseRecord = exerciseRecords[module.id] || {};
  const exerciseScore = Number(exerciseRecord?.score || 0);
  const exerciseCompleted = Boolean(exerciseRecord?.completed);
  const exercisePass = exerciseCompleted && exerciseScore >= 70;

  return {
    moduleLessonsDone,
    exerciseScore,
    exerciseCompleted,
    exercisePass,
  };
};

export const getBeginnerCompletionStatus = (
  completedLessons,
  exerciseRecords = {},
  minimumAverageScore = 70,
  langCode
) => {
  const curriculum = getCurriculumForLanguage(langCode);
  const beginnerLevel = curriculum.levels.find((level) => level.id === "niveau-debutant");
  if (!beginnerLevel) {
    return { complete: false, averageScore: 0, allModulesPassed: false, allLessonsDone: false };
  }

  const moduleStates = beginnerLevel.modules.map((module) =>
    getModuleCompletionState(module, completedLessons, exerciseRecords)
  );

  const allModulesPassed = moduleStates.every((state) => state.moduleLessonsDone && state.exercisePass);
  const averageScore = moduleStates.length > 0
    ? Math.round(moduleStates.reduce((sum, state) => sum + state.exerciseScore, 0) / moduleStates.length)
    : 0;
  const allLessonsDone = beginnerLevel.modules.every((module) => {
    const lessonNumbers = getModuleLessonNumbers(module);
    return lessonNumbers.length > 0 && lessonNumbers.every((n) => completedLessons.includes(n));
  });

  return {
    complete: allModulesPassed && allLessonsDone && averageScore >= minimumAverageScore,
    averageScore,
    allModulesPassed,
    allLessonsDone,
  };
};

export const getAvailableState = (
  levelIndex,
  moduleIndex,
  level,
  module,
  completedLessons,
  exerciseRecords = {},
  langCode
) => {
  const currentModuleState = getModuleCompletionState(module, completedLessons, exerciseRecords);
  const beginnerStatus = getBeginnerCompletionStatus(completedLessons, exerciseRecords, 70, langCode);
  const levelEnabled = levelIndex === 0 ? true : beginnerStatus.complete;

  const previousModuleComplete = moduleIndex === 0
    ? levelEnabled
    : (() => {
        const previousModule = level.modules[moduleIndex - 1];
        const previousModuleState = getModuleCompletionState(previousModule, completedLessons, exerciseRecords);
        return previousModuleState.moduleLessonsDone && previousModuleState.exercisePass;
      })();

  return {
    ...currentModuleState,
    available: levelEnabled && previousModuleComplete,
    previousModuleComplete,
    beginnerStatusComplete: beginnerStatus.complete,
    levelEnabled,
  };
};

export const isLessonAccessible = (
  lessonNumber,
  niveauLabel,
  completedLessons,
  exerciseRecords = {},
  langCode
) => {
  const found = findModuleByLessonNumber(lessonNumber, niveauLabel, langCode);
  if (!found) return true;
  const { levelIndex, moduleIndex, level, module } = found;
  return getAvailableState(levelIndex, moduleIndex, level, module, completedLessons, exerciseRecords, langCode).available;
};

export const isModuleAccessible = (moduleId, completedLessons, exerciseRecords = {}, langCode) => {
  const found = getModuleById(moduleId, langCode);
  if (!found) return true;
  const { levelIndex, moduleIndex, level, module } = found;
  return getAvailableState(levelIndex, moduleIndex, level, module, completedLessons, exerciseRecords, langCode).available;
};

export const getLockMessageForModule = (levelIndex, moduleIndex, level, beginnerComplete) => {
  if (levelIndex === 0) {
    return moduleIndex === 0
      ? "Ce module est disponible dès le départ."
      : "Termine le module précédent et valide sa série d’exercices avec au moins 70%.";
  }
  return beginnerComplete
    ? "Termine le module précédent pour débloquer ce module."
    : "Débloque ce niveau en terminant d’abord toutes les leçons et les séries d’exercices du Niveau Débutant avec une moyenne d’au moins 70%.";
};
