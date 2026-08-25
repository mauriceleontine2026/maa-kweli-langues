import { useMemo, useRef, useState } from "react";
import { ArrowRight, Chrome, Lock, Mail, Sparkles, UserRound } from "lucide-react";

/**
 * @param {{
 *   onSubmit?: any;
 *   onGoogle?: any;
 *   loading?: boolean;
 *   error?: string;
 *   message?: string;
 *   initialMode?: string;
 *   submitLabel?: string;
 *   switchLabel?: string;
 *   switchButtonLabel?: string;
 *   children?: any;
 *   hideForm?: boolean;
 *   forgotPasswordHref?: string;
 * }} props
 */
export default function AuthSplitPanel(props) {
  const {
    onSubmit,
    onGoogle,
    loading = false,
    error = "",
    message = "",
    initialMode = "signin",
    submitLabel = "Se connecter",
    switchLabel = "Pas encore de compte ?",
    switchButtonLabel = "Créer un compte",
    children = null,
    hideForm = false,
    forgotPasswordHref = "/forgot-password",
  } = props;
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", remember: false });
  const [showPassword, setShowPassword] = useState(false);
  const submittingRef = useRef(false);

  const isSignUp = mode === "signup";

  const title = useMemo(() => (isSignUp ? "Créer votre compte" : "Bon retour parmi nous"), [isSignUp]);
  const subtitle = useMemo(
    () =>
      isSignUp
        ? "Rejoignez Mǎa-kwɛ́lî Langues et débloquez un apprentissage plus vivant."
        : "Accédez à vos leçons, progrès et contenus préférés en un instant.",
    [isSignUp]
  );

  const buttonLabel = useMemo(() => (isSignUp ? "Créer mon compte" : submitLabel), [isSignUp, submitLabel]);

  const accentTitle = useMemo(() => (isSignUp ? "Bienvenue chez Mǎa-kwɛ́lî" : "Apprends autrement"), [isSignUp]);
  const accentBody = useMemo(
    () =>
      isSignUp
        ? "Construisez votre parcours de langues avec des contenus immersifs et des activités guidées."
        : "Votre espace d’apprentissage est prêt. Connectez-vous pour reprendre là où vous vous êtes arrêté.",
    [isSignUp]
  );

  const handleSubmit = (/** @type {any} */ event) => {
    event.preventDefault();
    event.stopPropagation();
    if (submittingRef.current || loading) return;
    submittingRef.current = true;
    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    const submittedValues = {
      name: String(formData.get("name") || form.name || "").trim(),
      email: String(formData.get("email") || form.email || "").trim(),
      password: String(formData.get("password") || form.password || ""),
      confirmPassword: String(formData.get("confirmPassword") || form.confirmPassword || ""),
      remember: formData.get("remember") === "on",
    };
    Promise.resolve(onSubmit?.({ ...submittedValues, mode })).finally(() => {
      submittingRef.current = false;
    });
  };


  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div className="w-full max-w-6xl overflow-hidden rounded-[2rem] border border-border bg-card shadow-[0_20px_80px_-20px_rgba(0,0,0,0.25)]">
        <div className={`flex flex-col transition-all duration-700 ease-&lsqb;cubic-bezier(0.4,0,0.2,1)&rsqb; lg:flex-row ${isSignUp ? "lg:flex-row-reverse" : "lg:flex-row"}`}>
          <div className="relative flex w-full items-center justify-center overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-accent/90 px-6 py-10 text-primary-foreground sm:px-10 sm:py-12 lg:w-[46%] lg:px-12 lg:py-16">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.25),transparent_40%)]" />
            <div className="relative z-10 w-full max-w-md transition-all duration-500">
              <div className="mb-6 flex items-center gap-3">
                <img
                  src="/logo.png"
                  alt="Logo Mǎa-kwɛ́lî Langues"
                  className="h-14 w-14 rounded-full border border-white/20 object-cover shadow-lg"
                />
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-medium backdrop-blur-sm">
                  <Sparkles className="h-4 w-4" />
                  Mǎa-kwɛ́lî Langues
                </div>
              </div>
              <h2 className="font-heading text-3xl font-semibold leading-tight sm:text-4xl">{accentTitle}</h2>
              <p className="mt-4 text-sm leading-7 text-primary-foreground/90 sm:text-base">{accentBody}</p>

              <div className="mt-8 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm transition-transform duration-300 hover:scale-[1.01]">
                <p className="text-sm font-medium">{isSignUp ? "Déjà un compte ?" : "Nouveau ici ?"}</p>
                <button
                  type="button"
                  onClick={() => setMode(isSignUp ? "signin" : "signup")}
                  className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-primary-foreground transition-all duration-300 hover:scale-[1.02] hover:bg-white/20"
                >
                  {isSignUp ? "Se connecter" : switchButtonLabel}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="w-full bg-card px-6 py-8 sm:px-10 lg:w-[54%] lg:px-12 lg:py-12">
            <div className="mx-auto flex h-full max-w-md flex-col justify-center">
              <div className="mb-8 text-center lg:text-left">
                <h1 className="font-heading text-3xl font-semibold text-foreground">{title}</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{subtitle}</p>
              </div>

              {onGoogle ? (
                <div className="mb-6 flex items-center">
                  <button
                    type="button"
                    onClick={onGoogle}
                    disabled={loading}
                    aria-busy={loading}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.01] hover:bg-secondary"
                  >
                    <Chrome className="h-4 w-4 text-primary" />
                    {loading ? "Connexion en cours..." : "Continuer avec Google"}
                  </button>
                </div>
              ) : null}

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-card px-3 text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">ou</span>
                </div>
              </div>

              {!hideForm ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {isSignUp && (
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-foreground">Nom complet</span>
                      <div className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 transition-all duration-300 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                        <UserRound className="h-4 w-4 text-muted-foreground" />
                        <input
                          name="name"
                          type="text"
                          value={form.name}
                          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                          placeholder="Votre nom"
                          className="w-full border-none bg-transparent text-sm text-foreground outline-none"
                          required={isSignUp}
                        />
                      </div>
                    </label>
                  )}

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-foreground">Email</span>
                    <div className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 transition-all duration-300 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <input
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={(event) => setForm((current) => ({ ...current, email: event.target.value.trim() }))}
                        placeholder="votre@email.com"
                        className="w-full border-none bg-transparent text-sm text-foreground outline-none"
                        autoComplete="email"
                        inputMode="email"
                        required
                        spellCheck={false}
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-foreground">Mot de passe</span>
                    <div className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 transition-all duration-300 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      <input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                        placeholder="••••••••"
                        className="w-full border-none bg-transparent text-sm text-foreground outline-none"
                        autoComplete={isSignUp ? "new-password" : "current-password"}
                        required
                        minLength={12}
                          aria-describedby={isSignUp ? "password-requirements" : undefined}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {showPassword ? "Masquer" : "Voir"}
                      </button>
                    </div>
                  </label>

                  {isSignUp ? (
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-foreground">Confirmer le mot de passe</span>
                      <div className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 transition-all duration-300 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                        <input
                          name="confirmPassword"
                          type={showPassword ? "text" : "password"}
                          value={form.confirmPassword}
                          onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                          placeholder="••••••••"
                          className="w-full border-none bg-transparent text-sm text-foreground outline-none"
                          required={isSignUp}
                        />
                      </div>
                    </label>
                  ) : null}

                  {isSignUp ? (
                    <p id="password-requirements" className="text-xs leading-5 text-muted-foreground">
                      12 caractères minimum, avec une majuscule, une minuscule, un chiffre et un caractère spécial.
                    </p>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <label className="flex items-center gap-2 text-sm text-muted-foreground">
                        <input name="remember" type="checkbox" className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
                        Se souvenir de moi
                      </label>
                      <a href={forgotPasswordHref} className="text-sm font-semibold text-primary transition-colors hover:text-primary/80">
                        Mot de passe oublié ?
                      </a>
                    </div>
                  )}

                  {error ? <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm leading-5 text-destructive">{error}</p> : null}
                  {message ? <p role="status" className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5 text-sm leading-5 text-emerald-700">{message}</p> : null}

                                  <button
                    type="submit"
                    disabled={loading}
                    aria-busy={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all duration-300 hover:-translate-y-0.5 hover:opacity-95 disabled:opacity-70"
                  >
                    {loading ? (isSignUp ? "Création..." : "Connexion...") : buttonLabel}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              ) : null}


              {children ? <div className="mt-4">{children}</div> : null}

              {!hideForm ? (
                <div className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
                  <Lock className="h-3.5 w-3.5 text-primary" /> Connexion sécurisée · Vos données restent privées
                </div>
              ) : null}

              {!hideForm ? (
                <p className="mt-6 text-center text-sm text-muted-foreground">
                  {switchLabel}{" "}
                  <button
                    type="button"
                    onClick={() => setMode(isSignUp ? "signin" : "signup")}
                    className="font-semibold text-primary transition-colors hover:text-primary/80"
                  >
                    {isSignUp ? "Se connecter" : switchButtonLabel}
                  </button>
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
