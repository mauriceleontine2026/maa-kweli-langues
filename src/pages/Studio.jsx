import { Link } from "react-router-dom";
import { Mic, Waves, Scan, Trophy, ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const MODULES = [
  {
    key: "studioVoiceTutor",
    title: "Tuteur Vocal Kôrô",
    desc: "Parlez à voix haute — transcription, corrections IA et réponse parlée.",
    icon: Mic,
    to: "/tuteur",
    gradient: "from-orange-500/20 to-red-500/10",
    iconColor: "text-orange-500",
  },
  {
    key: "studioAccent",
    title: "Atelier d'Accent",
    desc: "Comparez votre voix à un locuteur de référence — analyse spectrale en %.",
    icon: Waves,
    to: "/studio/accent",
    gradient: "from-blue-500/20 to-purple-500/10",
    iconColor: "text-blue-500",
  },
  {
    key: "studioScan",
    title: "Scan & Traduit",
    desc: "Photographiez un texte — OCR local gratuit, traduction et ajout à la file SRS.",
    icon: Scan,
    to: "/studio/scan",
    gradient: "from-green-500/20 to-teal-500/10",
    iconColor: "text-green-500",
  },
  {
    key: "studioLeagues",
    title: "Ligues en Direct",
    desc: "Classement hebdomadaire XP, synchronisé en temps réel entre joueurs.",
    icon: Trophy,
    to: "/studio/ligues",
    gradient: "from-yellow-500/20 to-orange-500/10",
    iconColor: "text-yellow-500",
  },
];

export default function Studio() {
  const { language, t } = useLanguage();

  const localizedModules = MODULES.map((module) => {
    const isEnglish = language === "en";
    return {
      ...module,
      title: isEnglish
        ? module.key === "studioVoiceTutor"
          ? "Kôrô Voice Tutor"
          : module.key === "studioAccent"
            ? "Accent Workshop"
            : module.key === "studioScan"
              ? "Scan & Translate"
              : "Live Leagues"
        : module.title,
      desc: isEnglish
        ? module.key === "studioVoiceTutor"
          ? "Speak aloud — transcription, AI corrections, and spoken responses."
          : module.key === "studioAccent"
            ? "Compare your voice to a reference speaker — spectral analysis in %."
            : module.key === "studioScan"
              ? "Photograph a text — free local OCR, translation, and add to the SRS queue."
              : "Weekly XP leaderboard, synced in real time between players."
        : module.desc,
      openLabel: isEnglish ? "Open" : "Ouvrir",
      headline: isEnglish ? "AI Studio & Data Science" : "Studio IA & Data Science",
      subtitle: isEnglish
        ? "Mǎa-kwɛ́lî advanced modules — voice, accent, vision, and competition."
        : "Les modules avancés de Mǎa-kwɛ́lî — voix, accent, vision et compétition.",
    };
  });

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto">
      <h1 className="font-heading text-3xl font-bold text-foreground mb-1">{localizedModules[0]?.headline}</h1>
      <p className="text-muted-foreground mb-8">{localizedModules[0]?.subtitle}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {localizedModules.map(({ title, desc, icon: Icon, to, gradient, iconColor, openLabel }) => (
          <Link key={to} to={to}
            className={`group bg-gradient-to-br ${gradient} via-card to-card border border-border rounded-2xl p-6 hover:border-primary/40 hover:shadow-xl transition-all`}>
            <div className={`mb-4 ${iconColor}`}>
              <Icon size={32} />
            </div>
            <h2 className="font-heading text-xl font-bold text-foreground mb-2">{title}</h2>
            <p className="text-sm text-muted-foreground mb-4">{desc}</p>
            <div className="flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
              {openLabel} <ArrowRight size={14} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}