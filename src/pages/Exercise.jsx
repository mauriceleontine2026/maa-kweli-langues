import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, ArrowLeft, RotateCcw, Trophy, Sparkles, Flame, CircleHelp, Zap, Medal, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { getProgress } from "@/api/progressService";
import { getAdaptiveSummary, orderAdaptiveExercises, recordAdaptiveAnswer } from "@/lib/adaptiveLearning";
import {
  getModuleById,
  getBeginnerCompletionStatus,
  isModuleAccessible,
  getLockMessageForModule,
  getCurriculumForLanguageExport,
} from "@/lib/curriculumGate";

const STOP_WORDS = new Set([
  "et", "les", "des", "dans", "pour", "avec", "une", "un", "sur", "son", "sa", "ses", "de", "du", "la", "le", "au", "aux", "par", "plus", "sans", "être", "avoir", "faire", "comme", "que", "qui", "est", "ou", "à", "a", "de", "des", "et", "une", "un"
]);

function extractKeywords(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-zà-ÿ\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
    .slice(0, 8);
}

export default function Exercise() {
  const { langCode, moduleId, lessonNum } = useParams();
  const navigate = useNavigate();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [responses, setResponses] = useState({});
  const [results, setResults] = useState({});

  const { user } = useAuth();
  const { t } = useLanguage();
  const [completedLessons, setCompletedLessons] = useState([]);
  const [moduleLocked, setModuleLocked] = useState(false);
  const [lockMessage, setLockMessage] = useState("");

  const examContext = useMemo(() => {
    const curriculum = getCurriculumForLanguageExport(langCode);
    for (const level of curriculum.levels) {
      for (const item of level.modules) {
        if (moduleId && item.id === moduleId) return { module: item, lesson: null };
        const lesson = item.lessons.find((entry) => Number(entry.lesson_number) === Number(lessonNum));
        if (lesson) return { module: item, lesson };
      }
    }
    return { module: null, lesson: null };
  }, [moduleId, lessonNum, langCode]);
  const module = examContext.module;
  const lesson = examContext.lesson;
  const exerciseKey = module?.id || moduleId || `lesson-${lessonNum}`;

  const rawExercises = lesson
    ? (Array.isArray(lesson.exercises) ? lesson.exercises : lesson.content?.exercises || [])
    : (Array.isArray(module?.exerciseSeries) ? module.exerciseSeries : []);
  const exercises = useMemo(
    () => orderAdaptiveExercises(rawExercises, langCode, exerciseKey),
    [rawExercises, langCode, exerciseKey]
  );
  const adaptiveSummary = getAdaptiveSummary(exercises, langCode, exerciseKey);

  const currentExercise = exercises[currentIdx] || null;
  const progress = exercises.length > 0 ? ((currentIdx + 1) / exercises.length) * 100 : 0;
  const currentAnswer = responses[currentIdx] || "";
  const currentResult = results[currentIdx];
  const currentVerified = Boolean(currentResult);
  const currentOptions = Array.isArray(currentExercise?.options) ? currentExercise.options : [];
  const isChoiceExercise = currentOptions.length > 0;

  const validateResponse = () => {
    if (!currentExercise) return;
    const response = String(currentAnswer || "").trim();
    const expected = String(currentExercise.correct_answer || "").trim();
    if (expected && (isChoiceExercise || currentExercise.type === "fill_in_the_blanks" || currentExercise.type === "texte_a_trous")) {
      const passed = response.localeCompare(expected, undefined, { sensitivity: "base" }) === 0;
      recordAdaptiveAnswer(langCode, exerciseKey, currentExercise, passed, currentIdx);
      setResults((prev) => ({ ...prev, [currentIdx]: { passed, response } }));
      return;
    }
    const keywords = extractKeywords(`${currentExercise.title} ${currentExercise.goal}`);
    const scoreHits = keywords.filter((word) => response.toLowerCase().includes(word)).length;
    const passed = response.length >= 20 && scoreHits >= 2;
    recordAdaptiveAnswer(langCode, exerciseKey, currentExercise, passed, currentIdx);
    setResults((prev) => ({ ...prev, [currentIdx]: { passed, response } }));
  };

  const nextExercise = () => {
    if (currentIdx < exercises.length - 1) {
      setCurrentIdx((idx) => idx + 1);
    }
  };

  const restart = () => {
    setCurrentIdx(0);
    setResponses({});
    setResults({});
  };

  const score = Object.values(results).filter((result) => result?.passed).length;
  const average = exercises.length > 0 ? Math.round((score / exercises.length) * 100) : 0;
  const remaining = exercises.length - (currentIdx + 1);

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

  const persistExerciseResult = () => {
    if (typeof window === "undefined") return;
    try {
      const payload = {
        score: average,
        completed: score === exercises.length,
        moduleId,
        updatedAt: new Date().toISOString(),
      };
      window.localStorage.setItem(`mbaara-exercise-${langCode}-${exerciseKey}`, JSON.stringify({ ...payload, lessonNum }));
    } catch (e) {
      // ignore localStorage errors
    }
  };

  useEffect(() => {
    if (!user || !module || !langCode) return;
    getProgress()
      .then((data) => {
        const progress = Array.isArray(data) ? data.find((p) => p.language_code === langCode) : null;
        const completed = Array.isArray(progress?.completed_lessons)
          ? progress.completed_lessons.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0)
          : [];
        setCompletedLessons(completed);
      })
      .catch(() => setCompletedLessons([]));
  }, [user, langCode, module]);

  useEffect(() => {
    if (!module || !exerciseKey) return;
    const exerciseRecords = getExerciseRecords();
    const moduleInfo = getModuleById(module.id, langCode);
    const beginnerStatus = getBeginnerCompletionStatus(completedLessons, exerciseRecords, 70, langCode);
    const accessible = moduleInfo ? isModuleAccessible(moduleId, completedLessons, exerciseRecords, langCode) : true;
    setModuleLocked(moduleInfo ? !accessible : false);
    setLockMessage(moduleInfo ? getLockMessageForModule(moduleInfo.levelIndex, moduleInfo.moduleIndex, moduleInfo.level, beginnerStatus.complete) : "");
  }, [module, exerciseKey, completedLessons, langCode]);

  const isCompleted = currentIdx === exercises.length - 1 && currentVerified;

  useEffect(() => {
    if (isCompleted && score === exercises.length) {
      persistExerciseResult();
    }
  }, [isCompleted, score, exercises.length, langCode, moduleId]);

  if (!module) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div className="max-w-md space-y-3">
          <p className="text-muted-foreground">{t("Module introuvable.")}</p>
          <button onClick={() => navigate(-1)} className="text-primary text-sm font-medium">← {t("Retour")}</button>
        </div>
      </div>
    );
  }

  if (moduleLocked) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div className="max-w-lg rounded-3xl border border-amber-300/40 bg-amber-500/10 p-8">
          <p className="text-base font-semibold text-amber-900 mb-3">{t("Accès restreint")}</p>
          <p className="text-sm text-amber-800 mb-6">{lockMessage || "This module is locked until the Beginner level is completed with all exercises passed."}</p>
          <button onClick={() => navigate(`/apprendre/${langCode}`)} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{t("Retour au curriculum")}</button>
        </div>
      </div>
    );
  }

  if (exercises.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div className="max-w-md space-y-3">
          <p className="text-muted-foreground">{t("Aucun exercice disponible pour cette leçon.")}</p>
          <button onClick={() => navigate(-1)} className="text-primary text-sm font-medium">← {t("Retour")}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="lesson-exam min-h-screen bg-[#141211] text-neutral-100" style={{ backgroundImage: "radial-gradient(circle at 12% 0%, rgba(249,115,22,.16), transparent 34%), radial-gradient(circle at 88% 15%, rgba(234,88,12,.1), transparent 28%)" }}>
      <div className="mx-auto max-w-3xl px-4 py-6 lg:py-10">
        <div className="mb-6 flex items-center justify-between gap-3">
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 rounded-xl border border-neutral-700/40 bg-[#211d1c] px-3 py-2 text-sm text-neutral-300 transition hover:border-orange-500/50 hover:text-white">
            <ArrowLeft size={16} /> {t("Retour")}
          </button>
          <Link to={`/apprendre/${langCode}`} className="rounded-xl px-3 py-2 text-sm font-medium text-orange-400 transition hover:bg-orange-500/10">{t("Voir la langue")}</Link>
        </div>

        <div className="mb-6 overflow-hidden rounded-3xl border border-neutral-700/40 bg-[#211d1c] p-5 shadow-[0_24px_70px_-40px_rgba(0,0,0,.9)] lg:p-7">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-orange-400"><Sparkles size={15} />{t("Défi adaptatif")}</div><h1 className="mt-2 font-heading text-2xl font-bold text-white lg:text-3xl">{lesson?.title || module.label}</h1><p className="mt-1 text-sm text-neutral-400">{t("Les exercices difficiles reviennent en priorité pour t’aider à progresser.")}</p></div>
            <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-orange-500/15 text-orange-400 shadow-[0_0_35px_rgba(249,115,22,.2)]"><Trophy size={25} /><span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-orange-500 text-[10px] font-black text-white">{score}</span></div>
          </div>
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-neutral-400"><span>{t("Progression du défi")}</span><span className="text-white">{currentIdx + 1} / {exercises.length}</span></div>
          <div className="h-3 overflow-hidden rounded-full bg-neutral-800"><div className="h-full rounded-full bg-gradient-to-r from-orange-600 via-orange-400 to-amber-300 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-neutral-500"><Zap size={14} className="text-amber-400" />{remaining > 0 ? `Encore ${remaining} question${remaining > 1 ? "s" : ""} pour terminer` : "Dernière question, donne tout !"}</div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-orange-500/10 px-2.5 py-1 text-orange-300">{adaptiveSummary.due} à revoir</span><span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-300">{adaptiveSummary.mastered} maîtrisés</span></div>
        </div>

        <div className="rounded-3xl border border-neutral-700/40 bg-[#211d1c] p-5 shadow-[0_24px_70px_-40px_rgba(0,0,0,.9)] lg:p-7">
          <div className="mb-4">
            <div className="flex items-center justify-between gap-3"><div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-400">{t("Question")} {currentIdx + 1} · {currentExercise.type}</div><CircleHelp size={18} className="text-neutral-500" /></div>
          </div>
          <p className="mb-5 text-sm leading-6 text-neutral-400">{currentExercise.goal}</p>

          {isChoiceExercise ? (
            <div className="grid gap-3">{currentOptions.map((option, index) => <button key={option} type="button" onClick={() => setResponses((prev) => ({ ...prev, [currentIdx]: option }))} className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left text-sm font-medium transition ${currentAnswer === option ? "border-orange-500 bg-orange-500/15 text-white shadow-lg shadow-orange-950/20" : "border-neutral-700/40 bg-neutral-900/60 text-neutral-300 hover:border-orange-500/50 hover:text-white"}`}><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-neutral-800 text-xs font-bold text-orange-400">{String.fromCharCode(65 + index)}</span>{option}</button>)}</div>
          ) : (
            <>
              <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">{currentExercise.type === "fill_in_the_blanks" || currentExercise.type === "texte_a_trous" ? t("Complète la réponse") : t("Rédige ta réponse courte")}</label>
              <textarea value={currentAnswer} onChange={(event) => setResponses((prev) => ({ ...prev, [currentIdx]: event.target.value }))} className="w-full min-h-[140px] rounded-2xl border border-neutral-700/40 bg-neutral-900/70 px-4 py-4 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30" placeholder={currentExercise.sentence_with_blank || t("Écrivez votre réponse ici…")} />
            </>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={validateResponse}
              disabled={!currentAnswer.trim()}
              className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-950/30 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {currentIdx >= exercises.length - 1 ? "Valider mon résultat" : "Vérifier ma réponse"} <ArrowRight size={15} className="ml-1 inline" />
            </button>
            <button
              onClick={nextExercise}
              disabled={!currentVerified || currentIdx >= exercises.length - 1}
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold disabled:opacity-40"
            >
              {currentIdx >= exercises.length - 1 ? "Voir le résultat" : "Continuer →"}
            </button>
          </div>

          {currentVerified && (
            <div className={`mt-5 rounded-2xl border px-4 py-4 text-sm ${currentResult?.passed ? "border-emerald-500/30 bg-emerald-500/10" : "border-orange-500/30 bg-orange-500/10"}`}>
              <div className="flex items-center gap-2 font-semibold text-white">
                {currentResult?.passed ? <CheckCircle2 size={18} className="text-emerald-400" /> : <Flame size={18} className="text-orange-400" />}
                {currentResult?.passed
                  ? "Bonne structure de réponse. Vous pouvez passer à l’exercice suivant."
                  : "Essayez d’ajouter plus de détails pour mieux répondre à la consigne."}
              </div>
              {currentExercise.explanation && <p className="mt-2 text-xs leading-5 text-neutral-300">Correction : {currentExercise.explanation}</p>}
            </div>
          )}
        </div>

        <div className="mt-6 rounded-3xl border border-neutral-700/40 bg-[#211d1c] p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold">Progression</div>
              <div className="text-sm font-semibold text-white">{score}/{exercises.length} exercices validés</div>
            </div>
            <button onClick={restart} className="inline-flex items-center gap-2 rounded-xl border border-neutral-700/40 px-3 py-2 text-xs font-semibold text-neutral-300 transition hover:border-orange-500/50 hover:text-white">
              <RotateCcw size={14} /> Recommencer
            </button>
          </div>

          {isCompleted && (
            <div className="mt-5 overflow-hidden rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-500/15 to-amber-500/5 p-5 text-white">
              <div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-500/20 text-orange-300"><Medal size={25} /></div><div><div className="font-heading text-lg font-bold">Défi terminé !</div><div className="text-sm text-neutral-300">Ton résultat est enregistré.</div></div></div>
              <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-neutral-900/50 p-3"><div className="text-2xl font-black text-orange-300">{average}%</div><div className="text-xs text-neutral-400">Score final</div></div><div className="rounded-xl bg-neutral-900/50 p-3"><div className="text-2xl font-black text-emerald-300">{score}/{exercises.length}</div><div className="text-xs text-neutral-400">Réponses justes</div></div></div>
              <div className="mt-4 text-sm text-neutral-300">{average >= 80 ? "Excellent travail, la leçon est bien maîtrisée." : "Bonne base. Recommencez pour battre votre meilleur score."}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
