import { useState } from "react";
import { register, requestEmailVerification } from "@/api/authService";
import AuthSplitPanel from "@/components/AuthSplitPanel";

export default function Register() {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [createdEmail, setCreatedEmail] = useState("");
  const [resendStatus, setResendStatus] = useState("");
  const [resendLoading, setResendLoading] = useState(false);

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
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    const normalizedEmail = typeof formEmail === "string" ? formEmail.trim() : "";
    if (normalizedEmail.length === 0) {
      setError("Veuillez saisir une adresse e-mail.");
      return;
    }
    if (formPassword.length < 12 || !/[a-z]/.test(formPassword) || !/[A-Z]/.test(formPassword) || !/\d/.test(formPassword) || !/[^A-Za-z0-9]/.test(formPassword)) {
      setError("Le mot de passe doit contenir au moins 12 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.");
      return;
    }
    setLoading(true);
    try {
      const result = await register(normalizedEmail, formPassword, name);
      setCreatedEmail(normalizedEmail);
      if (result?.verification_required === false) {
        setMessage("Compte créé. Votre adresse e-mail est déjà vérifiée, vous pouvez vous connecter immédiatement.");
      } else if (result?.message) {
        setMessage(result.message);
      } else {
        setMessage("Compte créé. Consultez votre boîte mail et cliquez sur le lien de vérification avant de vous connecter.");
      }
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : "Erreur lors de l'inscription";
      const normalized = String(rawMessage || "").trim();
      if (err?.status === 429 || normalized.toLowerCase().includes("rate limit") || normalized.toLowerCase().includes("limite temporairement")) {
        setError("Trop de demandes d'e-mails de confirmation ont été envoyées. Attendez quelques minutes, puis réessayez avec la même adresse ou utilisez le renvoi depuis la page de connexion.");
      } else if (err?.status === 409 || normalized.toLowerCase().includes("already") || normalized.toLowerCase().includes("déjà")) {
        setAlreadyRegistered(true);
        setError("Cette adresse e-mail est déjà utilisée. Connectez-vous avec ce compte ou réinitialisez votre mot de passe.");
      } else {
        setError(normalized || "Erreur lors de l'inscription");
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
      setResendStatus("Un nouvel e-mail de vérification a été envoyé.");
    } catch (err) {
      setResendStatus(err instanceof Error ? err.message : "Impossible d'envoyer l'e-mail de vérification.");
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
      submitLabel="S'inscrire"
      switchLabel="Déjà inscrit ?"
      switchButtonLabel="Se connecter"
    >
      {createdEmail && message && !alreadyRegistered ? (
        <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-left text-sm text-foreground">
          <p>Vérifiez votre boîte mail pour confirmer :</p>
          <p className="mt-1 break-all font-semibold">{createdEmail}</p>
          <button type="button" onClick={handleResendVerification} disabled={resendLoading} className="mt-3 font-semibold text-primary hover:underline disabled:opacity-60">
            {resendLoading ? "Envoi..." : "Renvoyer l'e-mail de vérification"}
          </button>
          {resendStatus ? <p className={`mt-2 ${resendStatus.includes("envoyé") ? "text-emerald-600" : "text-destructive"}`}>{resendStatus}</p> : null}
        </div>
      ) : null}
      {alreadyRegistered ? (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center text-sm">
          <a href="/login" className="font-semibold text-primary hover:underline">Aller à la connexion</a>
          <span className="mx-2 text-muted-foreground">ou</span>
          <a href="/forgot-password" className="font-semibold text-primary hover:underline">Réinitialiser le mot de passe</a>
        </div>
      ) : null}
    </AuthSplitPanel>
  );
}