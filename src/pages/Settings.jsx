import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Bell, Lock, UserRound, ChevronRight, Save, RotateCcw, Info } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

const settingsItems = [
  {
    title: "Account",
    description: "Manage your profile, preferences, and personal information.",
    icon: UserRound,
  },
  {
    title: "Security",
    description: "Enable an extra layer of protection for your account.",
    icon: Lock,
  },
  {
    title: "Notifications",
    description: "Control alerts and learning reminders.",
    icon: Bell,
  },
];

const SETTINGS_STORAGE_KEY = "mbaara_user_settings";

const loadSavedSettings = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY) || window.sessionStorage.getItem(SETTINGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveSettings = (snapshot) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(snapshot));
    window.sessionStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore storage failures when blocked or unavailable.
  }
};

export default function Settings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const settingsItems = [
    {
      title: t("Account"),
      description: t("Manage your profile, preferences, and personal information."),
      icon: UserRound,
    },
    {
      title: t("Security"),
      description: t("Enable an extra layer of protection for your account."),
      icon: Lock,
    },
    {
      title: t("Notifications"),
      description: t("Control alerts and learning reminders."),
      icon: Bell,
    },
  ];
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [securityAlertsEnabled, setSecurityAlertsEnabled] = useState(true);
  const [privateModeEnabled, setPrivateModeEnabled] = useState(false);
  const [activePanel, setActivePanel] = useState("notifications");
  const [saved, setSaved] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  const profileSummary = useMemo(() => {
    return user?.full_name || user?.email || "My space";
  }, [user]);

  useEffect(() => {
    const loaded = loadSavedSettings();
    if (loaded) {
      setNotificationsEnabled(Boolean(loaded.notificationsEnabled));
      setSecurityAlertsEnabled(Boolean(loaded.securityAlertsEnabled));
      setPrivateModeEnabled(Boolean(loaded.privateModeEnabled));
      if (loaded.updatedAt) {
        setSavedAt(loaded.updatedAt);
      }
    }
  }, []);

  const handleSave = () => {
    const snapshot = {
      notificationsEnabled,
      securityAlertsEnabled,
      privateModeEnabled,
      updatedAt: new Date().toISOString(),
    };
    saveSettings(snapshot);
    setSavedAt(snapshot.updatedAt);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  const handleReset = () => {
    setNotificationsEnabled(true);
    setSecurityAlertsEnabled(true);
    setPrivateModeEnabled(false);
    setSavedAt(null);
    saveSettings({ notificationsEnabled: true, securityAlertsEnabled: true, privateModeEnabled: false });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  const activeTitle = activePanel === "security" ? t("Security & privacy") : t("Notifications");

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-10">
      <div className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-2xl bg-primary/15 p-2 text-primary">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{t("Settings and privacy")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Centralize your preferences, security, and profile in one place.</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {settingsItems.map(({ title, description, icon: Icon }) => (
            <button
              key={title}
              type="button"
              onClick={() => title === t("Account") ? navigate("/profil") : setActivePanel(title === t("Security") ? "security" : "notifications")}
              className={`group rounded-2xl border bg-secondary/40 p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/5 ${activePanel === (title === t("Security") ? "security" : title === t("Notifications") ? "notifications" : "") ? "border-primary/50 ring-2 ring-primary/15" : "border-border"}`}
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-background text-primary">
                <Icon size={18} />
              </div>
              <div className="text-sm font-semibold text-foreground">{title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">{title === t("Account") ? t("Open my profile") : t("Manage now")} <ChevronRight size={13} /></div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="h-fit rounded-2xl border border-border bg-card p-2 shadow-sm" aria-label={t("Settings sections")}>
          <button type="button" onClick={() => navigate("/profil")} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-foreground transition hover:bg-secondary"><UserRound size={17} className="text-primary" /> {t("My account")}</button>
          <button type="button" onClick={() => setActivePanel("notifications")} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${activePanel === "notifications" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}><Bell size={17} /> {t("Notifications")}</button>
          <button type="button" onClick={() => setActivePanel("security")} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${activePanel === "security" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}><Lock size={17} /> {t("Security")}</button>
        </nav>

        <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7">
        <div className="mb-5 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">{activeTitle}</div>
            <h2 className="text-xl font-bold text-foreground">Your preferences</h2>
            <p className="text-sm text-muted-foreground">{profileSummary}</p>
          </div>
          <div className="flex gap-2"><button type="button" onClick={handleReset} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-secondary"><RotateCcw size={15} /> Reset</button><button type="button" onClick={handleSave} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"><Save size={16} /> Save</button></div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {activePanel === "notifications" && <label className="flex items-center justify-between rounded-2xl border border-border bg-secondary/40 p-4">
            <div>
              <div className="font-medium text-foreground">Learning notifications</div>
              <div className="text-sm text-muted-foreground">Program reminders and alerts.</div>
            </div>
            <input
              type="checkbox"
              checked={notificationsEnabled}
              onChange={(event) => setNotificationsEnabled(event.target.checked)}
            />
          </label>}

          {activePanel === "security" && <label className="flex items-center justify-between rounded-2xl border border-border bg-secondary/40 p-4">
            <div>
              <div className="font-medium text-foreground">Security alerts</div>
              <div className="text-sm text-muted-foreground">Receive security notifications.</div>
            </div>
            <input
              type="checkbox"
              checked={securityAlertsEnabled}
              onChange={(event) => setSecurityAlertsEnabled(event.target.checked)}
            />
          </label>}

          {activePanel === "security" && <label className="flex items-center justify-between rounded-2xl border border-border bg-secondary/40 p-4 md:col-span-2">
            <div>
              <div className="font-medium text-foreground">Private mode</div>
              <div className="text-sm text-muted-foreground">Hide some profile information in public sections.</div>
            </div>
            <input
              type="checkbox"
              checked={privateModeEnabled}
              onChange={(event) => setPrivateModeEnabled(event.target.checked)}
            />
          </label>}
        </div>

        <div className="mt-5 flex items-start gap-2 rounded-xl border border-border bg-background/70 p-3 text-xs leading-5 text-muted-foreground"><Info size={15} className="mt-0.5 shrink-0 text-primary" /><span>Preferences are saved on this device. Your account data is still managed from your profile.</span></div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={() => navigate("/profil")}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground"
          >
            <UserRound size={16} />
            View my profile
          </button>
          <button
            onClick={() => navigate("/support")}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground"
          >
            <ChevronRight size={16} />
            Support
          </button>
        </div>

        {saved ? (
          <div className="mt-4 rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
            Preferences saved successfully.
          </div>
        ) : null}
        {savedAt ? (
          <div className="mt-3 text-xs text-muted-foreground">
            Last saved: {new Date(savedAt).toLocaleString("en-US", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        ) : null}
        </section>
      </div>
    </div>
  );
}
