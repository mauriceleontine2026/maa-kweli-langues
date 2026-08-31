import { useMemo, useRef, useState } from "react";
import { ArrowRight, Chrome, Lock, Mail, Sparkles, UserRound } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

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
    submitLabel = "Sign in",
    switchLabel = "Need an account?",
    switchButtonLabel = "Create an account",
    children = null,
    hideForm = false,
    forgotPasswordHref = "/forgot-password",
  } = props;
  const { language, toggleLanguage, t } = useLanguage();
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", remember: false });
  const [showPassword, setShowPassword] = useState(false);
  const submittingRef = useRef(false);

  const isSignUp = mode === "signup";

  const title = useMemo(() => (isSignUp ? t("createAccount") : t("welcomeBack")), [isSignUp, t]);
  const subtitle = useMemo(
    () =>
      isSignUp
        ? t("authSignupSubtitle")
        : t("authSubtitle"),
      [isSignUp, t]
  );

  const buttonLabel = useMemo(() => (isSignUp ? t("signUpNow") : t("signIn")), [isSignUp, t]);

  const accentTitle = useMemo(() => (isSignUp ? t("welcomeTo") : t("learnDifferently")), [isSignUp, t]);
  const accentBody = useMemo(
    () =>
      isSignUp
        ? t("buildPath")
        : t("readySpace"),
      [isSignUp, t]
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
              <div className="mb-6 flex items-center justify-between gap-3">
                <img
                  src="/logo.png"
                  alt="Logo Mǎa-kwɛ́lî Langues"
                  className="h-14 w-14 rounded-full border border-white/20 object-cover shadow-lg"
                />
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-medium backdrop-blur-sm">
                  <Sparkles className="h-4 w-4" />
                  Mǎa-kwɛ́lî Langues
                </div>
                <button type="button" onClick={toggleLanguage} className="rounded-full border border-white/30 px-3 py-1 text-xs font-semibold text-white hover:bg-white/15" aria-label={t("language")}>
                  {language === "fr" ? "EN" : "FR"}
                </button>
              </div>
              <h2 className="font-heading text-3xl font-semibold leading-tight sm:text-4xl">{accentTitle}</h2>
              <p className="mt-4 text-sm leading-7 text-primary-foreground/90 sm:text-base">{accentBody}</p>

              <div className="mt-8 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm transition-transform duration-300 hover:scale-[1.01]">
                <p className="text-sm font-medium">{isSignUp ? t("alreadyAccount") : t("newHere")}</p>
                <button
                  type="button"
                  onClick={() => setMode(isSignUp ? "signin" : "signup")}
                  className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-primary-foreground transition-all duration-300 hover:scale-[1.02] hover:bg-white/20"
                >
                  {isSignUp ? t("signIn") : t("signUp")}
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
                    {loading ? t("signingIn") : t("continueGoogle")}
                  </button>
                </div>
              ) : null}

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-card px-3 text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">{t("or")}</span>
                </div>
              </div>

              {!hideForm ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {isSignUp && (
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-foreground">{t("fullName")}</span>
                      <div className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 transition-all duration-300 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                        <UserRound className="h-4 w-4 text-muted-foreground" />
                        <input
                          name="name"
                          type="text"
                          value={form.name}
                          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                          placeholder={t("yourName")}
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
                        placeholder={language === "en" ? "your@email.com" : "votre@email.com"}
                        className="w-full border-none bg-transparent text-sm text-foreground outline-none"
                        autoComplete="email"
                        inputMode="email"
                        required
                        spellCheck={false}
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-foreground">{t("password")}</span>
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
                        {showPassword ? t("hide") : t("show")}
                      </button>
                    </div>
                  </label>

                  {isSignUp ? (
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-foreground">{t("confirmPassword")}</span>
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
                      {t("passwordRequirements")}
                    </p>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <label className="flex items-center gap-2 text-sm text-muted-foreground">
                        <input name="remember" type="checkbox" className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
                        {t("rememberMe")}
                      </label>
                      <a href={forgotPasswordHref} className="text-sm font-semibold text-primary transition-colors hover:text-primary/80">
                        {t("forgotPassword")}
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
                    {loading ? (isSignUp ? t("creating") : t("signingIn")) : buttonLabel}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              ) : null}


              {children ? <div className="mt-4">{children}</div> : null}

              {!hideForm ? (
                <div className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
                  <Lock className="h-3.5 w-3.5 text-primary" /> {t("secureLogin")}
                </div>
              ) : null}

              {!hideForm ? (
                <p className="mt-6 text-center text-sm text-muted-foreground">
                  {(isSignUp ? t("alreadyAccount") : t("newHere"))}{" "}
                  <button
                    type="button"
                    onClick={() => setMode(isSignUp ? "signin" : "signup")}
                    className="font-semibold text-primary transition-colors hover:text-primary/80"
                  >
                    {isSignUp ? t("signIn") : t("signUp")}
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
