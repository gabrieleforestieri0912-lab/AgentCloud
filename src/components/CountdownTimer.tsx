"use client";

/**
 * Conto alla rovescia verso la data di lancio ufficiale.
 *
 * Design: Split-card glassmorphism con scanalatura centrale, transizioni
 * fluide verticali per le cifre tramite Framer Motion, separatori ritmici pulsanti
 * al neon e barra temporale sottile.
 *
 * Mantiene useSyncExternalStore con getServerSnapshot per evitare hydration mismatch
 * e preservare prestazioni impeccabili a 60fps.
 */
import { useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PartyPopper, Sparkles, Clock } from "lucide-react";
import { LAUNCH_AT, hasLaunched } from "@/lib/waitlist-constants";
import { useLanguage } from "./LanguageProvider";

const LAUNCH_DATE = new Date(LAUNCH_AT);

interface TimeUnit {
  value: number;
}

const UNIT_KEYS = ["days", "hours", "minutes", "seconds"] as const;

function getTimeUnits(days: number, hours: number, minutes: number, seconds: number): TimeUnit[] {
  return [{ value: days }, { value: hours }, { value: minutes }, { value: seconds }];
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

function getServerSnapshot(): TimeUnit[] {
  return getTimeLeft();
}

/**
 * Singolo blocco digitale a scanalatura centrale (Split-Flap Glassmorphic Card)
 */
function TimerCard({
  value,
  label,
  isAccent = false,
}: {
  value: number;
  label: string;
  isAccent?: boolean;
}) {
  const formatted = String(value).padStart(2, "0");

  return (
    <div className="flex flex-col items-center">
      {/* Scheda numerica tridimensionale */}
      <div
        className={`group relative flex h-14 w-13 sm:h-16 sm:w-16 items-center justify-center overflow-hidden rounded-xl border backdrop-blur-md transition-all duration-300 ${
          isAccent
            ? "border-brand-500/40 bg-gradient-to-b from-neutral-900/90 via-neutral-900/95 to-neutral-950 shadow-[0_0_20px_rgba(3,139,254,0.18)]"
            : "border-white/10 bg-gradient-to-b from-neutral-900/80 via-neutral-900/90 to-neutral-950 shadow-[0_4px_16px_rgba(0,0,0,0.4)]"
        }`}
      >
        {/* Riflesso superiore in vetro */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[48%] bg-gradient-to-b from-white/[0.08] to-transparent" />

        {/* Fessura orizzontale centrale realistica */}
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-20 h-[1px] -translate-y-1/2 bg-black/75 shadow-[0_1px_1px_rgba(255,255,255,0.06)]" />

        {/* Tacche laterali di bloccaggio meccanico */}
        <div className="pointer-events-none absolute left-0 top-1/2 z-20 h-1.5 w-[2px] -translate-y-1/2 rounded-r-sm bg-black/80" />
        <div className="pointer-events-none absolute right-0 top-1/2 z-20 h-1.5 w-[2px] -translate-y-1/2 rounded-l-sm bg-black/80" />

        {/* Cifra con animazione fluida verticale */}
        <div className="relative z-10 flex h-full w-full items-center justify-center overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={formatted}
              initial={{ y: -18, opacity: 0, scale: 0.94, filter: "blur(2px)" }}
              animate={{ y: 0, opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ y: 18, opacity: 0, scale: 0.94, filter: "blur(2px)" }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
              className={`font-mono text-2xl sm:text-3xl font-black tabular-nums tracking-tight leading-none select-none ${
                isAccent
                  ? "bg-gradient-to-b from-white via-neutral-100 to-brand-300 bg-clip-text text-transparent"
                  : "bg-gradient-to-b from-white via-neutral-100 to-neutral-300 bg-clip-text text-transparent"
              }`}
            >
              {formatted}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* Alone di accento per i secondi */}
        {isAccent && (
          <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-tr from-brand-500/10 via-transparent to-pink-500/10 opacity-70" />
        )}
      </div>

      {/* Etichetta dell'unità */}
      <span className="mt-1.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-neutral-400 select-none">
        {label}
      </span>
    </div>
  );
}

/**
 * Separatore a due punti con pulsazione ritmica continua
 */
function PulsingColon() {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 px-0.5 pb-5 select-none" aria-hidden="true">
      <motion.span
        animate={{ opacity: [1, 0.25, 1], scale: [1, 0.85, 1] }}
        transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
        className="h-1.5 w-1.5 rounded-full bg-brand-400 shadow-[0_0_6px_rgba(3,139,254,0.8)]"
      />
      <motion.span
        animate={{ opacity: [1, 0.25, 1], scale: [1, 0.85, 1] }}
        transition={{ duration: 1, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
        className="h-1.5 w-1.5 rounded-full bg-brand-400 shadow-[0_0_6px_rgba(3,139,254,0.8)]"
      />
    </div>
  );
}

export default function CountdownTimer({ className = "" }: { className?: string }) {
  const { dict } = useLanguage();
  const units = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isLaunched = hasLaunched();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/60 p-3.5 sm:p-4 backdrop-blur-xl shadow-[0_12px_32px_rgba(0,0,0,0.5)] ${className}`}
    >
      {/* Bagliore radiale d'atmosfera sullo sfondo */}
      <div className="pointer-events-none absolute -top-10 left-1/2 h-24 w-48 -translate-x-1/2 rounded-full bg-brand-500/15 blur-2xl" />

      {/* Intestazione del timer con radar pulse */}
      <div className="relative z-10 mb-3 flex items-center justify-center gap-2">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-gradient-to-r from-brand-400 to-pink-400" />
        </span>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 text-brand-400" />
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-brand-300">
            {dict.countdownTimer.launchDate}
          </span>
        </div>
      </div>

      {/* Blocchi numerici */}
      <div className="relative z-10 flex items-center justify-center gap-1.5 sm:gap-2.5">
        {units.map((unit, i) => (
          <div key={UNIT_KEYS[i]} className="flex items-center gap-1.5 sm:gap-2.5">
            <TimerCard
              value={unit.value}
              label={dict.countdownTimer[UNIT_KEYS[i]]}
              isAccent={UNIT_KEYS[i] === "seconds"}
            />
            {i < units.length - 1 && <PulsingColon />}
          </div>
        ))}
      </div>

      {/* Messaggio festivo al raggiungimento del lancio */}
      {isLaunched && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300"
        >
          <PartyPopper className="h-4 w-4 text-emerald-400" />
          <span>{dict.countdownTimer.platformLive}</span>
          <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
        </motion.div>
      )}
    </motion.div>
  );
}
