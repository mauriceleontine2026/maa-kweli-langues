// @ts-nocheck
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getLeaderboard } from "@/api/leaderboardService";
import { getCurrentUser } from "@/api/authService";
import { useLanguage } from "@/contexts/LanguageContext";
import { Trophy, ArrowLeft, Crown, Medal, Flame, Star, TrendingUp, ChevronUp, RefreshCw, Users, Clock3 } from "lucide-react";

/**
 * @typedef {{ name: string; color: string; bg: string; border: string; min: number; icon: string }} League
 * @typedef {{ userId: string; xp: number; streak: number; langs: number; rank: number; name: string; isMe: boolean }} LeaderboardEntry
 */

const LEAGUES = [
  { name: "Bronze", color: "text-amber-600", bg: "bg-amber-500/10", border: "border-amber-500/30", min: 0, icon: "🥉" },
  { name: "Argent", color: "text-gray-400", bg: "bg-gray-500/10", border: "border-gray-500/30", min: 100, icon: "🥈" },
  { name: "Or", color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/30", min: 300, icon: "🥇" },
  { name: "Saphir", color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/30", min: 600, icon: "💎" },
  { name: "Rubis", color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/30", min: 1000, icon: "❤️" },
  { name: "Émeraude", color: "text-green-500", bg: "bg-green-500/10", border: "border-green-500/30", min: 2000, icon: "💚" },
  { name: "Diamant", color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/30", min: 4000, icon: "🔷" },
];

/** @param {number} xp */
const getLeague = (xp) => {
  let league = LEAGUES[0];
  for (const l of LEAGUES) { if (xp >= l.min) league = l; }
  return league;
};

/** @param {number} xp */
const getNextLeague = (xp) => {
  for (const l of LEAGUES) { if (xp < l.min) return l; }
  return null;
};

export default function Leagues() {
  const { language } = useLanguage();
  const isEnglish = language === "en";
  const labels = isEnglish ? {
    title: "Live Leagues",
    subtitle: "Weekly ranking · new week in ",
    refresh: "Refresh",
    participants: "Participants",
    xpInPlay: "XP in play",
    beforeReset: "Before reset",
    leagueStr: "League",
    nextLeague: "Next league",
    xpToNext: "XP to next",
    toReach: "% to reach ",
    gap: "XP separates you from ",
    gapSubtitle: "Beat them to climb the rankings!",
    loading: "Loading leaderboard...",
    empty: "No learners yet. Start a lesson to appear!",
    you: "(You)",
    actual: "Refresh",
    topWords: { week: "Weekly ranking", none: "No learners yet. Start a lesson to appear!" }
  } : {
    title: "Ligues en Direct",
    subtitle: "Classement hebdomadaire · nouvelle semaine dans ",
    refresh: "Actualiser",
    participants: "Participants",
    xpInPlay: "XP en jeu",
    beforeReset: "Avant le reset",
    leagueStr: "Ligue",
    nextLeague: "Prochaine ligue",
    xpToNext: "+",
    toReach: "% vers la ligue ",
    gap: " XP te séparent de ",
    gapSubtitle: "Dépasse-le pour grimper dans le classement !",
    loading: "Chargement du classement...",
    empty: "Aucun apprenant pour l'instant. Commence une leçon pour apparaître !",
    you: "(Toi)",
    actual: "Actualiser",
    topWords: { week: "Classement hebdomadaire", none: "Aucun apprenant pour l'instant. Commence une leçon pour apparaître !" }
  };
  const [entries, setEntries] = useState(/** @type {LeaderboardEntry[]} */ ([]));
  const [currentUser, setCurrentUser] = useState(/** @type {any | null} */ (null));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaderboard = async () => {
    setRefreshing(true);
    try {
      const [user, leaderboard] = await Promise.all([
        getCurrentUser().catch(() => null),
        getLeaderboard(),
      ]);
      setCurrentUser(user);

      const safeLeaderboard = Array.isArray(leaderboard) ? leaderboard : [];
      const entriesWithSelf = safeLeaderboard.map((entry) => ({
        ...entry,
        isMe: String(entry.userId) === String(user?.id),
      }));
      setEntries(entriesWithSelf);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const getNextReset = () => {
    const now = new Date();
    const next = new Date(now);
    const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
    next.setDate(now.getDate() + daysUntilMonday);
    next.setHours(0, 0, 0, 0);
    const diff = next.getTime() - now.getTime();
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    return `${days}j ${hours}h`;
  };

  const myEntry = entries.find(e => e.isMe);
  const myLeague = myEntry ? getLeague(myEntry.xp) : LEAGUES[0];
  const nextLeague = myEntry ? getNextLeague(myEntry.xp) : null;
  const xpToNext = nextLeague ? nextLeague.min - myEntry?.xp : 0;
  const leagueProgress = nextLeague && myEntry
    ? Math.min(100, ((myEntry.xp - myLeague.min) / (nextLeague.min - myLeague.min)) * 100)
    : 100;

  // Gap to person above
  const personAbove = myEntry && myEntry.rank > 1 ? entries[myEntry.rank - 2] : null;
  const gapToAbove = personAbove ? personAbove.xp - myEntry.xp : 0;

  const maxXP = entries[0]?.xp || 1;
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  const podiumStyle = /** @param {number} rank */ (rank) => {
    if (rank === 1) return { height: "h-28", bg: "bg-gradient-to-t from-yellow-500/30 to-yellow-500/5", ring: "ring-yellow-500/40", textSize: "text-3xl", iconSize: "text-3xl", avatar: "w-14 h-14" };
    if (rank === 2) return { height: "h-20", bg: "bg-gradient-to-t from-gray-400/30 to-gray-400/5", ring: "ring-gray-400/40", textSize: "text-2xl", iconSize: "text-2xl", avatar: "w-12 h-12" };
    return { height: "h-14", bg: "bg-gradient-to-t from-amber-600/30 to-amber-600/5", ring: "ring-amber-600/40", textSize: "text-xl", iconSize: "text-xl", avatar: "w-11 h-11" };
  };

  return (
    <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-10">
      <Link to="/studio" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft size={16} /> Studio
      </Link>
      <header className="mb-6 rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <Trophy className="text-yellow-500" size={24} />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold text-foreground">{labels.title}</h1>
              <p className="text-sm text-muted-foreground">{labels.subtitle}{getNextReset()}</p>
            </div>
          </div>
          <button type="button" onClick={fetchLeaderboard} disabled={refreshing} title={isEnglish ? "Refresh leaderboard" : "Actualiser le classement"} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-secondary disabled:opacity-50"><RefreshCw size={15} className={refreshing ? "animate-spin" : ""} /> {labels.refresh}</button>
        </div>
      <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3"><div className="rounded-xl bg-secondary/50 p-3"><div className="flex items-center gap-1 text-lg font-bold text-foreground"><Users size={15} className="text-primary" /> {entries.length}</div><div className="text-[11px] text-muted-foreground">{labels.participants}</div></div><div className="rounded-xl bg-secondary/50 p-3"><div className="flex items-center gap-1 text-lg font-bold text-foreground"><Star size={15} className="text-blue-500" /> {entries.reduce((total, entry) => total + (entry.xp || 0), 0)}</div><div className="text-[11px] text-muted-foreground">{labels.xpInPlay}</div></div><div className="rounded-xl bg-secondary/50 p-3"><div className="flex items-center gap-1 text-lg font-bold text-foreground"><Clock3 size={15} className="text-primary" /> {getNextReset()}</div><div className="text-[11px] text-muted-foreground">{labels.beforeReset}</div></div></div>
      </header>

      {/* My league card with progress bar */}
      {myEntry && (
        <div className={`${myLeague.bg} ${myLeague.border} border rounded-2xl p-5 mb-6`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{myLeague.icon}</span>
              <div>
                <div className={`font-heading text-xl font-bold ${myLeague.color}`}>{labels.leagueStr} {myLeague.name}</div>
                <div className="text-sm text-muted-foreground">{isEnglish ? `You are #${myEntry.rank} · ${myEntry.xp} XP` : `Tu es #${myEntry.rank} · ${myEntry.xp} XP`}</div>
              </div>
            </div>
            {nextLeague && (
              <div className="text-right">
                <div className="text-xs text-muted-foreground">{labels.nextLeague}</div>
                <div className="text-sm font-semibold text-foreground">{nextLeague.icon} {nextLeague.name}</div>
                <div className="text-xs text-primary font-medium">{labels.xpToNext === "+" ? `+${xpToNext} XP` : `${labels.xpToNext}${xpToNext} XP`}</div>
              </div>
            )}
          </div>
          {nextLeague && (
            <div>
              <div className="w-full bg-secondary/60 rounded-full h-2.5 overflow-hidden">
                <div className="h-2.5 rounded-full bg-gradient-to-r from-primary to-primary/50 transition-all duration-500" style={{ width: `${leagueProgress}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5 text-center">
                {Math.round(leagueProgress)}{labels.toReach}{nextLeague.name}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Gap to next person */}
      {personAbove && (
        <div className="bg-card border border-border rounded-2xl p-4 mb-6 flex items-center gap-3 shadow-sm">
          <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <ChevronUp size={18} className="text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-foreground">
              <span className="font-semibold">{gapToAbove} XP</span>{labels.gap}
              <span className="font-semibold">{personAbove.name}</span> (#{personAbove.rank})
            </p>
            <p className="text-xs text-muted-foreground">{labels.gapSubtitle}</p>
          </div>
          <TrendingUp size={18} className="text-primary shrink-0" />
        </div>
      )}

      {/* Podium for top 3 */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">{labels.loading}</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {labels.empty}
        </div>
      ) : (
        <>
          {top3.length >= 3 && (
            <div className="flex items-end justify-center gap-2 sm:gap-4 mb-6 px-2">
              {/* 2nd place */}
              <div className="flex flex-col items-center w-1/3">
                <div className={`w-12 h-12 rounded-full bg-gray-400/20 flex items-center justify-center mb-1.5 ring-2 ${podiumStyle(2).ring}`}>
                  <span className="text-2xl">{getLeague(top3[1].xp).icon}</span>
                </div>
                <div className="text-xs font-semibold text-foreground truncate max-w-full text-center">{top3[1].name}</div>
                <div className="text-xs text-muted-foreground mb-1.5">{top3[1].xp} XP</div>
                <div className={`w-full ${podiumStyle(2).bg} rounded-t-xl ${podiumStyle(2).height} flex items-center justify-center border-t-2 border-gray-400/30`}>
                  <span className={`font-bold text-gray-400 ${podiumStyle(2).textSize}`}>2</span>
                </div>
              </div>
              {/* 1st place */}
              <div className="flex flex-col items-center w-1/3">
                <Crown className="text-yellow-500 mb-1" size={26} />
                <div className={`w-14 h-14 rounded-full bg-yellow-500/20 flex items-center justify-center mb-1.5 ring-2 ${podiumStyle(1).ring}`}>
                  <span className="text-3xl">{getLeague(top3[0].xp).icon}</span>
                </div>
                <div className="text-xs font-semibold text-foreground truncate max-w-full text-center">{top3[0].name}</div>
                <div className="text-xs text-muted-foreground mb-1.5">{top3[0].xp} XP</div>
                <div className={`w-full ${podiumStyle(1).bg} rounded-t-xl ${podiumStyle(1).height} flex items-center justify-center border-t-2 border-yellow-500/40`}>
                  <span className={`font-bold text-yellow-500 ${podiumStyle(1).textSize}`}>1</span>
                </div>
              </div>
              {/* 3rd place */}
              <div className="flex flex-col items-center w-1/3">
                <div className={`w-11 h-11 rounded-full bg-amber-600/20 flex items-center justify-center mb-1.5 ring-2 ${podiumStyle(3).ring}`}>
                  <span className="text-xl">{getLeague(top3[2].xp).icon}</span>
                </div>
                <div className="text-xs font-semibold text-foreground truncate max-w-full text-center">{top3[2].name}</div>
                <div className="text-xs text-muted-foreground mb-1.5">{top3[2].xp} XP</div>
                <div className={`w-full ${podiumStyle(3).bg} rounded-t-xl ${podiumStyle(3).height} flex items-center justify-center border-t-2 border-amber-600/30`}>
                  <span className={`font-bold text-amber-600 ${podiumStyle(3).textSize}`}>3</span>
                </div>
              </div>
            </div>
          )}

          {/* Full leaderboard with progress bars */}
          <div className="space-y-2">
            {entries.map((e) => {
              const league = getLeague(e.xp);
              const pct = Math.max(4, (e.xp / maxXP) * 100);
              const isTop3 = e.rank <= 3;
              return (
                <div key={e.userId}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition ${
                    e.isMe ? "bg-primary/10 border-primary/40 shadow-sm" : isTop3 ? `${league.bg} ${league.border}` : "bg-card border-border"
                  }`}>
                  <div className={`w-8 text-center font-bold ${e.rank <= 3 ? "text-primary" : "text-muted-foreground"}`}>
                    {e.rank === 1 ? <Crown size={20} className="text-yellow-500 mx-auto" /> :
                     e.rank === 2 ? <Medal size={20} className="text-gray-400 mx-auto" /> :
                     e.rank === 3 ? <Medal size={20} className="text-amber-600 mx-auto" /> :
                     e.rank}
                  </div>
                  <span className="text-2xl shrink-0">{league.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-semibold text-foreground text-sm truncate">
                        {e.name} {e.isMe && <span className="text-primary">{labels.you}</span>}
                      </div>
                      <span className={`text-xs font-medium ${league.color} shrink-0 ml-2`}>{league.name}</span>
                    </div>
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="flex-1 bg-secondary rounded-full h-1.5 overflow-hidden min-w-[60px]">
                        <div className={`h-1.5 rounded-full transition-all duration-500 ${e.isMe ? "bg-primary" : "bg-muted-foreground/40"}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                        <Star size={12} className="text-blue-500" /> {e.xp}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                        <Flame size={12} className="text-primary" /> {e.streak}j
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">{e.langs}L</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}