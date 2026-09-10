"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Bot,
  ShoppingCart,
  Plug,
  Settings,
  ChevronRight,
  ChevronLeft,
  X,
} from "lucide-react";
import { useLanguage } from "./LanguageProvider";

interface DashboardOnboardingProps {
  onComplete: () => void;
}

const STEPS = [
  {
    icon: BarChart3,
    titleKey: "step1",
    title: "La tua Dashboard",
    desc: "Qui puoi vedere le statistiche dei tuoi agenti: run, token utilizzati e costi mensili.",
  },
  {
    icon: Bot,
    titleKey: "step2",
    title: "Agenti installati",
    desc: "In basso vedrai tutti gli agenti che hai attivato con le loro statistiche di utilizzo.",
  },
  {
    icon: ShoppingCart,
    titleKey: "step3",
    title: "Marketplace",
    desc: "Visita il Marketplace per scoprire e acquistare nuovi agenti AI per il tuo business.",
  },
  {
    icon: Plug,
    titleKey: "step4",
    title: "Integrazioni",
    desc: "Collega le tue app come Shopify, Gmail, Google Calendar e molto altro.",
  },
  {
    icon: Settings,
    titleKey: "step5",
    title: "Gestisci il tuo account",
    desc: "Gestisci abbonamenti, impostazioni e carrello dalla sidebar sinistra.",
  },
];

export default function DashboardOnboarding({ onComplete }: DashboardOnboardingProps) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);

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
        body: JSON.stringify({ type: "dashboard" }),
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
            {current.title}
          </h3>
          <p className="text-sm text-neutral-400 mb-6">
            {current.desc}
          </p>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrev}
              disabled={isFirst}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={14} />
              Indietro
            </button>
            <span className="text-xs text-neutral-500">
              {step + 1} / {STEPS.length}
            </span>
            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-5 py-2 text-sm font-bold text-white hover:bg-brand-400 transition-all"
            >
              {isLast ? "Inizia!" : "Avanti"}
              {!isLast && <ChevronRight size={14} />}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
