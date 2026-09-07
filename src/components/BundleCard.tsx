"use client";

/**
 * Card di un bundle nel marketplace.
 *
 * Toggle prezzo animato con framer-motion: pillola scorrono, prezzi
 * fade/slide, badge risparmio scale-in.
 */
import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight, Sparkles, Clock, Tag } from "lucide-react";
import type { Bundle, BundlePeriod } from "@/lib/bundles";
import { formatPrice, formatMonthlyPrice, getBundleAgents } from "@/lib/bundles";
import AgentIcon from "./AgentIcon";
import { useLanguage } from "./LanguageProvider";
import AddBundleToCartButton from "./AddBundleToCartButton";

type BundleCardProps = {
  bundle: Bundle;
};

const PERIODS: BundlePeriod[] = ["monthly", "quarterly", "yearly"];

export default function BundleCard({ bundle }: BundleCardProps) {
  const { locale } = useLanguage();
  const isIt = locale === "it";
  const [period, setPeriod] = useState<BundlePeriod>("monthly");
  const agents = getBundleAgents(bundle);

  const pricing = bundle.pricing;
  const monthlyPrice =
    period === "monthly" ? pricing.monthly
      : period === "quarterly" ? pricing.quarterly
        : pricing.yearly;

  const totalDisplay =
    period === "quarterly" ? formatPrice(pricing.quarterlyTotal)
      : period === "yearly" ? formatPrice(pricing.yearlyTotal)
        : null;

  const periodLabel =
    period === "monthly" ? (isIt ? "/mese" : "/month")
      : period === "quarterly" ? (isIt ? "/mese (fatt. trimestrale)" : "/mo (billed quarterly)")
        : (isIt ? "/mese (fatt. annuale)" : "/mo (billed annually)");

  const savingsPercent =
    period === "quarterly" ? pricing.savingsQuarterly
      : period === "yearly" ? pricing.savingsYearly
        : 0;

  const badgeColors: Record<string, string> = {
    "Best value": "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
    "Most popular": "bg-amber-500/15 text-amber-300 border-amber-500/20",
    "Save more": "bg-purple-500/15 text-purple-300 border-purple-500/20",
    "Starter": "bg-brand-500/10 text-brand-300 border-brand-500/20",
  };

  const periodIndex = PERIODS.indexOf(period);

  return (
    <div className="relative group flex flex-col rounded-2xl border border-white/5 bg-neutral-900 p-6 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-brand-500/30 hover:shadow-2xl hover:shadow-brand-500/10">
      {/* Accent gradient top */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${bundle.accent} opacity-[0.03] group-hover:opacity-[0.06] transition-opacity pointer-events-none`} />

      {/* Badge */}
      <div className="relative flex items-center justify-between mb-4">
        <motion.span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${badgeColors[bundle.badge] || badgeColors["Starter"]}`}
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <Sparkles size={12} />
          {bundle.badge}
        </motion.span>
        <span className="text-xs font-bold text-neutral-500">
          {agents.length} {isIt ? "agenti" : "agents"}
        </span>
      </div>

      {/* Name + description */}
      <h3 className="relative text-xl font-bold text-white mb-2">{bundle.name}</h3>
      <p className="relative text-sm leading-6 text-neutral-400 mb-4">{bundle.description}</p>

      {/* ── Period toggle with sliding indicator ── */}
      <div className="relative mb-5 flex gap-1 rounded-xl border border-white/10 bg-neutral-800/60 p-1">
        {/* Sliding pill background */}
        <motion.div
          className="absolute top-1 bottom-1 rounded-lg bg-brand-500 shadow-lg shadow-brand-500/20"
          layout
          layoutId={`pill-${bundle.slug}`}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          style={{
            width: `calc((100% - 8px) / 3)`,
            left: `calc(${periodIndex} * (100% - 8px) / 3 + 4px)`,
          }}
        />

        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`relative z-10 flex-1 rounded-lg px-3 py-2 text-xs font-bold transition-colors duration-200 ${
              period === p ? "text-white" : "text-neutral-400 hover:text-white"
            }`}
          >
            {p === "monthly"
              ? isIt ? "Mensile" : "Monthly"
              : p === "quarterly"
                ? isIt ? "Trimestrale" : "Quarterly"
                : isIt ? "Annuale" : "Yearly"}
          </button>
        ))}
      </div>

      {/* ── Animated price ── */}
      <div className="relative mb-5 h-[72px]">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={period}
            initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute inset-0"
          >
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-white">{formatPrice(monthlyPrice)}</span>
              <span className="text-sm font-semibold text-neutral-500">{periodLabel}</span>
            </div>

            {/* Savings badge — animated */}
            <AnimatePresence>
              {savingsPercent > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, x: -8 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: -8 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.05 }}
                  className="mt-2 flex items-center gap-2"
                >
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
                    <Tag size={10} />
                    -{savingsPercent}%
                  </span>
                  {totalDisplay && (
                    <span className="text-xs font-semibold text-neutral-500">
                      {isIt ? "Totale" : "Total"}: {totalDisplay}
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Monthly hint */}
            <AnimatePresence>
              {period === "monthly" && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-2 text-xs font-semibold text-neutral-500"
                >
                  {isIt ? "Prezzo singolo agente" : "Single agent price"}: {formatMonthlyPrice(pricing.monthly)}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Agents included */}
      <div className="relative flex-1 mb-5">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
          {isIt ? "Agenti inclusi" : "Included agents"}
        </p>
        <div className="space-y-2">
          {agents.map((agent, i) => (
            <motion.div
              key={agent.slug}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.3 }}
              className="flex items-center gap-2.5"
            >
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${agent.accent}`}>
                <AgentIcon icon={agent.icon} brand={agent.brand} size={12} className="text-white" />
              </span>
              <span className="text-sm font-semibold text-neutral-200 truncate">{agent.name}</span>
              <Check size={14} className="ml-auto shrink-0 text-emerald-400" />
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="relative border-t border-white/5 pt-5">
        <div className="grid grid-cols-2 gap-2">
          <AddBundleToCartButton bundleSlug={bundle.slug} period={period} className="w-full justify-center py-2.5 text-sm" />
          <Link
            href={`/bundles/${bundle.slug}`}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-white/10 bg-neutral-800 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:border-white/20"
          >
            {isIt ? "Dettagli" : "Details"}
          </Link>
        </div>
        <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-neutral-500">
          <Clock size={11} />
          {isIt ? "Setup rapido · senza vincoli" : "Quick setup · no commitment"}
        </div>
      </div>
    </div>
  );
}
