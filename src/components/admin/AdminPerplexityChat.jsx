import { useEffect, useRef, useState } from "react";
import { invokeAI } from "@/api/aiService";
import { auditLanguage, getAdminLessonCatalog } from "@/api/languageService";
import { Bot, Copy, Eraser, Loader2, MessageSquare, Send, Sparkles, UserRound } from "lucide-react";

const CONTENT_TYPES = [
  "Une leçon complète",
  "Du vocabulaire authentique",
  "Des exercices corrigés",
  "Une note culturelle",
  "Une conversation pratique",
];

const STARTER_PROMPTS = [
  "Crée une leçon A1 sur les salutations avec 8 mots et 3 exercices.",
  "Vérifie les expressions locales utiles au marché et explique leur contexte.",
  "Propose une leçon de prononciation sur les tons et les sons difficiles.",
];

export default function AdminPerplexityChat({ languages }) {
  const [language, setLanguage] = useState("");
  const [contentType, setContentType] = useState(CONTENT_TYPES[0]);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [catalogAccess, setCatalogAccess] = useState(false);
  const [catalog, setCatalog] = useState(null);
  const [applying, setApplying] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    if (!language && languages.length > 0) setLanguage(languages[0].code);
  }, [languages, language]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const selectedLanguage = languages.find((item) => item.code === language);
  const languageLabel = selectedLanguage ? `${selectedLanguage.name_fr} (${selectedLanguage.name})` : "la langue sélectionnée";

  const loadCatalog = async (enabled) => {
    setCatalogAccess(enabled);
    if (!enabled || catalog) return;
    try {
      setCatalog(await getAdminLessonCatalog());
    } catch (error) {
      setCatalogAccess(false);
      setNotice(`Accès au catalogue refusé: ${error instanceof Error ? error.message : "session admin requise"}`);
    }
  };

  const sendMessage = async (suggestion) => {
    const message = (suggestion || input).trim();
    if (!message || loading || !language) return;

    const nextMessages = [...messages, { role: "user", content: message }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setNotice("");

    const conversation = nextMessages.map((item) => `${item.role === "user" ? "ADMIN" : "PERPLEXITY"}: ${item.content}`).join("\n\n");
    const catalogContext = catalogAccess && catalog
      ? `\nCATALOGUE ADMINISTRATIF DES LEÇONS (lecture seule pour cette demande):\n${JSON.stringify(catalog)}\nPropose les modifications sous forme de brouillon. Elles ne sont enregistrées qu'après validation explicite de l'admin.`
      : "";
    const prompt = `Tu es Perplexity, le chercheur et concepteur pédagogique de Mǎa-kwɛ́lî Langues.
Langue de travail: ${languageLabel}.
Type de contenu souhaité: ${contentType}.

Mission:
- Recherche des informations authentiques et actuelles.
- Ne fabrique jamais une expression, une traduction ou une règle linguistique.
- Distingue clairement les faits vérifiés, les variantes régionales et les incertitudes.
- Rédige un contenu directement exploitable par un professeur, en français, avec les formes dans la langue cible.
- Donne des sources ou citations Perplexity quand elles sont disponibles.
- Réponds en texte structuré et lisible, pas en JSON.

Conversation de travail:
${conversation}${catalogContext}`;

    try {
      const response = await invokeAI(prompt, null, 0.2, "perplexity");
      const content = response && typeof response === "object" && "content" in response ? response.content : response;
      setMessages((current) => [...current, { role: "assistant", content: typeof content === "string" ? content : JSON.stringify(content ?? "") }]);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Erreur inconnue";
      const message = error?.status === 401 || detail.includes("Not authenticated")
        ? "Votre session administrateur a expiré. Reconnectez-vous, puis relancez la génération."
        : `La génération a échoué. ${detail}`;
      setMessages((current) => [...current, { role: "assistant", content: message }]);
    } finally {
      setLoading(false);
    }
  };

  const copyLastResponse = async () => {
    const lastResponse = [...messages].reverse().find((item) => item.role === "assistant");
    if (!lastResponse) return;
    await navigator.clipboard.writeText(lastResponse.content);
    setNotice("Réponse copiée dans le presse-papiers.");
  };

  const applyLanguageChanges = async () => {
    if (!language || applying) return;
    const confirmed = window.confirm(`Demander à Perplexity de corriger et compléter ${languageLabel}, puis enregistrer les changements dans le backend ?`);
    if (!confirmed) return;
    setApplying(true);
    setNotice("");
    try {
      const result = await auditLanguage(language, true);
      setNotice(`Modifications synchronisées : ${result.lesson_corrections.length} correction(s), ${result.missing_lessons.length} leçon(s) créée(s).`);
    } catch (error) {
      setNotice(`Échec de la synchronisation : ${error instanceof Error ? error.message : "erreur inconnue"}`);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="h-fit rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground"><Sparkles size={17} className="text-primary" /> Studio Perplexity</div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Langue de travail</label>
        <select value={language} onChange={(event) => setLanguage(event.target.value)} className="mb-4 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm">
          <option value="">Choisir une langue</option>
          {languages.map((item) => <option key={item.code} value={item.code}>{item.flag_emoji} {item.name_fr}</option>)}
        </select>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Production demandée</label>
        <select value={contentType} onChange={(event) => setContentType(event.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm">
          {CONTENT_TYPES.map((type) => <option key={type}>{type}</option>)}
        </select>
        <label className="mt-5 flex cursor-pointer items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs leading-5 text-muted-foreground"><input type="checkbox" checked={catalogAccess} onChange={(event) => loadCatalog(event.target.checked)} className="mt-1 accent-primary" /> <span><b>Autoriser l’accès au catalogue complet</b><br />Toutes les leçons des langues seront transmises à Perplexity en lecture seule pour préparer les changements.</span></label>
        <div className="mt-3 rounded-xl border border-border bg-background p-3 text-xs leading-5 text-muted-foreground">Les réponses sont des brouillons. Aucune donnée n’est modifiée sans validation explicite.</div>
      </aside>

      <section className="flex min-h-[620px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3"><div className="rounded-xl bg-primary/15 p-2 text-primary"><Bot size={20} /></div><div><h2 className="font-semibold text-foreground">Assistant de contenu</h2><p className="text-xs text-muted-foreground">{selectedLanguage ? `${selectedLanguage.flag_emoji} ${languageLabel}` : "Sélectionnez une langue"} · Perplexity sonar</p></div></div>
          <div className="flex gap-1"><button type="button" onClick={copyLastResponse} title="Copier la dernière réponse" className="rounded-lg p-2 text-muted-foreground transition hover:bg-secondary"><Copy size={16} /></button><button type="button" onClick={() => { setMessages([]); setNotice(""); }} title="Effacer la conversation" className="rounded-lg p-2 text-muted-foreground transition hover:bg-secondary"><Eraser size={16} /></button></div>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto bg-background/40 p-4 sm:p-6">
          {messages.length === 0 && <div className="mx-auto max-w-xl py-8 text-center"><MessageSquare size={30} className="mx-auto mb-3 text-primary" /><h3 className="font-heading text-xl font-semibold text-foreground">Que voulez-vous préparer ?</h3><p className="mt-2 text-sm text-muted-foreground">Demandez une leçon, une vérification culturelle ou des exercices pour la langue sélectionnée.</p><div className="mt-6 grid gap-2 text-left">{STARTER_PROMPTS.map((prompt) => <button key={prompt} type="button" onClick={() => sendMessage(prompt)} disabled={!language} className="rounded-xl border border-border bg-card p-3 text-left text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50">{prompt}</button>)}</div></div>}
          {messages.map((message, index) => <div key={`${message.role}-${index}`} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}><div className={`flex max-w-[90%] flex-col gap-2 rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground"}`}><div className="flex gap-3">{message.role === "assistant" && <Bot size={17} className="mt-1 shrink-0 text-primary" />}<div className="whitespace-pre-wrap">{message.content}</div>{message.role === "user" && <UserRound size={17} className="mt-1 shrink-0" />}</div>{message.role === "assistant" && <button type="button" onClick={applyLanguageChanges} disabled={applying || !language} className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-primary/30 px-2.5 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10 disabled:opacity-50">{applying ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} Appliquer à cette langue</button>}</div></div>)}
          {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin text-primary" /> Perplexity recherche et prépare le contenu...</div>}
          <div ref={endRef} />
        </div>

        <div className="border-t border-border p-4"><div className="flex items-end gap-2 rounded-xl border border-border bg-background p-2 focus-within:border-primary/50"><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); } }} rows={2} placeholder={language ? "Décrivez le contenu à générer..." : "Choisissez d'abord une langue"} disabled={!language || loading} className="min-h-[48px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none disabled:opacity-50" /><button type="button" onClick={() => sendMessage()} disabled={!input.trim() || !language || loading} title="Envoyer la demande" className="rounded-lg bg-primary p-2.5 text-primary-foreground transition hover:opacity-90 disabled:opacity-40"><Send size={17} /></button></div>{notice && <p className="mt-2 text-center text-xs text-green-600">{notice}</p>}<p className="mt-2 text-center text-[11px] text-muted-foreground">Entrée pour envoyer · Maj + Entrée pour aller à la ligne</p></div>
      </section>
    </div>
  );
}
