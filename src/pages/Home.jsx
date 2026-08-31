import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { getLanguages } from "@/api/languageService";
import { getProgress } from "@/api/progressService";
import {
  ArrowRight,
  BookOpen,
  Flame,
  GraduationCap,
  Mic,
  Play,
  Search,
  Star,
  Wrench,
} from "lucide-react";
import LanguageFlag from "@/components/ui/LanguageFlag";
import { getLanguageName, getLocalizedCountryForLanguage } from "@/lib/localLanguageData";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Home() {
  const { user } = useAuth();
  const { t, language: interfaceLanguage } = useLanguage();
  const [languages, setLanguages] = useState(/** @type {any[]} */ ([]));
  const [progresses, setProgresses] = useState(/** @type {any[]} */ ([]));
  const [loadingLanguages, setLoadingLanguages] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(true);

  useEffect(() => {
    getLanguages().then((data) => setLanguages(Array.isArray(data) ? data : [])).catch(() => setLanguages([])).finally(() => setLoadingLanguages(false));
  }, []);

  useEffect(() => {
    const refreshProgress = () => {
      if (user) {
        getProgress().then((data) => setProgresses(Array.isArray(data) ? data : [])).catch(() => setProgresses([])).finally(() => setLoadingProgress(false));
      } else {
        setProgresses([]);
        setLoadingProgress(false);
      }
    };

    refreshProgress();
    window.addEventListener("mbaara-progress-updated", refreshProgress);
    window.addEventListener("mbaara-user-updated", refreshProgress);

    return () => {
      window.removeEventListener("mbaara-progress-updated", refreshProgress);
      window.removeEventListener("mbaara-user-updated", refreshProgress);
    };
  }, [user]);

  const safeProgresses = /** @type {any[]} */ (Array.isArray(progresses) ? progresses : []);
  const safeLanguages = /** @type {any[]} */ (Array.isArray(languages) ? languages : []);
  const totalXP = safeProgresses.reduce((s, p) => s + (p.xp || 0), 0);
  const maxStreak = safeProgresses.reduce((s, p) => Math.max(s, p.streak || 0), 0);
  const currentProgress = [...safeProgresses].sort((first, second) => (second.current_lesson || 1) - (first.current_lesson || 1))[0];
  const startedLanguages = safeProgresses.map((progress) => ({
    progress,
    language: safeLanguages.find((language) => language.code === progress.language_code),
  })).filter((item) => item.language);
  const activeLangs = startedLanguages.length;
  const currentLanguage = safeLanguages.find((language) => language.code === currentProgress?.language_code);
  const displayName = user?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "";
  const discoveryLanguages = useMemo(() => {
    const startedCodes = new Set(safeProgresses.map((progress) => progress.language_code));
    const availableLanguages = safeLanguages.filter((language) => !startedCodes.has(language.code));
    return [...availableLanguages].sort(() => Math.random() - 0.5).slice(0, 3);
  }, [safeLanguages, safeProgresses]);

  const actions = [
    { to: "/apprendre", label: t("learn"), icon: Search, color: "text-orange-500" },
    { to: "/contribuer", label: t("contribute"), icon: Mic, color: "text-pink-500" },
    { to: "/studio", label: t("workshop"), icon: Wrench, color: "text-yellow-500" },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl min-w-0 p-4 sm:p-6 lg:p-8">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-8 overflow-hidden rounded-[2rem] border border-border bg-gradient-to-br from-primary/18 via-card to-card p-4 shadow-[0_30px_90px_-50px_rgba(249,115,22,0.55)] sm:p-7 lg:p-9"
      >
        <div className="absolute -right-12 -top-12 h-52 w-52 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-16 left-8 h-56 w-56 rounded-full bg-[#1554a0]/10 blur-3xl" />

        <div className="relative lg:grid lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-8">
          <div className="text-left">
            <div className="mb-4 flex items-center gap-3">
              <img src="/logo.png" alt="Mǎa-kwɛ́lî Langues" className="h-14 w-14 rounded-full object-cover shadow-md ring-2 ring-primary/30 sm:h-16 sm:w-16" />
              <div>
                <div className="font-heading text-lg font-bold leading-none text-foreground">Mǎa-kwɛ́lî</div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Langues</div>
              </div>
            </div>

            <h1 className="mb-3 max-w-xl break-words font-heading text-2xl font-bold leading-tight text-foreground sm:mb-4 sm:text-4xl lg:text-[2.65rem]">
              {t("welcome")}{displayName ? `, ${displayName}` : ""} !
            </h1>

            <p className="mb-5 max-w-lg text-sm leading-6 text-muted-foreground sm:mb-6 sm:text-base">
              {t("welcomeText")}
            </p>

          </div>

          <div className="mt-5 text-left lg:mt-0">
            <div className="mb-5 flex flex-col items-start gap-2.5 sm:mb-6 sm:flex-row sm:flex-wrap sm:gap-3">
              {currentLanguage ? (
                <Link
                  to={`/apprendre/${currentLanguage.code}`}
                  className="inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:opacity-95 sm:w-auto sm:px-5"
                >
                  {t("continueLearning")} <ArrowRight size={18} />
                </Link>
              ) : (
                <Link
                  to="/apprendre"
                  className="inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:opacity-95 sm:w-auto sm:px-5"
                >
                  {t("startNow")} <ArrowRight size={18} />
                </Link>
              )}

              <Link
                to="/tuteur"
                className="inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:text-primary sm:w-auto sm:px-5"
              >
                <GraduationCap size={18} /> {t("tutor")}
              </Link>
            </div>

            <div className="-mx-1 flex flex-nowrap items-center gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-secondary/70 px-2.5 py-1.5 text-[11px] text-foreground sm:gap-2 sm:px-3 sm:text-sm">
                <Flame size={14} className="text-primary" /> {maxStreak} {t("jours série")}
              </div>
              <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-secondary/70 px-2.5 py-1.5 text-[11px] text-foreground sm:gap-2 sm:px-3 sm:text-sm">
                <Star size={14} className="text-blue-500" /> {totalXP} XP
              </div>
              <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-secondary/70 px-2.5 py-1.5 text-[11px] text-foreground sm:gap-2 sm:px-3 sm:text-sm">
                <BookOpen size={14} className="text-green-500" /> {loadingLanguages || loadingProgress ? "..." : activeLangs} {t("activeLanguages")}
              </div>
            </div>
          </div>

        </div>
      </motion.section>

      {startedLanguages.length > 0 && (
        <section className="mb-8">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{t("yourPaths")}</p>
              <h2 className="font-heading text-3xl font-bold text-foreground">{t("resume")}</h2>
            </div>
            <Link to="/apprendre" className="text-sm font-semibold text-primary hover:underline">{t("seeAll")}</Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {startedLanguages.slice(0, 4).map(({ progress, language }) => {
              const totalLessons = Math.max(1, language.total_lessons || 20);
              const lesson = Math.max(1, progress.current_lesson || 1);
              const percentage = Math.min(100, ((lesson - 1) / totalLessons) * 100);

              return (
                <Link key={language.code} to={`/apprendre/${language.code}`} className="group rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
                  <div className="flex items-center gap-3">
                    <LanguageFlag language={language} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-foreground">{getLanguageName(language, interfaceLanguage)}</div>
                      <div className="text-xs text-muted-foreground">{t("lessonOf", lesson, totalLessons)} · {progress.xp || 0} XP</div>
                    </div>
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                      <Play size={14} fill="currentColor" />
                    </span>
                  </div>
                  <div className="mt-4 h-2.5 rounded-full bg-secondary">
                    <div className="h-2.5 rounded-full bg-primary transition-all" style={{ width: `${percentage}%` }} />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {discoveryLanguages.length > 0 && (
        <section className="mb-8">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{t("discover")}</p>
              <h2 className="font-heading text-2xl font-bold leading-tight text-foreground sm:text-3xl">{t("discoverPaths")}</h2>
            </div>
            <Link to="/apprendre" className="shrink-0 pb-0.5 text-sm font-semibold text-primary hover:underline">{t("explore")}</Link>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {discoveryLanguages.map((language) => (
              <Link key={language.code} to={`/apprendre/${language.code}`} className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
                <LanguageFlag language={language} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-foreground">{getLanguageName(language, interfaceLanguage)}</div>
                  <div className="truncate text-xs text-muted-foreground">{getLocalizedCountryForLanguage(language, interfaceLanguage)}</div>
                </div>
                <ArrowRight size={15} className="shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mb-8">
        <div className="mb-6 flex items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{t("quickActions")}</p>
            <h2 className="font-heading text-2xl font-bold leading-tight text-foreground sm:text-3xl">{t("directAccess")}</h2>
          </div>
        </div>

        <div className="grid items-stretch gap-4 md:grid-cols-3">
          {actions.map(({ to, label, icon: Icon, color }) => {
            const isWorkshop = to === "/studio";
            return (
            <Link key={to} to={to} className={`group relative flex min-h-[10.5rem] flex-col justify-between overflow-hidden rounded-2xl border p-5 transition duration-300 hover:-translate-y-1.5 hover:shadow-lg ${isWorkshop ? "border-white/25 bg-gradient-to-br from-[#1554a0] via-[#10447f] to-[#08294f] text-white shadow-[0_20px_45px_-18px_rgba(8,41,79,0.9)] ring-1 ring-[#facc15]/20 hover:border-[#facc15]/60 hover:shadow-[0_28px_55px_-18px_rgba(8,41,79,0.95)]" : "border-border bg-card hover:border-primary/40"}`}>
              {isWorkshop && <><div className="absolute -right-10 -top-10 h-32 w-32 rounded-full border-[18px] border-[#facc15]/15 transition-transform duration-500 group-hover:scale-110" /><div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[#facc15]/70 to-transparent" /></>}
              <div className={`relative mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl ${isWorkshop ? "bg-[#facc15] text-[#1554a0] shadow-[0_8px_20px_rgba(0,0,0,0.2)] ring-4 ring-white/10 transition-transform duration-300 group-hover:rotate-3 group-hover:scale-105" : `bg-primary/10 ${color}`}`}>
                <Icon size={22} />
              </div>
              <div className="relative">
                {isWorkshop && <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#facc15]">{t("workshop")}</div>}
                <div className={`mb-2 font-heading text-lg font-bold ${isWorkshop ? "text-white" : "text-foreground"}`}>{label}</div>
                {isWorkshop && <p className="mb-3 max-w-[15rem] text-xs leading-5 text-blue-100">{t("workshopText")}</p>}
                <div className={`flex items-center gap-2 text-sm font-semibold ${isWorkshop ? "text-white group-hover:text-[#facc15]" : "text-muted-foreground group-hover:text-primary"}`}>
                  {t("discover")} <ArrowRight size={15} />
                </div>
              </div>
            </Link>
            );
          })}
        </div>
      </section>

    </div>
  );
}
