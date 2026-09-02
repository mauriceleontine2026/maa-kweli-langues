import { getTTSLocale, getBestVoice, normalizeTtsLanguageCode, isProvisionalSyntheticLanguage } from "./languagePhonology";
import { getLanguageConfig } from "./voiceConfig";

let recognitionInstance = null;
let activeAudioElement = null;

const normalizeSpeechText = (text) => String(text ?? "")
  .replace(/\[AUDIO:(https?:\/\/[^\]]+)\]/g, "")
  .replace(/https?:\/\/\S+/g, "")
  .replace(/```[\s\S]*?```/g, "")
  .replace(/[*_#>`~]/g, "")
  .replace(/\s+/g, " ")
  .trim();

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
  if (isProvisionalSyntheticLanguage(languageCode)) {
    return "La prononciation est actuellement générée ou non disponible selon votre appareil. Une voix native validée sera ajoutée prochainement.";
  }

  return "La synthèse vocale navigateur n’est pas disponible sur cet appareil pour cette langue.";
};

const fallbackBrowserSpeech = (text, languageCode = "fr", options = {}) => {
  const languageConfig = getLanguageConfig(languageCode);
  const {
    onEnd,
    onError,
    rate = 0.88,
    volume = 1,
  } = options;

  if (isProvisionalSyntheticLanguage(languageCode)) {
    onError?.(new Error(getSyntheticStatusMessage(languageCode)));
    onEnd?.();
    return false;
  }

  if (languageConfig?.tts?.status === "unavailable") {
    onError?.(new Error("Audio bientôt disponible pour cette langue."));
    onEnd?.();
    return false;
  }

  const win = typeof window !== "undefined" ? window : globalThis;
  if (!win || !("speechSynthesis" in win) || typeof SpeechSynthesisUtterance !== "function") {
    onEnd?.();
    return false;
  }

  const cleanText = normalizeSpeechText(text);
  if (!cleanText) {
    onEnd?.();
    return false;
  }

  const preferredVoice = getBestVoice(languageCode || "fr");
  const voices = win.speechSynthesis.getVoices ? win.speechSynthesis.getVoices() : [];
  const hasVoiceList = Array.isArray(voices) && voices.length > 0;

  if (!preferredVoice && hasVoiceList) {
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
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  utterance.onend = () => onEnd?.();
  utterance.onerror = () => {
    onError?.(new Error("Speech synthesis failed"));
    onEnd?.();
  };

  win.speechSynthesis.speak(utterance);
  return true;
};

const requestBackendTtsAudio = async (text, languageCode = "fr") => {
  const cleanText = normalizeSpeechText(text);
  if (!cleanText || typeof fetch !== "function") {
    return null;
  }

  const normalizedLanguageCode = normalizeTtsLanguageCode(languageCode || "fr");
  const endpoints = [
    "/api/audio/synthesize-mms",
    "/api/audio/synthesize",
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: cleanText,
          language_code: normalizedLanguageCode,
        }),
        cache: "no-store",
      });

      if (!response.ok) {
        continue;
      }

      const payload = await response.json();
      const audioUrl = typeof payload?.audio_url === "string" ? payload.audio_url.trim() : "";
      if (audioUrl) {
        return audioUrl;
      }

      if (payload?.status === "unavailable") {
        return null;
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
  const cleanText = normalizeSpeechText(text);
  if (!cleanText) {
    options.onEnd?.();
    return false;
  }

  if (isProvisionalSyntheticLanguage(languageCode)) {
    options.onError?.(new Error(getSyntheticStatusMessage(languageCode)));
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

  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognitionCtor) {
    onError?.(new Error("Speech recognition is not supported"));
    return null;
  }

  if (recognitionInstance && typeof recognitionInstance.stop === "function") {
    recognitionInstance.stop();
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

  recognition.onerror = () => {
    onError?.(new Error("Speech recognition failed"));
    recognitionInstance = null;
  };

  recognition.onend = () => {
    recognitionInstance = null;
    onEnd?.();
  };

  recognitionInstance = recognition;
  recognition.start();
  return recognition;
};

export const stopVoiceRecognition = () => {
  if (recognitionInstance && typeof recognitionInstance.stop === "function") {
    recognitionInstance.stop();
  }
  recognitionInstance = null;
  return true;
};
