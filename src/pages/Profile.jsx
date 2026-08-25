import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { getLanguages } from "@/api/languageService";
import { getProgress } from "@/api/progressService";
import { logout as logoutService, updateMe } from "@/api/authService";
import { listContributions } from "@/api/contributionService";
import { uploadProfilePhoto } from "@/api/uploadService";
import { useTheme } from "@/contexts/ThemeContext";
import { Mail, Shield, Flame, Star, BookOpen, Globe, LogOut, Clock, CheckCircle, XCircle, Hourglass, Award, Settings, Camera, Loader2, Save, Lock, CheckCircle2 } from "lucide-react";
import LanguageFlag from "@/components/ui/LanguageFlag";
// public logo at /logo.png

export default function Profile() {
  const [progresses, setProgresses] = useState(/** @type {any[]} */ ([]));
  const [languages, setLanguages] = useState(/** @type {any[]} */ ([]));
  const [contributions, setContributions] = useState(/** @type {any[]} */ ([]));
  const { theme, toggleTheme } = useTheme();
  const [uploading, setUploading] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const fileInputRef = useRef(/** @type {HTMLInputElement | null} */ (null));

  const { user, updateUser } = useAuth();

  useEffect(() => {
    setProfileName(user?.full_name || "");
  }, [user?.full_name]);

  useEffect(() => {
    getLanguages()
      .then((data) => setLanguages(Array.isArray(data) ? data : []))
      .catch(() => setLanguages([]));
    if (user) {
      listContributions()
        .then((data) => setContributions(Array.isArray(data) ? data : []))
        .catch(() => setContributions([]));
    }
  }, [user]);

  useEffect(() => {
    const refreshProgress = () => {
      if (user) {
        getProgress()
          .then((data) => setProgresses(Array.isArray(data) ? data : []))
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

  const totalXP = Array.isArray(progresses) ? progresses.reduce((s, p) => s + (p.xp || 0), 0) : 0;
  const maxStreak = Array.isArray(progresses) ? progresses.reduce((s, p) => Math.max(s, p.streak || 0), 0) : 0;
  const activeLangs = Array.isArray(progresses) ? progresses.length : 0;
  const totalLessons = Array.isArray(progresses) ? progresses.reduce((s, p) => s + (p.completed_lessons?.length || 0), 0) : 0;
  const pendingContributions = contributions.filter((contribution) => contribution.status === "pending").length;
  const approvedContributions = contributions.filter((contribution) => contribution.status === "approved").length;

  const achievements = [
    { icon: "🎯", title: "Premiers pas", desc: "1 leçon complétée", unlocked: totalLessons >= 1 },
    { icon: "📚", title: "Assidu", desc: "10 leçons", unlocked: totalLessons >= 10 },
    { icon: "🏆", title: "Expert", desc: "30 leçons", unlocked: totalLessons >= 30 },
    { icon: "🌍", title: "Polyglotte", desc: "3 langues", unlocked: activeLangs >= 3 },
    { icon: "🔥", title: "Régulier", desc: "7 jours de série", unlocked: maxStreak >= 7 },
    { icon: "⭐", title: "Chasseur d'XP", desc: "500 XP", unlocked: totalXP >= 500 },
    { icon: "📝", title: "Contributeur", desc: "1 contribution", unlocked: contributions.length >= 1 },
    { icon: "💎", title: "Bienfaiteur", desc: "5 contributions", unlocked: contributions.length >= 5 },
  ];

  const handlePhotoUpload = async (/** @type {import("react").ChangeEvent<HTMLInputElement>} */ e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploadData = await uploadProfilePhoto(file);
      const file_url = uploadData?.photo_url;
      if (!file_url) throw new Error("Aucune URL de photo renvoyée.");
      updateUser(uploadData.user || { photo_url: file_url });
    } catch (err) {
      const errorValue = /** @type {unknown} */ (err);
      const message = errorValue instanceof Error ? errorValue.message : String(errorValue);
      alert("Erreur lors de l'upload : " + message);
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    await logoutService();
    window.location.href = "/login";
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();
    setProfileError("");
    setProfileMessage("");
    const nameChanged = profileName.trim() !== (user.full_name || "");
    const changingPassword = Boolean(currentPassword || newPassword || confirmNewPassword);

    if (!nameChanged && !changingPassword) {
      setProfileMessage("Aucune modification à enregistrer.");
      return;
    }
    if (changingPassword) {
      if (!currentPassword || !newPassword || !confirmNewPassword) {
        setProfileError("Remplissez les trois champs du changement de mot de passe.");
        return;
      }
      if (newPassword !== confirmNewPassword) {
        setProfileError("Les nouveaux mots de passe ne correspondent pas.");
        return;
      }
      if (newPassword.length < 12 || !/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
        setProfileError("Le nouveau mot de passe doit contenir 12 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.");
        return;
      }
    }

    setProfileSaving(true);
    try {
      const payload = {};
      if (nameChanged) payload.full_name = profileName.trim();
      if (changingPassword) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword;
      }
      const updated = await updateMe(payload);
      updateUser(updated);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setProfileMessage("Profil et sécurité mis à jour.");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Impossible de mettre à jour le profil.");
    } finally {
      setProfileSaving(false);
    }
  };

  if (!user) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  const initial = (user.full_name || user.email || "?")[0].toUpperCase();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 p-3 sm:p-6 lg:p-10">
      {/* Header card */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/20 via-card to-card p-4 shadow-sm sm:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),transparent_35%)]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative shrink-0 self-center sm:self-auto">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg overflow-hidden sm:h-20 sm:w-20 sm:text-3xl">
              {user.photo_url ? (
                <img
                  src={user.photo_url}
                  alt={user.full_name || "Profil"}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                initial
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:opacity-90 transition disabled:opacity-60 border-2 border-card"
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h1 className="font-heading text-2xl font-bold text-foreground break-words">{user.full_name || "Apprenant"}</h1>
            <div className="mt-1 flex items-center justify-center gap-2 text-sm text-muted-foreground break-all sm:justify-start">
              <Mail size={14} className="shrink-0" /> <span className="min-w-0 break-all">{user.email}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${user.role === "admin" ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`}>
                <Shield size={12} /> {user.role === "admin" ? "Administrateur" : "Apprenant"}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400"><CheckCircle2 size={12} /> Compte actif</span>
            </div>
          </div>
          <img src="/logo.png" alt="Mǎa-kwɛ́lî Langues" className="hidden h-14 w-14 rounded-full object-cover shadow-md ring-2 ring-primary/20 sm:block" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: Star, color: "text-blue-500", value: totalXP, label: "XP totaux" },
          { icon: Flame, color: "text-primary", value: maxStreak, label: "Série max (j)" },
          { icon: BookOpen, color: "text-green-500", value: totalLessons, label: "Leçons" },
          { icon: Globe, color: "text-purple-500", value: activeLangs, label: "Langues" },
        ].map(({ icon: Icon, color, value, label }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-3 text-center shadow-sm sm:p-4">
            <Icon className={`mx-auto mb-1.5 ${color}`} size={22} />
            <div className="text-xl font-bold text-foreground sm:text-2xl">{value}</div>
            <div className="text-[10px] text-muted-foreground sm:text-xs">{label}</div>
          </div>
        ))}
      </div>

      {/* Achievements */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <Award size={18} className="text-primary" />
          <h2 className="font-heading text-xl font-bold text-foreground">Mes badges</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {achievements.map((a) => (
            <div key={a.title} className={`rounded-2xl border p-3 text-center transition sm:p-4 ${a.unlocked ? "border-primary/30 bg-card" : "border-border bg-secondary/30 opacity-50"}`}>
              <div className={`mb-1.5 text-2xl sm:text-3xl ${a.unlocked ? "" : "grayscale"}`}>{a.icon}</div>
              <div className="text-[11px] font-semibold text-foreground sm:text-xs">{a.title}</div>
              <div className="text-[10px] text-muted-foreground">{a.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* My contributions */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <Clock size={18} className="text-muted-foreground" />
          <h2 className="font-heading text-xl font-bold text-foreground">Mes contributions</h2>
        </div>
        {contributions.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">Vous n'avez pas encore contribué.</p>
            <Link to="/contribuer" className="text-primary text-sm font-medium hover:underline">Contribuer maintenant →</Link>
          </div>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-yellow-500/10 p-3"><div className="text-lg font-bold text-foreground">{pendingContributions}</div><div className="text-xs text-muted-foreground">En attente</div></div><div className="rounded-xl bg-emerald-500/10 p-3"><div className="text-lg font-bold text-foreground">{approvedContributions}</div><div className="text-xs text-muted-foreground">Validées</div></div></div>
          <div className="space-y-2">
            {contributions.map(c => {
              const lang = languages.find(l => l.code === c.language_code);
              return (
                <div key={c.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:gap-3">
                  <LanguageFlag language={lang} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground break-words">{c.word} <span className="text-muted-foreground">→ {c.translation_fr}</span></div>
                    <div className="text-xs text-muted-foreground">{lang?.name_fr || c.language_code}</div>
                  </div>
                  {c.status === "pending" && <span className="inline-flex items-center gap-1 text-xs text-yellow-500"><Hourglass size={12} /> En attente</span>}
                  {c.status === "approved" && <span className="inline-flex items-center gap-1 text-xs text-green-500"><CheckCircle size={12} /> Validé</span>}
                  {c.status === "rejected" && <span className="inline-flex items-center gap-1 text-xs text-red-500"><XCircle size={12} /> Refusé</span>}
                </div>
              );
            })}
          </div></>
        )}
      </div>

      {/* Settings */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Settings size={18} className="text-muted-foreground" />
          <h2 className="font-heading text-lg font-bold text-foreground">Paramètres</h2>
        </div>
        <form onSubmit={handleProfileSave} className="mb-4 rounded-2xl border border-border bg-secondary/30 p-3 sm:p-4">
          <div className="mb-4 flex items-center gap-2">
            <Lock size={17} className="text-primary" />
            <div>
              <h3 className="text-sm font-bold text-foreground">Informations du compte</h3>
              <p className="text-xs text-muted-foreground">Modifiez votre nom et votre mot de passe.</p>
            </div>
          </div>
          <label className="mb-3 block text-sm font-medium text-foreground">
            Nom utilisateur
            <input value={profileName} onChange={(event) => setProfileName(event.target.value)} maxLength={120} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm font-medium text-foreground">Mot de passe actuel<input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" /></label>
            <label className="text-sm font-medium text-foreground">Nouveau mot de passe<input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" /></label>
            <label className="text-sm font-medium text-foreground">Confirmer le nouveau<input type="password" autoComplete="new-password" value={confirmNewPassword} onChange={(event) => setConfirmNewPassword(event.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" /></label>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Le nouveau mot de passe doit contenir au moins 12 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.</p>
          {profileError ? <p role="alert" className="mt-3 text-sm text-destructive">{profileError}</p> : null}
          {profileMessage ? <p role="status" className="mt-3 text-sm text-emerald-600">{profileMessage}</p> : null}
          <button type="submit" disabled={profileSaving} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60">
            {profileSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {profileSaving ? "Enregistrement..." : "Enregistrer les modifications"}
          </button>
        </form>
        <button onClick={toggleTheme}
          className="mb-2 flex w-full items-center justify-between rounded-xl bg-secondary/50 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-secondary">
          <span>Thème {theme === "dark" ? "sombre" : "clair"}</span>
          <span className="text-xs text-primary">Basculer</span>
        </button>
        <button onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-sm font-medium text-red-500 transition hover:bg-red-500/20">
          <LogOut size={16} /> Se déconnecter
        </button>
      </div>
    </div>
  );
}