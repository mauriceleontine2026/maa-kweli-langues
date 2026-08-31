import { useEffect, useRef, useState } from "react";
import { invokeAI } from "@/api/aiService";
import { restoreBackendSession } from "@/api/authService";
import { getLanguages, getVocabularyForLanguage } from "@/api/languageService";
import { useLanguage } from "@/contexts/LanguageContext";
import { Send, Mic, Volume2, Square, Headphones, Languages, Sparkles, MessageSquareText, ArrowUpRight, CheckCircle2, RotateCcw } from "lucide-react";
import { moderateContent, getModerationMessage } from "@/lib/moderation";
import { buildPhonologyContext, getTTSLocale, getBestVoice, getPhonologyProfile } from "@/lib/languagePhonology";
import { getCountryForLanguage, getFlagForLanguage } from "@/lib/localLanguageData";
import { playAudioSource, speakText, startVoiceRecognition, stopVoiceRecognition } from "@/lib/audioService";
// public logo at /logo.png

const getSuggestions = (t) => [
  t("suggestionAlpha"),
  t("suggestionGreeting"),
  t("suggestionTones"),
  t("suggestionImplosives"),
  t("suggestionDifficultSounds"),
  t("suggestionVowels"),
];

const getQuickActions = (t) => [
  { label: t("pronunciation"), prompt: t("promptPronunciation"), icon: "🎯" },
  { label: t("conversation"), prompt: t("promptConversation"), icon: "💬" },
  { label: t("culture"), prompt: t("promptCulture"), icon: "🌍" },
  { label: t("translation"), prompt: t("promptTranslation"), icon: "📝" },
];

