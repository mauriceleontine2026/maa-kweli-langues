import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, loginWithGoogle, completeGoogleLogin, requestEmailVerification } from "@/api/authService";
import AuthSplitPanel from "@/components/AuthSplitPanel";

export default function Login() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [resendStatus, setResendStatus] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [showResendLink, setShowResendLink] = useState(false);

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
        const errorMessage = err instanceof Error ? err.message : "Connexion Google impossible";
        setError(err?.status === 403 || errorMessage.toLowerCase().includes("email not verified")
          ? "Votre adresse e-mail Google doit être confirmée avant d'accéder à l'application. Consultez votre boîte mail."
          : errorMessage);
      } finally {
        setLoading(false);
      }
    };

    handleOAuthRedirect();
  }, [navigate]);

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      const user = await loginWithGoogle();
      if (user !== null) {
        window.location.href = "/";
      }
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message
        : "Connexion Google impossible";
      setError(err?.status === 403 || errorMessage.toLowerCase().includes("email not verified")
        ? "Votre adresse e-mail Google doit être confirmée avant d'accéder à l'application. Consultez votre boîte mail."
        : errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!submittedEmail) {
      setResendStatus("Veuillez saisir votre adresse e-mail et réessayer.");
      return;
    }

    setResendStatus("");
    setResendLoading(true);
    try {
      await requestEmailVerification(submittedEmail);
      setResendStatus("Un nouvel e-mail de vérification a été envoyé.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible d'envoyer l'e-mail de vérification.";
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
      setError("Email et mot de passe sont requis.");
      return;
    }

    const emailPattern = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/;
    if (!emailPattern.test(email)) {
      setError("Veuillez saisir une adresse e-mail valide.");
      return;
    }

    if (password.length < 12) {
      setError("Le mot de passe doit contenir au moins 12 caractères.");
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
      const rawMessage = err instanceof Error ? err.message : "Identifiants incorrects";
      const normalized = String(rawMessage || "").trim();
      const isNotVerified = err?.status === 403 || normalized.toLowerCase().includes("email not verified") || normalized.toLowerCase().includes("email non vérifié") || normalized.toLowerCase().includes("vérifié");
      const isInvalidCredentials = err?.status === 401 || normalized.toLowerCase().includes("invalid credentials") || normalized.toLowerCase().includes("identifiants incorrects") || normalized.toLowerCase().includes("identifiants invalides");

      if (isNotVerified) {
        setError("Votre adresse e-mail doit être vérifiée avant de vous connecter. Un lien de confirmation vient d'être envoyé dans votre boîte mail.");
        setShowResendLink(true);
      } else if (isInvalidCredentials) {
        setError("Adresse e-mail ou mot de passe incorrect.");
      } else {
        setError(normalized || "Identifiants incorrects");
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
      submitLabel="Se connecter"
      switchLabel="Pas encore de compte ?"
      switchButtonLabel="Créer un compte"
    >
      {showResendLink ? (
        <div className="mt-6 rounded-2xl border border-border bg-background p-4 text-left text-sm text-foreground">
          <p>Vous n'avez pas reçu l'e-mail de vérification ?</p>
          <button
            type="button"
            onClick={handleResendVerification}
            disabled={resendLoading}
            className="mt-3 inline-flex items-center justify-center rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-70"
          >
            {resendLoading ? "Envoi..." : "Renvoyer l'e-mail de vérification"}
          </button>
          {resendStatus ? <p className={`mt-3 text-sm ${resendStatus.includes("envoyé") ? "text-emerald-600" : "text-destructive"}`}>{resendStatus}</p> : null}
        </div>
      ) : null}
    </AuthSplitPanel>
  );
}