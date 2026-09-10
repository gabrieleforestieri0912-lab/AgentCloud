"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Store,
  Plug,
  Send,
  Paperclip,
  ChevronRight,
  ChevronLeft,
  X,
} from "lucide-react";
import { useLanguage } from "./LanguageProvider";

interface ChatOnboardingProps {
  onComplete: () => void;
}

const STEPS = [
  {
    icon: MessageSquare,
    titleKey: "onboarding.chat.step1Title" as const,
    descKey: "onboarding.chat.step1Desc" as const,
    target: "sidebar-nav",
    position: "right" as const,
  },
  {
    icon: Store,
    titleKey: "onboarding.chat.step2Title" as const,
    descKey: "onboarding.chat.step2Desc" as const,
    target: "sidebar-tools",
    position: "right" as const,
  },
  {
    icon: Plug,
    titleKey: "onboarding.chat.step3Title" as const,
    descKey: "onboarding.chat.step3Desc" as const,
    target: "sidebar-agents",
    position: "right" as const,
  },
  {
    icon: Send,
    titleKey: "onboarding.chat.step4Title" as const,
    descKey: "onboarding.chat.step4Desc" as const,
    target: "chat-input",
    position: "top" as const,
  },
  {
    icon: Paperclip,
    titleKey: "onboarding.chat.step5Title" as const,
    descKey: "onboarding.chat.step5Desc" as const,
    target: "chat-input",
    position: "top" as const,
  },
];

export default function ChatOnboarding({ onComplete }: ChatOnboardingProps) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);
  const { locale } = useLanguage();

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  const handleNext = () => {
    if (isLast) {
      handleClose();
    } else {
      setStep((s) => s + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) setStep((s) => s - 1);
  };

  const handleClose = async () => {
    setVisible(false);
    try {
      await fetch("/api/user/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "chat" }),
      });
    } catch {}
    onComplete();
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

        {/* Onboarding card */}
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.3 }}
          className="relative z-10 mx-4 w-full max-w-md rounded-2xl border border-white/[0.08] bg-neutral-900/95 backdrop-blur-xl p-6 shadow-2xl"
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white transition-all"
          >
            <X size={14} />
          </button>

          {/* Step indicator */}
          <div className="flex items-center gap-1.5 mb-4">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  i === step
                    ? "bg-brand-500"
                    : i < step
                    ? "bg-brand-500/40"
                    : "bg-white/10"
                }`}
              />
            ))}
          </div>

          {/* Icon */}
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 text-brand-400 mb-4">
            <Icon size={24} />
          </div>

          {/* Content */}
          <h3 className="text-lg font-bold text-white mb-2">
            {step === 0
              ? "Benvenuto nella Chat AI!"
              : step === 1
              ? "Strumenti & Integrazioni"
              : step === 2
              ? "I tuoi Agenti"
              : step === 3
              ? "Invia messaggi"
              : "Allega file"}
          </h3>
          <p className="text-sm text-neutral-400 mb-6">
            {step === 0
              ? "Questa è la tua chat AI personale. Usa la sidebar per navigare tra chat, strumenti e agenti."
              : step === 1
              ? "Clicca su Strumenti nella sidebar per vedere le integrazioni disponibili e connettere le tue app."
              : step === 2
              ? "Clicca su Agenti nella sidebar per sfogliare il catalogo e scegliere l'agente perfetto per te."
              : step === 3
              ? "Scrivi qui sotto per parlare con l'assistente AI. Puoi fare domande, chiedere aiuto o dare istruzioni."
              : "Puoi allegare file, immagini e documenti trascinandoli nell'area della chat o cliccando l'icona."}
          </p>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrev}
              disabled={isFirst}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={14} />
              {locale === "it" ? "Indietro" : "Back"}
            </button>
            <span className="text-xs text-neutral-500">
              {step + 1} / {STEPS.length}
            </span>
            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-5 py-2 text-sm font-bold text-white hover:bg-brand-400 transition-all"
            >
              {isLast
                ? locale === "it"
                  ? "Inizia!"
                  : "Start!"
                : locale === "it"
                ? "Avanti"
                : "Next"}
              {!isLast && <ChevronRight size={14} />}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
