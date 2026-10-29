"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { useLanguage } from "./LanguageProvider";
import { markOnboardingSeen } from "@/lib/onboarding";

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
  // Rect del target oppure null quando il target manca / non è visibile
  // (sezione sotto il fold, sidebar chiusa su mobile): in quel caso il tooltip
  // diventa una card centrata invece di sparire — l'onboarding non si blocca
  // mai e l'ultimo passo arriva sempre.
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { dict } = useLanguage();
  // Su schermo < lg la sidebar è un drawer chiuso: nav e account non sono
  // agganciabili. Il tour mobile segue il menu fluttuante e le sezioni della
  // pagina davvero visibili.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const steps: StepConfig[] = isMobile
    ? [
        {
          target: "[data-onboard='dashboard-mobile-menu']",
          title: dict.dashboardOnboarding.mobileMenu,
          desc: dict.dashboardOnboarding.mobileMenuDesc,
          position: "bottom",
        },
        {
          target: "[data-onboard='dashboard-stats']",
          title: dict.dashboardOnboarding.stats,
          desc: dict.dashboardOnboarding.statsDesc,
          position: "bottom",
        },
        {
          target: "[data-onboard='dashboard-agents']",
          title: dict.dashboardOnboarding.agents,
          desc: dict.dashboardOnboarding.agentsDesc,
          position: "bottom",
        },
      ]
    : [
        {
          target: "[data-onboard='dashboard-stats']",
          title: dict.dashboardOnboarding.stats,
          desc: dict.dashboardOnboarding.statsDesc,
          position: "bottom",
        },
    {
      target: "[data-onboard='dashboard-nav']",
      title: dict.dashboardOnboarding.navigation,
      desc: dict.dashboardOnboarding.navigationDesc,
      position: "right",
    },
    {
      target: "[data-onboard='dashboard-skills']",
      title: dict.dashboardOnboarding.skills,
      desc: dict.dashboardOnboarding.skillsDesc,
      position: "bottom",
    },
    {
      target: "[data-onboard='dashboard-agents']",
      title: dict.dashboardOnboarding.agents,
      desc: dict.dashboardOnboarding.agentsDesc,
      position: "bottom",
    },
    {
      target: "[data-onboard='dashboard-account']",
      title: dict.dashboardOnboarding.account,
      desc: dict.dashboardOnboarding.accountDesc,
      position: "right",
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const isFirst = step === 0;
  // Card centrata quando il target non è agganciabile: sempre visibile.
  const centered = targetRect === null;

  const updateTargetRect = useCallback(() => {
    const el = document.querySelector(current.target);
    if (el) {
      const rect = el.getBoundingClientRect();
      // Rettangoli a area zero (sidebar chiusa su mobile, pannello nascosto):
      // trattali come target mancante così appare la card centrata.
      if (rect.width > 0 && rect.height > 0) {
        // Porta il target in vista prima di misurare: senza questo, le
        // sezioni sotto il fold (competenze, agenti) e l'ultimo passo
        // (account in fondo alla sidebar) venivano misurati fuori viewport
        // e il tooltip usciva dallo schermo — per l'utente il tour pareva
        // "sparito" prima della fine.
        try {
          el.scrollIntoView({ block: "nearest", behavior: "smooth" });
        } catch {}
        const fresh = el.getBoundingClientRect();
        setTargetRect(fresh.width > 0 && fresh.height > 0 ? fresh : null);
        return;
      }
    }
    setTargetRect(null);
  }, [current.target]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    updateTargetRect();
    window.addEventListener("resize", updateTargetRect);
    // Lo scroll (pagina, sidebar) sposta i target: rimisura sempre.
    window.addEventListener("scroll", updateTargetRect, true);
    return () => {
      window.removeEventListener("resize", updateTargetRect);
      window.removeEventListener("scroll", updateTargetRect, true);
    };
  }, [updateTargetRect]);

  // Il tour è in mostra (anche come card centrata quando il bersaglio non è
  // agganciabile): lo segniamo come visto subito, così non ricompare a ogni
  // visita. Prima il flag veniva scritto solo alla chiusura e un tour
  // abbandonato tornava alla visita successiva.
  useEffect(() => {
    markOnboardingSeen("dashboard");
  }, []);

  const getTooltipPosition = () => {
    if (!targetRect) return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };

    const padding = 12;
    const tooltipWidth = 320;
    const tooltipHeight = 200;
    const maxLeft = Math.max(window.innerWidth - tooltipWidth - 20, 20);

    switch (current.position) {
      case "right":
        return {
          top: `${Math.min(Math.max(targetRect.top, 20), Math.max(window.innerHeight - tooltipHeight - 20, 20))}px`,
          left: `${Math.min(targetRect.right + padding, maxLeft)}px`,
        };
      case "left":
        return {
          top: `${Math.min(Math.max(targetRect.top, 20), Math.max(window.innerHeight - tooltipHeight - 20, 20))}px`,
          left: `${Math.max(targetRect.left - tooltipWidth - padding, 20)}px`,
        };
      case "top":
        return {
          top: `${Math.max(targetRect.top - tooltipHeight - padding, 20)}px`,
          left: `${Math.min(Math.max(targetRect.left, 20), maxLeft)}px`,
        };
      case "bottom":
        return {
          top: `${Math.min(targetRect.bottom + padding, Math.max(window.innerHeight - tooltipHeight - 20, 20))}px`,
          left: `${Math.min(Math.max(targetRect.left, 20), maxLeft)}px`,
        };
      default:
        return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    }
  };

  const getArrowStyle = () => {
    if (!targetRect) return { display: "none" };
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
    markOnboardingSeen("dashboard");
    onComplete();
  };

  if (!visible) return null;

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

        {/* Highlight target (solo quando agganciato a un elemento visibile) */}
        {!centered && targetRect && (
          <div
            className="absolute rounded-lg ring-2 ring-brand-500/50 ring-offset-2 ring-offset-transparent"
            style={{
              top: targetRect.top - 4,
              left: targetRect.left - 4,
              width: targetRect.width + 8,
              height: targetRect.height + 8,
            }}
          />
        )}

        {/* Tooltip */}
        <motion.div
          key={step}
          ref={tooltipRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="absolute z-10 w-80 max-w-[calc(100vw-2.5rem)] rounded-2xl border border-white/[0.08] bg-neutral-900 p-5 shadow-2xl"
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
              {dict.onboarding.back}
            </button>
            <span className="text-[10px] text-neutral-500">
              {step + 1} / {steps.length}
            </span>
            <button
              onClick={handleNext}
              className="flex items-center gap-1 rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-400 transition-all"
            >
              {isLast ? dict.onboarding.start : dict.onboarding.next}
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