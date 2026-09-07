"use client";

/**
 * Counter animato che mostra il risparmio in euro quando cambia il periodo.
 * Usa framer-motion per l'animazione del numero (spring-based counting).
 */
import { useEffect, useRef } from "react";
import { motion, useSpring, useTransform, useMotionValue } from "framer-motion";
import { TrendingDown } from "lucide-react";

function AnimatedDigit({ value }: { value: number }) {
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 100, damping: 20, mass: 0.5 });
  const display = useTransform(spring, (v) => Math.round(v));
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    motionVal.set(value);
  }, [value, motionVal]);

  useEffect(() => {
    const unsubscribe = display.on("change", (v) => {
      if (ref.current) ref.current.textContent = v.toString();
    });
    return unsubscribe;
  }, [display]);

  return <span ref={ref}>0</span>;
}

type Props = {
  /** Risparmio mensile in centesimi (monthlyCents - discountedCents) */
  savingsCents: number;
  /** Percentuale risparmio */
  percent: number;
  locale?: string;
};

export default function AnimatedSavingsCounter({ savingsCents, percent, locale = "it" }: Props) {
  const isIt = locale === "it";
  const euros = Math.round(savingsCents / 100);

  if (percent === 0 || euros <= 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0, marginTop: 0 }}
      animate={{ opacity: 1, height: "auto", marginTop: 12 }}
      exit={{ opacity: 0, height: 0, marginTop: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="overflow-hidden"
    >
      <div className="flex items-center gap-2 rounded-xl border border-emerald-500/10 bg-emerald-500/5 px-3 py-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15">
          <TrendingDown size={12} className="text-emerald-400" />
        </span>
        <span className="text-xs font-bold text-emerald-400">
          {isIt ? "Risparmi" : "You save"}{" "}
          <span className="text-sm font-extrabold">
            €<AnimatedDigit value={euros} />
          </span>
          {isIt ? "/mese" : "/mo"}{" "}
          <span className="text-neutral-500">
            ({percent}%)
          </span>
        </span>
      </div>
    </motion.div>
  );
}
