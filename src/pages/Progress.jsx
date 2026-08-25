import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { getLanguages } from "@/api/languageService";
import { getProgress } from "@/api/progressService";
import { Award, BookOpen, Flame, Star, TrendingUp, ArrowRight } from "lucide-react";
import LanguageFlag from "@/components/ui/LanguageFlag";

export default function Progress() {
  const { user } = useAuth();
  const [progresses, setProgresses] = useState(/** @type {any[]} */ ([]));
  const [languages, setLanguages] = useState(/** @type {any[]} */ ([]));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLanguages().then(data => setLanguages(Array.isArray(data) ? data : [])).catch(() => setLanguages([]));
  }, []);

  useEffect(() => {
    const refreshProgress = () => {
      if (user) {
        getProgress().then(data => setProgresses(Array.isArray(data) ? data : [])).catch(() => setProgresses([])).finally(() => setLoading(false));
      } else {
        setProgresses([]);
        setLoading(false);
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

  /** @type {any[]} */
  const safeProgresses = Array.isArray(progresses) ? progresses : [];
  /** @type {any[]} */
  const safeLanguages = Array.isArray(languages) ? languages : [];
  const normalizeCode = (value) => String(value || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
  const progressByLanguage = new Map(safeProgresses.map((progress) => [normalizeCode(progress.language_code), progress]));
  const languageRows = safeLanguages.map((language) => ({ language, progress: progressByLanguage.get(normalizeCode(language.code)) || null }));
  const totalXP = safeProgresses.reduce((s, p) => s + (p.xp || 0), 0);
  const maxStreak = safeProgresses.reduce((s, p) => Math.max(s, p.streak || 0), 0);
  const activeLangs = languageRows.filter(({ progress }) => progress).length;
  const totalLessons = safeProgresses.reduce((s, p) => s + (p.completed_lessons?.length || 0), 0);

  const rank = totalLessons < 10 ? "Débutant" : totalLessons < 30 ? "Apprenti" : totalLessons < 60 ? "Intermédiaire" : "Avancé";
  const nextRank = totalLessons < 10 ? "Apprenti" : totalLessons < 30 ? "Intermédiaire" : "Avancé";
  const currentRankStart = totalLessons < 10 ? 0 : totalLessons < 30 ? 10 : totalLessons < 60 ? 30 : 60;
  const nextRankTarget = totalLessons < 10 ? 10 : totalLessons < 30 ? 30 : totalLessons < 60 ? 60 : 60;
  const toNext = Math.max(0, nextRankTarget - totalLessons);
  const rankProgress = totalLessons >= 60 ? 100 : Math.min(100, ((totalLessons - currentRankStart) / Math.max(1, nextRankTarget - currentRankStart)) * 100);
  const startedRows = languageRows.filter(({ progress }) => progress);
  const availableRows = languageRows.filter(({ progress }) => !progress);

  return (
    <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-10">
      <header className="mb-6 rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Tableau de bord personnel</div><h1 className="font-heading text-3xl font-bold text-foreground">Ma progression</h1><p className="mt-1 text-sm text-muted-foreground">Suivez vos progrès et reprenez vos parcours en un coup d’œil.</p></div><Link to="/apprendre" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90">Explorer les langues <ArrowRight size={16} /></Link></div>
      </header>

      {/* Rank card */}
      <div className="bg-gradient-to-br from-purple-600/20 via-card to-card border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-primary flex items-center justify-center">
            <Award className="text-white" size={28} />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Votre rang actuel</p>
            <h2 className="font-heading text-2xl font-bold text-foreground">{rank}</h2>
            <p className="text-sm text-muted-foreground">{toNext > 0 ? `Encore ${toNext} leçons pour devenir « ${nextRank} »` : "Niveau maximum atteint"}</p>
          </div>
        </div>
        <div className="mt-4">
          <div className="w-full bg-secondary rounded-full h-2">
            <div className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-primary" style={{ width: `${rankProgress}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 text-right">{totalLessons} leçons totales</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <BookOpen className="mx-auto mb-2 text-green-500" size={24} />
          <div className="text-2xl font-bold text-foreground">{totalLessons}</div>
          <div className="text-xs text-muted-foreground">Leçons maîtrisées</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <Flame className="mx-auto mb-2 text-primary" size={24} />
          <div className="text-2xl font-bold text-foreground">{maxStreak}</div>
          <div className="text-xs text-muted-foreground">Streak max (jours)</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <Star className="mx-auto mb-2 text-blue-500" size={24} />
          <div className="text-2xl font-bold text-foreground">{activeLangs}</div>
          <div className="text-xs text-muted-foreground">Langues actives</div>
        </div>
      </div>

      {/* Progression by language */}
      <div className="mb-4 flex items-center gap-2">
        <TrendingUp size={18} className="text-muted-foreground" />
        <h2 className="font-heading text-xl font-bold text-foreground">Progression par langue</h2>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">Chargement de votre progression...</div>
      ) : languageRows.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <BookOpen size={40} className="mx-auto mb-3 text-muted-foreground/40" />
          <p className="font-semibold text-foreground mb-1">Aucune progression encore</p>
          <p className="text-sm text-muted-foreground mb-4">Commencez à apprendre une langue pour voir votre progression ici</p>
          <Link to="/apprendre" className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-5 py-3 rounded-xl hover:opacity-90 transition">
            Choisir une langue <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {startedRows.length > 0 && <section><div className="mb-3 flex items-end justify-between"><div><h3 className="font-heading text-lg font-bold text-foreground">Parcours en cours</h3><p className="text-sm text-muted-foreground">Continuez là où vous vous êtes arrêté.</p></div><span className="text-xs text-muted-foreground">{startedRows.length} langue(s)</span></div><div className="grid gap-3 md:grid-cols-2">{startedRows.map(({ language: lang, progress: p }) => {
            const completed = p?.completed_lessons?.length || 0;
            return (
              <Link to={`/apprendre/${lang.code}`} key={lang.code} className="group rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md">
                <LanguageFlag language={lang} size="md" />
                <div className="mt-3 flex items-center justify-between gap-3"><div className="min-w-0"><div className="truncate font-semibold text-foreground text-sm">{lang.name_fr}</div><div className="text-xs text-muted-foreground">{completed} leçon(s) · {p?.xp || 0} XP</div></div><ArrowRight size={16} className="shrink-0 text-primary transition group-hover:translate-x-1" /></div>
                <div className="mt-3 w-full bg-secondary rounded-full h-1.5">
                  <div className="h-1.5 rounded-full" style={{ width: `${Math.min(100, (completed / Math.max(1, lang.total_lessons || 20)) * 100)}%`, background: lang.color }} />
                </div>
              </Link>
            );
          })}</div></section>}
          {availableRows.length > 0 && <section><div className="mb-3 flex items-end justify-between"><div><h3 className="font-heading text-lg font-bold text-foreground">À découvrir</h3><p className="text-sm text-muted-foreground">Commencez un nouveau parcours.</p></div><span className="text-xs text-muted-foreground">{availableRows.length} langue(s)</span></div><div className="grid gap-3 md:grid-cols-2">{availableRows.map(({ language: lang, progress: p }) => {
            const completed = p?.completed_lessons?.length || 0;
            return (
              <Link to={`/apprendre/${lang.code}`} key={lang.code} className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md">
                <LanguageFlag language={lang} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground text-sm">{lang.name_fr}</div>
                  <div className="text-xs text-muted-foreground">Pas encore commencé</div>
                </div>
                <span className="shrink-0 text-xs font-semibold text-primary transition group-hover:translate-x-1">Commencer <ArrowRight size={13} className="inline" /></span>
              </Link>
            );
          })}</div></section>}
        </div>
      )}
    </div>
  );
}