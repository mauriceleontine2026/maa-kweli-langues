import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BookOpen,
  CircleHelp,
  Clock,
  GraduationCap,
  Home,
  LayoutDashboard,
  LogIn,
  LogOut,
  Mic,
  Moon,
  Settings2,
  Shield,
  Sun,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

const NAV_ITEMS = [
  { to: "/", label: "Accueil", icon: Home },
  { to: "/apprendre", label: "Apprendre", icon: BookOpen },
  { to: "/tuteur", label: "Kôrô", icon: GraduationCap, featured: true },
  { to: "/contribuer", label: "Contribuer", icon: Mic },
  { to: "/progres", label: "Progrès", icon: TrendingUp },
  { to: "/revision", label: "Révision", icon: Clock },
];

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

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
      <header className="fixed inset-x-0 top-0 z-40 border-b border-border/70 bg-background/85 shadow-[0_8px_30px_-24px_rgba(249,115,22,.65)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:px-4">
          <div className="group flex min-w-0 items-center gap-3">
            <img src="/logo.png" alt="Mǎa-kwɛ́lî Langues" className="h-9 w-9 rounded-full object-cover ring-2 ring-primary/30" />
            <div>
              <div className="font-heading text-base font-bold leading-none text-foreground transition-colors group-hover:text-primary">Mǎa-kwɛ́lî</div>
              <div className="text-[11px] font-semibold text-primary">Langues</div>
            </div>
          </div>

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
                {user?.full_name || user?.email || "Mon espace"}
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
                <div className="text-sm font-semibold text-foreground">Espace personnel</div>
                <div className="text-xs text-muted-foreground">{user?.email || "Compte connecté"}</div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/dashboard" className="flex items-center gap-2">
                  <LayoutDashboard size={16} />
                  Tableau de bord / Dashboard
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings" className="flex items-center gap-2">
                  <Settings2 size={16} />
                  Réglages, Paramètres & Confidentialité
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/profil" className="flex items-center gap-2">
                  <UserRound size={16} />
                  Profil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/support" className="flex items-center gap-2">
                  <CircleHelp size={16} />
                  Centre d'aide / Support
                </Link>
              </DropdownMenuItem>
              {user?.role === "admin" ? (
                <DropdownMenuItem asChild>
                  <Link to="/admin" className="flex items-center gap-2">
                    <Shield size={16} />
                    Administration / Admin
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
                {theme === "dark" ? "Mode clair" : "Mode sombre"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {user ? (
                <DropdownMenuItem onSelect={(event) => {
                  event.preventDefault();
                  handleLogout();
                }} className="flex items-center gap-2 text-destructive focus:text-destructive">
                  <LogOut size={16} />
                  Déconnexion
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem asChild>
                  <Link to="/login" className="flex items-center gap-2 text-primary">
                    <LogIn size={16} />
                    Connexion
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
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
          {NAV_ITEMS.map(({ to, label, icon: Icon, featured }) => (
            <NavLink
              key={to}
              to={to}
              aria-label={featured ? "Kôrô, tuteur IA" : label}
              title={featured ? "Kôrô, tuteur IA" : label}
              className={({ isActive: navActive }) => {
                const active = navActive || isActive(to);
                return `relative flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 py-1.5 text-[9px] font-medium transition sm:text-[11px] ${
                  featured ? "rounded-xl border border-[#1554a0]/35 bg-[#1554a0]/10 font-semibold" : ""
                } ${
                  active
                    ? featured
                      ? "border-[#1554a0] bg-[#1554a0] text-white shadow-md shadow-[#1554a0]/25"
                      : "bg-primary/15 text-primary shadow-sm"
                    : featured
                      ? "text-[#1554a0] hover:bg-[#1554a0]/20"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`;
              }}
            >
              {({ isActive: navActive }) => {
                const active = navActive || isActive(to);
                return (
                  <>
                    <span className={`grid h-7 w-7 place-items-center rounded-lg ${featured ? "bg-[#1554a0]/15" : ""}`}>
                      <Icon size={featured ? 18 : 16} strokeWidth={active || featured ? 2.25 : 2} />
                    </span>
                    <span className="max-w-full truncate text-center leading-none">{label}</span>
                    {featured && <span className={`h-1 w-1 rounded-full ${active ? "bg-white" : "bg-[#1554a0]"}`} />}
                  </>
                );
              }}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}