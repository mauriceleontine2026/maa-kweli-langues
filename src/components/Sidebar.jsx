import { Link, useLocation } from "react-router-dom";
import { Home, BookOpen, GraduationCap, Mic, TrendingUp, Clock, Flame, Star, Sun, Moon, User, Shield, WifiOff } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useLanguage } from "@/contexts/LanguageContext";
import { syncProgressQueue } from "@/lib/offlineStorage";
import { getProgress } from "@/api/progressService";
// public logo at /logo.png

const NAV = [
  { to: "/", key: "home", icon: Home },
  { to: "/apprendre", key: "learn", icon: BookOpen },
  { to: "/tuteur", key: "tutor", icon: GraduationCap },
  { to: "/contribuer", key: "contribute", icon: Mic },
  { to: "/progres", key: "progress", icon: TrendingUp },
  { to: "/revision", key: "review", icon: Clock },
  { to: "/profil", key: "profile", icon: User },
];

export default function Sidebar() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [progresses, setProgresses] = useState([]);
  const online = useOnlineStatus();

  useEffect(() => {
    const refreshProgress = () => {
      if (user) {
        getProgress()
          .then((res) => setProgresses(Array.isArray(res) ? res : []))
          .catch(() => setProgresses([]));
      } else {
        setProgresses([]);
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

  useEffect(() => {
    if (online) syncProgressQueue();
  }, [online]);

  const totalXP = Array.isArray(progresses) ? progresses.reduce((s, p) => s + (p.xp || 0), 0) : 0;
  const maxStreak = Array.isArray(progresses) ? progresses.reduce((s, p) => Math.max(s, p.streak || 0), 0) : 0;

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="w-64 bg-sidebar border-r border-border flex flex-col h-screen sticky top-0 shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-3 border-b border-border">
      <img src="/logo.png" alt="Mǎa-kwɛ́lî Langues" className="w-11 h-11 rounded-full object-cover shadow-md ring-2 ring-primary/30" />
        <div>
          <div className="font-heading font-bold text-lg leading-none text-foreground">Mǎa-kwɛ́lî</div>
          <div className="text-xs text-primary font-semibold mt-0.5">Langues</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map(({ to, key, icon: Icon }) => {
          const active = isActive(to);
          return (
            <Link key={to} to={to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? "bg-primary/15 text-primary border-l-2 border-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}>
              <Icon size={18} strokeWidth={active ? 2.5 : 2} />
              {t(key)}
            </Link>
          );
        })}
        {user?.role === "admin" && (
          <Link to="/admin"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isActive("/admin")
                ? "bg-primary/15 text-primary border-l-2 border-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}>
            <Shield size={18} strokeWidth={isActive("/admin") ? 2.5 : 2} />
            {t("administration")}
          </Link>
        )}
      </nav>

      {/* Footer stats + theme */}
      <div className="px-3 py-4 border-t border-border space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-secondary/60 rounded-xl p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 text-primary font-bold text-sm">
              <Flame size={14} /> {maxStreak}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{t("jours série")}</div>
          </div>
          <div className="bg-secondary/60 rounded-xl p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 text-blue-500 font-bold text-sm">
              <Star size={14} /> {totalXP}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{t("XP totaux")}</div>
          </div>
        </div>
        {!online && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-yellow-500 bg-yellow-500/10">
            <WifiOff size={14} /> {t("Mode hors-ligne")}
          </div>
        )}
        <button onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition">
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          {theme === "dark" ? t("lightMode") : t("darkMode")}
        </button>
      </div>
    </aside>
  );
}