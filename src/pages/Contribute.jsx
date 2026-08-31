// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { uploadFile } from "@/api/uploadService";
import { createContribution } from "@/api/contributionService";
import { getLanguages } from "@/api/languageService";
import { useLanguage } from "@/contexts/LanguageContext";
import { Mic, Upload, Square, Trash2, ShieldCheck, BookOpen, MapPin, CheckCircle2 } from "lucide-react";
import { moderateContent, getModerationMessage } from "@/lib/moderation";
import AudioVisualizer from "@/components/contribute/AudioVisualizer";

export default function Contribute() {
  const { t, language } = useLanguage();
  const getLanguageDisplayName = (languageItem) => language === "en"
    ? (languageItem?.name || languageItem?.name_fr)
    : languageItem?.name_fr;
  const [languages, setLanguages] = useState(/** @type {any[]} */ ([]));
  const [form, setForm] = useState({
    language_code: "", word: "", phonetic: "", translation_fr: "",
    contributor_name: "", region: "", context_notes: ""
  });
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(/** @type {Blob | null} */ (null));
  const [audioUrl, setAudioUrl] = useState(/** @type {string | null} */ (null));
  const [recordTime, setRecordTime] = useState(0);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [stream, setStream] = useState(/** @type {MediaStream | null} */ (null));
  const [mimeType, setMimeType] = useState("");
  const mediaRecorderRef = useRef(/** @type {MediaRecorder | null} */ (null));
  const chunksRef = useRef(/** @type {Blob[]} */ ([]));
  const streamRef = useRef(/** @type {MediaStream | null} */ (null));
  const timerRef = useRef(/** @type {ReturnType<typeof setInterval> | null} */ (null));

  useEffect(() => {
    getLanguages()
      .then((data) => setLanguages(Array.isArray(data) ? data : []))
      .catch(() => setLanguages([]));
      return () => {
        const s = /** @type {any} */ (streamRef.current);
        if (s && typeof s.getTracks === 'function') s.getTracks().forEach((/** @type {any} */ t) => t.stop());
        if (timerRef.current) clearInterval(/** @type {any} */ (timerRef.current));
      };
  }, []);

  const getSupportedMimeType = () => {
    const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4;codecs=mp4a.40.2", "audio/mp4", "audio/ogg;codecs=opus", "audio/ogg"];
    for (const t of types) { try { if (MediaRecorder.isTypeSupported(t)) return t; } catch {} }
    return "";
  };

  const startRecording = async () => {
    setMsg("");
    if (audioUrl) deleteRecording();
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setMsg(`❌ ${t("microphoneUnsupported")}`);
      return;
    }
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      });
      streamRef.current = newStream;
      setStream(newStream);
      const mType = getSupportedMimeType();
      setMimeType(mType);
      const recorder = mType ? new MediaRecorder(newStream, { mimeType: mType }) : new MediaRecorder(newStream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mType || "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        newStream.getTracks().forEach((t) => t.stop());
        setStream(null);
      };
      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setRecordTime(0);
      timerRef.current = setInterval(() => setRecordTime((t) => t + 1), 1000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setMsg(`❌ ${t("microphoneAccess")} ${errorMessage ? errorMessage : ""}`.trim());
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const deleteRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordTime(0);
    setStream(null);
  };

  /** @param {Event} e */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.word || !form.translation_fr || !form.language_code) {
      setMsg(`❌ ${t("fillRequiredFields")}`);
      return;
    }

    // Content moderation
    const fullText = `${form.word} ${form.translation_fr} ${form.context_notes} ${form.contributor_name}`;
    const mod = moderateContent(fullText);
    if (!mod.ok) {
      setMsg(getModerationMessage(mod.reason));
      return;
    }

    setSaving(true);
    setMsg("");
    try {
      // Upload audio if recorded
      let audio_url = "";
      if (audioBlob) {
        const ext = mimeType.includes("mp4") ? "mp4" : mimeType.includes("ogg") ? "ogg" : "webm";
        const file = new File([audioBlob], `contribution_${Date.now()}.${ext}`, { type: mimeType || "audio/webm" });
        const uploadRes = await uploadFile(file);
        audio_url = uploadRes?.file_url || "";
      }
      await createContribution({ ...form, audio_url });
      setMsg(`✅ ${t("contributionSubmitted")}`);
      setForm({ ...form, word: "", phonetic: "", translation_fr: "", context_notes: "" });
      deleteRecording();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setMsg("❌ " + t("Erreur lors de l'envoi :") + " " + errorMessage);
    }
  };

  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="mx-auto w-full max-w-5xl p-4 sm:p-6 lg:p-10">
      <header className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary"><Mic size={21} /></div>
          <div><h1 className="font-heading text-3xl font-bold text-foreground">{t("contributeTitle")}</h1><p className="mt-1 text-sm text-muted-foreground">{t("contributeSubtitle")}</p></div>
        </div>
      </header>

      {/* Callout */}
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-border bg-background/60 p-4">
        <div className="shrink-0 w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
          <Mic className="text-yellow-500" size={20} />
        </div>
        <div>
          <p className="font-semibold text-foreground mb-1">{t("contributeCalloutTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("contributeCalloutText")}</p>
        </div>
      </div>
      {/* Language selector */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2"><BookOpen size={17} className="text-primary" /><div><label className="text-sm font-semibold text-foreground">{t("languageConcerned")}</label><p className="text-xs text-muted-foreground">{t("languageConcernedHint")}</p></div></div>
        <select aria-label={t("languageConcerned")} value={form.language_code} onChange={e => setForm({ ...form, language_code: e.target.value })}
          className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
          <option value="">{t("selectLanguagePlaceholder")}</option>
          {languages.map(l => <option key={l.code} value={l.code}>{getLanguageDisplayName(l)}</option>)}
        </select>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1.05fr_.95fr]">
      {/* Recording studio */}
      <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm sm:p-8">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">{t("recordingStudio")}</p>

        {!audioUrl ? (
          <>
            <button type="button" onClick={recording ? stopRecording : startRecording}
              className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto transition shadow-lg ${
                recording ? "bg-red-500 animate-pulse shadow-red-500/30" : "bg-yellow-500 hover:bg-yellow-600 shadow-yellow-500/20"
              }`}>
              {recording ? <Square size={28} className="text-white" /> : <Mic size={32} className="text-white" />}
            </button>
            {recording && stream && (
              <div className="mt-4">
                <AudioVisualizer stream={stream} />
              </div>
            )}
            <p className="text-sm text-muted-foreground mt-4">
              {recording ? `${t("recordingInProgress")} ${fmtTime(recordTime)}` : t("clickToRecord")}
            </p>
            {recording && (
              <p className="text-xs text-red-500 mt-1">{t("stopRecording")}</p>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-green-500">
              <ShieldCheck size={20} />
              <span className="text-sm font-medium">{t("recordingReady")} ({fmtTime(recordTime)})</span>
            </div>
            <audio controls src={audioUrl} className="w-full max-w-sm mx-auto" />
            <div className="flex items-center justify-center gap-3">
              <button type="button" onClick={startRecording}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500 text-white text-sm font-medium hover:bg-yellow-600 transition">
                <Mic size={16} /> {t("reRecord")}
              </button>
              <button type="button" onClick={deleteRecording}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/70 transition">
                <Trash2 size={16} /> {t("deleteText")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div>
          <h3 className="mb-1 text-sm font-semibold text-foreground">{t("speakerProfile")}</h3>
          <p className="mb-4 text-xs text-muted-foreground">{t("requiredFields")}</p>
          <div className="space-y-3">
            <input required aria-label={t("wordExpression")} value={form.word} onChange={e => setForm({ ...form, word: e.target.value })}
              placeholder={t("wordExpression")}
              className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
            <input value={form.phonetic} onChange={e => setForm({ ...form, phonetic: e.target.value })}
              placeholder={t("phoneticLabel")}
              className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
            <input required aria-label={t("translationFrench")} value={form.translation_fr} onChange={e => setForm({ ...form, translation_fr: e.target.value })}
              placeholder={`${t("translationFrench")} *`}
              className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
        </div>

        <div className="mt-5 border-t border-border pt-5">
          <h3 className="mb-1 text-sm font-semibold text-foreground">{t("speakerProfile")}</h3>
          <p className="mb-4 text-xs text-muted-foreground">{t("speakerProfileText")}</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-muted-foreground">{t("firstName")}<input value={form.contributor_name} onChange={e => setForm({ ...form, contributor_name: e.target.value })}
              placeholder={t("firstName")}
              className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" /></label>
            <label className="text-xs text-muted-foreground"><span className="inline-flex items-center gap-1">{t("region")} <MapPin size={11} /></span><input value={form.region} onChange={e => setForm({ ...form, region: e.target.value })}
              placeholder={t("region")}
              className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" /></label>
          </div>
        </div>

        <div className="mt-5 border-t border-border pt-5">
          <h3 className="mb-1 text-sm font-semibold text-foreground">{t("notesContext")} <span className="font-normal text-muted-foreground">({t("optional")})</span></h3>
          <textarea value={form.context_notes} onChange={e => setForm({ ...form, context_notes: e.target.value })}
            placeholder={t("notesContext")}
            rows={3}
            className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" />
        </div>

        {msg && (
          <p className={`text-sm text-center ${msg.startsWith("✅") ? "text-green-500" : msg.startsWith("⚠️") ? "text-yellow-500" : "text-red-500"}`}>
            {msg}
          </p>
        )}

        <button type="submit" disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl hover:opacity-90 transition disabled:opacity-60">
          <Upload size={18} /> {saving ? t("sendingContribution") : t("submitContribution")}
        </button>
      </form>
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-muted-foreground"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-500" /><p><b className="text-foreground">{t("afterSubmission")}</b> {t("contributeAfterReview")}</p></div>
    </div>
  );
}

// EOF