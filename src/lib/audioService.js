import { getTTSLocale, getBestVoice, normalizeTtsLanguageCode, isProvisionalSyntheticLanguage } from "./languagePhonology";
import { getLanguageConfig } from "./voiceConfig";
import { getSupportedAudioRecordingMimeType } from "./audioRecording";
import { getApiBaseUrl, request } from "@/api/backendClient";

let recognitionInstance = null;
let mediaRecognitionInstance = null;
let activeAudioElement = null;
const AUDIO_CACHE = new Map();
const VOICE_CAPTURE_MAX_DURATION_MS = 8000;

/** @param {string} aiText @returns {string} */
export const cleanTextForTTS = (aiText) => {
  if (!aiText) return "";

  return String(aiText)
    .replace(/\[AUDIO:(https?:\/\/[^\]]+)\]/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\bSources(?: Perplexity)?\s*:\s*[\s\S]*$/gi, " ")
    .replace(/\s*[\[(]\s*(?:prononcer|prononciation(?: simplifi[eé]e| simple)?|phon[eé]tique|phonetic|pronunciation|ph|IPA)\s*:[^\])]*[\])]/gi, " ")
    .replace(/\s*\(?(?:prononcer|phon[eé]tique|ph)\s*:[^)]+\)?/gi, " ")
    .replace(/\b(?:IPA|phon[eé]tique|prononciation simplifi[eé]e|prononciation simple|transcription phon[eé]tique)\s*:\s*[^.;\n]+/gi, " ")
    .replace(/\s*[\[(](?:[\p{L}\p{M}]+-){1,}[\p{L}\p{M}]+(?:-[\p{L}\p{M}]+)*[\])]/gu, " ")
    .replace(/\/[^/\n]+\//g, " ")
    .replace(/[*_#>`~]/g, "")
    .replace(/[🎵🎯💬🌍📝⚠️]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const ttsGenerationEnabled = () => {
  if (typeof window !== "undefined") {
    const browserWindow = /** @type {Window & { MBAARA_TTS_GENERATION?: string; __MBAARA_TTS_GENERATION?: string }} */ (window);
    const flag = browserWindow.MBAARA_TTS_GENERATION || browserWindow.__MBAARA_TTS_GENERATION || "";
    return String(flag).toLowerCase() === "true";
  }
  return false;
};

export const getAudioStatus = (languageCode, source = null) => {
  const config = getLanguageConfig(languageCode);
  const status = config?.tts?.status || "unavailable";

  if (source && typeof source === "object") {
    const resolved = resolveAudioSource(source, languageCode);
    if (resolved) {
      return {
        status: "available",
        label: "Audio disponible",
        sourceUrl: resolved,
      };
    }
  }

  if (status === "validated") {
    return { status: "validated", label: "Audio natif validé" };
  }
  if (status === "experimental") {
    return { status: "experimental", label: "Synthèse IA expérimentale — prononciation à valider" };
  }
  if (status === "fallback-only") {
    return { status: "fallback-only", label: "Prononciation provisoire" };
  }
  if (status === "browser-fallback") {
    return { status: "browser-fallback", label: "Voix système provisoire" };
  }

  return { status: "unavailable", label: "Cours disponible — audio non disponible" };
};

export const shouldAttemptBackendTts = (languageCode) => {
  const config = getLanguageConfig(languageCode);
  const status = config?.tts?.status || "unavailable";
  const provider = config?.tts?.backendIntegration;
  if (status === "fallback-only" && provider === "gtts") return true;
  if (!ttsGenerationEnabled()) return false;

  return Boolean(provider) && ["validated", "experimental", "cloud-supported"].includes(status);
};

export const getAudioCacheKey = (languageCode, text, sourceType = "tts") => {
  const normalizedText = cleanTextForTTS(text);
  return `${sourceType}:${String(languageCode || "fr").trim().toLowerCase()}:${normalizedText}`;
};

export const readAudioCache = (languageCode, text, sourceType = "tts") => {
  const key = getAudioCacheKey(languageCode, text, sourceType);
  return AUDIO_CACHE.get(key) || null;
};

export const writeAudioCache = (languageCode, text, audioUrl, sourceType = "tts") => {
  if (!audioUrl || !text) return false;
  const key = getAudioCacheKey(languageCode, text, sourceType);
  AUDIO_CACHE.set(key, audioUrl);
  return true;
};

export const stopAllAudio = () => {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }

  if (activeAudioElement && typeof activeAudioElement.pause === "function") {
    activeAudioElement.pause();
  }

  activeAudioElement = null;
};

const playAudioFromUrl = (audioUrl, onEnd, onError) => {
  if (!audioUrl || typeof Audio === "undefined") {
    return false;
  }

  stopAllAudio();
  const audio = new Audio(audioUrl);
  activeAudioElement = audio;

  audio.onended = () => {
    activeAudioElement = null;
    onEnd?.();
  };
  audio.onerror = () => {
    activeAudioElement = null;
    onError?.(new Error("Audio playback failed"));
    onEnd?.();
  };

  audio.play().catch(() => {
    activeAudioElement = null;
    onError?.(new Error("Audio playback failed"));
    onEnd?.();
  });

  return true;
};

const getSyntheticStatusMessage = (languageCode) => {
  const config = getLanguageConfig(languageCode);
  const status = config?.tts?.status || "unavailable";

  if (status === "experimental") {
    return "Synthèse IA expérimentale — prononciation à valider.";
  }
  if (status === "fallback-only") {
    return "Prononciation provisoire. Audio humain natif attendu.";
  }
  if (status === "browser-fallback") {
    return "Voix système provisoire pour cette langue.";
  }
  if (isProvisionalSyntheticLanguage(languageCode)) {
    return "Le cours est disponible, mais aucun audio validé n’est encore disponible pour cette langue.";
  }

  return "Le cours est disponible, mais l’audio n’est pas encore ajouté pour cette langue.";
};

const fallbackBrowserSpeech = (text, languageCode = "fr", options = {}) => {
  const languageConfig = getLanguageConfig(languageCode);
  const {
    onEnd,
    onError,
    rate = 0.88,
    volume = 1,
  } = options;

  const win = typeof window !== "undefined" ? window : globalThis;
  if (!win || !("speechSynthesis" in win) || typeof SpeechSynthesisUtterance !== "function") {
    onEnd?.();
    return false;
  }

  const cleanText = cleanTextForTTS(text);
  if (!cleanText) {
    onEnd?.();
    return false;
  }

  const status = languageConfig?.tts?.status || "unavailable";
  const hasGttsProvider = languageConfig?.tts?.backendIntegration === "gtts";
  const isUnsupportedLanguage = isProvisionalSyntheticLanguage(languageCode) || status === "unavailable" || (status === "fallback-only" && !hasGttsProvider);
  const preferredVoice = isUnsupportedLanguage ? null : getBestVoice(languageCode || "fr");
  const voices = win.speechSynthesis.getVoices ? win.speechSynthesis.getVoices() : [];
  const hasVoiceList = Array.isArray(voices) && voices.length > 0;

  if (!preferredVoice && hasVoiceList) {
    onError?.(new Error(getSyntheticStatusMessage(languageCode)));
    onEnd?.();
    return false;
  }

  if (!preferredVoice && !hasVoiceList) {
    onError?.(new Error(getSyntheticStatusMessage(languageCode)));
    onEnd?.();
    return false;
  }

  stopAllAudio();

  const utterance = new SpeechSynthesisUtterance(cleanText);
  const locale = getTTSLocale(languageCode || "fr");
  if (locale) {
    utterance.lang = locale;
  }
  utterance.rate = rate;
  utterance.volume = volume;
  utterance.voice = preferredVoice;

  utterance.onend = () => onEnd?.();
  utterance.onerror = () => {
    onError?.(new Error("Speech synthesis failed"));
    onEnd?.();
  };

  win.speechSynthesis.speak(utterance);
  return true;
};

const requestBackendTtsAudio = async (text, languageCode = "fr") => {
  const cleanText = cleanTextForTTS(text);
  if (!cleanText) {
    return null;
  }

  if (!shouldAttemptBackendTts(languageCode)) {
    return null;
  }

  const cachedUrl = readAudioCache(languageCode, cleanText, "tts");
  if (cachedUrl) {
    return cachedUrl;
  }

  const normalizedLanguageCode = normalizeTtsLanguageCode(languageCode || "fr");
  const config = getLanguageConfig(languageCode);
  const endpoints = config?.tts?.backendIntegration === "gtts"
    ? ["/api/audio/synthesize"]
    : ["/api/audio/synthesize-mms", "/api/audio/synthesize"];

  for (const endpoint of endpoints) {
    try {
      const payload = await request("POST", endpoint, {
        text: cleanText,
        language_code: normalizedLanguageCode,
      });
      const returnedAudioUrl = typeof payload?.audio_url === "string" ? payload.audio_url.trim() : "";
      const audioUrl = returnedAudioUrl
        ? new URL(returnedAudioUrl, `${getApiBaseUrl()}/`).toString()
        : "";
      if (audioUrl) {
        writeAudioCache(languageCode, cleanText, audioUrl, "tts");
        return audioUrl;
      }

      if (payload?.status === "unavailable") {
        continue;
      }
    } catch {
      continue;
    }
  }

  return null;
};

export const resolveAudioSource = (source, languageCode) => {
  if (!source || typeof source !== "object") {
    return null;
  }

  const candidates = [];
  const audioBlock = source.audio && typeof source.audio === "object" ? source.audio : {};

  if (source.native_audio && typeof source.native_audio === "object") {
    candidates.push(source.native_audio.url, source.native_audio.src, source.native_audio.srcUrl);
  }

  candidates.push(
    source.nativeUrl,
    source.native_url,
    source.nativeAudio,
    source.native_audio,
    source.localUrl,
    source.local_url,
    source.remoteUrl,
    source.remote_url,
    audioBlock.nativeUrl,
    audioBlock.localUrl,
    audioBlock.remoteUrl,
    source.audio_url,
    source.url,
    source.audio,
    source.file,
    source.mp3,
    source.src,
    source.href,
  );

  const resolved = candidates
    .map((candidate) => {
      if (candidate && typeof candidate === "object" && typeof candidate.url === "string") {
        return candidate.url.trim();
      }
      return typeof candidate === "string" ? candidate.trim() : "";
    })
    .find((candidate) => {
      if (!candidate) return false;
      return candidate.startsWith("/") || candidate.startsWith("http") || candidate.startsWith("data:") || candidate.startsWith("blob:");
    });

  return resolved || null;
};

export const speakText = (text, languageCode = "fr", options = {}) => {
  const cleanText = cleanTextForTTS(text);
  if (!cleanText) {
    options.onEnd?.();
    return false;
  }

  const config = getLanguageConfig(languageCode);
  const status = config?.tts?.status || "unavailable";
  const hasGttsProvider = config?.tts?.backendIntegration === "gtts";
  const isExplicitlyBlocked = status === "unavailable"
    || ((status === "fallback-only" || isProvisionalSyntheticLanguage(languageCode)) && !hasGttsProvider);

  if (isExplicitlyBlocked) {
    const message = getSyntheticStatusMessage(languageCode);
    options.onError?.(new Error(message));
    options.onEnd?.();
    return false;
  }

  const playBackendText = async () => {
    const backendAudioUrl = await requestBackendTtsAudio(cleanText, languageCode);
    if (backendAudioUrl) {
      const played = playAudioFromUrl(backendAudioUrl, options.onEnd, options.onError);
      if (played) {
        return;
      }
    }

    const browserSpeechSucceeded = fallbackBrowserSpeech(cleanText, languageCode, options);
    if (!browserSpeechSucceeded && options.onError) {
      options.onError(new Error(getSyntheticStatusMessage(languageCode)));
    }
  };

  playBackendText();
  return true;
};

export const playAudioSource = (source, languageCode = "fr", options = {}) => {
  const { fallbackText = "", onEnd, onError } = options;
  const resolvedUrl = resolveAudioSource(source, languageCode);

  if (resolvedUrl) {
    if (typeof Audio === "undefined") {
      return fallbackText ? speakText(fallbackText, languageCode, { onEnd, onError }) : false;
    }

    const audio = new Audio(resolvedUrl);
    activeAudioElement = audio;
    audio.play().then(() => onEnd?.()).catch(() => {
      activeAudioElement = null;
      if (fallbackText) {
        speakText(fallbackText, languageCode, { onEnd, onError });
      } else {
        onError?.(new Error("Audio source playback failed"));
      }
    });
    return true;
  }

  if (fallbackText) {
    return speakText(fallbackText, languageCode, { onEnd, onError });
  }

  onError?.(new Error("No playable audio source found"));
  return false;
};

const getRecordingExtension = (mimeType) => {
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "m4a";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("wav")) return "wav";
  return "webm";
};

const startMediaRecorderRecognition = (handlers = {}) => {
  const { onResult, onError, onEnd } = handlers;
  const mediaDevices = typeof navigator !== "undefined" ? navigator.mediaDevices : null;
  if (!mediaDevices?.getUserMedia || typeof window.MediaRecorder !== "function") {
    onError?.(new Error("Speech recognition and audio recording are not supported on this device."));
    return null;
  }

  if (mediaRecognitionInstance) stopVoiceRecognition({ transcribe: false });

  const session = {
    recorder: null,
    stream: null,
    chunks: [],
    timer: null,
    stopped: false,
    transcribe: true,
    stop: () => {},
  };
  mediaRecognitionInstance = session;

  const stopCapture = () => {
    if (session.stopped) return;
    session.stopped = true;
    if (session.timer) clearTimeout(session.timer);

    const finalizeRecording = async () => {
      session.stream?.getTracks().forEach((track) => track.stop());
      if (mediaRecognitionInstance === session) mediaRecognitionInstance = null;

      try {
        if (!session.transcribe) return;
        const mimeType = session.recorder?.mimeType || session.chunks.find((chunk) => chunk.type)?.type || "audio/webm";
        const blob = new Blob(session.chunks, { type: mimeType });
        if (blob.size < 12) {
          throw new Error("No speech was recorded. Please try again.");
        }
        const formData = new FormData();
        formData.append("file", blob, `voice-message.${getRecordingExtension(mimeType)}`);
        const response = await request("POST", "/api/audio/transcribe", formData);
        const transcript = typeof response?.text === "string" ? response.text.trim() : "";
        if (transcript) onResult?.(transcript);
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error("Audio transcription failed."));
      } finally {
        onEnd?.();
      }
    };

    if (session.recorder?.state === "recording") {
      session.recorder.addEventListener("stop", finalizeRecording, { once: true });
      session.recorder.stop();
    } else {
      finalizeRecording();
    }
  };
  session.stop = stopCapture;

  mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
  }).then((stream) => {
    session.stream = stream;
    if (session.stopped || mediaRecognitionInstance !== session) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    const mimeType = getSupportedAudioRecordingMimeType(window.MediaRecorder);
    const recorder = mimeType
      ? new window.MediaRecorder(stream, { mimeType })
      : new window.MediaRecorder(stream);
    session.recorder = recorder;
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data?.size > 0) session.chunks.push(event.data);
    });
    recorder.start(250);
    session.timer = setTimeout(stopCapture, VOICE_CAPTURE_MAX_DURATION_MS);
  }).catch((error) => {
    session.stopped = true;
    session.stream?.getTracks().forEach((track) => track.stop());
    if (mediaRecognitionInstance === session) mediaRecognitionInstance = null;
    onError?.(new Error(error instanceof Error ? error.message : "Microphone access failed."));
    onEnd?.();
  });

  return session;
};

