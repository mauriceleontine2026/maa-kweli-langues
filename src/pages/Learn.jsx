// @ts-nocheck
// Updated Learn page with all languages from data folder
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getLanguages, getVocabularyForLanguage, getLessonsForLanguage } from "@/api/languageService";
import { getProgress } from "@/api/progressService";
import { ArrowLeft, ArrowRight, Download, Trash2, WifiOff, Loader2, Search, X, BookOpen, TrendingUp, CheckCircle2, LockKeyhole, Layers3 } from "lucide-react";
import LanguageFlag from "@/components/ui/LanguageFlag";
import { AudioStatusBadgeInline } from "@/components/AudioStatusBadge";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { getCountryForLanguage, getLanguageName, getLocalizedCountryForLanguage, getLocalizedCurriculumText } from "@/lib/localLanguageData";
import { downloadLanguageOffline, isLanguageDownloaded, removeLanguageOffline, getOfflineVocab, getOfflineLanguages } from "@/lib/offlineStorage";
import {
  getBeginnerCompletionStatus,
  getAvailableState,
  getLockMessageForModule,
  getCurriculumForLanguageExport,
} from "@/lib/curriculumGate";

export default function Learn() {
  const { langCode } = useParams();
  const { user } = useAuth();
  const { t, language: interfaceLanguage } = useLanguage();
  /** @type {[any[], import('react').Dispatch<import('react').SetStateAction<any[]>>]} */
  const languagesState = useState(/** @type {any[]} */ ([]));
  const [languages, setLanguages] = languagesState;
  /** @type {[any[], import('react').Dispatch<import('react').SetStateAction<any[]>>]} */
  const progressesState = useState(/** @type {any[]} */ ([]));
  const [progresses, setProgresses] = progressesState;
  /** @type {[any[], import('react').Dispatch<import('react').SetStateAction<any[]>>]} */
  const itemsState = useState(/** @type {any[]} */ ([]));
  const [items, setItems] = itemsState;
  const [lessons, setLessons] = useState([]);
  const [filter, setFilter] = useState("all");
  const [languageQuery, setLanguageQuery] = useState("");
  const online = useOnlineStatus();
  const [downloaded, setDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [selectedLevelId, setSelectedLevelId] = useState("niveau-debutant");

  useEffect(() => {
    if (online) {
      getLanguages()
        .then((data) => setLanguages(Array.isArray(data) ? data : []))
        .catch(() => setLanguages([]));
    } else {
      const offlineLanguages = getOfflineLanguages();
      setLanguages(Array.isArray(offlineLanguages) ? offlineLanguages : []);
    }
  }, [online]);

  useEffect(() => {
    const refreshProgress = () => {
      if (!user) return;
      getProgress()
        .then((data) => setProgresses(Array.isArray(data) ? data : []))
        .catch(() => setProgresses([]));
    };

    refreshProgress();
    window.addEventListener("mbaara-progress-updated", refreshProgress);
    window.addEventListener("mbaara-lesson-completed", refreshProgress);

    return () => {
      window.removeEventListener("mbaara-progress-updated", refreshProgress);
      window.removeEventListener("mbaara-lesson-completed", refreshProgress);
    };
  }, [user]);

  useEffect(() => {
    if (langCode) {
      setDownloaded(isLanguageDownloaded(langCode));
      if (online) {
        Promise.all([
          getVocabularyForLanguage(langCode),
          getLessonsForLanguage(langCode),
        ])
          .then(([vocabData, lessonsData]) => {
            setItems(Array.isArray(vocabData) ? vocabData : []);
            setLessons(Array.isArray(lessonsData) ? lessonsData : []);
          })
          .catch(() => {
            setItems([]);
            setLessons([]);
          });
      } else {
        const offlineVocab = getOfflineVocab(langCode);
        setItems(Array.isArray(offlineVocab) ? offlineVocab : []);
        setLessons([]);
      }
    } else {
      setItems([]);
      setLessons([]);
    }
  }, [langCode, online]);

  const downloadLanguage = async () => {
    setDownloading(true);
    try {
      await downloadLanguageOffline(langCode);
      setDownloaded(true);
    } catch (/** @type {any} */ err) {
      const message = err?.message || String(err);
      alert(t("Erreur: ") + message);
    } finally {
      setDownloading(false);
    }
  };

  const removeDownload = () => {
    removeLanguageOffline(langCode);
    setDownloaded(false);
  };

  // Group languages by their primary country.
  const safeLanguages = Array.isArray(languages) ? languages : [];
  const safeItems = Array.isArray(items) ? items : [];
  const safeLessons = Array.isArray(lessons) ? lessons : [];
  const safeProgresses = Array.isArray(progresses) ? progresses : [];
  /** @type {{ [country: string]: any[] }} */
  const countries = {};
  safeLanguages.forEach(l => {
    const country = getLocalizedCountryForLanguage(l, interfaceLanguage);
    if (!countries[country]) countries[country] = [];
    countries[country].push(l);
  });
  const countryKeys = Object.keys(countries);

  const readExerciseRecord = (moduleId) => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(`mbaara-exercise-${langCode}-${moduleId}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (e) {
      return null;
    }
  };

  const getExerciseRecords = () => {
    const curriculum = getCurriculumForLanguageExport(langCode);
    return curriculum.levels.reduce((acc, level) => {
      level.modules.forEach((module) => {
        acc[module.id] = readExerciseRecord(module.id);
      });
      return acc;
    }, {});
  };

  // Detail view
  if (langCode) {
    const lang = safeLanguages.find(l => l.code === langCode);
    if (!lang) return <div className="p-10 text-center text-muted-foreground">{t("Chargement...")}</div>;

    const prog = safeProgresses.find(p => p.language_code === langCode);
    const completed = Array.isArray(prog?.completed_lessons) ? prog.completed_lessons.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0) : [];
    const completedSet = new Set(completed);
    const totalLessonCount = Math.max(1, Array.isArray(safeLessons) ? safeLessons.length : 0);
    const exerciseRecords = getExerciseRecords();
    const beginnerStatus = getBeginnerCompletionStatus(completed, exerciseRecords);
    const curriculum = getCurriculumForLanguageExport(langCode);
    const totalCurriculumLessons = curriculum.levels.reduce((total, level) => total + level.modules.reduce((count, module) => count + module.lessons.length, 0), 0);
    const selectedLevel = curriculum.levels.find((level) => level.id === selectedLevelId) || curriculum.levels[0];
    const selectedLevelIndex = Math.max(0, curriculum.levels.findIndex((level) => level.id === selectedLevel?.id));
    const selectedLevelLessons = selectedLevel?.modules.reduce((total, module) => total + module.lessons.length, 0) || 0;

    return (
      <div className="p-6 lg:p-10 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <Link to="/apprendre" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={16} /> {t("Retour")}
          </Link>
          {!online && (
            <span className="flex items-center gap-1.5 text-xs text-yellow-500 font-medium">
              <WifiOff size={14} /> {t("Hors-ligne")}
            </span>
          )}
          {online && (
            downloaded ? (
              <button onClick={removeDownload} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-500 font-medium transition">
                <Trash2 size={14} /> {t("Retirer le téléchargement")}
              </button>
            ) : (
              <button onClick={downloadLanguage} disabled={downloading}
                className="flex items-center gap-1.5 text-xs text-primary font-medium hover:opacity-80 transition disabled:opacity-60">
                {downloading ? <><Loader2 size={14} className="animate-spin" /> {t("Téléchargement...")}</> : <><Download size={14} /> {t("Télécharger pour hors-ligne")}</>}
              </button>
            )
          )}
        </div>
        <div className="rounded-3xl p-6 mb-6 text-white" style={{ background: `linear-gradient(135deg, ${lang.color}, ${lang.color}cc)` }}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
            <LanguageFlag language={lang} size="lg" />
            <div>
              <h1 className="font-heading text-2xl font-bold">{getLanguageName(lang, interfaceLanguage)}</h1>
              <p className="text-white/80 text-sm">{t("Pays :")} {getLocalizedCountryForLanguage(lang, interfaceLanguage)}</p>
            </div>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:min-w-[280px]">
              <div className="rounded-2xl bg-black/15 px-3 py-2 text-center"><div className="text-lg font-bold">{totalCurriculumLessons}</div><div className="text-[10px] uppercase tracking-wider text-white/70">{t("leçons")}</div></div>
              <div className="rounded-2xl bg-black/15 px-3 py-2 text-center"><div className="text-lg font-bold">{curriculum.levels.length}</div><div className="text-[10px] uppercase tracking-wider text-white/70">{t("niveaux")}</div></div>
              <div className="rounded-2xl bg-black/15 px-3 py-2 text-center"><div className="text-lg font-bold">{completed.length}</div><div className="text-[10px] uppercase tracking-wider text-white/70">{t("acquises")}</div></div>
            </div>
          </div>
          {prog && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-white/70 mb-1">
                <span>{t("Progression")}</span><span>{completed.length}/{totalLessonCount} {t("leçons")}</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div className="h-2 bg-white rounded-full" style={{ width: `${Math.min(100, (completed.length / Math.max(1, totalLessonCount)) * 100)}%` }} />
              </div>
            </div>
          )}
        </div>

        <div className="mb-6 rounded-[28px] border border-border/80 bg-gradient-to-br from-card via-card to-background/90 p-5 shadow-[0_18px_50px_-30px_rgba(0,0,0,0.45)]">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="font-heading text-2xl font-bold text-foreground">{t("Structure pédagogique")}</h2>
              <p className="text-sm text-muted-foreground">{t("Clique sur un module puis choisis la leçon à lancer")}</p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">{t("Curriculum")}</span>
          </div>
          <div className="mb-5 grid grid-cols-3 gap-2 rounded-2xl bg-secondary/60 p-1.5">
            {curriculum.levels.map((level) => {
              const levelLessons = level.modules.reduce((total, module) => total + module.lessons.length, 0);
              const isSelected = selectedLevel?.id === level.id;
              return <button key={level.id} type="button" onClick={() => setSelectedLevelId(level.id)} className={`rounded-xl px-3 py-3 text-left transition ${isSelected ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:bg-card/60 hover:text-foreground"}`}><span className="block text-sm font-bold">{getLocalizedCurriculumText(level.label, interfaceLanguage)}</span><span className="mt-1 block text-xs">{levelLessons} {t("leçons")} · {level.range}</span></button>;
            })}
          </div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
            <div className="flex items-center gap-3"><Layers3 size={20} className="text-primary" /><div><p className="text-sm font-bold text-foreground">{t("Parcours")} {getLocalizedCurriculumText(selectedLevel?.label, interfaceLanguage)}</p><p className="text-xs text-muted-foreground">{selectedLevelLessons} {t("leçons réparties dans")} {selectedLevel?.modules.length || 0} {t("modules")}</p></div></div>
            {selectedLevelIndex > 0 && <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300"><LockKeyhole size={13} /> {t("Niveau à débloquer")}</span>}
          </div>
          <div className="space-y-4">
            {[selectedLevel].filter(Boolean).map((level) => {
              const levelIndex = curriculum.levels.findIndex((item) => item.id === level.id);
              const exerciseRecords = getExerciseRecords();
              const beginnerStatus = getBeginnerCompletionStatus(completed, exerciseRecords, 70, langCode);
              const levelModulesState = level.modules.map((module, moduleIndex) => ({
                ...getAvailableState(levelIndex, moduleIndex, level, module, completed, exerciseRecords, langCode),
                module,
              }));
              const levelUnlocked = levelIndex === 0 || beginnerStatus.complete;
              return (
                <div key={level.id} className={`rounded-[24px] border border-border/80 p-4 shadow-sm ${
                  levelIndex > 0 && !beginnerStatus.complete ? "bg-slate-950/20" : "bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.02))]"
                }`}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold text-foreground">{getLocalizedCurriculumText(level.label, interfaceLanguage)}</div>
                      <div className="text-sm text-muted-foreground">{level.range}</div>
                    </div>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary font-semibold">{level.modules.length} modules</span>
                  </div>
                  {level.globalReview && (
                    <div className="mb-4 rounded-[20px] border border-primary/25 bg-primary/5 p-3.5">
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{t("Exercice global")}</div>
                      <div className="mt-1 text-base font-semibold text-foreground">{level.globalReview.title}</div>
                      <div className="text-sm text-muted-foreground">{level.globalReview.description}</div>
                      <ul className="mt-2 list-disc pl-4 text-sm text-muted-foreground space-y-1">
                        {level.globalReview.tasks.map((task) => (
                          <li key={task}>{task}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="grid gap-3">
                    {level.modules.map((module, moduleIndex) => {
                      const state = levelModulesState[moduleIndex];
                      const lessonLinksDisabled = !state.available || (levelIndex > 0 && !levelUnlocked);
                      const practiceDisabled = !state.available || (levelIndex > 0 && !levelUnlocked);
                      const onlyFirstLevelUnlock = levelIndex === 0 && moduleIndex === 0;
                      const normalizePath = (value) => String(value || "")
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .toLowerCase();
                      const expectedLevel = normalizePath(`Niveau ${level.label}`);
                      const expectedModule = normalizePath(`Module ${moduleIndex + 1}`);
                      const moduleLessons = module.lessons.filter((lesson) => {
                        const sourcePath = normalizePath(lesson.source_file);
                        return sourcePath.includes(expectedLevel) && sourcePath.includes(expectedModule);
                      });
                      const displayedLessons = moduleLessons.length > 0 ? moduleLessons : module.lessons;
                      const completedModuleLessons = displayedLessons.filter((lesson) => completedSet.has(Number(lesson.lesson_number))).length;
                      return (
                          <details key={module.id} className="rounded-[20px] bg-secondary/40 p-3.5 shadow-[0_10px_25px_-20px_rgba(0,0,0,0.55)]" open={levelIndex === 0 && moduleIndex === 0}>
                          <summary className="cursor-pointer list-none text-base font-semibold text-foreground mb-2 flex items-center justify-between gap-2">
                            <span>{getLocalizedCurriculumText(module.label, interfaceLanguage)}</span>
                            <span className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 size={15} className={completedModuleLessons === displayedLessons.length ? "text-emerald-500" : "text-muted-foreground"} />{completedModuleLessons}/{displayedLessons.length} {t("acquises")}</span>
                          </summary>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {displayedLessons.map((lesson) => (
                              <Link
                                key={lesson.id}
                                to={lessonLinksDisabled ? "#" : `/lecon/${langCode}/${lesson.lesson_number}`}
                                onClick={(event) => {
                                  if (lessonLinksDisabled) {
                                    event.preventDefault();
                                  }
                                }}
                                className={`rounded-full bg-card px-3 py-1.5 text-sm font-medium ring-1 ring-border transition ${
                                  lessonLinksDisabled
                                    ? "text-muted-foreground/50 cursor-not-allowed"
                                    : "text-muted-foreground hover:text-foreground hover:ring-primary/40"
                                }`}
                              >
                                {getLocalizedCurriculumText(lesson.title, interfaceLanguage)}
                              </Link>
                            ))}
                          </div>
                          {!state.available && (
                            <div className="mt-2 rounded-[16px] border border-amber-300/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
                              {getLocalizedCurriculumText(getLockMessageForModule(levelIndex, moduleIndex, level, beginnerStatus.complete), interfaceLanguage)}
                            </div>
                          )}
                        </details>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    );
  }

  // Grid view
  const available = online ? safeLanguages : safeLanguages.filter(l => isLanguageDownloaded(l?.code));
  const filtered = filter === "all" ? available : available.filter(l => getLocalizedCountryForLanguage(l, interfaceLanguage).includes(filter));
  const normalizedQuery = languageQuery.trim().toLowerCase();
  const safeFiltered = (Array.isArray(filtered) ? filtered : []).filter((languageItem) => {
    if (!normalizedQuery) return true;
    return `${getLanguageName(languageItem, interfaceLanguage) || ""} ${getLocalizedCountryForLanguage(languageItem, interfaceLanguage)}`
      .toLowerCase()
      .includes(normalizedQuery);
  });

  return (
    <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-10">
      <section className="mb-6 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="relative px-5 py-6 sm:px-8 sm:py-8">
          <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.16),transparent_68%)]" />
          <div className="relative max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary"><BookOpen size={14} /> {t("Parcours d'apprentissage")}</div>
            <h1 className="font-heading text-3xl font-bold tracking-normal text-foreground sm:text-4xl">{t("Choisissez votre prochaine langue")}</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{t("Progressez à votre rythme avec des leçons pensées pour comprendre, pratiquer et retenir.")}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-border sm:grid-cols-4">
          <div className="border-r border-border px-4 py-3 sm:px-6"><div className="text-xl font-bold text-foreground">{safeLanguages.length}</div><div className="text-xs text-muted-foreground">{t("Langues disponibles")}</div></div>
          <div className="border-r border-border px-4 py-3 sm:px-6"><div className="text-xl font-bold text-foreground">{safeLanguages.filter((lang) => lang.status === "active").length}</div><div className="text-xs text-muted-foreground">{t("Parcours actifs")}</div></div>
          <div className="border-r border-border px-4 py-3 sm:px-6"><div className="text-xl font-bold text-foreground">{safeProgresses.filter((progress) => progress.current_lesson > 1).length}</div><div className="text-xs text-muted-foreground">{t("Parcours commencés")}</div></div>
          <div className="px-4 py-3 sm:px-6"><div className="flex items-center gap-1 text-xl font-bold text-foreground"><TrendingUp size={18} className="text-primary" /> {safeProgresses.reduce((total, progress) => total + (progress.xp || 0), 0)}</div><div className="text-xs text-muted-foreground">{t("XP total")}</div></div>
        </div>
      </section>

      <label className="group mb-5 flex items-center gap-3 rounded-2xl border-2 border-border bg-card px-4 py-3.5 text-sm text-muted-foreground transition focus-within:border-primary focus-within:shadow-[0_0_0_4px_rgba(249,115,22,.12)]">
        <Search size={20} className="shrink-0 text-primary transition group-focus-within:scale-110" />
        <input
          value={languageQuery}
          onChange={(event) => setLanguageQuery(event.target.value)}
          placeholder={t("Rechercher une langue ou un pays...")}
          aria-label={t("Rechercher une langue")}
          className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
        />
        {languageQuery && (
          <button type="button" aria-label={t("Effacer la recherche")} onClick={() => setLanguageQuery("")} className="rounded-lg p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground">
            <X size={16} />
          </button>
        )}
      </label>

      {/* Filter tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${filter === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/70"}`}>
          {t("Toutes")}
        </button>
        {countryKeys.map(country => (
          <button key={country} onClick={() => setFilter(country)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${filter === country ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/70"}`}>
            {country}
          </button>
        ))}
      </div>

      {/* Language cards */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-heading text-xl font-bold text-foreground">{t("Tous les parcours")}</h2>
        <span className="text-xs text-muted-foreground">{safeFiltered.length} {t("résultat(s)")}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {safeFiltered.map(lang => {
          const prog = safeProgresses.find(p => p.language_code === lang.code);
          const pct = prog ? Math.min(100, ((prog.current_lesson - 1) / Math.max(1, lang.total_lessons || 20)) * 100) : 0;
          return (
            <Link key={lang.id} to={`/apprendre/${lang.code}`}
              className="group flex min-h-[218px] flex-col rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <LanguageFlag language={lang} size="lg" />
                  <div>
                    <div className="font-heading font-bold text-foreground">{getLanguageName(lang, interfaceLanguage)}</div>
                    <div className="text-xs text-muted-foreground">{getLocalizedCountryForLanguage(lang, interfaceLanguage)}</div>
                  </div>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  {lang.status === "coming_soon" && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded-full">{t("Bientôt")}</span>
                  )}
                  {isLanguageDownloaded(lang.code) && (
                    <span className="flex items-center gap-1 text-xs bg-green-500/15 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full">
                      <Download size={10} /> {t("Hors-ligne")}
                    </span>
                  )}
                  <AudioStatusBadgeInline languageCode={lang.code} size="xs" />
                </div>
              </div>
              <p className="mb-4 line-clamp-2 min-h-[40px] text-sm text-muted-foreground">{t("Pays :")} {getLocalizedCountryForLanguage(lang, interfaceLanguage)}</p>
              <div className="mb-3 h-1.5 w-full rounded-full bg-secondary">
                <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: lang.color }} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{prog?.xp || 0} XP</span>
                <span className="flex items-center gap-1 text-primary font-medium group-hover:gap-2 transition-all">
                  {t("Commencer")} <ArrowRight size={14} />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
      {safeFiltered.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">{t("Aucune langue ne correspond à votre recherche.")}</p>
      )}
    </div>
  );
}