"use client";
/**
 * Problema → Soluzione per PMI — sostituisce FeaturesSection generica.
 * 3 problemi misurabili → soluzione con agente reale, workflow e integrazione live.
 */
import Link from "next/link";
import { motion } from "framer-motion";
import { Clock3, TrendingDown, MessageCircleWarning, ArrowRight } from "lucide-react";

const ITEMS = [
  {
    icon: Clock3,
    problem: "Ore perse a copiare ordini e prodotti tra Shopify, email e fogli.",
    solution: "Shopify Agent cerca nel catalogo, genera link carrello e verifica stato ordine via OAuth — in chat, senza copiare.",
    agent: "Shopify Agent",
    workflow: "Query catalogo → Suggerisci → Carrello rapido → Conferma",
    href: "/agents/shopify-agent",
  },
  {
    icon: TrendingDown,
    problem: "Lead dai moduli che restano senza follow-up e senza contesto.",
    solution: "Lead Capture cattura, valida email, arricchisce profilo e notifica Slack/HubSpot con score High/Medium/Low.",
    agent: "Lead Capture Agent",
    workflow: "Cattura → Arricchisci → Score → Notifica vendite",
    href: "/agents/lead-capture",
  },
  {
    icon: MessageCircleWarning,
    problem: "Recensioni Google e ticket senza risposta rapida, perdita di fiducia.",
    solution: "Reviews Agent monitora Google Business, analizza sentiment e propone bozze empatiche da approvare; Support Agent scala solo se serve umano.",
    agent: "Reviews & Reputation / Support",
    workflow: "Fetch → Analizza tono → Bozza → Pubblica su approvazione",
    href: "/agents/reviews-agent",
  },
];

export default function ProblemSolutionSection() {
  return (
    <section id="soluzioni" className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl 3xl:max-w-[1720px] px-4 sm:px-6 lg:px-8">
        <motion.div className="mx-auto max-w-3xl text-center" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
          <div className="mb-4 flex items-center justify-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-amber-300">Problema → Soluzione per PMI</span>
          </div>
          <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">Dove perdi tempo, <span className="bg-linear-to-r from-amber-400 to-pink-500 bg-clip-text text-transparent">l’agente lo fa per te</span></h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-7 text-neutral-400">Tre colli di bottiglia reali, risolti con <code className="rounded bg-white/5 px-1">tasks</code> e <code className="rounded bg-white/5 px-1">workflow</code> già nel codice.</p>
        </motion.div>

        <div className="mx-auto mt-10 grid max-w-5xl gap-4 lg:grid-cols-3">
          {ITEMS.map((it) => (
            <motion.div key={it.agent} className="rounded-2xl border border-white/5 bg-neutral-900 p-5" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300"><it.icon size={16} /></div>
              <p className="mt-3 text-xs font-bold uppercase tracking-wide text-red-300">Problema</p>
              <p className="mt-1 text-sm font-semibold leading-5 text-neutral-300">{it.problem}</p>
              <p className="mt-4 text-xs font-bold uppercase tracking-wide text-emerald-300">Soluzione</p>
              <p className="mt-1 text-sm font-semibold leading-5 text-white">{it.solution}</p>
              <p className="mt-3 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs font-bold text-neutral-400">{it.agent} • {it.workflow}</p>
              <Link href={it.href} className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand-400 hover:text-brand-300">Vedi agente <ArrowRight size={12} /></Link>
            </motion.div>
          ))}
        </div>

        <div className="mx-auto mt-6 max-w-5xl rounded-2xl border border-white/5 bg-neutral-900/40 p-3 text-center text-xs font-semibold text-neutral-500">
          Visual: 3 card JSX/Tailwind con workflow reali da <code className="rounded bg-white/5 px-1">src/lib/agents.ts</code> — solo transform/opacity.
        </div>

        <div className="mt-8 text-center">
          <Link href="/agents" className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-7 py-3 text-sm font-bold text-white hover:bg-brand-400">Sfoglia i 15 agenti <ArrowRight size={14} /></Link>
        </div>
      </div>
    </section>
  );
}
