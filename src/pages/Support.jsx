import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Headphones, MessageCircle, BookOpenText, ArrowRight, Mail, Settings2, Search, ChevronDown, Wifi } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useLanguage } from "@/contexts/LanguageContext";

const SUPPORT_EMAIL = "maurice.leontine2026@gmail.com";

export default function Support() {
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);
  const [faqQuery, setFaqQuery] = useState("");
  const [openFaq, setOpenFaq] = useState(0);
  const [copyState, setCopyState] = useState("idle");
  const online = useOnlineStatus();
  const { language, t } = useLanguage();

  const supportItems = [
    {
      title: t("supportHelpCenterTitle"),
      description: t("supportHelpCenterDescription"),
      icon: BookOpenText,
      actionLabel: t("supportHelpCenterAction"),
      details: t("supportHelpCenterDetails"),
    },
    {
      title: t("supportTitle"),
      description: t("supportDescription"),
      icon: Headphones,
      actionLabel: t("supportAction"),
      details: t("supportDetails"),
    },
    {
      title: t("supportFeedbackTitle"),
      description: t("supportFeedbackDescription"),
      icon: MessageCircle,
      actionLabel: t("supportFeedbackAction"),
      details: t("supportFeedbackDetails"),
    },
  ];

  const FAQS = [
    { question: t("supportFaq1Question"), answer: t("supportFaq1Answer") },
    { question: t("supportFaq2Question"), answer: t("supportFaq2Answer") },
    { question: t("supportFaq3Question"), answer: t("supportFaq3Answer") },
    { question: t("supportFaq4Question"), answer: t("supportFaq4Answer") },
    { question: t("supportFaq5Question"), answer: t("supportFaq5Answer") },
  ];

  const activeItem = supportItems[activeIndex];
  const filteredFaqs = useMemo(() => FAQS.filter((faq) => `${faq.question} ${faq.answer}`.toLowerCase().includes(faqQuery.trim().toLowerCase())), [faqQuery, FAQS]);

  const getMailParams = () => {
    const subject = activeIndex === 1 ? t("supportEmailSubject") : t("supportFeedbackSubject");
    const body = language === "en" ? "Hello,\n\nI would like to contact you about:\n- \n\nAdditional information:\n" : "Bonjour,\n\nJe souhaite vous contacter concernant :\n- \n\nInformations supplémentaires :\n";

    return {
      subject,
      body,
      mailto: `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
      gmail: `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(SUPPORT_EMAIL)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    };
  };

  const handlePrimaryAction = () => {
    if (activeIndex === 0) {
      setOpenFaq(0);
      document.getElementById("support-faq")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    const { gmail, mailto } = getMailParams();
    const gmailWindow = window.open(gmail, "_blank", "noopener,noreferrer");

    if (gmailWindow) {
      return;
    }

    window.location.href = mailto;
  };

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch (error) {
      setCopyState("failed");
      window.setTimeout(() => setCopyState("idle"), 1800);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-10">
      <header className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-2xl bg-primary/15 p-2 text-primary">
            <Headphones size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{t("supportHelpCenterTitle")} & {t("supportTitle")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("supportHelpCenterDescription")}</p>
          </div>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${online ? "bg-emerald-500/10 text-emerald-600" : "bg-yellow-500/10 text-yellow-600"}`}><Wifi size={13} /> {online ? t("supportOnline") : t("supportOffline")}</div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {supportItems.map(({ title, description, icon: Icon }, index) => (
            <button
              key={title}
              type="button"
              onClick={() => { setActiveIndex(index); if (index === 0) setOpenFaq(0); }}
              className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/50 ${activeIndex === index ? "border-primary/50 bg-primary/5 ring-2 ring-primary/10" : "border-border bg-secondary/40"}`}
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-background text-primary">
                <Icon size={18} />
              </div>
              <div className="text-sm font-semibold text-foreground">{title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </button>
          ))}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,.75fr)]">
      <section id="support-faq" className="scroll-mt-6 rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="mb-4"><h2 className="text-xl font-bold text-foreground">{t("supportFaqTitle")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("supportFaqDescription")}</p></div>
        <label className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-muted-foreground focus-within:border-primary"><Search size={17} className="text-primary" /><input value={faqQuery} onChange={(event) => setFaqQuery(event.target.value)} placeholder={t("supportSearchPlaceholder")} aria-label="Search support questions" className="min-w-0 flex-1 bg-transparent text-foreground outline-none" /></label>
        <div className="space-y-2">{filteredFaqs.map((faq, index) => <div key={faq.question} className="rounded-xl border border-border bg-secondary/30"><button type="button" onClick={() => setOpenFaq(openFaq === index ? -1 : index)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-foreground"><span>{faq.question}</span><ChevronDown size={16} className={`shrink-0 transition ${openFaq === index ? "rotate-180 text-primary" : "text-muted-foreground"}`} /></button>{openFaq === index && <p className="border-t border-border px-4 py-3 text-sm leading-6 text-muted-foreground">{faq.answer}</p>}</div>)}{filteredFaqs.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{t("supportNoResults")}</p>}</div>
      </section>

      <section className="h-fit rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
          <Headphones size={16} />
          {t("supportAssistant")}
        </div>
        <h2 className="text-lg font-bold text-foreground">{activeItem.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{activeItem.details}</p>

        <div className="mt-5 grid gap-2">
          <button
            type="button"
            onClick={handlePrimaryAction}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <Mail size={16} />
            {activeItem.actionLabel}
          </button>

          <button
            type="button"
            onClick={handleCopyEmail}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-foreground"
          >
            <Mail size={16} />
            {copyState === "copied" ? t("supportCopyDone") : copyState === "failed" ? t("supportCopyFailed") : t("supportContactEmail")}
          </button>

          <button
            onClick={() => navigate("/settings")}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-foreground"
          >
            <Settings2 size={16} />
            {t("supportOpenSettings")}
          </button>
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-foreground"
          >
            <ArrowRight size={16} />
            {t("supportBackHome")}
          </button>
        </div>
      </section>
      </div>
    </div>
  );
}
