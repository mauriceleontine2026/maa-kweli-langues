import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { createLanguage, getLanguages, getAllVocabulary, getAllLessons } from "@/api/languageService";
import { listUsers } from "@/api/userService";
import { listContributions } from "@/api/contributionService";
import { getCountryForLanguage, getFlagForLanguage } from "@/lib/localLanguageData";
import { Link } from "react-router-dom";
import { Plus, Globe, BookOpen, Users, FileText, Clock, ShieldAlert, RefreshCw, Activity } from "lucide-react";
import AdminVocabulary from "@/components/admin/AdminVocabulary";
import AdminContributions from "@/components/admin/AdminContributions";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminLessons from "@/components/admin/AdminLessons";

export default function Admin() {
  const [tab, setTab] = useState("overview");
  const [languages, setLanguages] = useState(/** @type {any[]} */ ([]));
  const [vocabCount, setVocabCount] = useState(0);
  const [users, setUsers] = useState(/** @type {any[]} */ ([]));
  const [contribCount, setContribCount] = useState(0);
  const [lessonCount, setLessonCount] = useState(0);
  const [loadingData, setLoadingData] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user, isLoadingAuth } = useAuth();

  const loadAdminData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoadingData(true);
    const [languageData, vocabularyData, userData, contributionData, lessonData] = await Promise.allSettled([
      getLanguages(),
      getAllVocabulary(),
      listUsers(),
      listContributions(),
      getAllLessons(),
    ]);

    if (languageData.status === "fulfilled") setLanguages(Array.isArray(languageData.value) ? languageData.value : []);
    if (vocabularyData.status === "fulfilled") setVocabCount(Array.isArray(vocabularyData.value) ? vocabularyData.value.length : 0);
    if (userData.status === "fulfilled") setUsers(Array.isArray(userData.value) ? userData.value : []);
    if (contributionData.status === "fulfilled") setContribCount(Array.isArray(contributionData.value) ? contributionData.value.length : 0);
    if (lessonData.status === "fulfilled") setLessonCount(Array.isArray(lessonData.value) ? lessonData.value.length : 0);
    setLoadingData(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const refreshLanguages = () => {
    getLanguages()
      .then((data) => setLanguages(Array.isArray(data) ? data : []))
      .catch(() => setLanguages([]));
  };

  const handleAddLanguage = async () => {
    const code = prompt("Language code (e.g. bambara):");
    const name = prompt("Language name:");
    const country = prompt("Country:");
    if (!code || !name) return;
    try {
      await createLanguage({ code, name, name_fr: name, region: country, country, status: "active", color: "#E8A838", flag_emoji: getFlagForLanguage({ code, country }), total_lessons: 0 });
      refreshLanguages();
    } catch {
      // Ignore create failure for now
    }
  };

  if (isLoadingAuth) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  if (!user || user.role !== "admin") {
    return (
      <div className="p-6 lg:p-10 max-w-md mx-auto text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
          <ShieldAlert className="text-red-500" size={32} />
        </div>
        <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Access denied</h1>
        <p className="text-muted-foreground mb-4">This page is reserved for administrators.</p>
        <Link to="/" className="text-primary font-medium hover:underline">← Back to home</Link>
      </div>
    );
  }

  const TABS = [
    { val: "overview", label: "Overview", icon: Globe },
    { val: "vocab", label: "Vocabulary", icon: BookOpen },
    { val: "langs", label: "Languages", icon: Plus },
    { val: "contributions", label: "Contributions", icon: FileText },
    { val: "users", label: "Users", icon: Users },
    { val: "lessons", label: "Lessons", icon: Clock },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-10">
      <header className="mb-6 flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary"><Activity size={14} /> Control center</div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Administration</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage languages, lessons, users, and AI-assisted content.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-2 text-xs font-medium text-green-600 dark:text-green-400"><span className="h-2 w-2 rounded-full bg-green-500" /> Administrator access</div>
          <button type="button" onClick={() => loadAdminData(true)} disabled={refreshing} title="Refresh data" className="rounded-xl border border-border bg-background p-2.5 text-muted-foreground transition hover:bg-secondary disabled:opacity-50">
            <RefreshCw size={17} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
        {[
          { icon: Globe, color: "text-primary", value: languages.length, label: "Languages" },
          { icon: BookOpen, color: "text-blue-500", value: vocabCount, label: "Words" },
          { icon: Users, color: "text-green-500", value: users.length, label: "Users" },
          { icon: FileText, color: "text-yellow-500", value: contribCount, label: "Contribs" },
          { icon: Clock, color: "text-purple-500", value: lessonCount, label: "Lessons" },
        ].map(({ icon: Icon, color, value, label }) => (
          <div key={label} className="bg-card rounded-xl p-3 text-center border border-border">
            <Icon className={`mx-auto mb-1 ${color}`} size={18} />
            <div className="text-xl font-bold text-foreground">{loadingData ? "-" : value}</div>
            <div className="text-[10px] text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 bg-secondary p-1 rounded-xl mb-5 overflow-x-auto">
        {TABS.map(({ val, label, icon: Icon }) => (
          <button key={val} onClick={() => setTab(val)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${tab === val ? "bg-card shadow text-primary" : "text-muted-foreground"}`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <div className="space-y-6">
          <section>
            <div className="mb-3 flex items-center justify-between"><div><h2 className="font-heading text-xl font-bold text-foreground">Quick access</h2><p className="text-sm text-muted-foreground">Open the area to manage directly.</p></div></div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[{ tab: "vocab", icon: BookOpen, label: "Vocabulary", value: vocabCount, text: "Manage words" }, { tab: "lessons", icon: Clock, label: "Lessons", value: lessonCount, text: "Manage learning paths" }, { tab: "contributions", icon: FileText, label: "Contributions", value: contribCount, text: "Moderate additions" }, { tab: "users", icon: Users, label: "Users", value: users.length, text: "Manage accounts" }].map(({ tab: targetTab, icon: Icon, label, value, text }) => <button key={targetTab} type="button" onClick={() => setTab(targetTab)} className="group rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"><div className="mb-4 flex items-center justify-between"><span className="rounded-xl bg-primary/10 p-2 text-primary"><Icon size={18} /></span><span className="text-2xl font-bold text-foreground">{loadingData ? "-" : value}</span></div><div className="font-semibold text-foreground">{label}</div><div className="mt-1 text-xs text-muted-foreground">{text} <span className="text-primary transition group-hover:ml-1">→</span></div></button>)}
            </div>
          </section>
          <section>
            <div className="mb-3 flex items-end justify-between"><div><h2 className="font-heading text-xl font-bold text-foreground">Languages and content</h2><p className="text-sm text-muted-foreground">Quick overview of available paths.</p></div><button type="button" onClick={() => setTab("langs")} className="text-sm font-semibold text-primary hover:underline">Manage languages</button></div>
            <div className="grid gap-3 md:grid-cols-2">{languages.map(lang => <div key={lang.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"><span className="text-2xl">{getFlagForLanguage(lang)}</span><div className="min-w-0 flex-1"><div className="font-semibold text-foreground">{lang.name_fr}</div><div className="truncate text-xs text-muted-foreground">{getCountryForLanguage(lang)} · {lang.status === "active" ? "Active" : "Coming soon"}</div></div><Link to={`/apprendre/${lang.code}`} className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10">View</Link></div>)}</div>
          </section>
        </div>
      )}

      {tab === "vocab" && <AdminVocabulary languages={languages} />}
      {tab === "contributions" && <AdminContributions languages={languages} />}
      {tab === "users" && <AdminUsers />}
      {tab === "lessons" && <AdminLessons languages={languages} />}

      {tab === "langs" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground text-sm">Manage languages</h3>
            <button onClick={handleAddLanguage} className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition">
              <Plus size={14} /> New language
            </button>
          </div>
          <div className="space-y-2">
            {languages.map(lang => (
              <div key={lang.id} className="bg-card rounded-xl p-4 border border-border flex items-center gap-3">
                <span className="text-2xl">{getFlagForLanguage(lang)}</span>
                <div className="flex-1">
                  <div className="font-semibold text-foreground text-sm">{lang.name_fr}</div>
                  <div className="text-xs text-muted-foreground">{lang.code} · {lang.family} · {getCountryForLanguage(lang)}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${lang.status === "active" ? "bg-green-500/15 text-green-600 dark:text-green-400" : "bg-secondary text-muted-foreground"}`}>
                  {lang.status === "active" ? "Active" : "Coming soon"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}