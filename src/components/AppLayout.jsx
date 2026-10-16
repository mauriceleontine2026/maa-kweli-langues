import { useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Bell,
  BookOpen,
  CheckCheck,
  CircleHelp,
  Clock,
  GraduationCap,
  Home,
  LayoutDashboard,
  Languages,
  LogIn,
  LogOut,
  Megaphone,
  Mic,
  Moon,
  Settings2,
  Sparkles,
  Shield,
  Sun,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";

const NAV_ITEMS = [
  { to: "/", key: "home", icon: Home },
  { to: "/apprendre", key: "learn", icon: BookOpen },
  { to: "/tuteur", key: "tutor", icon: GraduationCap, featured: true },
  { to: "/contribuer", key: "contribute", icon: Mic },
  { to: "/progres", key: "progress", icon: TrendingUp },
  { to: "/revision", key: "review", icon: Clock },
];

const ANNOUNCEMENTS_STORAGE_KEY = "maa-kweli-announcements-read";

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();
  const [announcementsOpen, setAnnouncementsOpen] = useState(false);
  const [announcementFilter, setAnnouncementFilter] = useState("all");
  const [readAnnouncementIds, setReadAnnouncementIds] = useState(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = JSON.parse(window.localStorage.getItem(ANNOUNCEMENTS_STORAGE_KEY) || "[]");
      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  });

  const announcements = [
    {
      id: "support-center-update",
      title: t("notificationSupportTitle"),
      description: t("notificationSupportDescription"),
      to: "/support",
    },
    {
      id: "settings-update",
      title: t("notificationSettingsTitle"),
      description: t("notificationSettingsDescription"),
      to: "/settings",
    },
  ];
  const unreadCount = announcements.filter(({ id }) => !readAnnouncementIds.includes(id)).length;
  const visibleAnnouncements = announcements.filter(({ id }) => (
    announcementFilter !== "unread" || !readAnnouncementIds.includes(id)
  ));

  const markAnnouncementsRead = (ids) => {
    const nextReadIds = [...new Set([...readAnnouncementIds, ...ids])];
    setReadAnnouncementIds(nextReadIds);
    try {
      window.localStorage.setItem(ANNOUNCEMENTS_STORAGE_KEY, JSON.stringify(nextReadIds));
    } catch {
      // Keep the current session usable when browser storage is unavailable.
    }
  };

  const isActive = (to) => {
    if (to === "/") return location.pathname === "/";
    return location.pathname.startsWith(to);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:px-4">
          <div className="group flex min-w-0 items-center gap-3">
            <img src="/logo.png" alt="Mǎa-kwɛ́lî Langues" className="h-9 w-9 rounded-full object-cover ring-2 ring-primary/30" />
            <div>
              <div className="font-heading text-base font-bold leading-none text-foreground transition-colors group-hover:text-primary">Mǎa-kwɛ́lî</div>
              <div className="text-[11px] font-semibold text-primary">Langues</div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={toggleLanguage}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-2.5 py-2 text-xs font-bold text-foreground shadow-sm transition hover:bg-secondary sm:px-3"
              aria-label={language === "fr" ? "Switch to English" : "Switch to French"}
              title={language === "fr" ? "Switch to English" : "Switch to French"}
            >
              <Languages size={15} className="text-primary" />
              <span>{language === "fr" ? "EN" : "FR"}</span>
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex max-w-[48vw] shrink-0 items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-2 py-1.5 text-sm font-medium text-foreground shadow-sm transition hover:bg-secondary sm:gap-2 sm:px-3 sm:py-2">
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-primary ring-1 ring-border/80">
                {user?.photo_url ? (
                  <img
                    src={user.photo_url}
                    alt={user?.full_name || user?.email || "Profil"}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <UserRound size={16} />
                )}
              </div>
              <span className="max-w-[140px] truncate hidden sm:inline">
                {user?.full_name || user?.email || t("account")}
              </span>
              {user?.role === "admin" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-400/40">
                  <Shield size={10} />
                  Admin
                </span>
              ) : null}
              </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="px-3 py-2">
                <div className="text-sm font-semibold text-foreground">{t("personalSpace")}</div>
                <div className="text-xs text-muted-foreground">{user?.email || t("signedIn")}</div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/dashboard" className="flex items-center gap-2">
                  <LayoutDashboard size={16} />
                  {t("dashboard")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings" className="flex items-center gap-2">
                  <Settings2 size={16} />
                  {t("settings")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/profil" className="flex items-center gap-2">
                  <UserRound size={16} />
                  {t("profile")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/support" className="flex items-center gap-2">
                  <CircleHelp size={16} />
                  {t("support")}
                </Link>
              </DropdownMenuItem>
              {user?.role === "admin" ? (
                <DropdownMenuItem asChild>
                  <Link to="/admin" className="flex items-center gap-2">
                    <Shield size={16} />
                    {t("administration")}
                  </Link>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  toggleTheme();
                }}
                className="flex items-center gap-2"
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                {theme === "dark" ? t("lightMode") : t("darkMode")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {user ? (
                <DropdownMenuItem onSelect={(event) => {
                  event.preventDefault();
                  handleLogout();
                }} className="flex items-center gap-2 text-destructive focus:text-destructive">
                  <LogOut size={16} />
                  {t("logout")}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem asChild>
                  <Link to="/login" className="flex items-center gap-2 text-primary">
                    <LogIn size={16} />
                    {t("login")}
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
              </DropdownMenu>
              <Popover open={announcementsOpen} onOpenChange={setAnnouncementsOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label={t("notificationsTitle")}
                    title={t("notificationsTitle")}
                    className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-secondary/60 text-foreground shadow-sm transition hover:bg-secondary"
                  >
                    <Bell size={18} />
                    {unreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground ring-2 ring-background">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" sideOffset={10} className="w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden p-0">
                  <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">{t("notificationsTitle")}</h2>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {unreadCount > 0 ? t("notificationsUnreadCount", unreadCount) : t("notificationsAllRead")}
                      </p>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={() => markAnnouncementsRead(announcements.map(({ id }) => id))}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/10"
                      >
                        <CheckCheck size={14} />
                        {t("notificationsMarkAllRead")}
                      </button>
                    )}
                  </div>

                  <div role="tablist" aria-label={t("notificationsFilters")} className="flex gap-1 border-b border-border px-3 py-2">
                    {["all", "unread"].map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        role="tab"
                        aria-selected={announcementFilter === filter}
                        onClick={() => setAnnouncementFilter(filter)}
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${announcementFilter === filter ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"}`}
                      >
                        {t(filter === "all" ? "notificationsAll" : "notificationsUnread")}
                      </button>
                    ))}
                  </div>

                  <div className="max-h-[min(65vh,28rem)] overflow-y-auto p-2">
                    {visibleAnnouncements.length > 0 ? visibleAnnouncements.map((announcement) => {
                      const isRead = readAnnouncementIds.includes(announcement.id);
                      return (
                        <button
                          key={announcement.id}
                          type="button"
                          onClick={() => {
                            markAnnouncementsRead([announcement.id]);
                            setAnnouncementsOpen(false);
                            navigate(announcement.to);
                          }}
                          className="flex w-full gap-3 rounded-lg p-3 text-left transition hover:bg-secondary/70"
                        >
                          <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ${isRead ? "bg-secondary text-muted-foreground" : "bg-primary/10 text-primary"}`}>
                            <Megaphone size={17} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-start justify-between gap-2">
                              <span className="text-sm font-semibold text-foreground">{announcement.title}</span>
                              {!isRead && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label={t("notificationsUnread")} />}
                            </span>
                            <span className="mt-1 block text-xs leading-5 text-muted-foreground">{announcement.description}</span>
                            <span className="mt-2 block text-[10px] font-semibold uppercase text-primary">{t("notificationsNews")}</span>
                          </span>
                        </button>
                      );
                    }) : (
                      <div className="px-4 py-8 text-center">
                        <Bell size={20} className="mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm font-semibold text-foreground">{t("notificationsEmptyTitle")}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("notificationsEmptyDescription")}</p>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl pb-24 pt-20">
        <AnimatePresence mode="wait">
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22, ease: "easeOut" }}>
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="mx-auto grid max-w-7xl grid-cols-6 gap-0.5 px-0.5 py-1">
          {NAV_ITEMS.map(({ to, key, icon: Icon, featured }) => {
            const label = t(key);
            return (
            <NavLink
              key={to}
              to={to}
              aria-label={featured ? "Kôrô, tuteur IA" : label}
              title={featured ? "Kôrô, tuteur IA" : label}
              className={({ isActive: navActive }) => {
                const active = navActive || isActive(to);
                return `relative flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 py-1.5 text-[9px] font-medium transition sm:text-[11px] ${
                  active
                    ? "bg-primary/15 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`;
              }}
            >
              {({ isActive: navActive }) => {
                const active = navActive || isActive(to);
                return (
                  <>
                    <span className="relative grid h-7 w-7 place-items-center rounded-lg">
                      <Icon size={featured ? 18 : 16} strokeWidth={active || featured ? 2.25 : 2} />
                      {featured && <Sparkles className="absolute -right-1 -top-1" size={10} strokeWidth={2.5} />}
                    </span>
                    <span className={`max-w-full truncate text-center leading-none ${featured ? "font-semibold" : ""}`}>{label}</span>
                  </>
                );
              }}
            </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}