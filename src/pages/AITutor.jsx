import { useEffect, useRef, useState } from "react";
import { invokeAI } from "@/api/aiService";
import { restoreBackendSession } from "@/api/authService";
import { getLanguages, getVocabularyForLanguage } from "@/api/languageService";
import { deleteAIConversation, getAIConversations, saveAIConversation } from "@/api/aiConversationService";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { Send, Mic, Volume2, Square, Languages, Sparkles, MessageSquareText, RotateCcw, ArrowUpRight, History, Plus, Search, Trash2, Copy, X } from "lucide-react";
import { moderateContent, getModerationMessage } from "@/lib/moderation";
import { buildPhonologyContext, getPhonologyProfile } from "@/lib/languagePhonology";
import { getCountryForLanguage } from "@/lib/localLanguageData";
import { speakText, startVoiceRecognition, stopVoiceRecognition } from "@/lib/audioService";
// public logo at /logo.png

const getQuickActions = (t) => [
  { label: t("pronunciation"), prompt: t("promptPronunciation"), icon: "🎯" },
  { label: t("conversation"), prompt: t("promptConversation"), icon: "💬" },
  { label: t("culture"), prompt: t("promptCulture"), icon: "🌍" },
  { label: t("translation"), prompt: t("promptTranslation"), icon: "📝" },
];

