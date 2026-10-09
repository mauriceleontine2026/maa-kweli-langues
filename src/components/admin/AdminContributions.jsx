import { useEffect, useState } from "react";
import { createVocabulary, getLanguageCodeAdapter, saveLanguageCodeAdapter } from "@/api/languageService";
import {
  createContributionPrompt,
  listContributionPrompts,
  listContributions,
  updateContribution,
  updateContributionPrompt,
} from "@/api/contributionService";
import { getApiBaseUrl } from "@/api/backendClient";import { getLanguageLabel } from "@/lib/languageLabels";import { CheckCircle, XCircle, Hourglass, Play, Download, RotateCcw } from "lucide-react";

export default function AdminContributions({ languages }) {
  const [contributions, setContributions] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [prompts, setPrompts] = useState([]);
  const [promptDraft, setPromptDraft] = useState({ id: null, language_code: "", text: "", translation_fr: "", variant: "", status: "draft", native_verified: false });
  const [promptError, setPromptError] = useState("");
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [adapterLanguageCode, setAdapterLanguageCode] = useState("");
  const [languageAdapter, setLanguageAdapter] = useState({ iso639_3: "", tts_model_id: "" });
  const [adapterError, setAdapterError] = useState("");
  const [savingAdapter, setSavingAdapter] = useState(false);
  const [reviewNotes, setReviewNotes] = useState({});
  const [reviewError, setReviewError] = useState("");

  const fetch = async () => {
    try {
      const data = await listContributions();
      setContributions(Array.isArray(data) ? data : []);
    } catch {
      setContributions([]);
    }
  };
  const fetchPrompts = async () => {
    try {
      const data = await listContributionPrompts(undefined, true);
      setPrompts(Array.isArray(data) ? data : []);
    } catch {
      setPrompts([]);
    }
  };
  useEffect(() => { fetch(); fetchPrompts(); }, []);

  useEffect(() => {
    const languageCode = adapterLanguageCode || languages[0]?.code;
    if (!languageCode) return;
    setAdapterLanguageCode(languageCode);
    getLanguageCodeAdapter(languageCode)
      .then((adapter) => setLanguageAdapter({ iso639_3: adapter?.iso639_3 || "", tts_model_id: adapter?.tts_model_id || "" }))
      .catch(() => setLanguageAdapter({ iso639_3: "", tts_model_id: "" }));
  }, [adapterLanguageCode, languages]);

  const approve = async (c) => {
    if (!await updateReviewStatus(c, "approved")) return;
    if (!c.recording_id) {
      try {
        await createVocabulary({
          language_code: c.language_code,
          word: c.word,
          translation_fr: c.translation_fr,
          phonetic: c.phonetic,
          audio_url: c.audio_url,
          lesson_number: 1,
        });
      } catch { /* may already exist */ }
    }
    fetch();
  };

  const reject = async (c) => {
    if (await updateReviewStatus(c, "rejected")) fetch();
  };

  const requestRetry = async (c) => {
    if (await updateReviewStatus(c, "needs_retry")) fetch();
  };

  const updateReviewStatus = async (contribution, status) => {
    const review = reviewNotes[contribution.id] || {};
    const reviewerNativeVerified = contribution.recording_id ? Boolean(review.nativeVerified) : false;
    if (contribution.recording_id && !reviewerNativeVerified) {
      setReviewError("Une attestation de revue par un locuteur natif est requise.");
      return false;
    }
    setReviewError("");
    try {
      await updateContribution(contribution.id, {
        status,
        reviewer_native_verified: reviewerNativeVerified,
        audio_quality: review.audioQuality ? Number(review.audioQuality) : null,
        pronunciation_quality: review.pronunciationQuality ? Number(review.pronunciationQuality) : null,
        review_comment: review.comment || null,
      });
      return true;
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : "Unable to update review.");
      return false;
    }
  };

  const updateReviewField = (id, field, value) => setReviewNotes((current) => ({
    ...current,
    [id]: { ...current[id], [field]: value },
  }));

  const savePrompt = async (event) => {
    event.preventDefault();
    setPromptError("");
    setSavingPrompt(true);
    const payload = {
      language_code: promptDraft.language_code || languages[0]?.code || "",
      text: promptDraft.text,
      translation_fr: promptDraft.translation_fr,
      variant: promptDraft.variant || null,
      status: promptDraft.status,
      native_verified: promptDraft.native_verified,
    };
    try {
      if (promptDraft.id) await updateContributionPrompt(promptDraft.id, payload);
      else await createContributionPrompt(payload);
      setPromptDraft({ id: null, language_code: payload.language_code, text: "", translation_fr: "", variant: "", status: "draft", native_verified: false });
      await fetchPrompts();
    } catch (error) {
      setPromptError(error instanceof Error ? error.message : "Unable to save phrase.");
    } finally {
      setSavingPrompt(false);
    }
  };

  const editPrompt = (prompt) => setPromptDraft({
    id: prompt.id,
    language_code: prompt.language_code,
    text: prompt.text,
    translation_fr: prompt.translation_fr,
    variant: prompt.variant || "",
    status: prompt.status,
    native_verified: prompt.native_verified,
  });

  const changePromptStatus = async (prompt, nextStatus) => {
    try {
      await updateContributionPrompt(prompt.id, {
        language_code: prompt.language_code,
        text: prompt.text,
        translation_fr: prompt.translation_fr,
        variant: prompt.variant,
        status: nextStatus,
        native_verified: prompt.native_verified,
      });
      await fetchPrompts();
    } catch (error) {
      setPromptError(error instanceof Error ? error.message : "Unable to update phrase.");
    }
  };

  const saveLanguageAdapter = async (event) => {
    event.preventDefault();
    setSavingAdapter(true);
    setAdapterError("");
    try {
      await saveLanguageCodeAdapter(adapterLanguageCode, {
        iso639_3: languageAdapter.iso639_3.trim().toLowerCase(),
        tts_model_id: languageAdapter.tts_model_id.trim() || null,
      });
      await fetchPrompts();
    } catch (error) {
      setAdapterError(error instanceof Error ? error.message : "Unable to save language mapping.");
    } finally {
      setSavingAdapter(false);
    }
  };

  const filtered = contributions.filter(c => filter === "all" || c.status === filter);

  const statusInfo = {
    pending: { icon: Hourglass, color: "text-yellow-500", label: "En attente" },
    needs_retry: { icon: RotateCcw, color: "text-amber-600", label: "Nouvelle prise demandée" },
    approved: { icon: CheckCircle, color: "text-green-500", label: "Validé" },
    rejected: { icon: XCircle, color: "text-red-500", label: "Refusé" },
    withdrawn: { icon: XCircle, color: "text-muted-foreground", label: "Retiré" },
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {["pending", "needs_retry", "approved", "rejected", "all"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
              {f === "all" ? "Toutes" : f === "pending" ? "En attente" : f === "needs_retry" ? "Nouvelle prise" : f === "approved" ? "Validées" : "Refusées"}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`${getApiBaseUrl()}/api/contributions/export?scope=internal_tts`} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground"><Download size={14} /> Export TTS</a>
          <a href={`${getApiBaseUrl()}/api/contributions/export?scope=public_dataset`} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground"><Download size={14} /> Export dataset public</a>
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map(c => {
          const lang = languages.find(l => l.code === c.language_code);
          const si = statusInfo[c.status] || statusInfo.pending;
          return (
            <div key={c.id} className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{lang?.flag_emoji || "🌍"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-heading text-lg font-bold text-foreground">{c.word}</span>
                    {c.phonetic && <span className="text-sm text-primary font-mono">{c.phonetic}</span>}
                  </div>
                  <div className="text-sm text-muted-foreground">→ {c.translation_fr}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {getLanguageLabel(lang)} {c.variant && `· ${c.variant}`} {c.region && `· ${c.region}`} {c.contributor_name && `· par ${c.contributor_name}`}
                  </div>
                  {c.recording_id && <div className="mt-1 text-xs text-muted-foreground">TTS: {c.consent_tts_internal ? "oui" : "non"} · Dataset public: {c.consent_public_dataset ? c.dataset_license : "non autorisé"}</div>}
                  {c.recording_id && <div className="mt-1 text-xs text-muted-foreground">Publication: {c.publication_status === "published" ? "intégrée dans l’application" : c.publication_status === "not_requested" ? "non autorisée pour TTS" : "en attente"}</div>}
                  {c.context_notes && <div className="text-xs text-muted-foreground mt-1 italic">"{c.context_notes}"</div>}
                  {c.recording_id && c.status === "pending" && <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <label className="flex items-center gap-2 text-xs text-foreground sm:col-span-2"><input type="checkbox" checked={Boolean(reviewNotes[c.id]?.nativeVerified)} onChange={(event) => updateReviewField(c.id, "nativeVerified", event.target.checked)} className="accent-primary" />J’atteste avoir vérifié la prononciation comme locuteur natif.</label>
                    <select aria-label="Qualité audio" value={reviewNotes[c.id]?.audioQuality || ""} onChange={(event) => updateReviewField(c.id, "audioQuality", event.target.value)} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs"><option value="">Qualité audio</option>{[1, 2, 3, 4, 5].map((score) => <option key={score} value={score}>{score}/5</option>)}</select>
                    <select aria-label="Qualité de prononciation" value={reviewNotes[c.id]?.pronunciationQuality || ""} onChange={(event) => updateReviewField(c.id, "pronunciationQuality", event.target.value)} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs"><option value="">Prononciation</option>{[1, 2, 3, 4, 5].map((score) => <option key={score} value={score}>{score}/5</option>)}</select>
                    <textarea aria-label="Commentaire de revue" value={reviewNotes[c.id]?.comment || ""} onChange={(event) => updateReviewField(c.id, "comment", event.target.value)} placeholder="Commentaire de revue" rows={2} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs sm:col-span-2" />
                  </div>}
                  {c.rejection_reason && <div className="mt-1 text-xs text-amber-600">{c.rejection_reason}</div>}
                  {c.audio_url && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <Play size={12} className="text-primary" />
                      <audio controls src={c.audio_url} className="h-6" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`text-xs flex items-center gap-1 ${si.color}`}>
                    <si.icon size={12} /> {si.label}
                  </span>
                  {c.status === "pending" && (
                    <div className="flex gap-1">
                      <button onClick={() => approve(c)} className="p-2 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500/20 transition" title="Valider">
                        <CheckCircle size={18} />
                      </button>
                      <button onClick={() => reject(c)} className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition" title="Refuser">
                        <XCircle size={18} />
                      </button>
                      {c.recording_id && <button onClick={() => requestRetry(c)} className="p-2 rounded-lg bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition" title="Demander une nouvelle prise">
                        <RotateCcw size={18} />
                      </button>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Aucune contribution</p>}
      </div>
      {reviewError && <p role="alert" className="mt-3 text-sm text-red-500">{reviewError}</p>}

      <section className="mt-8 border-t border-border pt-6">
        <div className="mb-6 rounded-xl border border-border bg-card p-4">
          <h3 className="mb-1 text-sm font-semibold text-foreground">Adaptateur de langue</h3>
          <p className="mb-3 text-xs text-muted-foreground">Le code ISO est validé par le serveur et reste distinct de l’identifiant du modèle TTS.</p>
          <form onSubmit={saveLanguageAdapter} className="grid gap-3 sm:grid-cols-[1fr_120px_1fr_auto]">
            <select required aria-label="Langue de l’adaptateur" value={adapterLanguageCode} onChange={(event) => setAdapterLanguageCode(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <option value="">Choisir une langue</option>
              {languages.map((language) => <option key={language.code} value={language.code}>{getLanguageLabel(language)}</option>)}
            </select>
            <input required minLength={3} maxLength={3} pattern="[A-Za-z]{3}" aria-label="Code ISO 639-3" value={languageAdapter.iso639_3} onChange={(event) => setLanguageAdapter({ ...languageAdapter, iso639_3: event.target.value })} placeholder="ISO 639-3" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            <input aria-label="Identifiant du modèle TTS" value={languageAdapter.tts_model_id} onChange={(event) => setLanguageAdapter({ ...languageAdapter, tts_model_id: event.target.value })} placeholder="facebook/mms-tts-bam" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            <button type="submit" disabled={savingAdapter || !adapterLanguageCode} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">{savingAdapter ? "Enregistrement..." : "Valider"}</button>
          </form>
          {adapterError && <p role="alert" className="mt-2 text-xs text-red-500">{adapterError}</p>}
        </div>
        <div className="mb-4">
          <h3 className="font-heading text-lg font-bold text-foreground">Catalogue de phrases</h3>
          <p className="text-xs text-muted-foreground">Seules les phrases marquées comme vérifiées par un locuteur natif sont proposées.</p>
        </div>
        <form onSubmit={savePrompt} className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
          <select required aria-label="Langue de la phrase" value={promptDraft.language_code || languages[0]?.code || ""} onChange={(event) => setPromptDraft({ ...promptDraft, language_code: event.target.value })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">Choisir une langue</option>
            {languages.map((language) => <option key={language.code} value={language.code}>{getLanguageLabel(language)}</option>)}
          </select>
          <input required={promptDraft.status === "approved"} value={promptDraft.variant} onChange={(event) => setPromptDraft({ ...promptDraft, variant: event.target.value })} placeholder="Variante linguistique" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <textarea required value={promptDraft.text} onChange={(event) => setPromptDraft({ ...promptDraft, text: event.target.value })} placeholder="Phrase dans la langue" rows={2} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <textarea required value={promptDraft.translation_fr} onChange={(event) => setPromptDraft({ ...promptDraft, translation_fr: event.target.value })} placeholder="Traduction française" rows={2} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 text-xs text-foreground">
            <input type="checkbox" checked={promptDraft.native_verified} onChange={(event) => setPromptDraft({ ...promptDraft, native_verified: event.target.checked })} className="accent-primary" />
            Vérifié par un locuteur natif
          </label>
          <div className="flex items-center gap-2">
            <select aria-label="Statut de la phrase" value={promptDraft.status} onChange={(event) => setPromptDraft({ ...promptDraft, status: event.target.value })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <option value="draft">Brouillon</option><option value="approved">Approuvée</option><option value="inactive">Inactive</option>
            </select>
            <button type="submit" disabled={savingPrompt} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">{savingPrompt ? "Enregistrement..." : promptDraft.id ? "Enregistrer" : "Ajouter"}</button>
            {promptDraft.id && <button type="button" onClick={() => setPromptDraft({ id: null, language_code: languages[0]?.code || "", text: "", translation_fr: "", variant: "", status: "draft", native_verified: false })} className="rounded-lg border border-border px-3 py-2 text-sm">Annuler</button>}
          </div>
          {promptError && <p role="alert" className="text-sm text-red-500 sm:col-span-2">{promptError}</p>}
        </form>
        <div className="mt-3 space-y-2">
          {prompts.map((prompt) => (
            <div key={prompt.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{prompt.text}</p>
                <p className="text-xs text-muted-foreground">{prompt.translation_fr} · {prompt.language_code}{prompt.variant ? ` · ${prompt.variant}` : ""} · {prompt.status}</p>
              </div>
              <button type="button" onClick={() => editPrompt(prompt)} className="rounded-lg border border-border px-3 py-1.5 text-xs">Modifier</button>
              {prompt.status !== "approved" && <button type="button" disabled={!prompt.native_verified} onClick={() => changePromptStatus(prompt, "approved")} className="rounded-lg bg-green-500/10 px-3 py-1.5 text-xs text-green-600 disabled:opacity-50">Approuver</button>}
              {prompt.status === "approved" && <button type="button" onClick={() => changePromptStatus(prompt, "draft")} className="rounded-lg bg-secondary px-3 py-1.5 text-xs">Retirer</button>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}