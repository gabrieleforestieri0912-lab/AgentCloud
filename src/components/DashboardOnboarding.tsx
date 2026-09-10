"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { useLanguage } from "./LanguageProvider";

interface DashboardOnboardingProps {
  onComplete: () => void;
}

interface StepConfig {
  target: string;
  title: string;
  desc: string;
  position: "top" | "bottom" | "left" | "right";
}

export default function DashboardOnboarding({ onComplete }: DashboardOnboardingProps) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { locale } = useLanguage();

  const steps: StepConfig[] = [
    {
      target: "[data-onboard='dashboard-stats']",
      title: locale === "it" ? "Le tue statistiche" : "Your stats",
      desc: locale === "it"
        ? "Qui vedi le metriche principali: agenti installati, run totali e token utilizzati."
        : "Here you see key metrics: installed agents, total runs and tokens used.",
      position: "bottom",
    },
    {
      target: "[data-onboard='dashboard-nav']",
      title: locale === "it" ? "Navigazione rapida" : "Quick navigation",
      desc: locale === "it"
        ? "Usa la sidebar per accedere a Dashboard, Chat, Marketplace, Integrazioni e Account."
        : "Use the sidebar to access Dashboard, Chat, Marketplace, Integrations and Account.",
      position: "right",
    },
    {
      target: "[data-onboard='dashboard-agents']",
      title: locale === "it" ? "Agenti installati" : "Installed agents",
      desc: locale === "it"
        ? "Qui vedi tutti gli agenti che hai attivato con le loro statistiche di utilizzo."
        : "Here you see all activated agents with their usage stats.",
      position: "bottom",
    },
    {
      target: "[data-onboard='dashboard-account']",
      title: locale === "it" ? "Il tuo account" : "Your account",
      desc: locale === "it"
        ? "Gestisci abbonamenti, carrello e impostazioni del tuo profillo."
        : "Manage your subscriptions, cart and profile settings.",
      position: "right",
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const isFirst = step === 0;

  const updateTargetRect = useCallback(() => {
    const el = document.querySelector(current.target);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    }
  }, [current.target]);

  useEffect(() => {
    updateTargetRect();
    window.addEventListener("resize", updateTargetRect);
    return () => window.removeEventListener("resize", updateTargetRect);
  }, [updateTargetRect]);

  const getTooltipPosition = () => {
    if (!targetRect) return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };

    const padding = 12;
    const tooltipWidth = 320;
    const tooltipHeight = 180;

    switch (current.position) {
      case "right":
        return {
          top: `${Math.min(targetRect.top, window.innerHeight - tooltipHeight - 20)}px`,
          left: `${Math.min(targetRect.right + padding, window.innerWidth - tooltipWidth - 20)}px`,
        };
      case "left":
        return {
          top: `${Math.min(targetRect.top, window.innerHeight - tooltipHeight - 20)}px`,
          left: `${Math.max(targetRect.left - tooltipWidth - padding, 20)}px`,
        };
      case "top":
        return {
          top: `${Math.max(targetRect.top - tooltipHeight - padding, 20)}px`,
          left: `${Math.min(Math.max(targetRect.left, 20), window.innerWidth - tooltipWidth - 20)}px`,
        };
      case "bottom":
        return {
          top: `${targetRect.bottom + padding}px`,
          left: `${Math.min(Math.max(targetRect.left, 20), window.innerWidth - tooltipWidth - 20)}px`,
        };
      default:
        return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    }
  };

  const getArrowStyle = () => {
    if (!targetRect) return {};
    const tooltipPos = getTooltipPosition();
    const tooltipLeft = parseInt(tooltipPos.left as string) || 0;
    const tooltipTop = parseInt(tooltipPos.top as string) || 0;

    switch (current.position) {
      case "right":
        return {
          left: "-6px",
          top: `${targetRect.top + targetRect.height / 2 - tooltipTop - 6}px`,
          borderTop: "6px solid transparent",
          borderBottom: "6px solid transparent",
          borderRight: "6px solid rgb(23 23 23)",
        };
      case "left":
        return {
          right: "-6px",
          top: `${targetRect.top + targetRect.height / 2 - tooltipTop - 6}px`,
          borderTop: "6px solid transparent",
          borderBottom: "6px solid transparent",
          borderLeft: "6px solid rgb(23 23 23)",
        };
      case "top":
        return {
          bottom: "-6px",
          left: `${targetRect.left + targetRect.width / 2 - tooltipLeft - 6}px`,
          borderLeft: "6px solid transparent",
          borderRight: "6px solid transparent",
          borderTop: "6px solid rgb(23 23 23)",
        };
      case "bottom":
        return {
          top: "-6px",
          left: `${targetRect.left + targetRect.width / 2 - tooltipLeft - 6}px`,
          borderLeft: "6px solid transparent",
          borderRight: "6px solid transparent",
          borderBottom: "6px solid rgb(23 23 23)",
        };
      default:
        return {};
    }
  };

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

  if (!visible || !targetRect) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50"
      >
        {/* Highlight overlay */}
        <div className="absolute inset-0 bg-black/40" onClick={handleClose} />

        {/* Highlight target */}
        <div
          className="absolute rounded-lg ring-2 ring-brand-500/50 ring-offset-2 ring-offset-transparent"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
          }}
        />

        {/* Tooltip */}
        <motion.div
          key={step}
          ref={tooltipRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="absolute z-10 w-80 rounded-2xl border border-white/[0.08] bg-neutral-900 p-5 shadow-2xl"
          style={getTooltipPosition()}
        >
          {/* Arrow */}
          <div className="absolute w-3 h-3" style={getArrowStyle()} />

          {/* Content */}
          <h3 className="text-sm font-bold text-white mb-1.5">{current.title}</h3>
          <p className="text-xs text-neutral-400 mb-4 leading-relaxed">{current.desc}</p>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrev}
              disabled={isFirst}
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={12} />
              {locale === "it" ? "Indietro" : "Back"}
            </button>
            <span className="text-[10px] text-neutral-500">
              {step + 1} / {steps.length}
            </span>
            <button
              onClick={handleNext}
              className="flex items-center gap-1 rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-400 transition-all"
            >
              {isLast
                ? locale === "it" ? "Inizia!" : "Start!"
                : locale === "it" ? "Avanti" : "Next"}
              {!isLast && <ChevronRight size={12} />}
            </button>
          </div>

          {/* Skip */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full text-neutral-500 hover:text-white transition-all"
          >
            <X size={12} />
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
