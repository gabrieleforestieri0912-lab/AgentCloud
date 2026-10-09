"use client";
/**
 * Problema → Soluzione per PMI.
 * 3 problemi concreti → soluzione con l’agente giusto e il suo flusso di lavoro.
 *
 * I testi (problema, soluzione, workflow, intestazioni) vengono dal dizionario
 * i18n: sono contenuto tradotto, non testo fisso del componente. Gli `href`
 * restano qui perché dipendono dagli slug reali degli agenti, non dalla lingua.
 */
import Link from "next/link";
import { motion } from "framer-motion";
import { Clock3, TrendingDown, MessageCircleWarning, ArrowRight } from "lucide-react";
import { useLanguage } from "./LanguageProvider";
import { t } from "@/lib/i18n/dictionaries";
import { AGENTS } from "@/lib/agents";

// Icone allineate per indice con `dict.problemSolution.items`.
const ITEM_ICONS = [Clock3, TrendingDown, MessageCircleWarning];

/**
 * Slug dell'agente mostrato in ogni card. Risolvuti dal catalogo reale: se un
 * agente viene rinominato o spostato di sezione, la card non va a buon fine
 * né punta a una pagina inesistente.
 */
const ITEM_SLUGS = ["shopify-agent", "lead-capture", "reviews-agent"];

export default function ProblemSolutionSection() {
  const { dict } = useLanguage();
  const ps = dict.problemSolution;
  const hrefFor = (idx: number, fallbackAgent: string) => {
    const slug = ITEM_SLUGS[idx];
    if (slug && AGENTS.some((a) => a.slug === slug)) return `/agents/${slug}`;
    // Nessuno slug noto per questa card: la rimanda al marketplace, dove
    // l'agente è comunque elencato dal nome mostrato.
    return `/agents?search=${encodeURIComponent(fallbackAgent)}`;
  };

  return (
    <section id="soluzioni" className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl 3xl:max-w-[1720px] px-4 sm:px-6 lg:px-8">
        <motion.div className="mx-auto max-w-3xl text-center" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
          <div className="mb-4 flex items-center justify-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-amber-300">{ps.badge}</span>
          </div>
          <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            {ps.titleA}{" "}
            <span className="bg-linear-to-r from-amber-400 to-pink-500 bg-clip-text text-transparent">{ps.titleB}</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-7 text-neutral-400">{ps.subtitle}</p>
        </motion.div>

        <div className="mx-auto mt-10 grid max-w-5xl gap-4 lg:grid-cols-3">
          {ps.items.map((it, idx) => {
            const Icon = ITEM_ICONS[idx] ?? Clock3;
            return (
              <motion.div key={it.agent} className="rounded-2xl border border-white/5 bg-neutral-900 p-5" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300"><Icon size={16} /></div>
                <p className="mt-3 text-xs font-bold uppercase tracking-wide text-red-300">{ps.problemLabel}</p>
                <p className="mt-1 text-sm font-semibold leading-5 text-neutral-300">{it.problem}</p>
                <p className="mt-4 text-xs font-bold uppercase tracking-wide text-emerald-300">{ps.solutionLabel}</p>
                <p className="mt-1 text-sm font-semibold leading-5 text-white">{it.solution}</p>
                <p className="mt-3 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs font-bold text-neutral-400">{it.agent} • {it.workflow}</p>
                <Link href={hrefFor(idx, it.agent)} className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand-400 hover:text-brand-300">{ps.seeAgent} <ArrowRight size={12} /></Link>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Link href="/agents" className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-7 py-3 text-sm font-bold text-white hover:bg-brand-400">
            {t(ps.browseAll, { count: AGENTS.length })} <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}