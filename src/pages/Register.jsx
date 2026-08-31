import { useState } from "react";
import { register, requestEmailVerification } from "@/api/authService";
import AuthSplitPanel from "@/components/AuthSplitPanel";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Register() {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [createdEmail, setCreatedEmail] = useState("");
  const [resendStatus, setResendStatus] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const { t } = useLanguage();

  /**
   * @param {{ email: string; password: string; confirmPassword: string; name: string; mode: string }} props
   */
  const handleRegister = async ({ email: formEmail, password: formPassword, confirmPassword, name, mode }) => {
    if (mode === "signin") {
      window.location.href = "/login";
      return;
    }

    setError("");
    setMessage("");
    setResendStatus("");
    setAlreadyRegistered(false);
    if (formPassword !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }

    const normalizedEmail = typeof formEmail === "string" ? formEmail.trim() : "";
    if (normalizedEmail.length === 0) {
      setError(t("emailAddressRequired"));
      return;
    }
    if (formPassword.length < 12 || !/[a-z]/.test(formPassword) || !/[A-Z]/.test(formPassword) || !/\d/.test(formPassword) || !/[^A-Za-z0-9]/.test(formPassword)) {
      setError(t("passwordRequirements"));
      return;
    }
    setLoading(true);
    try {
      const result = await register(normalizedEmail, formPassword, name);
      setCreatedEmail(normalizedEmail);
      if (result?.verification_required === false) {
        setMessage(t("registrationAlreadyVerified"));
      } else if (result?.message) {
        setMessage(result.message);
      } else {
        setMessage(t("registrationSuccess"));
      }
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : t("registrationError");
      const normalized = String(rawMessage || "").trim();
      if (err?.status === 429 || normalized.toLowerCase().includes("rate limit") || normalized.toLowerCase().includes("limite temporairement")) {
        setError(t("verificationRateLimit"));
      } else if (err?.status === 409 || normalized.toLowerCase().includes("already") || normalized.toLowerCase().includes("déjà")) {
        setAlreadyRegistered(true);
        setError(t("emailAlreadyUsed"));
      } else {
        setError(normalized || t("registrationError"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!createdEmail) return;
    setResendLoading(true);
    setResendStatus("");
    try {
      await requestEmailVerification(createdEmail);
      setResendStatus(t("verificationSent"));
    } catch (err) {
      setResendStatus(err instanceof Error ? err.message : t("verificationSent"));
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <AuthSplitPanel
      onSubmit={handleRegister}
      loading={loading}
      error={error}
      message={message}
      initialMode="signup"
      submitLabel={t("signUp")}
      switchLabel={t("alreadyAccount")}
      switchButtonLabel={t("signIn")}
    >
      {createdEmail && message && !alreadyRegistered ? (
        <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-left text-sm text-foreground">
          <p>{t("verificationSent")}</p>
          <p className="mt-1 break-all font-semibold">{createdEmail}</p>
          <button type="button" onClick={handleResendVerification} disabled={resendLoading} className="mt-3 font-semibold text-primary hover:underline disabled:opacity-60">
            {resendLoading ? t("sending") : t("resendVerification")}
          </button>
          {resendStatus ? <p className={`mt-2 ${resendStatus.includes("sent") || resendStatus.includes("envoy") ? "text-emerald-600" : "text-destructive"}`}>{resendStatus}</p> : null}
        </div>
      ) : null}
      {alreadyRegistered ? (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center text-sm">
          <a href="/login" className="font-semibold text-primary hover:underline">{t("goToLoginAlt")}</a>
          <span className="mx-2 text-muted-foreground">or</span>
          <a href="/forgot-password" className="font-semibold text-primary hover:underline">{t("resetPasswordAlt")}</a>
        </div>
      ) : null}
    </AuthSplitPanel>
  );
}