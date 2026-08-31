// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { invokeAI } from "@/api/aiService";
import { restoreBackendSession } from "@/api/authService";
import { createVocabulary, getLanguages } from "@/api/languageService";
import { useLanguage } from "@/contexts/LanguageContext";
import { Scan, ArrowLeft, Upload, Loader2, Plus, CheckCircle, Languages } from "lucide-react";
import { createWorker } from "tesseract.js";

/**
 * @typedef {{ word: string; translation: string }} OCRWord
 * @typedef {{ original_text: string; translated_text: string; source_language: string; words: OCRWord[] }} OCRResult
 */

export default function ScanOCR() {
  const { language } = useLanguage();
  const isEnglish = language === "en";
  const labels = isEnglish ? {
    title: "Scan & Translate",
    subtitle: "Import an image, verify the text, then review the useful words.",
    step1: "1. Import an image",
    step2: "2. Scan & translate",
    step3: "3. Add to review",
    targetLanguage: "Translation language",
    uploadTitle: "Take a photo or import an image",
    uploadSubtitle: "Board, menu, book... the AI extracts and translates the text.",
    scan: "Scan & Translate",
    change: "Change",
    loading: "Analyzing...",
    detect: "Detected language",
    original: "Original text",
    translation: "Translation in ",
    noWords: "No words extracted",
    addReview: "Add to my review queue",
    added: "Added to your review queue!",
    errorImage: "Select an image file.",
    errorLarge: "The image must be under 10 MB.",
    notReadable: "Unable to read the image for analysis.",
    notPrepared: "Unable to prepare the image for analysis.",
    scanError: "Error during analysis: ",
    changeLanguage: "Choose a language",
    confidenceBanner: "Confidence level: ",
    confidenceDisclaimer: "Check the original text before adding it to your review.",
    wordsExtracted: "Extracted words",
    unidentified: "Unidentified",
    previewAlt: "Preview"
  } : {
    title: "Scan & Traduit",
    subtitle: "Importez une image, vérifiez le texte, puis révisez les mots utiles.",
    step1: "1. Importer une image",
    step2: "2. Scanner et traduire",
    step3: "3. Ajouter à la révision",
    targetLanguage: "Langue de traduction",
    uploadTitle: "Photographier ou importer une image",
    uploadSubtitle: "Panneau, menu, livre... l'IA extrait et traduit le texte",
    scan: "Scanner & Traduire",
    change: "Changer",
    loading: "Analyse...",
    detect: "Langue détectée",
    original: "Texte original",
    translation: "Traduction en ",
    noWords: "Aucun mot extrait",
    addReview: "Ajouter à ma file de révision",
    added: "Ajouté à ta file de révision !",
    errorImage: "Sélectionnez un fichier image.",
    errorLarge: "L’image doit faire moins de 10 Mo.",
    notReadable: "Impossible de lire l’image pour l’analyse.",
    notPrepared: "Impossible de préparer l’image pour l’analyse.",
    scanError: "Erreur pendant l’analyse : ",
    changeLanguage: "Choisir une langue",
    confidenceBanner: "Niveau de confiance : ",
    confidenceDisclaimer: "Vérifiez le texte original avant de l’ajouter à votre révision.",
    wordsExtracted: "Mots extraits",
    unidentified: "Non identifiée",
    previewAlt: "Aperçu"
  };
  const [imageFile, setImageFile] = useState(/** @type {File | null} */ (null));
  const [imagePreview, setImagePreview] = useState(/** @type {string | null} */ (null));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(/** @type {OCRResult | null} */ (null));
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("français");
  const [languages, setLanguages] = useState([]);
  const fileInputRef = useRef(/** @type {HTMLInputElement | null} */ (null));

  useEffect(() => {
    getLanguages()
      .then((items) => {
        const availableLanguages = Array.isArray(items) ? items : [];
        setLanguages(availableLanguages);
        if (availableLanguages.length > 0 && !availableLanguages.some((language) => language.name_fr?.toLowerCase() === "français")) {
          setTargetLanguage(availableLanguages[0].name_fr || availableLanguages[0].name || "français");
        }
      })
      .catch(() => setLanguages([]));
  }, []);

  /** @param {Event} e */
  const handleFile = (e) => {
    const target = /** @type {HTMLInputElement} */ (e.target);
    const file = target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(labels.errorImage);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError(labels.errorLarge);
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setResult(null);
    setAdded(false);
    setError("");
  };

  const prepareImageForAI = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Impossible de préparer l’image pour l’analyse."));
        return;
      }
      const image = new Image();
      image.onload = () => {
        const maxDimension = 1600;
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL("image/jpeg", 0.82);
        if (compressed.length > 3_500_000) {
          reject(new Error("Cette image reste trop volumineuse après compression. Choisissez une image plus légère."));
          return;
        }
        resolve(compressed);
      };
      image.onerror = () => reject(new Error("Impossible de lire l’image pour l’analyse."));
      image.src = reader.result;
    };
    reader.onerror = () => reject(new Error("Impossible de préparer l’image pour l’analyse."));
    reader.readAsDataURL(file);
  });

  const scanAndTranslate = async () => {
    if (!imageFile) return;
    setLoading(true);
    setError("");
    setResult(null);
    let worker;
    try {
      worker = await createWorker("eng+fra");
      const { data } = await worker.recognize(imageFile);
      const extractedText = String(data?.text || "").trim();
      const selectedTarget = languages.find((language) => language.name_fr === targetLanguage);
      const targetLabel = selectedTarget ? `${selectedTarget.name_fr} (${selectedTarget.name})` : targetLanguage;
      const imageData = await prepareImageForAI(imageFile);
      const requestTranslation = () => invokeAI(
        `Tu es un traducteur professionnel et un chercheur linguistique. Perplexity doit effectuer la recherche web pour cette demande. L'image jointe est la source principale : examine chaque mot directement sur l'image avant toute traduction. Le texte OCR ci-dessous est une aide non fiable, limitée à quelques alphabets, et peut être faux ou incomplet ; ignore-le dès qu'il contredit l'image. Identifie précisément la langue source, retranscris uniquement le texte réellement lisible, puis produis une traduction fidèle et naturelle vers ${targetLabel}.

      Cette recherche est illimitée par le dictionnaire local : consulte le web, des dictionnaires spécialisés, des corpus, des sources institutionnelles et des références de locuteurs lorsque c'est pertinent. Recoupe plusieurs sources indépendantes avant de retenir une traduction, vérifie les variantes nationales et régionales, les expressions idiomatiques et le contexte culturel. N'invente absolument aucun mot, caractère, sens ou traduction. Si un passage n'est pas lisible ou vérifiable, ne le devine pas : conserve uniquement ce qui est certain, signale le doute dans notes et baisse confidence. Ne fais pas une traduction mot à mot si une formulation naturelle existe. Respecte les accents, les tons, les caractères et l'orthographe officielle de la langue cible. Si le texte contient plusieurs mots ou phrases, sépare-les dans la liste words. Retourne uniquement un JSON valide conforme au schéma.

TEXTE EXTRAIT DE L'IMAGE:
${extractedText || "[aucun texte OCR fiable : lis l'image directement]"}`,
        {
          type: "object",
          properties: {
            original_text: { type: "string", description: "Transcription vérifiée du texte réellement visible dans l'image" },
            translated_text: { type: "string", description: `Traduction fidèle en ${targetLabel}` },
            source_language: { type: "string", description: "Langue détectée" },
            confidence: { type: "string", enum: ["élevée", "moyenne", "faible"], description: "Niveau de confiance fondé sur la lisibilité et la vérification" },
            notes: { type: "string", description: "Doute de lecture ou de traduction, chaîne vide si aucun" },
            words: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  word: { type: "string" },
                  translation: { type: "string" }
                }
              }
            }
          },
          required: ["original_text", "translated_text", "source_language", "confidence", "notes", "words"],
          additionalProperties: false
        },
        0.05,
        "perplexity",
        imageData
      );
      let res;
      try {
        res = await requestTranslation();
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes("User not found")) throw error;
        const restoredUser = await restoreBackendSession();
        if (!restoredUser) throw error;
        res = await requestTranslation();
      }
      setResult(typeof res === "object" && res !== null ? res : { original_text: String(res ?? ""), translated_text: "", source_language: "", words: [] });
    } catch (err) {
      setError(labels.scanError + (err instanceof Error ? err.message : String(err)));
    } finally {
      await worker?.terminate();
      setLoading(false);
    }
  };

  const addToReview = async () => {
    if (!result) return;
    const r = /** @type {any} */ (result);
    const words = Array.isArray(r.words) ? /** @type {any[]} */ (r.words) : [];
    if (words.length === 0) return;
    setAdding(true);
    try {
      const items = words.map(/** @param {any} w */ (w) => ({
        language_code: (r.source_language && String(r.source_language).toLowerCase().split(" ")[0]) || "unknown",
        lesson_number: 1,
        word: w?.word,
        translation_fr: w?.translation,
        difficulty: "beginner",
      })).filter((w) => w.word && w.translation_fr);

      if (items.length > 0) {
        await Promise.all(items.map((item) => createVocabulary(item)));
      }
      setAdded(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError("Erreur : " + errorMessage);
    } finally {
      setAdding(false);
    }
  };

  const reset = () => {
    setImageFile(null);
    setImagePreview(null);
    setResult(null);
    setAdded(false);
    setError("");
    if (fileInputRef.current) {
      try { fileInputRef.current.value = ""; } catch (e) { /* ignore readonly in some env */ }
    }
  };

  // Provide a safe any-cast for template usage to avoid TS 'never' index errors
  const resultAny = /** @type {any} */ (result);

  return (
    <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-10">
      <Link to="/studio" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft size={16} /> Studio
      </Link>
      <header className="mb-6 rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
          <Scan className="text-green-500" size={24} />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">{labels.title}</h1>
          <p className="text-sm text-muted-foreground">{labels.subtitle}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3"><div className="rounded-xl bg-green-500/10 px-3 py-2"><b className="text-foreground">{labels.step1}</b></div><div className="rounded-xl bg-green-500/10 px-3 py-2"><b className="text-foreground">{labels.step2}</b></div><div className="rounded-xl bg-green-500/10 px-3 py-2"><b className="text-foreground">{labels.step3}</b></div></div>
      </header>

      <div className="mb-5 rounded-2xl border border-border bg-card p-4 shadow-sm"><label className="mb-2 block text-sm font-semibold text-foreground">{labels.targetLanguage}</label><select value={targetLanguage} onChange={(event) => setTargetLanguage(event.target.value)} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"><option value="français">Français</option>{languages.filter((language) => language.name_fr && language.name_fr.toLowerCase() !== "français").map((language) => <option key={language.code} value={language.name_fr}>{language.name_fr}{language.name && language.name !== language.name_fr ? ` (${language.name})` : ""}</option>)}</select></div>

      {/* Upload area */}
      {!imagePreview ? (
        <button type="button" onClick={() => fileInputRef.current?.click()}
          className="w-full rounded-2xl border-2 border-dashed border-border p-10 text-center transition hover:border-primary/40 hover:bg-primary/5 sm:p-14">
          <Upload className="mx-auto text-muted-foreground mb-3" size={40} />
          <p className="font-semibold text-foreground">{labels.uploadTitle}</p>
          <p className="text-sm text-muted-foreground mt-1">{labels.uploadSubtitle}</p>
        </button>
      ) : (
        <div className="mb-5 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <img src={imagePreview} alt={labels.previewAlt} className="w-full rounded-xl max-h-64 object-contain mb-3" />
          <div className="flex gap-2">
            <button type="button" onClick={reset} className="flex-1 rounded-xl bg-secondary py-2 text-sm font-medium text-secondary-foreground transition hover:bg-secondary/70">
              {labels.change}
            </button>
            <button type="button" onClick={scanAndTranslate} disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition disabled:opacity-60">
              {loading ? <><Loader2 size={16} className="animate-spin" /> {labels.loading}</> : <><Scan size={16} /> {labels.scan}</>}
            </button>
          </div>
        </div>
      )}
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />

      {error && <div role="alert" className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-center text-sm text-red-600">{error}</div>}

      {/* Results */}
      {result && (
        <div className="grid gap-4 lg:grid-cols-2">
          {resultAny?.confidence && resultAny.confidence !== "élevée" && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300 lg:col-span-2">
              {labels.confidenceBanner}{resultAny.confidence}. {labels.confidenceDisclaimer}
            </div>
          )}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Languages size={18} className="text-primary" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{labels.detect}</span>
                </div>
                <p className="text-foreground font-medium">{resultAny?.source_language || labels.unidentified}</p>
              </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{labels.original}</h3>
            <p className="text-foreground whitespace-pre-wrap">{resultAny?.original_text}</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{labels.translation}{targetLanguage}</h3>
            <p className="text-foreground whitespace-pre-wrap">{resultAny?.translated_text}</p>
          </div>

          {(resultAny?.words && resultAny.words.length > 0) && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{labels.wordsExtracted} ({resultAny?.words?.length || 0})</h3>
              <div className="space-y-2 mb-4">
                {resultAny.words.map((/** @type {any} */ w, /** @type {number} */ i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{w.word}</span>
                    <span className="text-muted-foreground">{w.translation}</span>
                  </div>
                ))}
              </div>
              {added ? (
                <div className="flex items-center justify-center gap-2 text-green-500 text-sm font-medium py-2">
                  <CheckCircle size={18} /> {labels.added}
                </div>
              ) : (
                <button onClick={addToReview} disabled={adding}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition disabled:opacity-60">
                  {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  {adding ? (isEnglish ? "Adding..." : "Ajout...") : labels.addReview}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

  // EOF