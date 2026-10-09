import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { verifyEmail } from "@/api/authService";
import { notifyAuthChanged, request } from "@/api/backendClient";
import { useLanguage } from "@/contexts/LanguageContext";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState("loading");
  const [message, setMessage] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [verifiedUser, setVerifiedUser] = useState(null);
  const navigate = useNavigate();
  const { t } = useLanguage();
  const token = searchParams.get("token");
  const translate = useRef(t);

  useEffect(() => {
    translate.current = t;
  }, [t]);

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage(translate.current("emailVerificationMissing"));
      return;
    }

    let cancelled = false;
    const confirmVerification = async () => {
      try {
        const result = await verifyEmail(token);
        if (cancelled) return;
        setVerifiedEmail(result.user.email);

        let authenticatedUser;
        try {
          authenticatedUser = await request("GET", "/api/auth/me");
        } catch {
          authenticatedUser = null;
        }

        if (!authenticatedUser || authenticatedUser.email !== result.user.email) {
          setState("session-error");
          setMessage(translate.current("emailVerificationSessionError"));
          return;
        }

        setVerifiedUser(authenticatedUser);
        setState("success");
        setMessage(translate.current("emailVerificationSuccess"));
      } catch (error) {
        if (cancelled) return;
        setState("error");
        setMessage(error instanceof Error ? error.message : translate.current("emailVerificationInvalid"));
      }
    };

    confirmVerification();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleContinue = () => {
    if (verifiedUser) notifyAuthChanged(verifiedUser);
    navigate("/", { replace: true });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <section className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-lg">
        <h1 className="font-heading text-2xl font-semibold text-foreground">{t("emailVerificationTitle")}</h1>
        <p role="status" className={`mt-4 text-sm ${state === "error" ? "text-destructive" : state === "success" ? "text-emerald-600" : state === "session-error" ? "text-amber-700" : "text-muted-foreground"}`}>
          {state === "loading" ? t("verificationInProgress") : message}
        </p>
        {verifiedEmail ? <p className="mt-2 text-sm font-medium text-foreground">{verifiedEmail}</p> : null}
        {state === "success" ? (
          <button type="button" onClick={handleContinue} className="mt-6 inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
            {t("continueToApp")}
          </button>
        ) : null}
        {state === "error" || state === "session-error" ? (
          <button type="button" onClick={() => navigate("/login")} className="mt-6 inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
            {t("goToLogin")}
          </button>
        ) : null}
      </section>
    </main>
  );
}