export const startVoiceRecognition = (languageCode = "fr", handlers = {}) => {
  const {
    onResult,
    onError,
    onEnd,
  } = handlers;

  if (typeof window === "undefined") {
    onError?.(new Error("Window is not available"));
    return null;
  }

  const speechWindow = /** @type {Window & { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any }} */ (window);
  const SpeechRecognitionCtor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
  if (!SpeechRecognitionCtor) {
    return startMediaRecorderRecognition(handlers);
  }

  if (recognitionInstance && typeof recognitionInstance.stop === "function") {
    try {
      recognitionInstance.stop();
    } catch {
      recognitionInstance = null;
    }
  }

  const recognition = new SpeechRecognitionCtor();
  recognition.lang = getTTSLocale(languageCode || "fr") || "fr-FR";
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    const result = event?.results?.[0]?.[0]?.transcript;
    if (typeof result === "string" && result.trim()) {
      onResult?.(result.trim());
    }
  };

  recognition.onerror = (event) => {
    recognitionInstance = null;
    if (event?.error === "aborted") return;
    if (typeof navigator !== "undefined" &&
      navigator.mediaDevices?.getUserMedia && typeof window.MediaRecorder === "function") {
      startMediaRecorderRecognition(handlers);
      return;
    }
    onError?.(new Error("Speech recognition failed"));
    onEnd?.();
  };

  recognition.onend = () => {
    if (recognitionInstance !== recognition) return;
    recognitionInstance = null;
    onEnd?.();
  };

  recognitionInstance = recognition;
  try {
    recognition.start();
  } catch (error) {
    recognitionInstance = null;
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia && typeof window.MediaRecorder === "function") {
      return startMediaRecorderRecognition(handlers);
    }
    onError?.(error instanceof Error ? error : new Error("Speech recognition failed."));
    onEnd?.();
    return null;
  }
  return recognition;
};

export const stopVoiceRecognition = ({ transcribe = true } = {}) => {
  if (mediaRecognitionInstance) {
    const session = mediaRecognitionInstance;
    session.transcribe = transcribe;
    session.stop();
    return true;
  }
  if (recognitionInstance && typeof recognitionInstance.stop === "function") {
    const recognition = recognitionInstance;
    recognitionInstance = null;
    recognition.stop();
  }
  return true;
};
