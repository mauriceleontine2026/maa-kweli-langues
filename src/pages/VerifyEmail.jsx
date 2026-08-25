import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { verifyEmail } from "@/api/authService";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState("loading");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setState("error");
      setMessage("Lien de vérification manquant.");
      return;
    }

    verifyEmail(token)
      .then(() => {
        setState("success");
        setMessage("Adresse e-mail vérifiée. Connexion automatique en cours...");
        window.setTimeout(() => navigate("/", { replace: true }), 900);
      })
      .catch((error) => {
        setState("error");
        setMessage(error instanceof Error ? error.message : "Lien de vérification invalide ou expiré.");
      });
  }, [searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <section className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-lg">
        <h1 className="font-heading text-2xl font-semibold text-foreground">Vérification de l’adresse e-mail</h1>
        <p className={`mt-4 text-sm ${state === "error" ? "text-destructive" : state === "success" ? "text-emerald-600" : "text-muted-foreground"}`}>
          {state === "loading" ? "Vérification en cours..." : message}
        </p>
        {state === "error" ? (
          <button type="button" onClick={() => navigate("/login")} className="mt-6 inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
            Aller à la connexion
          </button>
        ) : null}
      </section>
    </main>
  );
}
