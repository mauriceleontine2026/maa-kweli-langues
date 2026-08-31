import { useState } from "react";
import { resetPassword } from "@/api/authService";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const resetToken = token;

  /**
   * @param {import("react").FormEvent<HTMLFormElement>} e
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError(t("passwordMismatch"));
      return;
    }
    if (!resetToken) {
      setError(t("resetTokenMissing"));
      return;
    }
    setLoading(true);
    try {
      await resetPassword(resetToken, password);
      window.location.href = "/login";
    } catch (err) {
      const message = err instanceof Error ? err.message : t("resetPasswordError");
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.png" alt="Mǎa-kwɛ́lî Langues" className="w-24 h-24 rounded-full shadow-lg mb-3 object-cover ring-2 ring-primary/30" />
          <h1 className="font-heading text-2xl font-bold text-foreground">{t("app_name")}</h1>
        </div>
        <div className="bg-card border border-border rounded-2xl shadow-xl p-6">
          <h2 className="font-heading text-xl font-bold text-foreground mb-5 text-center">{t("resetPasswordTitle")}</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border border-border bg-background rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder={t("newPassword")} required />
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className="w-full border border-border bg-background rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder={t("confirmPassword")} required />
            {error && <p className="text-destructive text-xs text-center">{error}</p>}
            <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:opacity-90 transition disabled:opacity-60">
              {loading ? t("resetPasswordSaving") : t("resetPasswordAction")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}