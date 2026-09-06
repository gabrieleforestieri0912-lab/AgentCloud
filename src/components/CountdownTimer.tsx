"use client";

import { useSyncExternalStore } from "react";
import { motion } from "framer-motion";

const LAUNCH_DATE = new Date("2026-09-15T16:00:00");

interface TimeUnit {
  value: number;
  label: string;
  labelIt: string;
}

function getTimeUnits(days: number, hours: number, minutes: number, seconds: number): TimeUnit[] {
  return [
    { value: days, label: "Days", labelIt: "Giorni" },
    { value: hours, label: "Hours", labelIt: "Ore" },
    { value: minutes, label: "Minutes", labelIt: "Minuti" },
    { value: seconds, label: "Seconds", labelIt: "Secondi" },
  ];
}

function getTimeLeft(): TimeUnit[] {
  const now = new Date();
  const diff = Math.max(0, LAUNCH_DATE.getTime() - now.getTime());

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return getTimeUnits(days, hours, minutes, seconds);
}

const ZERO = getTimeUnits(0, 0, 0, 0);

// Cached snapshot so `getSnapshot` returns a stable reference between ticks
// (required by useSyncExternalStore to avoid render loops).
let snapshot: TimeUnit[] = ZERO;

function subscribe(callback: () => void): () => void {
  const id = setInterval(callback, 1000);
  return () => clearInterval(id);
}

function getSnapshot(): TimeUnit[] {
  const next = getTimeLeft();
  if (
    next[0].value !== snapshot[0].value ||
    next[1].value !== snapshot[1].value ||
    next[2].value !== snapshot[2].value ||
    next[3].value !== snapshot[3].value
  ) {
    snapshot = next;
  }
  return snapshot;
}

// Stable on the server so server and client HTML match (no hydration mismatch).
function getServerSnapshot(): TimeUnit[] {
  return ZERO;
}

export default function CountdownTimer({ locale = "en" }: { locale?: string }) {
  const units = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isLaunched = units.every((u) => u.value === 0);

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
      <div className="flex items-center justify-center gap-2">
        {units.map((unit, i) => (
          <div key={unit.label} className="flex items-center gap-2">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-lg bg-neutral-900 border border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
                <motion.span
                  key={unit.value}
                  initial={{ y: -4, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="text-xl sm:text-2xl font-extrabold text-white tabular-nums leading-none"
                >
                  {String(unit.value).padStart(2, "0")}
                </motion.span>
              </div>
              <span className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-neutral-500">
                {locale === "it" ? unit.labelIt : unit.label}
              </span>
            </div>
            {i < units.length - 1 && (
              <span className="text-lg font-bold text-brand-400/40 self-start mt-3">:</span>
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
