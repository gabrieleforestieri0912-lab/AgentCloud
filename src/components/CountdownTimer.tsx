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
    { value: days, label: "Days", labelIt: "G" },
    { value: hours, label: "Hours", labelIt: "O" },
    { value: minutes, label: "Minutes", labelIt: "M" },
    { value: seconds, label: "Seconds", labelIt: "S" },
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className="flex items-center justify-between bg-neutral-800/50 border border-white/5 rounded-xl px-4 py-3 mb-4"
    >
      {/* Left: label + pulse */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-400" />
        </span>
        <span className="text-[11px] font-bold uppercase tracking-wider text-brand-400 truncate">
          {locale === "it" ? "Lancio 15/09" : "Launch 09/15"}
        </span>
      </div>

      {/* Right: timer blocks inline */}
      <div className="flex items-center gap-1.5 shrink-0">
        {(mounted ? timeLeft : getTimeLeft()).map((unit, i) => (
          <div key={unit.label} className="flex items-center gap-1.5">
            <div className="flex flex-col items-center">
              <span className="text-lg font-extrabold text-white tabular-nums leading-none">
                {mounted ? String(unit.value).padStart(2, "0") : "--"}
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-neutral-500 leading-none mt-0.5">
                {locale === "it" ? unit.labelIt : unit.label.charAt(0)}
              </span>
            </div>
            {i < timeLeft.length - 1 && (
              <span className="text-sm font-bold text-brand-400/50 self-start leading-none mt-px">:</span>
            )}
          </div>
        ))}
      </div>

      {/* Launched */}
      {isLaunched && (
        <span className="text-xs font-bold text-emerald-400 shrink-0 ml-2">Live!</span>
      )}
    </motion.div>
  );
}
