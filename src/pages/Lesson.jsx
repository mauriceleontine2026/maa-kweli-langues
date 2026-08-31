import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { getLanguageName, getLocalizedCountryForLanguage, getLocalizedCurriculumText } from "@/lib/localLanguageData";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  getLanguageByCode,
  getLessonsForLanguage,
  getVocabularyForLanguage,
  getVocabularyForLesson,
} from "@/api/languageService";
import { getProgress, updateProgress } from "@/api/progressService";
import {
  ArrowLeft,
  ArrowRight,
  Volume2,
  Heart,
  X,
  Check,
  WifiOff,
  BookOpen,
  Target,
  MessageCircle,
  Sparkles,
  ExternalLink,
  Clock3,
  ListChecks,
} from "lucide-react";
import LanguageFlag from "@/components/ui/LanguageFlag";
import { motion, AnimatePresence } from "framer-motion";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import {
  getOfflineVocab,
  getOfflineLessons,
  getOfflineLang,
  queueProgressUpdate,
} from "@/lib/offlineStorage";
import { getNextUnlockedLesson } from "@/lib/progressUtils";
import { playAudioSource, speakText } from "@/lib/audioService";
import {
  findModuleByLessonNumber,
  getAvailableState,
  getBeginnerCompletionStatus,
  getLockMessageForModule,
  getCurriculumForLanguageExport,
} from "@/lib/curriculumGate";

