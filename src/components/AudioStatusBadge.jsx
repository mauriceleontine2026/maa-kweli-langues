/**
 * AudioStatusBadge.jsx
 * Composant discret pour afficher le statut audio des phrases
 * 
 * Affiche:
 * - 🟢 Audio natif
 * - 🟢 Synthèse IA validée
 * - 🟡 Synthèse IA expérimentale
 * - ⚪ Voix navigateur provisoire
 * - ⚫ Audio non disponible
 */

import React from "react";
import { getLanguageConfig } from "@/lib/voiceConfig";

const BADGE_STYLES = {
  validated: {
    bg: "bg-green-50 dark:bg-green-950",
    text: "text-green-700 dark:text-green-300",
    border: "border-green-200 dark:border-green-800",
    emoji: "🟢",
    label: "Audio validé",
    title: "Prononciation d'un locuteur natif.",
  },
  native: {
    bg: "bg-green-50 dark:bg-green-950",
    text: "text-green-700 dark:text-green-300",
    border: "border-green-200 dark:border-green-800",
    emoji: "🟢",
    label: "Audio natif",
    title: "Enregistrement humain.",
  },
  experimental: {
    bg: "bg-amber-50 dark:bg-amber-950",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
    emoji: "🟡",
    label: "Synthèse IA (MMS)",
    title: "Prononciation générée par Meta MMS via Coqui. À valider par des locuteurs natifs.",
  },
  fallback_only: {
    bg: "bg-slate-50 dark:bg-slate-900",
    text: "text-slate-600 dark:text-slate-400",
    border: "border-slate-200 dark:border-slate-700",
    emoji: "⚪",
    label: "Voix gTTS (provisoire)",
    title: "Prononciation provisoire générée par Google TTS. Audio humain natif en cours d'enregistrement.",
  },
  unavailable: {
    bg: "bg-gray-50 dark:bg-gray-950",
    text: "text-gray-600 dark:text-gray-400",
    border: "border-gray-200 dark:border-gray-700",
    emoji: "⚫",
    label: "Indisponible",
    title: "Aucune prononciation disponible.",
  },
  browser_fallback: {
    bg: "bg-blue-50 dark:bg-blue-950",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
    emoji: "💬",
    label: "Voix navigateur",
    title: "Prononciation générée par le navigateur.",
  },
};

/**
 * Badge simple inline (ex: dans une liste de vocabulaire)
 */
export function AudioStatusBadgeInline({ languageCode, size = "sm" }) {
  const config = getLanguageConfig(languageCode);
  if (!config) return null;

  const status = config.tts?.status || "unavailable";
  const style = BADGE_STYLES[status] || BADGE_STYLES.unavailable;

  const sizeClasses = {
    xs: "px-2 py-0.5 text-xs",
    sm: "px-2.5 py-1 text-sm",
    md: "px-3 py-1.5 text-base",
  }[size] || "px-2.5 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium border ${sizeClasses} ${style.bg} ${style.text} ${style.border}`}
      title={style.title}
    >
      <span>{style.emoji}</span>
      <span>{style.label}</span>
    </span>
  );
}

/**
 * Tooltip au survol d'un bouton audio
 */
export function AudioStatusTooltip({ languageCode, children }) {
  const config = getLanguageConfig(languageCode);
  if (!config) return children;

  const status = config.tts?.status || "unavailable";
  const style = BADGE_STYLES[status] || BADGE_STYLES.unavailable;
  const notice = config.uiNotice || style.title;

  return (
    <div className="group relative inline-block">
      {children}
      {/* Tooltip */}
      <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-sm text-white opacity-0 transition-opacity group-hover:opacity-100 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <span>{style.emoji}</span>
          <div>
            <div className="font-semibold">{style.label}</div>
            <div className="text-xs text-gray-300">{notice}</div>
          </div>
        </div>
        {/* Arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </div>
    </div>
  );
}

/**
 * Info box pour afficher dans une modal/page de détails
 */
export function AudioStatusInfoBox({ languageCode }) {
  const config = getLanguageConfig(languageCode);
  if (!config) return null;

  const status = config.tts?.status || "unavailable";
  const style = BADGE_STYLES[status] || BADGE_STYLES.unavailable;

  return (
    <div
      className={`rounded-lg border p-4 ${style.bg} ${style.text} ${style.border}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{style.emoji}</span>
        <div className="flex-1">
          <h4 className="font-semibold">{style.label}</h4>
          <p className="text-sm mt-1">{config.uiNotice || style.title}</p>

          {status === "experimental" && (
            <div className="mt-3 pt-3 border-t border-current border-opacity-20 text-xs">
              <p>
                🔧 Utilise le modèle Meta MMS via Coqui XTTS-v2. Les retours des locuteurs natifs sont les bienvenus pour améliorer la qualité.
              </p>
            </div>
          )}
          {status === "fallback_only" && (
            <div className="mt-3 pt-3 border-t border-current border-opacity-20 text-xs">
              <p>
                ⏱️ Prononciation provisoire via Google TTS. Nous enregistrons des audios natifs qui remplaceront cette version.
              </p>
            </div>
          )}

          {status === "unavailable" && (
            <div className="mt-3 pt-3 border-t border-current border-opacity-20 text-xs">
              <p>
                Un audio humain validé par des locuteurs natifs sera ajouté dans
                une version future.
              </p>
            </div>
          )}

          {status === "fallback_only" && (
            <div className="mt-3 pt-3 border-t border-current border-opacity-20 text-xs">
              <p>Nous recherchons un modèle TTS adapté pour cette langue.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Composant pour afficher dans une card de leçon
 * Petit badge discret dans le coin
 */
export function AudioStatusBadgeCorner({ languageCode }) {
  const config = getLanguageConfig(languageCode);
  if (!config || config.tts?.status === "validated") return null;

  const status = config.tts?.status || "unavailable";
  const style = BADGE_STYLES[status] || BADGE_STYLES.unavailable;

  return (
    <div
      className={`absolute top-2 right-2 flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium opacity-75 hover:opacity-100 transition-opacity ${style.bg} ${style.text} ${style.border} border`}
      title={style.title}
    >
      <span>{style.emoji}</span>
    </div>
  );
}

/**
 * Hook pour déterminer le statut audio et retourner infos
 */
export function useAudioStatus(languageCode) {
  const config = getLanguageConfig(languageCode);

  if (!config) {
    return {
      status: "unknown",
      label: "Statut inconnu",
      emoji: "❓",
      title: "Langue non configurée",
      isAvailable: false,
      isExperimental: false,
    };
  }

  const status = config.tts?.status || "unavailable";
  const style = BADGE_STYLES[status] || BADGE_STYLES.unavailable;

  return {
    status,
    label: style.label,
    emoji: style.emoji,
    title: style.title,
    notice: config.uiNotice,
    isAvailable: status !== "unavailable",
    isExperimental: status === "experimental",
    isValidated: status === "validated" || status === "native",
    provider: config.tts?.primaryProvider,
  };
}

export default AudioStatusBadgeInline;
