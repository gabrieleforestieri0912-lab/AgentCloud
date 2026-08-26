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
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const isLaunched = timeLeft.every((u) => u.value === 0);

  if (!mounted) {
    // Render static placeholder during SSR
    return (
      <div className="bg-neutral-800/50 border border-white/5 rounded-2xl p-4 mb-6">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-400 mb-3">
            {locale === "it" ? "Lancio il 15 Settembre" : "Launching September 15"}
          </p>
          <div className="flex items-center justify-center gap-3">
            {["--", "--", "--", "--"].map((v, i) => (
              <div key={i} className="flex flex-col items-center">
                <span className="text-2xl font-extrabold text-white tabular-nums">
                  {v}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                  {locale === "it" ? ["G","O","M","S"][i] : ["D","H","M","S"][i]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="bg-neutral-800/50 border border-white/5 rounded-2xl p-5 mb-6"
    >
      {/* Header */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-400" />
        </span>
        <p className="text-xs font-bold uppercase tracking-widest text-brand-400">
          {locale === "it" ? "Lancio il 15 Settembre 2026" : "Launching September 15, 2026"}
        </p>
      </div>

      {/* Timer blocks */}
      <div className="flex items-center justify-center gap-2 sm:gap-3">
        {timeLeft.map((unit, i) => (
          <div key={unit.label} className="flex items-center gap-2 sm:gap-3">
            <div className="flex flex-col items-center">
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded-xl bg-neutral-900 border border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.3)] overflow-hidden">
                {/* Subtle glow */}
                <div className="absolute inset-0 bg-linear-to-b from-brand-500/5 to-transparent pointer-events-none" />
                <motion.span
                  key={unit.value}
                  initial={{ y: -8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.25 }}
                  className="relative text-2xl sm:text-3xl font-extrabold text-white tabular-nums"
                >
                  {String(unit.value).padStart(2, "0")}
                </motion.span>
              </div>
              <span className="mt-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                {locale === "it" ? unit.labelIt : unit.label}
              </span>
            </div>

            {/* Colon separator (not after last) */}
            {i < timeLeft.length - 1 && (
              <span className="text-xl font-bold text-brand-400/60 self-start mt-4 sm:mt-5">
                :
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Launched state */}
      {isLaunched && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center mt-4 text-sm font-bold text-emerald-400"
        >
          {locale === "it"
            ? "🎉 La piattaforma è live!"
            : "🎉 The platform is live!"}
        </motion.p>
      )}

      {/* Subtext */}
      {!isLaunched && (
        <p className="text-center mt-3 text-[11px] text-neutral-500">
          {locale === "it"
            ? "Iscriviti ora per accedere al lancio"
            : "Sign up now to access at launch"}
        </p>
      )}
    </motion.div>
  );
}
