import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, loginWithGoogle, completeGoogleLogin, requestEmailVerification } from "@/api/authService";
import AuthSplitPanel from "@/components/AuthSplitPanel";
import { useLanguage } from "@/contexts/LanguageContext";
import { isEmailVerificationError, isInvalidCredentialsError } from "@/lib/authErrorUtils";

export default function Login() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [resendStatus, setResendStatus] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [showResendLink, setShowResendLink] = useState(false);

  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    const handleOAuthRedirect = async () => {
      if (typeof window === "undefined") return;
      const hasHashCallback = window.location.hash.includes("access_token=") || window.location.hash.includes("provider_token=");
      const hasSearchCallback = window.location.search.includes("access_token=") || window.location.search.includes("provider_token=") || window.location.search.includes("code=");
      if (!hasHashCallback && !hasSearchCallback) {
        return;
      }

      setLoading(true);
      setError("");
      try {
        await completeGoogleLogin();
        navigate("/", { replace: true });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : t("invalidLogin");
        setError(isEmailVerificationError(err) ? t("googleVerification") : errorMessage);
      } finally {
        setLoading(false);
      }
    };

    handleOAuthRedirect();
  }, []);

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      const user = await loginWithGoogle();
      if (user !== null) {
        navigate("/", { replace: true });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t("invalidLogin");
      setError(isEmailVerificationError(err) ? t("googleVerification") : errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!submittedEmail) {
      setResendStatus(t("enterEmailAgain"));
      return;
    }

    setResendStatus("");
    setResendLoading(true);
    try {
      await requestEmailVerification(submittedEmail);
      setResendStatus(t("verificationSent"));
    } catch (err) {
      const message = err instanceof Error ? err.message : t("invalidLogin");
      setResendStatus(message);
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (/** @type {any} */ values) => {
    const email = typeof values?.email === "string" ? values.email.trim() : "";
    const password = typeof values?.password === "string" ? values.password : "";
    const remember = values?.remember === true;
    const mode = values?.mode;
    if (mode === "signup") {
      window.location.href = "/register";
      return;
    }

    if (!email || !password) {
      setError(t("emailRequired"));
      return;
    }

    const emailPattern = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/;
    if (!emailPattern.test(email)) {
      setError(t("invalidEmail"));
      return;
    }

    setError("");
    setResendStatus("");
    setShowResendLink(false);
    setLoading(true);
    try {
      setSubmittedEmail(email);
      await login(email, password, remember);
      window.location.href = "/";
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : t("invalidLogin");
      const normalized = String(rawMessage || "").trim();

      if (isEmailVerificationError(err)) {
        setError(t("verificationRequired"));
        setShowResendLink(true);
      } else if (isInvalidCredentialsError(err)) {
        setError(t("invalidLogin"));
      } else {
        setError(normalized || t("invalidLogin"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitPanel
      onSubmit={handleSubmit}
      onGoogle={handleGoogle}
      loading={loading}
      error={error}
      initialMode="signin"
      submitLabel={t("signIn")}
      switchLabel={t("notYetAccount")}
      switchButtonLabel={t("signUp")}
    >
      {showResendLink ? (
        <div className="mt-6 rounded-2xl border border-border bg-background p-4 text-left text-sm text-foreground">
          <p>{t("verificationQuestion")}</p>
          <button
            type="button"
            onClick={handleResendVerification}
            disabled={resendLoading}
            className="mt-3 inline-flex items-center justify-center rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-70"
          >
            {resendLoading ? t("sending") : t("resendVerification")}
          </button>
          {resendStatus ? <p className={`mt-3 text-sm ${resendStatus.includes("envoyé") ? "text-emerald-600" : "text-destructive"}`}>{resendStatus}</p> : null}
        </div>
      ) : null}
    </AuthSplitPanel>
  );
}