import { useEffect, useState } from "react";
import { getLanguages, getAllVocabulary, createVocabulary } from "@/api/languageService";
import { useLanguage } from "@/contexts/LanguageContext";
import { Calendar, Layers, RotateCcw, Plus, CheckCircle2, WifiOff, Target, ArrowRight } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { getOfflineLanguages, getAllOfflineVocab } from "@/lib/offlineStorage";
import LanguageFlag from "@/components/ui/LanguageFlag";
import { getLanguageName, getLocalizedCountryForLanguage, getFlagForLanguage } from "@/lib/localLanguageData";
import { getReviewState, recordReviewAnswer } from "@/lib/adaptiveLearning";

/** @type {any[]} */
const initialList = [];
/** @type {{ word: string; translation_fr: string; language_code: string }} */
const initialNewWord = { word: "", translation_fr: "", language_code: "" };

export default function Review() {
  const { t, language: interfaceLanguage } = useLanguage();
  const [languages, setLanguages] = useState(initialList);
  const [items, setItems] = useState(initialList);
  const [filter, setFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [newWord, setNewWord] = useState(initialNewWord);
  const [reviewItem, setReviewItem] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const online = useOnlineStatus();

  useEffect(() => {
    if (online) {
      getLanguages()
        .then((data) => setLanguages(Array.isArray(data) ? data : []))
        .catch(() => setLanguages([]));
      getAllVocabulary()
        .then((data) => setItems(Array.isArray(data) ? data : []))
        .catch(() => setItems([]));
    } else {
      const offlineLanguages = getOfflineLanguages();
      const offlineItems = getAllOfflineVocab();
      setLanguages(Array.isArray(offlineLanguages) ? offlineLanguages : []);
      setItems(Array.isArray(offlineItems) ? offlineItems : []);
    }
  }, [online]);

  /** @type {any[]} */
  const filtered = filter === "all" ? items : items.filter(i => i.language_code === filter);
  const reviewStates = filtered.map((item) => getReviewState(item.language_code, item.id));
  const toReview = reviewStates.filter((state) => !state.nextReviewAt || Number(state.nextReviewAt) <= Date.now()).length;
  const totalReviews = reviewStates.reduce((total, state) => total + Number(state.attempts || 0), 0);
  const mastered = reviewStates.filter((state) => Number(state.streak || 0) >= 3).length;
  const reviewQueue = filtered.slice().sort((a, b) => {
    const aState = getReviewState(a.language_code, a.id);
    const bState = getReviewState(b.language_code, b.id);
    return Number(aState.nextReviewAt || 0) - Number(bState.nextReviewAt || 0);
  });

  const finishReview = (remembered) => {
    if (!reviewItem) return;
    recordReviewAnswer(reviewItem.language_code, reviewItem.id, remembered);
    setReviewItem(null);
    setShowAnswer(false);
  };

  const handleAdd = /** @type {(e: import("react").FormEvent<HTMLFormElement>) => Promise<void>} */ (async (e) => {
    e.preventDefault();
    if (!newWord.word || !newWord.translation_fr || !newWord.language_code) return;
    await createVocabulary({ ...newWord, lesson_number: 1, difficulty: "beginner" });
    setNewWord(initialNewWord);
    setShowAdd(false);
    getAllVocabulary()
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]));
  });

  return (
    <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-10">
      <header className="mb-6 rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">{t("activeMemorization")}</div><h1 className="font-heading text-3xl font-bold text-foreground">{t("reviewIntelligently")}</h1><p className="mt-1 text-sm text-muted-foreground">{t("spacedReviewDescription")}</p></div><div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-2 text-xs font-semibold text-primary"><Target size={14} /> SM-2 active</div></div>
      </header>
      {!online && (
        <div className="flex items-center gap-2 text-sm text-yellow-500 bg-yellow-500/10 rounded-xl px-4 py-2.5 mb-6">
          <WifiOff size={16} /> {t("offlineReview")}
        </div>
      )}

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <Calendar className="mx-auto mb-2 text-primary" size={24} />
          <div className="text-2xl font-bold text-foreground">{toReview}</div>
          <div className="text-xs text-muted-foreground">{t("toReview")}</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <Layers className="mx-auto mb-2 text-blue-500" size={24} />
          <div className="text-2xl font-bold text-foreground">{items.length}</div>
          <div className="text-xs text-muted-foreground">{t("allLanguages")}</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <RotateCcw className="mx-auto mb-2 text-green-500" size={24} />
          <div className="text-2xl font-bold text-foreground">{totalReviews}</div>
          <div className="text-xs text-muted-foreground">{t("totalReviews")}</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <CheckCircle2 className="mx-auto mb-2 text-emerald-500" size={24} />
          <div className="text-2xl font-bold text-foreground">{mastered}</div>
          <div className="text-xs text-muted-foreground">{t("masteredCards")}</div>
        </div>
      </div>

      {/* Language filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${filter === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/70"}`}>
          {t("allLanguages")}
        </button>
        {languages.map(l => (
          <button key={l.code} onClick={() => setFilter(l.code)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${filter === l.code ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/70"}`}>
            {getFlagForLanguage(l)} {getLanguageName(l, interfaceLanguage)} · {getLocalizedCountryForLanguage(l, interfaceLanguage)}
          </button>
        ))}
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <CheckCircle2 className="mx-auto mb-3 text-green-500" size={48} />
          <p className="font-semibold text-foreground mb-1">{t("allCaughtUp")}</p>
          <p className="text-sm text-muted-foreground mb-4">{t("addFirstWords")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-end justify-between"><div><h2 className="font-heading text-xl font-bold text-foreground">{t("cardsToPractice")}</h2><p className="text-sm text-muted-foreground">{toReview} {t("cardsReadyToday")}</p></div><span className="text-xs text-muted-foreground">{Math.min(10, reviewQueue.length)} {t("cardCount")}</span></div>
          <div className="grid gap-3 md:grid-cols-2">{reviewQueue.slice(0, 10).map(item => {
            const lang = languages.find(l => l.code === item.language_code);
            return (
              <div key={item.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 transition hover:border-primary/40 hover:shadow-sm">
                <LanguageFlag language={lang} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-foreground">{item.word}</div>
                  <div className="truncate text-xs text-muted-foreground">{item.translation_fr}</div>
                </div>
                <button onClick={() => { setReviewItem(item); setShowAnswer(false); }} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90">
                  {t("revisionMode")} <ArrowRight size={13} />
                </button>
              </div>
            );
          })}</div>
        </div>
      )}

      {reviewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 text-center shadow-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{t("reviewActive")}</p>
            <h2 className="mt-4 text-3xl font-heading font-bold text-foreground">{reviewItem.word}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("recallTranslation")}</p>
            {showAnswer ? <p className="mt-6 rounded-2xl bg-primary/10 p-4 text-lg font-semibold text-foreground">{reviewItem.translation_fr}</p> : <button type="button" onClick={() => setShowAnswer(true)} className="mt-6 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground">{t("revealAnswer")}</button>}
            {showAnswer && <div className="mt-5 grid grid-cols-2 gap-3"><button type="button" onClick={() => finishReview(false)} className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-600">{t("toReview")}</button><button type="button" onClick={() => finishReview(true)} className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white">{t("iKnowIt")}</button></div>}
            <button type="button" onClick={() => { setReviewItem(null); setShowAnswer(false); }} className="mt-4 text-sm text-muted-foreground hover:text-foreground">{t("close")}</button>
          </div>
        </div>
      )}

      {/* Add word */}
      <button onClick={() => setShowAdd(!showAdd)}
        className="mt-6 w-full flex items-center justify-center gap-2 bg-secondary text-secondary-foreground font-medium py-3 rounded-xl hover:bg-secondary/70 transition">
        <Plus size={18} /> {t("addWordToReview")}
      </button>

      {showAdd && (
        <form onSubmit={handleAdd} className="mt-4 bg-card border border-border rounded-2xl p-5 space-y-3">
          <select value={newWord.language_code} onChange={/** @param {import("react").ChangeEvent<HTMLSelectElement>} e */ (e) => setNewWord({ ...newWord, language_code: e.target.value })}
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
            <option value="">{t("languageFilter")}...</option>
            {languages.map(l => <option key={l.code} value={l.code}>{getLanguageName(l, interfaceLanguage)}</option>)}
          </select>
          <input value={newWord.word} onChange={/** @param {import("react").ChangeEvent<HTMLInputElement>} e */ (e) => setNewWord({ ...newWord, word: e.target.value })}
            placeholder={t("word")} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          <input value={newWord.translation_fr} onChange={/** @param {import("react").ChangeEvent<HTMLInputElement>} e */ (e) => setNewWord({ ...newWord, translation_fr: e.target.value })}
            placeholder={t("translationFrench")} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          <button type="submit" className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:opacity-90 transition">
            {t("addWordToReview")}
          </button>
        </form>
      )}
    </div>
  );
}