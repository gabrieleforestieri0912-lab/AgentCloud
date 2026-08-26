"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const LAUNCH_DATE = new Date("2026-09-15T16:00:00");

interface TimeUnit {
  value: number;
  label: string;
  labelIt: string;
}

function getTimeLeft(): TimeUnit[] {
  const now = new Date();
  const diff = Math.max(0, LAUNCH_DATE.getTime() - now.getTime());

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return [
    { value: days, label: "Days", labelIt: "Giorni" },
    { value: hours, label: "Hours", labelIt: "Ore" },
    { value: minutes, label: "Minutes", labelIt: "Minuti" },
    { value: seconds, label: "Seconds", labelIt: "Secondi" },
  ];
}

export default function CountdownTimer({ locale = "it" }: { locale?: string }) {
  const [timeLeft, setTimeLeft] = useState<TimeUnit[]>(getTimeLeft());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isLaunched = timeLeft.every((u) => u.value === 0);
  const units = mounted ? timeLeft : getTimeLeft();

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className="bg-neutral-800/50 border border-white/5 rounded-2xl p-4 mb-5"
    >
      {/* Header */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-400" />
        </span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-brand-400">
          {locale === "it" ? "Lancio il 15 Settembre 2026" : "Launching September 15, 2026"}
        </span>
      </div>

      {/* Timer blocks */}
      <div className="flex items-center justify-center gap-3 sm:gap-4">
        {units.map((unit, i) => (
          <div key={unit.label} className="flex items-center gap-3 sm:gap-4">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-xl bg-neutral-900 border border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.4)]">
                <motion.span
                  key={unit.value}
                  initial={{ y: -6, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="text-3xl sm:text-4xl font-extrabold text-white tabular-nums leading-none"
                >
                  {String(unit.value).padStart(2, "0")}
                </motion.span>
              </div>
              <span className="mt-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                {locale === "it" ? unit.labelIt : unit.label}
              </span>
            </div>
            {i < units.length - 1 && (
              <span className="text-2xl font-bold text-brand-400/40 self-start mt-5 sm:mt-6">:</span>
            )}
          </div>
        ))}
      </div>

      {isLaunched && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center mt-3 text-sm font-bold text-emerald-400"
        >
          🎉 {locale === "it" ? "La piattaforma è live!" : "The platform is live!"}
        </motion.p>
      )}
    </motion.div>
  );
}
