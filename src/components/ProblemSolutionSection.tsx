"use client";
/**
 * Problema → Soluzione per PMI.
 * 3 problemi concreti → soluzione con l’agente giusto e il suo flusso di lavoro.
 * Testi dal dizionario i18n; icone, agenti e link per indice.
 */
import Link from "next/link";
import { motion } from "framer-motion";
import { Clock3, TrendingDown, MessageCircleWarning, ArrowRight } from "lucide-react";
import { useLanguage } from "./LanguageProvider";

const META = [
  { icon: Clock3, agent: "Shopify Agent", href: "/agents/shopify-agent" },
  { icon: TrendingDown, agent: "Lead Capture Agent", href: "/agents/lead-capture" },
  { icon: MessageCircleWarning, agent: "Reviews & Reputation / Support", href: "/agents/reviews-agent" },
];

export default function ProblemSolutionSection() {
  const { dict } = useLanguage();
  const ps = dict.problemSolution;
  return (
    <section id="soluzioni" className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl 3xl:max-w-[1720px] px-4 sm:px-6 lg:px-8">
        <motion.div className="mx-auto max-w-3xl text-center" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
          <div className="mb-4 flex items-center justify-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-amber-300">{ps.eyebrow}</span>
          </div>
          <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">{ps.titleA} <span className="bg-linear-to-r from-amber-400 to-pink-500 bg-clip-text text-transparent">{ps.titleB}</span></h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-7 text-neutral-400">{ps.subtitle}</p>
        </motion.div>

        <div className="mx-auto mt-10 grid max-w-5xl gap-4 lg:grid-cols-3">
          {ps.items.map((it, i) => {
            const meta = META[i] ?? META[0];
            return (
            <motion.div key={meta.agent} className="rounded-2xl border border-white/5 bg-neutral-900 p-5" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300"><meta.icon size={16} /></div>
              <p className="mt-3 text-xs font-bold uppercase tracking-wide text-red-300">{ps.problemLabel}</p>
              <p className="mt-1 text-sm font-semibold leading-5 text-neutral-300">{it.problem}</p>
              <p className="mt-4 text-xs font-bold uppercase tracking-wide text-emerald-300">{ps.solutionLabel}</p>
              <p className="mt-1 text-sm font-semibold leading-5 text-white">{it.solution}</p>
              <p className="mt-3 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs font-bold text-neutral-400">{meta.agent} • {it.workflow}</p>
              <Link href={meta.href} className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand-400 hover:text-brand-300">{ps.viewAgent} <ArrowRight size={12} /></Link>
            </motion.div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Link href="/agents" className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-7 py-3 text-sm font-bold text-white hover:bg-brand-400">{dict.marketplace.browseAll} <ArrowRight size={14} /></Link>
        </div>
      </div>
    </section>
  );
}