export default function Lesson() {
  const { t, language: interfaceLanguage } = useLanguage();
  const { langCode, lessonNum } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [language, setLanguage] = useState(null);
  const [lessonMeta, setLessonMeta] = useState(null);
  const [items, setItems] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [phase, setPhase] = useState("learn");
  const [activeSection, setActiveSection] = useState("vocabulaire");
  const [dialogueRole, setDialogueRole] = useState(null);
  const [showDialogueTranslation, setShowDialogueTranslation] = useState(false);
  const [completedObjectives, setCompletedObjectives] = useState([]);
  const [openGrammarPoint, setOpenGrammarPoint] = useState(0);
  const [cardIdx, setCardIdx] = useState(0);
  const [quizIdx, setQuizIdx] = useState(0);
  const [choices, setChoices] = useState([]);
  const [selected, setSelected] = useState(null);
  const [hearts, setHearts] = useState(5);
  const [correct, setCorrect] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [progressError, setProgressError] = useState(null);
  const [completedLessons, setCompletedLessons] = useState([]);
  const [lessonLockedMessage, setLessonLockedMessage] = useState("");
  const [lessonLocked, setLessonLocked] = useState(false);

  const online = useOnlineStatus();

  const getExerciseRecords = () => {
    if (typeof window === "undefined") return {};
    const curriculum = getCurriculumForLanguageExport(langCode);

    return curriculum.levels.reduce((acc, level) => {
      level.modules.forEach((module) => {
        const raw = window.localStorage.getItem(`mbaara-exercise-${langCode}-${module.id}`);
        if (!raw) {
          acc[module.id] = null;
          return;
        }

        try {
          acc[module.id] = JSON.parse(raw);
        } catch (e) {
          acc[module.id] = null;
        }
      });
      return acc;
    }, {});
  };

  useEffect(() => {
    const safeLangCode = langCode || "";
    const safeLessonNum = parseInt(lessonNum || "0", 10);

    setLoading(true);
    setFetchError(null);

    const languagePromise = online
      ? getLanguageByCode(safeLangCode)
      : Promise.resolve(getOfflineLang(safeLangCode));

    const lessonItemsPromise = online
      ? getVocabularyForLesson(safeLangCode, safeLessonNum)
      : Promise.resolve(
          Array.isArray(getOfflineVocab(safeLangCode))
            ? getOfflineVocab(safeLangCode).filter((v) => v.lesson_number === safeLessonNum)
            : []
        );

    const allItemsPromise = online
      ? getVocabularyForLanguage(safeLangCode)
      : Promise.resolve(Array.isArray(getOfflineVocab(safeLangCode)) ? getOfflineVocab(safeLangCode) : []);

    const lessonMetaPromise = online
      ? getLessonsForLanguage(safeLangCode)
      : Promise.resolve(getOfflineLessons(safeLangCode));

    Promise.allSettled([
      languagePromise,
      lessonItemsPromise,
      allItemsPromise,
      lessonMetaPromise,
    ])
      .then(([langRes, itemsRes, allRes, lessonsRes]) => {
        const meta =
          lessonsRes.status === "fulfilled" && Array.isArray(lessonsRes.value)
            ? lessonsRes.value.find((lesson) => lesson.lesson_number === safeLessonNum)
            : null;

        setLessonMeta(meta);
        setLanguage(langRes.status === "fulfilled" ? langRes.value ?? null : null);
        setItems(itemsRes.status === "fulfilled" && Array.isArray(itemsRes.value) ? itemsRes.value : []);
        setAllItems(allRes.status === "fulfilled" && Array.isArray(allRes.value) ? allRes.value : []);
        setLoading(false);
      })
      .catch((err) => {
        setFetchError(err instanceof Error ? err.message : String(err));
        setLanguage(null);
        setItems([]);
        setAllItems([]);
        setLoading(false);
      });
  }, [langCode, lessonNum, online]);

  useEffect(() => {
    if (!user) return;

    getProgress()
      .then((data) => {
        const progress = Array.isArray(data) ? data.find((p) => p.language_code === langCode) : null;
        const completed = Array.isArray(progress?.completed_lessons)
          ? progress.completed_lessons.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0)
          : [];
        setCompletedLessons(completed);
      })
      .catch(() => setCompletedLessons([]));
  }, [user, langCode]);

  useEffect(() => {
    const moduleNumber = Number(lessonNum || "0");
    if (!moduleNumber || !langCode) return;

    const exerciseRecords = getExerciseRecords();
    const moduleInfo = findModuleByLessonNumber(
      moduleNumber,
      lessonMeta?.module?.niveau || lessonMeta?.level || "",
      langCode
    );

    if (moduleInfo) {
      const beginnerStatus = getBeginnerCompletionStatus(completedLessons, exerciseRecords, 70, langCode);
      const available = getAvailableState(
        moduleInfo.levelIndex,
        moduleInfo.moduleIndex,
        moduleInfo.level,
        moduleInfo.module,
        completedLessons,
        exerciseRecords,
        langCode
      ).available;

      setLessonLocked(!available);
      setLessonLockedMessage(
        available
          ? ""
          : getLockMessageForModule(
              moduleInfo.levelIndex,
              moduleInfo.moduleIndex,
              moduleInfo.level,
              beginnerStatus.complete
            )
      );
    } else {
      setLessonLocked(false);
      setLessonLockedMessage("");
    }
  }, [lessonNum, langCode, completedLessons, lessonMeta]);

  useEffect(() => {
    if (phase === "quiz" && items[quizIdx]) {
      const item = items[quizIdx];
      if (allItems.length >= 4) {
        const wrong = allItems
          .filter((i) => i.id !== item.id && i.translation_fr)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);

        setChoices([...wrong.map((i) => i.translation_fr), item.translation_fr].sort(() => Math.random() - 0.5));
      } else {
        setChoices([item.translation_fr]);
      }
      setSelected(null);
    }
  }, [quizIdx, phase, items, allItems]);

  const speak = (text) => {
    if (!text) return;
    speakText(text, language?.code || langCode || "fr");
  };

  const playAudio = (item) => {
    const source = item || {};
    playAudioSource(source, language?.code || langCode || "fr", {
      fallbackText: source.word || "",
    });
  };

  const handleChoice = (choice) => {
    if (selected !== null) return;

    setSelected(choice);
    if (choice === items[quizIdx]?.translation_fr) {
      setCorrect((c) => c + 1);
    } else {
      setHearts((h) => Math.max(0, h - 1));
    }

    setTimeout(() => {
      if (quizIdx < items.length - 1) {
        setQuizIdx((q) => q + 1);
      } else {
        setPhase("complete");
        saveProgress();
      }
    }, 1200);
  };

  const saveProgress = async () => {
    if (!user) return;

    const xpEarned = Math.round((correct / items.length) * 20) + 5;
    const num = parseInt(lessonNum || "0", 10);

    if (!online) {
      queueProgressUpdate({
        type: "lesson_complete",
        user_id: user.id,
        language_code: langCode,
        lesson_number: num,
        xp: xpEarned,
      });

      const offlineLessons = getOfflineLessons(langCode);
      const lessonNumbers = offlineLessons
        .map((lesson) => Number(lesson?.lesson_number))
        .filter((n) => Number.isFinite(n) && n > 0)
        .sort((a, b) => a - b);

      const nextLessonOffline = getNextUnlockedLesson([num], lessonNumbers);

      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(`mbaara-next-lesson-${langCode}`, String(nextLessonOffline));
        }
      } catch (e) {}

      window.dispatchEvent(new Event("mbaara-progress-updated"));
      window.dispatchEvent(
        new CustomEvent("mbaara-lesson-completed", {
          detail: { lessonNumber: num, nextLesson: nextLessonOffline, completedLessons: [num] },
        })
      );

      try {
        navigate(`/lecon/${langCode}/${nextLessonOffline}`);
      } catch (e) {}
      return;
    }

    try {
      setProgressError(null);
      const updated = await updateProgress({
        type: "lesson_complete",
        language_code: langCode,
        lesson_number: num,
        xp: xpEarned,
      });

      if (updated?.error) {
        if (updated.status === 401) {
          setProgressError(t("Vous devez être connecté pour sauvegarder la progression."));
        } else if (updated.status === 422) {
          setProgressError(t("Impossible de sauvegarder la progression : requête invalide."));
        } else {
          setProgressError(t("Erreur lors de la sauvegarde de la progression. Réessayez plus tard."));
        }
        return;
      }

      const refreshed = await getProgress();
      const completedLessonsList =
        updated?.completed_lessons || refreshed?.find?.((p) => p.language_code === langCode)?.completed_lessons || [];

      const lessonMetaList = online ? await getLessonsForLanguage(langCode) : getOfflineLessons(langCode);
      const lessonNumbers =
        lessonMetaList?.map((lesson) => lesson.lesson_number).filter((n) => Number.isFinite(Number(n)) && Number(n) > 0) || [];
      const nextLesson = getNextUnlockedLesson(completedLessonsList, lessonNumbers);

      window.dispatchEvent(new Event("mbaara-progress-updated"));
      window.dispatchEvent(
        new CustomEvent("mbaara-lesson-completed", {
          detail: { lessonNumber: num, nextLesson, completedLessons: completedLessonsList },
        })
      );

      if (typeof window !== "undefined") {
        window.localStorage.setItem(`mbaara-next-lesson-${langCode}`, String(nextLesson));
      }

      try {
        if (nextLesson && nextLesson > num) {
          navigate(`/lecon/${langCode}/${nextLesson}`);
        } else {
          navigate(`/apprendre/${langCode}`);
        }
      } catch (e) {}
    } catch (error) {
      console.error("Progress update failed", error);
      if (error?.status === 401) {
        setProgressError(t("Vous devez être connecté pour sauvegarder la progression."));
      } else if (error?.status === 422) {
        setProgressError(t("Impossible de sauvegarder la progression : requête invalide."));
      } else {
        setProgressError(t("Erreur lors de la sauvegarde de la progression. Réessayez plus tard."));
      }
    }
  };

  const normalizeLessonLevel = (value) => {
    const raw = String(value || "").trim().toUpperCase();
    if (raw === "A1" || raw === "A2") return "Débutant";
    if (raw === "B1") return "Intermédiaire";
    if (raw === "B2" || raw === "C1" || raw === "C2") return "Avancé";
    if (raw === "DEBUTANT" || raw === "DÉBUTANT") return "Débutant";
    if (raw === "INTERMEDIAIRE" || raw === "INTERMÉDIAIRE") return "Intermédiaire";
    if (raw === "AVANCE" || raw === "AVANCÉ") return "Avancé";
    return value || null;
  };

  const lessonTitle = getLocalizedCurriculumText(
    lessonMeta?.title_fr || lessonMeta?.title || lessonMeta?.module?.theme || `Leçon ${parseInt(lessonNum || "0", 10)}`,
    interfaceLanguage,
  );
  const lessonDescription =
    getLocalizedCurriculumText(
      lessonMeta?.introduction ||
      lessonMeta?.description ||
      lessonMeta?.module?.description ||
      `${items.length} mots à apprendre`,
      interfaceLanguage,
    );
  const lessonNiveau = normalizeLessonLevel(lessonMeta?.module?.niveau || lessonMeta?.level || null);
  const lessonBlocked = lessonLocked && !loading;

  const lessonSections = [
    { id: "objectifs", label: t("Objectifs"), icon: Target, visible: (lessonMeta?.learning_objectives?.length || 0) > 0 },
    { id: "vocabulaire", label: t("Vocabulaire"), icon: BookOpen, visible: items.length > 0 },
    { id: "phrases", label: t("Phrases"), icon: MessageCircle, visible: (lessonMeta?.common_phrases?.length || 0) > 0 },
    { id: "phonetique", label: t("Phonétique"), icon: Volume2, visible: Boolean(lessonMeta?.phonetic_focus) },
    { id: "grammaire", label: t("Grammaire"), icon: Sparkles, visible: (lessonMeta?.grammar_points?.length || 0) > 0 },
    { id: "dialogue", label: t("Dialogue"), icon: MessageCircle, visible: (lessonMeta?.dialogue?.length || 0) > 0 },
    { id: "culture", label: t("Culture"), icon: Sparkles, visible: (lessonMeta?.cultural_notes?.length || 0) > 0 },
    { id: "exercices", label: t("Exercices"), icon: Target, visible: (lessonMeta?.exercises?.length || 0) > 0 },
    { id: "sources", label: t("Sources"), icon: ExternalLink, visible: (lessonMeta?.sources?.length || 0) > 0 || Boolean(lessonMeta?.confidence_note) },
  ].filter((section) => section.visible);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="font-medium text-red-500">{t("Erreur de chargement :")} {fetchError}</p>
        <button onClick={() => navigate(-1)} className="text-sm font-medium text-primary">
          ← {t("Retour")}
        </button>
      </div>
    );
  }

  if (!language) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-muted-foreground">{t("Langue introuvable ou leçon invalide.")}</p>
        <button onClick={() => navigate(-1)} className="text-sm font-medium text-primary">
          ← {t("Retour")}
        </button>
      </div>
    );
  }

  if (lessonBlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div className="max-w-lg rounded-[2rem] border border-amber-300/40 bg-amber-500/10 p-8 shadow-sm">
          <p className="mb-3 text-base font-semibold text-amber-900">{t("Accès restreint")}</p>
          <p className="mb-6 text-sm text-amber-800">
            {getLocalizedCurriculumText(
              lessonLockedMessage ||
                "Cette leçon est verrouillée tant que le niveau Débutant n'est pas achevé avec tous les exercices validés.",
              interfaceLanguage,
            )}
          </p>
          <button
            onClick={() => navigate(`/apprendre/${langCode}`)}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            {t("Retour au curriculum")}
          </button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <WifiOff size={40} className="text-yellow-500" />
        <p className="text-muted-foreground">{t("Aucun mot trouvé pour cette leçon.")}</p>
        <button onClick={() => navigate(-1)} className="text-sm font-medium text-primary">
          ← {t("Retour")}
        </button>
      </div>
    );
  }

  const currentItem = phase === "learn" ? items[cardIdx] : items[quizIdx];
  const progress = phase === "complete"
    ? 1
    : phase === "learn"
      ? (cardIdx / Math.max(1, items.length)) * 0.5
      : 0.5 + (quizIdx / Math.max(1, items.length)) * 0.5;
  const sectionTitles = {
    objectifs: t("Objectifs à débloquer"),
    phrases: t("Phrases utiles"),
    phonetique: t("Focus phonétique"),
    grammaire: t("Les points de grammaire"),
    dialogue: t("Dialogue et conversation"),
    culture: t("Notes culturelles"),
    exercices: t("Le défi de la leçon"),
    sources: t("Sources de la leçon"),
  };

  return (
    <div
      className="min-h-screen bg-background"
      style={{
        backgroundImage: `radial-gradient(circle at 10% 0%, ${language.color}15, transparent 25%), radial-gradient(circle at 90% 15%, ${language.color}12, transparent 20%)`,
      }}
    >
      <div className="sticky top-0 z-20 border-b border-border/70 bg-background/85 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          {!online && (
            <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-yellow-500">
              <WifiOff size={14} /> {t("Hors-ligne")}
            </span>
          )}

          <button
            aria-label={t("Retour au curriculum")}
            onClick={() => navigate(-1)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex-1">
            <div className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <span>{phase === "learn" ? t("Apprentissage") : phase === "quiz" ? t("Quiz") : t("Terminé")}</span>
              <span>
                {phase === "learn"
                  ? `${cardIdx + 1}/${items.length}`
                  : phase === "quiz"
                    ? `${quizIdx + 1}/${items.length}`
                    : "100%"}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <motion.div
                className="h-2 rounded-full"
                style={{ background: language.color }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-0.5 text-red-500">
            {[...Array(5)].map((_, index) => (
              <Heart
                key={index}
                size={16}
                fill={index < hearts ? "currentColor" : "none"}
                className={index < hearts ? "" : "text-muted-foreground/30"}
              />
            ))}
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-8 lg:py-10">
        <section className="relative mb-8 overflow-hidden rounded-[2rem] border border-border/70 bg-card/90 p-6 shadow-[0_24px_80px_-44px_rgba(15,23,42,0.7)] lg:p-10">
          <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full opacity-20 blur-3xl" style={{ background: language.color }} />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
                <span className="rounded-full bg-primary/10 px-3 py-1.5">{t("Leçon")} {lessonNum}</span>
                {lessonNiveau && (
                  <span className="rounded-full border border-border px-3 py-1.5 text-muted-foreground">
                    {getLocalizedCurriculumText(lessonNiveau, interfaceLanguage)}
                  </span>
                )}
              </div>

              <h1 className="font-heading text-3xl font-bold leading-tight text-foreground lg:text-5xl">
                {lessonTitle}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground lg:text-base">
                {lessonDescription}
              </p>
            </div>

            <div className="flex items-center gap-4 rounded-[1.5rem] border border-border bg-secondary/30 px-4 py-3">
              <div
                className="grid h-16 w-16 place-items-center rounded-2xl text-white shadow-lg"
                style={{ background: language.color }}
              >
                <LanguageFlag language={language} size="lg" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">{getLanguageName(language, interfaceLanguage)}</div>
                <div className="text-xs text-muted-foreground">{getLocalizedCountryForLanguage(language, interfaceLanguage)}</div>
              </div>
            </div>
          </div>

          <div className="relative mt-8 grid gap-3 border-t border-border/70 pt-5 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { icon: BookOpen, value: items.length, label: t("mots") },
              { icon: Target, value: lessonMeta?.learning_objectives?.length || 0, label: t("objectifs") },
              { icon: MessageCircle, value: lessonMeta?.common_phrases?.length || 0, label: t("phrases") },
              { icon: Sparkles, value: lessonMeta?.grammar_points?.length || 0, label: t("points clés") },
            ].map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/25 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon size={18} />
                </div>
                <div>
                  <div className="font-semibold text-foreground">{value}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="relative mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setActiveSection("vocabulaire")}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90"
            >
              <BookOpen size={16} /> {t("Commencer la leçon")}
            </button>

            {lessonMeta?.exercises?.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveSection("exercices")}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-5 py-3 text-sm font-bold text-foreground transition hover:border-primary/50 hover:text-primary"
              >
                <Target size={16} /> {t("Voir le défi")}
              </button>
            )}
          </div>

          <div className="relative mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border/70 pt-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Clock3 size={14} className="text-primary" /> {t("Environ")} {Math.max(5, Math.ceil(items.length * 1.5))} min</span>
            <span className="inline-flex items-center gap-1.5"><ListChecks size={14} className="text-primary" /> {t("Apprentissage puis défi")}</span>
            <span className="inline-flex items-center gap-1.5"><Sparkles size={14} className="text-primary" /> {t("Progression sauvegardée")}</span>
          </div>
        </section>

        <nav
          aria-label={t("Sections de la leçon")}
          className="sticky top-[4.4rem] z-10 mb-8 rounded-[1.7rem] border border-border/70 bg-card/90 p-3 shadow-lg shadow-black/5 backdrop-blur-xl"
        >
          <div className="mb-3 flex items-center justify-between gap-3 px-2">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              {t("Plan de la leçon")}
            </div>
            <span className="text-xs text-muted-foreground">{lessonSections.length} {t("parties")}</span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 lg:grid-cols-5">
            {lessonSections.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-current={activeSection === id ? "page" : undefined}
                onClick={() => setActiveSection(id)}
                className={`flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition sm:min-w-0 ${
                  activeSection === id
                    ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "border-border bg-background/70 text-muted-foreground hover:border-primary/50 hover:bg-primary/10 hover:text-foreground"
                }`}
              >
                <Icon size={15} className={activeSection === id ? "" : "text-primary"} />
                {label}
              </button>
            ))}
          </div>
        </nav>

        {progressError && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {progressError}
          </div>
        )}

        {activeSection === "vocabulaire" && (
          <section id="vocabulaire" className="scroll-mt-24">
            <AnimatePresence mode="wait">
              {phase === "learn" && (
                <motion.div key="learn-grid" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="w-full">
                  <div className="mb-5 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
                        {t("Apprentissage / Vocabulaire")}
                      </p>
                      <h2 className="mt-1 font-heading text-2xl font-bold text-foreground">
                        {t("Découvre les mots de la leçon")}
                      </h2>
                    </div>
                    <span className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                      {items.length} {t("cartes")}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                    {items.map((item, index) => (
                      <motion.article
                        key={item.word_id || `${item.word}-${index}`}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index * 0.025, 0.35) }}
                        className="flex min-h-[260px] flex-col rounded-[1.5rem] border border-border bg-card p-4 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.7)] transition hover:-translate-y-1 hover:border-primary/40"
                      >
                        <div className="flex items-center justify-between">
                          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                            <LanguageFlag language={language} size="sm" />
                          </span>
                          <span className="text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                        </div>

                        <div className="flex flex-1 flex-col justify-center py-5">
                          <h3 className="text-xl font-bold text-foreground">{getLocalizedCurriculumText(item.translation_fr || item.word, interfaceLanguage)}</h3>
                          <p className="mt-2 text-lg font-medium text-muted-foreground">{item.word}</p>
                          {item.phonetic && <p className="mt-2 font-mono text-xs text-primary">/{item.phonetic}/</p>}
                          {item.example_target && (
                            <div className="mt-3 rounded-xl bg-primary/5 p-3">
                              <p className="line-clamp-2 text-xs italic text-muted-foreground">“{item.example_target}”</p>
                              {item.example_phonetic && (
                                <p className="mt-1 font-mono text-[11px] text-primary">{item.example_phonetic}</p>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => playAudio(item)}
                            className="flex-1 rounded-xl bg-primary px-3 py-2.5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
                          >
                            <Volume2 size={15} className="mr-1.5 inline" /> {t("Écouter")}
                          </button>
                          <button
                            type="button"
                            aria-label={`${t("Écouter")} ${item.word}`}
                            onClick={() => playAudio(item)}
                            className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-secondary text-foreground transition hover:bg-muted"
                          >
                            <Volume2 size={16} />
                          </button>
                        </div>
                      </motion.article>
                    ))}
                  </div>

                  <div className="mt-6 flex justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        setCardIdx(items.length - 1);
                        setPhase("quiz");
                        setQuizIdx(0);
                      }}
                      className="rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90"
                    >
                      {t("Commencer l’examen")} →
                    </button>
                  </div>
                </motion.div>
              )}

              {phase === "quiz" && currentItem && (
                <motion.div
                  key={`quiz-${quizIdx}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex flex-col gap-6"
                >
                  <p className="text-center text-[11px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
                    Quiz · {quizIdx + 1}/{items.length}
                  </p>

                  <div className="rounded-[1.75rem] border border-border bg-card p-6 text-center shadow-sm">
                    <div className="mb-2 flex items-center justify-center gap-3">
                      <LanguageFlag language={language} size="md" />
                      <h2 className="font-heading text-3xl font-bold text-foreground">{currentItem.word}</h2>
                      <button onClick={() => speak(currentItem.word)} className="text-muted-foreground transition hover:text-primary">
                        <Volume2 size={18} />
                      </button>
                    </div>
                    {currentItem.phonetic && (
                      <p className="font-mono text-sm text-primary">/{currentItem.phonetic}/</p>
                    )}
                    <p className="mt-3 text-sm text-muted-foreground">{t("Quelle est la traduction ?")}</p>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {choices.map((choice, index) => {
                      const isCorrect = choice === currentItem.translation_fr;
                      let stateClass = "border-border bg-card text-foreground";

                      if (selected !== null) {
                        if (choice === selected && isCorrect) {
                          stateClass = "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
                        } else if (choice === selected && !isCorrect) {
                          stateClass = "border-red-500 bg-red-500/10 text-red-700 dark:text-red-300";
                        } else if (isCorrect) {
                          stateClass = "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
                        } else {
                          stateClass = "border-border bg-secondary text-muted-foreground";
                        }
                      }

                      return (
                        <button
                          key={index}
                          onClick={() => handleChoice(choice)}
                          className={`flex w-full items-center justify-between rounded-2xl border-2 px-5 py-4 text-left font-medium transition ${stateClass} ${selected === null ? "cursor-pointer hover:border-primary/40" : "cursor-default"}`}
                        >
                          <span className="max-w-[85%] break-words whitespace-normal">{choice}</span>
                          {selected !== null && isCorrect && <Check size={18} className="text-emerald-500" />}
                          {selected === choice && !isCorrect && <X size={18} className="text-red-500" />}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {phase === "complete" && (
                <motion.div
                  key="complete"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-6 py-8 text-center"
                >
                  <div className="text-7xl">🎉</div>
                  <h2 className="font-heading text-3xl font-bold text-foreground">{t("Leçon terminée !")}</h2>

                  <div className="flex flex-wrap justify-center gap-4">
                    <div className="rounded-2xl bg-yellow-500/10 p-4">
                      <div className="text-2xl font-bold text-yellow-500">{Math.round((correct / items.length) * 20) + 5}</div>
                      <div className="text-xs text-muted-foreground">XP gagnés</div>
                    </div>
                    <div className="rounded-2xl bg-emerald-500/10 p-4">
                      <div className="text-2xl font-bold text-emerald-500">{correct}/{items.length}</div>
                      <div className="text-xs text-muted-foreground">Bonnes réponses</div>
                    </div>
                    <div className="rounded-2xl bg-red-500/10 p-4">
                      <div className="text-2xl font-bold text-red-500">{hearts}</div>
                      <div className="text-xs text-muted-foreground">Cœurs restants</div>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/apprendre/${langCode}`)}
                    className="w-full max-w-sm rounded-2xl py-4 font-bold text-white shadow-lg transition hover:opacity-95"
                    style={{ background: language.color }}
                  >
                    Continuer →
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}

        {activeSection && activeSection !== "vocabulaire" && (
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mt-8 rounded-[2rem] border border-border bg-card p-5 shadow-[0_24px_80px_-42px_rgba(0,0,0,0.7)] lg:p-7"
          >
            <div className="mb-6 flex items-end justify-between gap-4 border-b border-border/70 pb-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">{t("Espace d’apprentissage")}</p>
                <h2 className="mt-1 font-heading text-2xl font-bold text-foreground">{sectionTitles[activeSection]}</h2>
              </div>
              <span className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs text-muted-foreground">
                {items.length} {t("mots")} · {lessonMeta?.exercises?.length || 0} {t("défis")}
              </span>
            </div>

            {activeSection === "objectifs" && lessonMeta?.learning_objectives?.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                {lessonMeta.learning_objectives.map((objective, index) => {
                  const done = completedObjectives.includes(index);
                  return (
                    <motion.button
                      type="button"
                      key={objective}
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.06 }}
                      onClick={() =>
                        setCompletedObjectives((current) =>
                          done ? current.filter((value) => value !== index) : [...current, index]
                        )
                      }
                      className={`group relative overflow-hidden rounded-[1.4rem] border p-4 text-left transition hover:-translate-y-1 ${
                        done ? "border-emerald-400/50 bg-emerald-500/10" : "border-border bg-secondary/40 hover:border-primary/50"
                      }`}
                    >
                      <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-primary/10 blur-xl" />
                      <span
                        className={`relative grid h-8 w-8 place-items-center rounded-xl text-xs font-black ${
                          done ? "bg-emerald-500 text-white" : "bg-primary text-primary-foreground"
                        }`}
                      >
                        {done ? "✓" : index + 1}
                      </span>
                      <p className="relative mt-3 text-sm leading-6 text-foreground">{getLocalizedCurriculumText(objective, interfaceLanguage)}</p>
                      <span
                        className={`mt-3 block text-xs font-semibold ${
                          done ? "text-emerald-600 dark:text-emerald-300" : "text-primary"
                        }`}
                      >
                        {done ? t("Objectif maîtrisé") : t("Marquer comme acquis")}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            )}

            {activeSection === "phrases" && lessonMeta?.common_phrases?.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                {lessonMeta.common_phrases.map((phrase, index) => (
                  <motion.article
                    key={phrase.phrase_id || phrase.original || index}
                    whileHover={{ y: -2 }}
                    className="rounded-[1.4rem] border border-border bg-secondary/30 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                        Phrase {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => speak(phrase.original)}
                        className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary transition hover:bg-primary hover:text-primary-foreground"
                      >
                        <Volume2 size={15} />
                      </button>
                    </div>
                    <p className="text-lg font-semibold text-foreground">{phrase.original}</p>
                    {phrase.phonetic_simple && (
                      <p className="mt-1 font-mono text-xs text-primary">{phrase.phonetic_simple}</p>
                    )}
                    <p className="mt-2 text-sm text-muted-foreground">{getLocalizedCurriculumText(phrase.translation || "", interfaceLanguage)}</p>
                    {phrase.context && (
                      <p className="mt-3 border-t border-border pt-3 text-xs leading-5 text-muted-foreground">
                        {getLocalizedCurriculumText(phrase.context, interfaceLanguage)}
                      </p>
                    )}
                  </motion.article>
                ))}
              </div>
            )}

            {activeSection === "phonetique" && lessonMeta?.phonetic_focus && (
              <div className="grid gap-4 md:grid-cols-2">
                <article className="rounded-[1.4rem] border border-primary/20 bg-primary/5 p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">{t("À retenir")}</p>
                      <h3 className="mt-1 font-heading text-xl font-bold text-foreground">{t("Les sons clés")}</h3>
                    </div>
                    <button
                      type="button"
                      aria-label={t("Écouter les sons clés")}
                      onClick={() => speak(lessonMeta.phonetic_focus.key_sounds || "")}
                      className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground transition hover:bg-primary/90"
                    >
                      <Volume2 size={17} />
                    </button>
                  </div>
                  <p className="text-sm leading-7 text-muted-foreground">
                    {getLocalizedCurriculumText(lessonMeta.phonetic_focus.key_sounds || "Répétez lentement les sons présentés dans cette leçon.", interfaceLanguage)}
                  </p>
                </article>

                {lessonMeta.phonetic_focus.common_pitfalls && (
                  <article className="rounded-[1.4rem] border border-amber-500/20 bg-amber-500/10 p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-500">{t("Point de vigilance")}</p>
                    <h3 className="mt-1 font-heading text-xl font-bold text-foreground">{t("Les erreurs à éviter")}</h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{getLocalizedCurriculumText(lessonMeta.phonetic_focus.common_pitfalls, interfaceLanguage)}</p>
                  </article>
                )}
              </div>
            )}

            {activeSection === "grammaire" && lessonMeta?.grammar_points?.length > 0 && (
              <div className="space-y-4">
                {lessonMeta.grammar_points.map((point, pointIndex) => {
                  const isOpen = openGrammarPoint === pointIndex;
                  return (
                    <motion.article
                      key={point.concept}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: pointIndex * 0.08 }}
                      className="rounded-[1.4rem] border border-border bg-secondary/25 p-5"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenGrammarPoint(isOpen ? -1 : pointIndex)}
                        className="flex w-full items-start gap-3 text-left"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-sm font-black text-primary-foreground">
                          {pointIndex + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <h3 className="text-base font-semibold text-foreground">{getLocalizedCurriculumText(point.concept, interfaceLanguage)}</h3>
                          <span className="mt-2 block text-xs font-semibold text-primary">
                            {isOpen ? t("Réduire l’explication") : t("Ouvrir l’explication →")}
                          </span>
                        </span>
                      </button>

                      {isOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="mt-4 border-t border-border pt-4"
                        >
                          <p className="text-sm leading-6 text-muted-foreground">{getLocalizedCurriculumText(point.explanation, interfaceLanguage)}</p>
                          {point.rules?.length > 0 && (
                            <div className="mt-4 grid gap-2">
                              {point.rules.map((rule, index) => (
                                <p key={rule} className="rounded-xl bg-card p-3 text-xs leading-5 text-muted-foreground">
                                  <strong className="mr-1 text-primary">{t("Règle")} {index + 1}.</strong>
                                  {getLocalizedCurriculumText(rule, interfaceLanguage)}
                                </p>
                              ))}
                            </div>
                          )}

                          {point.examples?.length > 0 && (
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              {point.examples.map((example) => (
                                <p
                                  key={example.structure}
                                  className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground"
                                >
                                  <strong className="mb-1 block text-foreground">{example.structure}</strong>
                                  <span>{getLocalizedCurriculumText(example.meaning || "", interfaceLanguage)}</span>
                                </p>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </motion.article>
                  );
                })}
              </div>
            )}

            {activeSection === "dialogue" && lessonMeta?.dialogue?.length > 0 && (() => {
              const dialogue = lessonMeta.dialogue;
              const speakers = [...new Set(dialogue.map((line) => line.speaker).filter(Boolean))].slice(0, 2);
              const selectedRole = dialogueRole || speakers[0] || "";

              return (
                <div className="space-y-5">
                  <div className="rounded-[1.5rem] border border-primary/20 bg-primary/5 p-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Conversation</p>
                        <h3 className="mt-1 font-heading text-2xl font-bold text-foreground">{t("Dialogue de la leçon")}</h3>
                      </div>
                      <MessageCircle size={28} className="text-primary" />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {speakers.map((speaker) => (
                        <button
                          key={speaker}
                          type="button"
                          onClick={() => setDialogueRole(speaker)}
                          className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                            selectedRole === speaker
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card text-muted-foreground hover:border-primary/50"
                          }`}
                        >
                          {t("Je suis")} {speaker}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {dialogue.map((line, index) => {
                      const isPlayerLine = line.speaker === selectedRole;
                      return (
                        <motion.article
                          key={`${line.speaker}-${index}`}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex ${isPlayerLine ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-2xl rounded-[1.5rem] border p-4 shadow-sm ${
                              isPlayerLine ? "border-primary/30 bg-primary/5" : "border-border bg-secondary/20"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                                {line.speaker}
                              </span>
                              <button
                                type="button"
                                onClick={() => speak(line.text)}
                                className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
                              >
                                <Volume2 size={14} />
                              </button>
                            </div>
                            <p className="mt-3 text-base font-medium leading-7 text-foreground">{line.text}</p>
                            {line.phonetic_simple && (
                              <p className="mt-2 font-mono text-xs text-primary">{line.phonetic_simple}</p>
                            )}
                            <button
                              type="button"
                              onClick={() => setShowDialogueTranslation((value) => !value)}
                              className="mt-3 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
                            >
                              {showDialogueTranslation ? t("Masquer la traduction") : t("Voir la traduction")}
                            </button>
                            {showDialogueTranslation && (
                              <p className="mt-3 border-t border-border pt-3 text-sm text-muted-foreground">
                                {getLocalizedCurriculumText(line.translation || "", interfaceLanguage)}
                              </p>
                            )}
                          </div>
                        </motion.article>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {activeSection === "culture" && lessonMeta?.cultural_notes?.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                {lessonMeta.cultural_notes.map((note, index) => (
                  <motion.article key={note} whileHover={{ y: -2 }} className="rounded-[1.4rem] border border-border bg-secondary/25 p-4">
                    <div className="mb-3 flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-lg text-primary">✦</span>
                      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                        {t("Repère")} {index + 1}
                      </span>
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">{getLocalizedCurriculumText(note, interfaceLanguage)}</p>
                  </motion.article>
                ))}
              </div>
            )}

            {activeSection === "exercices" && lessonMeta?.exercises?.length > 0 && (
              <div className="space-y-5">
                <div className="rounded-[1.5rem] border border-primary/20 bg-primary/5 p-5 text-center">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
                    <Target size={30} />
                  </div>
                  <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">{t("Évaluation")}</p>
                  <h3 className="mt-2 font-heading text-2xl font-bold text-foreground">{t("Examen de la leçon")}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t("Réponds à chaque question sans voir la correction. La note finale sera calculée définitivement.")}
                  </p>
                  <Link
                    to={`/examen/${langCode}/${lessonNum}`}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90"
                  >
                    {t("Lancer le défi")} <ArrowRight size={16} />
                  </Link>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  {lessonMeta.exercises.map((exercise, index) => (
                    <article key={exercise.exercise_id || index} className="rounded-[1.4rem] border border-border bg-secondary/20 p-5">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                          {t("Question")} {index + 1}
                        </span>
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                          {t(exercise.type || "Exercice")}
                        </span>
                      </div>
                      <h4 className="font-semibold leading-6 text-foreground">
                        {getLocalizedCurriculumText(exercise.question || exercise.sentence_with_blank || exercise.instruction || "Consigne", interfaceLanguage)}
                      </h4>

                      {Array.isArray(exercise.options) && (
                        <ul className="mt-4 space-y-2">
                          {exercise.options.map((option, optionIndex) => (
                            <li
                              key={optionIndex}
                              className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground"
                            >
                              {String.fromCharCode(65 + optionIndex)}. {getLocalizedCurriculumText(option, interfaceLanguage)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            )}

            {activeSection === "sources" && (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">{t("Provenance")}</p>
                    <h3 className="mt-1 font-heading text-2xl font-bold text-foreground">{t("Sources de la leçon")}</h3>
                  </div>
                  {lessonMeta?.confidence && (
                    <span className="rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-300">
                      {t("Fiabilité")} : {lessonMeta.confidence}
                    </span>
                  )}
                </div>

                {lessonMeta?.sources?.length > 0 && (
                  <div className="grid gap-3">
                    {lessonMeta.sources.map((source, index) => (
                      <a
                        key={source.url || source.label || index}
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-start gap-3 rounded-[1.2rem] border border-border bg-secondary/20 p-4 transition hover:border-primary/40 hover:bg-primary/5"
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                          {index + 1}
                        </span>
                        <span className="min-w-0 flex-1 text-sm leading-6 text-foreground group-hover:text-primary">
                          {source.label || source.url}
                        </span>
                        <ExternalLink size={16} className="mt-1 shrink-0 text-muted-foreground group-hover:text-primary" />
                      </a>
                    ))}
                  </div>
                )}

                {lessonMeta?.confidence_note && (
                  <div className="rounded-[1.2rem] border border-amber-500/20 bg-amber-500/10 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-500">
                      {t("Note méthodologique")}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{getLocalizedCurriculumText(lessonMeta.confidence_note, interfaceLanguage)}</p>
                  </div>
                )}

                {lessonMeta?.source_file && (
                  <p className="break-words border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
                    {t("Fichier de données")} : {lessonMeta.source_file.replace(/^\.\.\/data_langues\//, "")}
                  </p>
                )}
              </div>
            )}
          </motion.section>
        )}
      </main>
    </div>
  );
}