export default function AITutor() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const getLanguageDisplayName = (languageItem) => language === "en"
    ? (languageItem?.name || languageItem?.name_fr)
    : languageItem?.name_fr;
  const QUICK_ACTIONS = getQuickActions(t);
  /** @type {{ role: string; content: string }[]} */
  const initialMessages = [];
  /** @type {any[]} */
  const initialAnyArray = [];

  const [messages, setMessages] = useState(initialMessages);
  const [conversations, setConversations] = useState(initialAnyArray);
  const [activeConversationId, setActiveConversationId] = useState("");
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [languages, setLanguages] = useState(initialAnyArray);
  const [lang, setLang] = useState("");
  const [vocab, setVocab] = useState(initialAnyArray);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const recognitionRef = /** @type {import("react").MutableRefObject<any>} */ (useRef(null));
  const scrollRef = /** @type {import("react").MutableRefObject<HTMLDivElement | null>} */ (useRef(null));
  const historySyncRef = useRef(Promise.resolve());
  const knownSnapshotsRef = useRef(new Map());
  const historyStorageKey = `maa-kweli-ai-tutor-history:${encodeURIComponent(String(user?.id || user?.email || "user").toLowerCase())}`;

  useEffect(() => {
    if (!historyOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setHistoryOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [historyOpen]);

  useEffect(() => {
    let cancelled = false;
    setHistoryLoaded(false);
    setMessages([]);
    setActiveConversationId("");
    setConversations([]);
    setNotice("");
    knownSnapshotsRef.current = new Map();

    const loadHistory = async () => {
      let localConversations = [];
      try {
        const stored = window.localStorage.getItem(historyStorageKey);
        const parsed = stored ? JSON.parse(stored) : [];
        if (!Array.isArray(parsed)) throw new Error("Format d’historique invalide.");
        localConversations = parsed.filter((conversation) => (
          conversation &&
          typeof conversation.id === "string" &&
          typeof conversation.title === "string" &&
          typeof conversation.language === "string" &&
          Array.isArray(conversation.messages) &&
          conversation.messages.every((message) => (
            message &&
            (message.role === "user" || message.role === "assistant") &&
            typeof message.content === "string"
          ))
        )).map((conversation) => ({
          ...conversation,
          updatedAt: Number.isFinite(conversation.updatedAt) ? conversation.updatedAt : 0,
        }));
      } catch (error) {
        setNotice(`${t("historyLoadError")} ${error instanceof Error ? error.message : t("unknownError")}`);
      }

      let remoteConversations;
      try {
        const response = await getAIConversations();
        if (!Array.isArray(response)) throw new Error(t("historyInvalidResponse"));
          remoteConversations = response.filter((conversation) => (
            conversation &&
            typeof conversation.id === "string" &&
            typeof conversation.title === "string" &&
            typeof conversation.language === "string" &&
            Array.isArray(conversation.messages) &&
            conversation.messages.every((message) => (
              message &&
              (message.role === "user" || message.role === "assistant") &&
              typeof message.content === "string"
            ))
          )).map((conversation) => ({
            id: conversation.id,
            title: conversation.title,
            language: conversation.language,
            messages: conversation.messages,
            updatedAt: Date.parse(conversation.updated_at) || 0,
          }));
        } catch (error) {
        if (cancelled) return;
        setConversations(localConversations);
        setNotice(`${t("historySyncError")} ${error instanceof Error ? error.message : t("unknownError")}`);
        setHistoryLoaded(true);
        return;
      }

      if (cancelled) return;
      const remoteById = new Map(remoteConversations.map((conversation) => [conversation.id, conversation]));
      const mergedById = new Map(remoteConversations.map((conversation) => [conversation.id, conversation]));
      const localToSync = [];
      localConversations.forEach((conversation) => {
        const remote = remoteById.get(conversation.id);
        if (!remote || conversation.updatedAt > remote.updatedAt) {
          mergedById.set(conversation.id, conversation);
          localToSync.push(conversation);
        }
      });
      const mergedConversations = [...mergedById.values()]
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 100);
      knownSnapshotsRef.current = new Map(mergedConversations.map((conversation) => [
        conversation.id,
        JSON.stringify({ language: conversation.language, messages: conversation.messages }),
      ]));
      setConversations(mergedConversations);
      setNotice(t("historySyncedAcrossDevices"));
      setHistoryLoaded(true);

      try {
        await Promise.all(localToSync.map((conversation) => saveAIConversation(conversation)));
      } catch (error) {
        if (!cancelled) setNotice(`${t("historySyncError")} ${error instanceof Error ? error.message : t("unknownError")}`);
      }
    };

    loadHistory();
    return () => { cancelled = true; };
  }, [historyStorageKey, t]);

  useEffect(() => {
    if (!historyLoaded) return;
    try {
      window.localStorage.setItem(historyStorageKey, JSON.stringify(conversations));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The conversation history could not be saved.");
    }
  }, [conversations, historyLoaded, historyStorageKey]);

  useEffect(() => {
    if (!historyLoaded || !activeConversationId || !messages.some((message) => message.role === "user")) return;
    const snapshot = JSON.stringify({ language: lang, messages });
    if (knownSnapshotsRef.current.get(activeConversationId) === snapshot) return;
    knownSnapshotsRef.current.set(activeConversationId, snapshot);
    const firstQuestion = messages.find((message) => message.role === "user")?.content || t("newConversation");
    const conversation = {
      id: activeConversationId,
      title: firstQuestion.length > 64 ? `${firstQuestion.slice(0, 61)}…` : firstQuestion,
      language: lang,
      messages,
      updatedAt: Date.now(),
    };
    setConversations((current) => [
      conversation,
      ...current.filter((item) => item.id !== activeConversationId),
    ].sort((a, b) => b.updatedAt - a.updatedAt));

    historySyncRef.current = historySyncRef.current
      .catch(() => {})
      .then(() => saveAIConversation(conversation))
      .catch((error) => {
        knownSnapshotsRef.current.delete(activeConversationId);
        setNotice(`${t("historySyncError")} ${error instanceof Error ? error.message : t("unknownError")}`);
      });
  }, [activeConversationId, historyLoaded, lang, messages, t]);

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
    return speakText(text, lang, { onEnd });
  };

  /**
   * @param {(transcript: string) => void} onResult
   */
  const startListening = (onResult, onEnd, onError) => {
    setVoiceError("");
    const rec = startVoiceRecognition(lang, {
      onResult: (transcript) => {
        onResult(transcript);
      },
      onError: (error) => {
        const detail = error instanceof Error ? error.message : t("unknownError");
        setVoiceError(`${t("voiceRecognitionError")} ${detail}`);
        setListening(false);
        onError?.();
      },
      onEnd: () => {
        setListening(false);
        onEnd?.();
      },
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
  /** @param {string} msg */
  const callLLM = async (msg) => {
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
  - Présente ces aides visuellement sous la forme « mot — IPA: /.../ ; prononciation simplifiée: ... »; elles sont pédagogiques et ne doivent pas remplacer ni être confondues avec le mot à prononcer.
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
12. Sois concis mais complet. Donne des exemples concrets et adapte le niveau de détail à la question.${dictContext}${phonologyContext}

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

  const startNewConversation = () => {
    setActiveConversationId("");
    setMessages([]);
    setInput("");
    setNotice("");
  };

  const beginConversationIfNeeded = () => {
    if (activeConversationId) return;
    const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setActiveConversationId(id);
  };

  const openConversation = (conversation) => {
    if (loading) return;
    setActiveConversationId(conversation.id);
    setMessages(conversation.messages);
    setLang(conversation.language);
    setInput("");
    setNotice("");
  };

  const deleteConversation = async (conversationId) => {
    if (!window.confirm(t("confirmDeleteConversation"))) return;
    try {
      await deleteAIConversation(conversationId);
    } catch (error) {
      setNotice(`${t("historySyncError")} ${error instanceof Error ? error.message : t("unknownError")}`);
      return;
    }
    setConversations((current) => current.filter((conversation) => conversation.id !== conversationId));
    if (activeConversationId === conversationId) {
      setActiveConversationId("");
      setMessages([]);
      setInput("");
    }
    setNotice("");
  };

  const copyResponse = async (content) => {
    try {
      await navigator.clipboard.writeText(content);
      setNotice(t("responseCopied"));
    } catch (error) {
      setNotice(`${t("copyResponseError")} ${error instanceof Error ? error.message : t("unknownError")}`);
    }
  };

  // === Text mode ===
  /** @param {string} [text] */
  const sendMessage = async (text) => {
    const msg = (text || input || "").trim();
    if (!msg || loading) return;

    const mod = moderateContent(msg);
    if (!mod.ok) {
      beginConversationIfNeeded();
      setMessages(prev => [...prev,
        { role: "user", content: msg },
        { role: "assistant", content: getModerationMessage(mod.reason) }
      ]);
      setInput("");
      return;
    }

    beginConversationIfNeeded();
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setInput("");
    setLoading(true);
    try {
      const res = await callLLM(msg);
      setMessages(prev => [...prev, { role: "assistant", content: res }]);
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

  const visibleConversations = conversations.filter((conversation) => {
    const query = historySearch.trim().toLocaleLowerCase();
    if (!query) return true;
    return conversation.title.toLocaleLowerCase().includes(query) ||
      conversation.messages.some((message) => message.content.toLocaleLowerCase().includes(query));
  });

  const renderHistoryPanel = (mobile = false) => (
    <>
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <History size={15} className="text-primary" /> {t("chatHistory")}
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              startNewConversation();
              if (mobile) setHistoryOpen(false);
            }}
            disabled={loading}
            title={t("newConversation")}
            aria-label={t("newConversation")}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary transition hover:bg-primary/15 disabled:opacity-40"
          >
            <Plus size={16} />
          </button>
          {mobile && (
            <button
              type="button"
              onClick={() => setHistoryOpen(false)}
              title={t("closeHistory")}
              aria-label={t("closeHistory")}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <label className="relative mt-3 block">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={historySearch}
          onChange={(event) => setHistorySearch(event.target.value)}
          placeholder={t("searchHistory")}
          aria-label={t("searchHistory")}
          className="w-full rounded-xl border border-border/70 bg-background/80 py-2 pl-9 pr-3 text-xs text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
        />
      </label>
      <p role={notice ? "status" : undefined} className={`mt-1.5 px-1 text-[10px] ${notice ? "leading-4 text-destructive" : "text-muted-foreground"}`}>
        {notice || t("historySyncedAcrossDevices")}
      </p>

      <div className="mt-3 flex-1 space-y-1 overflow-y-auto pr-1">
        {!historyLoaded ? (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">{t("historyLoading")}</p>
        ) : visibleConversations.length === 0 ? (
          <p className="px-2 py-5 text-center text-xs leading-5 text-muted-foreground">
            {historySearch ? t("historyNoResults") : t("historyEmpty")}
          </p>
        ) : visibleConversations.map((conversation) => {
          const lastMessage = [...conversation.messages].reverse().find((message) => message.role === "user");
          const languageItem = languages.find((item) => item.code === conversation.language);
          return (
            <div key={conversation.id} className={`group flex items-center gap-1 rounded-xl border px-2 py-2 transition ${
              activeConversationId === conversation.id
                ? "border-primary/20 bg-primary/[0.06]"
                : "border-transparent hover:border-border/70 hover:bg-background/80"
            }`}>
              <button
                type="button"
                onClick={() => {
                  openConversation(conversation);
                  if (mobile) setHistoryOpen(false);
                }}
                disabled={loading}
                className="min-w-0 flex-1 text-left disabled:cursor-not-allowed"
              >
                <span className="block truncate text-xs font-medium text-foreground">{conversation.title}</span>
                <span className="mt-1 flex items-center gap-1.5 truncate text-[10px] text-muted-foreground">
                  {languageItem && <span>{getLanguageDisplayName(languageItem)}</span>}
                  {languageItem && lastMessage && <span aria-hidden="true">·</span>}
                  {lastMessage && <span className="truncate">{lastMessage.content}</span>}
                </span>
                <span className="mt-1 block text-[10px] text-muted-foreground/80">
                  {Number.isFinite(conversation.updatedAt)
                    ? new Date(conversation.updatedAt).toLocaleDateString(language, { month: "short", day: "numeric" })
                    : ""}
                </span>
              </button>
              <button
                type="button"
                onClick={() => deleteConversation(conversation.id)}
                disabled={loading}
                title={t("deleteConversation")}
                aria-label={`${t("deleteConversation")}: ${conversation.title}`}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground opacity-70 transition hover:bg-destructive/10 hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 disabled:opacity-30"
              >
                <Trash2 size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </>
  );

  return (
    <div className="relative px-4 pb-6 pt-5 md:px-6">
      <div className="relative mx-auto max-w-5xl">
        <header className="mb-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="relative mt-1 shrink-0">
              <img src="/logo.png" alt="" aria-hidden="true" className="h-14 w-14 rounded-2xl object-cover shadow-lg shadow-primary/15 ring-1 ring-border/70" />
              <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-background bg-emerald-500" />
            </div>
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                <Sparkles size={12} /> {t("aiCoach")}
              </div>
              <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{t("assistantLabel")}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{t("assistantDescription")}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-2 sm:justify-end">
            <div className="min-w-[180px] flex-1 sm:flex-none">
              <label htmlFor="ai-tutor-language" className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <Languages size={12} /> {t("languageActive")}
              </label>
              <select
                id="ai-tutor-language"
                value={lang}
                onChange={(event) => setLang(event.target.value)}
                className="w-full rounded-xl border border-border/80 bg-card/80 px-3 py-2.5 text-sm font-medium text-foreground shadow-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
              >
                {languages.map((item) => (
                  <option key={item.code} value={item.code}>{getLanguageDisplayName(item)}</option>
                ))}
              </select>
            </div>
          </div>
        </header>

        <main className="grid gap-4 lg:grid-cols-[245px_minmax(0,1fr)]">
          <div className="mb-1 flex items-center justify-between lg:hidden">
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              aria-expanded={historyOpen}
              aria-controls="ai-tutor-history-drawer"
              className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-card/90 px-3 py-2 text-xs font-medium text-foreground shadow-sm transition hover:bg-card"
            >
              <History size={15} className="text-primary" />
              {t("chatHistory")}
              {conversations.length > 0 && (
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">{conversations.length}</span>
              )}
            </button>
            <button
              type="button"
              onClick={startNewConversation}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-card/90 px-3 py-2 text-xs font-medium text-foreground shadow-sm transition hover:bg-card disabled:opacity-40"
            >
              <Plus size={14} /> {t("newConversation")}
            </button>
          </div>

          <aside className="hidden max-h-[min(68vh,680px)] flex-col rounded-[24px] border border-border/70 bg-card/90 p-3.5 shadow-sm lg:sticky lg:top-20 lg:flex lg:self-start">
            {renderHistoryPanel()}
          </aside>

          {historyOpen && (
            <div className="fixed inset-0 z-[60] lg:hidden">
              <button
                type="button"
                tabIndex={-1}
                aria-label={t("closeHistory")}
                onClick={() => setHistoryOpen(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
              />
              <aside
                id="ai-tutor-history-drawer"
                role="dialog"
                aria-modal="true"
                aria-label={t("chatHistory")}
                className="absolute inset-y-0 left-0 flex w-[min(21rem,88vw)] flex-col border-r border-border/70 bg-background p-4 shadow-2xl animate-in slide-in-from-left duration-200"
              >
                {renderHistoryPanel(true)}
              </aside>
            </div>
          )}

          <section className="flex min-h-[min(68vh,680px)] flex-col overflow-hidden rounded-[28px] border border-border/70 bg-card/95 shadow-[0_24px_80px_rgba(65,45,24,0.10)] ring-1 ring-white/40 backdrop-blur-sm dark:shadow-[0_24px_80px_rgba(0,0,0,0.24)] dark:ring-white/5">
            <div className="flex items-center justify-between border-b border-border/60 bg-gradient-to-r from-primary/[0.045] via-transparent to-violet-500/[0.04] px-5 py-3.5 sm:px-7">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
                  <MessageSquareText size={15} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t("conversation")}</p>
                  {getPhonologyProfile(lang) && (
                    <p className="text-[11px] text-muted-foreground">{t("accent")} {getPhonologyProfile(lang).name}</p>
                  )}
                </div>
              </div>
              {messages.length > 0 && (
                <button type="button" onClick={startNewConversation} disabled={loading} title={t("newConversation")} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-40">
                  <RotateCcw size={13} /> {t("newConversation")}
                </button>
              )}
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-7 sm:py-8">
              <div className="mx-auto max-w-3xl space-y-5">
                {messages.length === 0 && (
                  <div className="flex min-h-[330px] items-center justify-center py-5">
                    <div className="w-full max-w-xl text-center">
                      <div className="relative mx-auto mb-5 grid h-[72px] w-[72px] place-items-center rounded-[24px] bg-gradient-to-br from-primary/15 via-amber-400/10 to-violet-500/15 ring-1 ring-primary/10">
                        <img src="/logo.png" alt="" aria-hidden="true" className="h-12 w-12 rounded-2xl object-cover shadow-md" />
                        <Sparkles size={16} className="absolute -right-2 -top-2 text-primary" />
                      </div>
                      <h2 className="font-heading text-2xl font-semibold text-foreground sm:text-3xl">{t("helloKoro")}</h2>
                      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{t("koroIntro")}</p>

                      <div className="mt-6 flex flex-wrap justify-center gap-2">
                        {QUICK_ACTIONS.slice(0, 3).map((action) => (
                          <button
                            key={action.label}
                            type="button"
                            onClick={() => sendMessage(action.prompt)}
                            className="group inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/80 px-3.5 py-2 text-xs font-medium text-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/[0.04] hover:shadow-md"
                          >
                            <span>{action.icon}</span>
                            <span>{action.label}</span>
                            <ArrowUpRight size={12} className="text-muted-foreground transition group-hover:text-primary" />
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
                    <div key={i} className={`flex items-end gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}>
                      {!isUser && <img src="/logo.png" alt="" aria-hidden="true" className="mb-1 h-8 w-8 shrink-0 rounded-xl object-cover ring-1 ring-border/70" />}
                      <div className={`min-w-0 max-w-[88%] break-words px-4 py-3.5 [overflow-wrap:anywhere] sm:max-w-[80%] ${
                        isUser
                          ? "rounded-[22px] rounded-br-md bg-gradient-to-br from-primary to-orange-500 text-primary-foreground shadow-md shadow-primary/15"
                          : "rounded-[22px] rounded-bl-md border border-border/70 bg-background/80 text-foreground shadow-sm"
                      }`}>
                        <p className="whitespace-pre-wrap break-words text-sm leading-7 [overflow-wrap:anywhere]">{display}</p>
                        {!isUser && (
                          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border/60 pt-2.5">
                            <button type="button" onClick={() => copyResponse(display)} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground transition hover:text-primary">
                              <Copy size={13} /> {t("copyResponse")}
                            </button>
                            <button type="button" onClick={() => speak(display)} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground transition hover:text-primary">
                              <Volume2 size={13} /> {t("audioListen")}
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
                  <div className="flex items-end gap-2.5">
                    <img src="/logo.png" alt="" aria-hidden="true" className="mb-1 h-8 w-8 rounded-xl object-cover ring-1 ring-border/70" />
                    <div className="rounded-[22px] rounded-bl-md border border-border/70 bg-background/80 px-4 py-3.5 shadow-sm">
                      <p className="mb-2 text-xs font-medium text-muted-foreground">{t("assistantLabel")} {t("thinking")}</p>
                      <div className="flex gap-1.5">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: "0ms" }} />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: "150ms" }} />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

            <div className="border-t border-border/60 bg-gradient-to-b from-transparent to-primary/[0.025] px-4 py-4 sm:px-7 sm:py-5">
                <div className="mx-auto max-w-3xl">
                  <div className={`flex items-center gap-2 rounded-2xl border bg-background/90 p-1.5 pl-2 shadow-[0_8px_30px_rgba(65,45,24,0.07)] transition focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/10 ${
                    listening ? "border-red-400/50" : "border-border/80"
                  }`}>
                    <button
                      type="button"
                      onClick={onMicClick}
                      aria-label={listening ? t("stop") : t("voiceInput")}
                      title={listening ? t("stop") : t("voiceInput")}
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition ${
                        listening ? "bg-red-500 text-white" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      }`}
                    >
                      {listening ? <Square size={16} /> : <Mic size={17} />}
                    </button>

                    <input
                      type="text"
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && sendMessage()}
                      placeholder={listening ? t("listening") : t("askLanguageQuestion")}
                      aria-label={t("askLanguageQuestion")}
                      className="min-w-0 flex-1 border-0 bg-transparent px-2 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />

                    <button
                      type="button"
                      onClick={() => sendMessage()}
                      disabled={loading || !input.trim()}
                      aria-label={t("sendMessage")}
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                  {voiceError && (
                    <p role="alert" className="mt-2 text-xs leading-5 text-destructive">
                      {voiceError}
                    </p>
                  )}
                </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}