export default function AITutor() {
  const { t, language } = useLanguage();
  const getLanguageDisplayName = (languageItem) => language === "en"
    ? (languageItem?.name || languageItem?.name_fr)
    : languageItem?.name_fr;
  const QUICK_ACTIONS = getQuickActions(t);
  const SUGGESTIONS = getSuggestions(t);
  /** @type {{ role: string; content: string }[]} */
  const initialMessages = [];
  /** @type {any[]} */
  const initialAnyArray = [];

  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [languages, setLanguages] = useState(initialAnyArray);
  const [lang, setLang] = useState("");
  const [vocab, setVocab] = useState(initialAnyArray);
  const [listening, setListening] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [siriMode, setSiriMode] = useState(false);
  const recognitionRef = /** @type {import("react").MutableRefObject<any>} */ (useRef(null));
  const scrollRef = /** @type {import("react").MutableRefObject<HTMLDivElement | null>} */ (useRef(null));
  const siriModeRef = useRef(/** @type {boolean} */ (false));
  const voiceModeRef = useRef(/** @type {boolean} */ (false));

  useEffect(() => { siriModeRef.current = siriMode; }, [siriMode]);
  useEffect(() => { voiceModeRef.current = voiceMode; }, [voiceMode]);

  // Fetch all languages from database
  useEffect(() => {
    getLanguages()
      .then((langs) => {
        const safeLangs = Array.isArray(langs) ? langs : [];
        setLanguages(safeLangs);
        if (safeLangs.length > 0 && !lang) setLang(safeLangs[0].code);
      })
      .catch(() => setLanguages([]));
  }, []);

  // Fetch vocabulary for selected language (dictionary data)
  useEffect(() => {
    if (lang) {
      getVocabularyForLanguage(lang)
        .then((data) => setVocab(Array.isArray(data) ? data : []))
        .catch(() => setVocab([]));
    } else {
      setVocab([]);
    }
  }, [lang]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  /**
   * @param {string} text
   * @param {() => void} [onEnd]
   */
  const speak = (text, onEnd) => {
    const speechText = cleanForSpeech(text);
    if (!speechText) { onEnd?.(); return; }
    return speakText(speechText, lang, { onEnd });
  };

  /**
   * @param {(transcript: string) => void} onResult
   */
  const startListening = (onResult) => {
    const rec = startVoiceRecognition(lang, {
      onResult: (transcript) => {
        onResult(transcript);
      },
      onError: () => {
        alert(t("micUnsupported"));
        setListening(false);
      },
      onEnd: () => setListening(false),
    });

    recognitionRef.current = rec;
    setListening(Boolean(rec));
  };

  const stopListening = () => {
    stopVoiceRecognition();
    recognitionRef.current = null;
    setListening(false);
  };

  // Build dictionary context from vocabulary items
  /** @param {string} langLabel */
  const buildDictContext = (langLabel) => {
    if (vocab.length === 0) return "";
    const vocabList = vocab.slice(0, 60).map(v => {
      let entry = `• ${v.word}`;
      if (v.translation_fr) entry += ` = ${v.translation_fr}`;
      if (v.phonetic) entry += ` [phonétique IPA: ${v.phonetic}]`;
      if (v.phonetic_simple) entry += ` (prononciation simple: ${v.phonetic_simple})`;
      if (v.example_target) entry += ` | Exemple: ${v.example_target}`;
      if (v.example_fr) entry += ` — ${v.example_fr}`;
      if (v.audio_url) entry += ` [AUDIO:${v.audio_url}]`;
      return entry;
    }).join("\n");
    return `\n\nDICTIONNAIRE DE RÉFÉRENCE (${langLabel}):\n${vocabList}\n\nIMPORTANT: Utilise ces données comme référence prioritaire uniquement pour les entrées, phonétiques et audios effectivement présents. Ce dictionnaire ne limite jamais tes recherches ni tes réponses. Pour tout mot absent ou toute question générale, utilise la recherche web Perplexity et des sources linguistiques fiables. Si un audio est disponible (marqué [AUDIO:url]), inclus le marqueur [AUDIO:url] dans ta réponse pour que l'apprenant puisse l'écouter.`;
  };
  /** @param {string} msg @param {boolean} [voiceReply] */  const callLLM = async (msg, voiceReply = false) => {
    const langObj = languages.find(l => l.code === lang);
    const langLabel = langObj ? `${getLanguageDisplayName(langObj)} (${langObj.name})` : lang;
    const country = getCountryForLanguage(langObj || lang);
    const explanationLanguage = language === "en" ? "English" : "French";
    const dictContext = buildDictContext(langLabel);
    const phonologyContext = buildPhonologyContext(lang, langObj);
    const conversationContext = messages.slice(-8).map((message) => `${message.role === "user" ? "Utilisateur" : "Kôrô"}: ${message.content}`).join("\n");

    const prompt = `Tu es Kôrô, l'assistant IA de Mǎa-kwɛ́lî Langues, une plateforme d'apprentissage des langues africaines et internationales. Tu es à la fois un locuteur natif virtuel de la langue choisie, un tuteur pédagogique, un expert en phonétique et un coach de prononciation adaptatif.

L'apprenant a choisi la langue: ${langLabel}. Pays principal de référence: ${country}.

RÈGLES:
  1. Réponds D'ABORD dans la langue choisie (${langLabel}), avec la grammaire, le vocabulaire, les expressions idiomatiques, le niveau de politesse et le registre naturel d'un locuteur natif de cette langue. Utilise ${explanationLanguage} pour les traductions et les explications pédagogiques.
2. Le dictionnaire est une référence prioritaire uniquement pour les mots, exemples audio et phonétiques qu'il contient. Il ne limite ni tes recherches ni les sujets auxquels tu peux répondre. Pour un mot absent du dictionnaire, recherche une source linguistique fiable et indique clairement la source et ton niveau de certitude ; n'invente jamais de phonétique.
  3. ADOPTE LA PRONONCIATION ET L'ACCENT naturels de la langue choisie en suivant fidèlement son profil phonologique : rythme, intonation, longueur vocalique, tons, voyelles, consonnes et enchaînements. Ne remplace jamais ses sons par des équivalents français lorsque tu écris ou transcris la langue cible.
4. Pour chaque mot ou expression dans la langue cible:
  - Donne la phonétique IPA ET une prononciation simplifiée expliquée en ${explanationLanguage}
   - Explique comment articuler les sons spécifiques (implosives, tons, nasales, emphatiques, etc.)
  - Compare avec les sons les plus proches de ${explanationLanguage}
   - Si la langue est tonale, indique le ton de chaque mot et explique comment le réaliser
5. Corrige activement les erreurs de prononciation fréquentes listées dans le profil phonologique.
6. Si un mot demandé est dans le dictionnaire, donne sa phonétique exacte et mentionne si un audio est disponible.
7. Réponds à toute question générale utile dans la langue choisie : sciences, histoire, actualité, technologie, études, travail, voyage, culture, vie quotidienne et conseils pratiques. Ne limite pas ta réponse à l'apprentissage des langues.
8. MODE RECHERCHE APPROFONDIE ET EXACTITUDE : tu as accès à la recherche web Perplexity. Pour chaque question factuelle, actuelle, technique, scientifique, historique, culturelle ou de traduction, fais une recherche web approfondie avant de répondre, consulte plusieurs sources fiables et compare leurs informations. Ne limite jamais ta recherche aux dictionnaires locaux ni à tes connaissances internes.
9. Réponds exactement à la question posée, sans détour ni sujet de remplacement. Cite brièvement les sources utilisées avec leur nom et leur URL pour les sujets factuels. Sépare clairement les faits vérifiés, les interprétations et les incertitudes. Si aucune source fiable ne confirme une information, dis-le explicitement au lieu de deviner.
10. Si la question est ambiguë, demande une précision. Si elle concerne une langue peu documentée, distingue les formes attestées des hypothèses et n'invente aucun mot ni aucune prononciation.
11. Reste respectueux, professionnel et bienveillant. Refuse uniquement les demandes dangereuses, illégales, haineuses, sexuelles impliquant des mineurs, ou visant à causer un préjudice. Pour les sujets sensibles, donne des informations générales et oriente vers une aide qualifiée si nécessaire.
12. Sois concis mais complet. Donne des exemples concrets et adapte le niveau de détail à la question.${voiceReply ? `
13. MODE VOCAL SIRI : réponds avec des phrases courtes, naturelles et faciles à écouter dans la langue choisie. N'utilise pas de Markdown, de tableaux, de symboles décoratifs, d'URL ni de marqueurs audio. Exécute directement la demande de l'apprenant. Ne donne une transcription IPA ou une explication en ${explanationLanguage} que si elle est nécessaire ou explicitement demandée.` : ""}${dictContext}${phonologyContext}

HISTORIQUE RÉCENT DE LA CONVERSATION:
${conversationContext || "[aucun historique]"}

Question actuelle de l'apprenant: ${msg}`;

    let res;
    try {
      res = await invokeAI(prompt, null, 0.1, "perplexity");
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("User not found")) throw error;
      const restoredUser = await restoreBackendSession();
      if (!restoredUser) throw error;
      res = await invokeAI(prompt, null, 0.1, "perplexity");
    }
    if (res && typeof res === "object" && "content" in res) {
      return /** @type {string} */ (res.content);
    }
    return typeof res === "string" ? res : JSON.stringify(res ?? "");
  };

  // Extract audio URLs from AI response
  /** @param {unknown} content */
  const extractAudioUrls = (content) => {
    const text = typeof content === "string" ? content : String(content ?? "");
    const urls = [];
    const regex = /\[AUDIO:(https?:\/\/[^\]]+)\]/g;
    let match;
    while ((match = regex.exec(text)) !== null) urls.push(match[1]);
    return urls;
  };

  // Clean content for display
  /** @param {unknown} content */
  const cleanContent = (content) => {
    const text = typeof content === "string" ? content : String(content ?? "");
    return text.replace(/\[AUDIO:https?:\/\/[^\]]+\]/g, "🎵");
  };

  /** @param {unknown} content */
  const cleanForSpeech = (content) => cleanContent(content)
    .replace(/https?:\/\/\S+/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[*_#>`~]/g, "")
    .replace(/\[(?:IPA|phonétique)[^\]]*\]/gi, "")
    .replace(/[🎵🎯💬🌍📝⚠️]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

  // === Siri mode (hands-free conversation) ===
  const startSiriMode = () => {
    setSiriMode(true);
    siriModeRef.current = true;
    setMessages(prev => prev.length === 0
      ? [{ role: "assistant", content: t("siriActivated") }]
      : prev
    );
    speak(t("siriActivatedVoice"), () => {
      if (siriModeRef.current) setTimeout(() => siriListen(), 500);
    });
  };

  const siriListen = () => {
    if (!siriModeRef.current) return;
    startListening((transcript) => siriSend(transcript));
  };

  /** @param {string} text */
  const siriSend = async (text) => {
    if (!siriModeRef.current || !text.trim()) return;
    setMessages(prev => [...prev, { role: "user", content: text }]);
    setLoading(true);
    try {
      const res = await callLLM(text, true);
      setMessages(prev => [...prev, { role: "assistant", content: res }]);
      speak(cleanContent(res), () => {
        if (siriModeRef.current) setTimeout(() => siriListen(), 500);
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : t("unknownError");
      setMessages(prev => [...prev, { role: "assistant", content: `${t("tutorError")} ${detail}` }]);
      if (siriModeRef.current) setTimeout(() => siriListen(), 2000);
    } finally {
      setLoading(false);
    }
  };

  const stopSiriMode = () => {
    setSiriMode(false);
    siriModeRef.current = false;
    stopListening();
    window.speechSynthesis?.cancel();
  };

  // === Text mode ===
  /** @param {string} [text] */
  const sendMessage = async (text) => {
    const msg = (text || input || "").trim();
    if (!msg || loading) return;

    const mod = moderateContent(msg);
    if (!mod.ok) {
      setMessages(prev => [...prev,
        { role: "user", content: msg },
        { role: "assistant", content: getModerationMessage(mod.reason) }
      ]);
      setInput("");
      return;
    }

    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setInput("");
    setLoading(true);
    try {
      const res = await callLLM(msg);
      setMessages(prev => [...prev, { role: "assistant", content: res }]);
      if (voiceModeRef.current) speak(cleanContent(res));
    } catch (error) {
      const detail = error instanceof Error ? error.message : t("unknownError");
      setMessages(prev => [...prev, { role: "assistant", content: `${t("tutorError")} ${detail}` }]);
    } finally {
      setLoading(false);
    }
  };

  const onMicClick = () => {
    if (listening) { stopListening(); return; }
    startListening(/** @param {string} t */ (t) => { setInput(t); sendMessage(t); });
  };

  const activeLanguage = languages.find((item) => item.code === lang);

  return (
    <div className="min-h-screen bg-background px-4 py-5 md:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="overflow-hidden rounded-[30px] border border-white/60 bg-white/75 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/75">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.12),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.12),_transparent_35%)]" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img src="/logo.png" alt="Mǎa-kwɛ́lî Langues" className="h-14 w-14 rounded-2xl object-cover shadow-[0_15px_35px_rgba(249,115,22,0.25)] ring-4 ring-primary/15" />
                <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-950" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-heading text-3xl font-bold text-foreground">{t("assistantLabel")}</h1>
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                    {t("aiCoach")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {activeLanguage ? `${getFlagForLanguage(activeLanguage)} ${getLanguageDisplayName(activeLanguage)}` : t("assistantDescription")} · {languages.length} {t("languagesCount")} · {vocab.length} {t("wordsCount")}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="hidden items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-medium text-emerald-600 sm:inline-flex">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> {t("online")}
              </span>
              <button
                onClick={() => setVoiceMode(!voiceMode)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  voiceMode
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                <Volume2 size={14} /> {t("voice")}
              </button>
              <button
                onClick={siriMode ? stopSiriMode : startSiriMode}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  siriMode
                    ? "bg-red-500 text-white shadow-md shadow-red-500/30 animate-pulse"
                    : "bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700"
                }`}
              >
                <Headphones size={14} /> {siriMode ? t("stop") : t("modeSiri")}
              </button>
            </div>
          </div>

          <div className="relative mt-4 rounded-[24px] border border-primary/10 bg-gradient-to-r from-primary/8 via-orange-500/6 to-violet-500/8 p-3 shadow-inner shadow-primary/5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground/90">
                <Languages size={16} className="text-primary" />
                <span>{activeLanguage ? `${t("languageActive")} : ${getLanguageDisplayName(activeLanguage)}` : t("languageActive")}</span>
              </div>
              {getPhonologyProfile(lang) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-600">
                  <Languages size={10} /> {t("accent")} {getPhonologyProfile(lang).name}
                </span>
              )}
            </div>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {languages.map(l => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition ${
                    lang === l.code
                      ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  <span>{getFlagForLanguage(l)}</span> {getLanguageDisplayName(l)}
                </button>
              ))}
            </div>
          </div>
        </header>

        <main className="mt-4 grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="rounded-[28px] border border-border/80 bg-card/80 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.05)] backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-xl font-bold text-foreground">{t("focusTitle")}</h2>
              <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                AI coach
              </span>
            </div>

            <div className="space-y-3">
              {[
                { label: t("pronunciation"), value: t("ipaTones"), icon: "🎧" },
                { label: t("culture"), value: t("historicalUses"), icon: "🌍" },
                { label: t("context"), value: t("adaptedAccent"), icon: "✨" },
                { label: t("dictionary"), value: `${vocab.length} ${t("wordsCount")}`, icon: "📚" }
              ].map(item => (
                <div key={item.label} className="rounded-[20px] border border-border bg-gradient-to-br from-secondary/50 to-white/80 px-3 py-2.5 shadow-sm dark:from-slate-900/70 dark:to-slate-950/80">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-lg shadow-sm dark:bg-slate-900">
                      {item.icon}
                    </span>
                    <div>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-sm font-semibold text-foreground">{item.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-[22px] border border-dashed border-primary/30 bg-primary/5 p-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{t("suggestionsTitle")}</p>
                <Sparkles size={14} className="text-primary" />
              </div>
              <div className="space-y-2">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => sendMessage(action.prompt)}
                    className="flex w-full items-center justify-between rounded-xl border border-transparent bg-white/75 px-3 py-2 text-left text-sm text-foreground transition hover:border-primary/20 hover:bg-primary/5 dark:bg-slate-900/70"
                  >
                    <span className="flex items-center gap-2">
                      <span>{action.icon}</span>
                      <span>{action.label}</span>
                    </span>
                    <ArrowUpRight size={14} className="text-primary" />
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-[22px] border border-border bg-gradient-to-br from-emerald-500/10 to-primary/10 p-3 shadow-inner shadow-emerald-500/5">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                <CheckCircle2 size={16} className="text-emerald-500" />
                {t("progressToday")}
              </div>
              <div className="space-y-2">
                <div>
                  <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
                    <span>{t("pronunciation")}</span>
                    <span>78%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/70 dark:bg-slate-900/80">
                    <div className="h-2 w-[78%] rounded-full bg-gradient-to-r from-emerald-500 to-primary" />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
                    <span>{t("conversation")}</span>
                    <span>64%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/70 dark:bg-slate-900/80">
                    <div className="h-2 w-[64%] rounded-full bg-gradient-to-r from-violet-500 to-purple-600" />
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <section className="flex min-h-[620px] flex-col overflow-hidden rounded-[28px] border border-border/80 bg-card/80 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-border/70 px-4 py-3 sm:px-5 lg:px-6">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <MessageSquareText size={14} className="text-primary" /> {t("conversation")}
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] tracking-normal">{messages.length} {t("messageCount", messages.length)}</span>
              </div>
              {messages.length > 0 && <button type="button" onClick={() => setMessages([])} title={t("newConversation")} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"><RotateCcw size={13} /> {t("newConversation")}</button>}
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 sm:px-5 lg:px-6">
              <div className="mx-auto max-w-3xl space-y-4">
                {messages.length === 0 && (
                  <div className="flex min-h-[500px] items-center justify-center">
                    <div className="w-full max-w-xl rounded-[28px] border border-border bg-gradient-to-br from-primary/8 via-orange-500/5 to-violet-500/8 p-5 text-center shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-6">
                      <div className="mb-5 flex items-center justify-center">
                        <img src="/logo.png" alt="Mǎa-kwɛ́lî Langues" className="h-24 w-24 rounded-[28px] object-cover shadow-[0_18px_45px_rgba(249,115,22,0.22)] ring-4 ring-primary/15" />
                      </div>
                      <div className="mb-3 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                        <Sparkles size={12} />
                        <span>{t("languageCoach")}</span>
                      </div>
                      <h2 className="font-heading text-3xl font-bold text-foreground">{t("helloKoro")}</h2>
                      <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
                        {t("koroIntro")}
                      </p>

                      <div className="mt-6 grid gap-2 sm:grid-cols-2">
                        {QUICK_ACTIONS.slice(0, 4).map((action) => (
                          <button
                            key={action.label}
                            onClick={() => sendMessage(action.prompt)}
                            className="flex items-center justify-between rounded-2xl border border-border bg-white/80 px-3 py-2.5 text-left text-sm text-foreground shadow-sm transition hover:border-primary/20 hover:bg-primary/5 dark:bg-slate-900/70"
                          >
                            <span className="flex items-center gap-2">
                              <span>{action.icon}</span>
                              <span>{action.label}</span>
                            </span>
                            <ArrowUpRight size={14} className="text-primary" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {messages.map((m, i) => {
                  const audioUrls = m.role === "assistant" ? extractAudioUrls(m.content) : [];
                  const display = m.role === "assistant" ? cleanContent(m.content) : m.content;
                  const isUser = m.role === "user";

                  return (
                    <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                      <div className={`min-w-0 max-w-[85%] break-words rounded-[24px] px-4 py-3 shadow-sm ring-1 [overflow-wrap:anywhere] ${
                        isUser
                          ? "bg-gradient-to-br from-primary to-orange-500 text-primary-foreground ring-primary/40"
                          : "border border-border bg-secondary/30 text-foreground ring-border/60"
                      }`}>
                        <div className="mb-2 flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.14em] opacity-80">
                          <span className="inline-flex items-center gap-1.5">
                            {isUser ? <MessageSquareText size={12} /> : <Sparkles size={12} />}
                            {isUser ? t("userLabel") : t("assistantLabel")}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap break-words text-sm leading-7 [overflow-wrap:anywhere]">{display}</p>
                        {!isUser && (
                          <div className="mt-3 flex flex-wrap items-center gap-3">
                            <button onClick={() => speak(display)} className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition hover:text-primary">
                              <Volume2 size={12} /> {t("audioListen")}
                            </button>
                            {audioUrls.map((url, j) => (
                              <audio key={j} controls src={url} className="h-7 max-w-full" />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {loading && (
                  <div className="flex justify-start">
                    <div className="rounded-[24px] border border-border bg-secondary/30 px-4 py-3">
                      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        <span>{t("assistantLabel")} {t("thinking")}</span>
                      </div>
                      <div className="mt-3 flex gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}

                {siriMode && (
                  <div className="pt-2 text-center">
                    <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-600">
                      <Mic size={16} className={listening ? "animate-pulse" : ""} />
                      {listening ? t("listening") : loading ? t("thinking") : t("readyToListen")}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {!siriMode && (
              <div className="border-t border-border bg-background/80 px-4 py-4 backdrop-blur-sm sm:px-5 lg:px-6">
                <div className="mx-auto max-w-3xl">
                  <div className="flex items-center gap-2 rounded-[28px] border border-border bg-card p-2 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
                    <button
                      onClick={onMicClick}
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition ${
                        listening ? "bg-red-500 text-white animate-pulse" : "bg-primary text-primary-foreground hover:opacity-90"
                      }`}
                    >
                      {listening ? <Square size={18} /> : <Mic size={20} />}
                    </button>

                    <input
                      type="text"
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && sendMessage()}
                      placeholder={listening ? t("listening") : t("askLanguageQuestion")}
                      aria-label={t("askLanguageQuestion")}
                      className="min-w-0 flex-1 rounded-full border-0 bg-transparent px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />

                    <button
                      onClick={() => sendMessage()}
                      disabled={loading || !input.trim()}
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-primary to-orange-500 text-primary-foreground shadow-[0_10px_24px_rgba(249,115,22,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}