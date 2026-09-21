"use client";
/**
 * Casi d’uso per tipo di attività — solo da agenti esistenti (audit Fase 0).
 * 4 card: E-commerce D2C, Studio/Clinica, Agenzia vendite, Ristorazione/locale.
 */
import Link from "next/link";
import { motion } from "framer-motion";
import { ShoppingBag, CalendarDays, UserPlus, Star, ArrowRight } from "lucide-react";

const CASES = [
  {
    icon: ShoppingBag,
    eyeb: "E-commerce D2C",
    title: "Shopify: dal prodotto al carrello in chat",
    problem: "Ordini copiati a mano, link carrello lenti, scorte non viste.",
    agent: "Shopify Agent + Inventory & Logistics",
    tasks: ["Ricerca catalogo", "Link carrello diretto", "Stato ordine con email", "Allerta scorte"],
    href: "/agents/shopify-agent",
    accent: "bg-green-500",
  },
  {
    icon: CalendarDays,
    eyeb: "Studio / Clinica / Salone",
    title: "Prenotazioni senza ping-pong",
    problem: "Email avanti-indietro per trovare una data.",
    agent: "Calendar Booking Agent",
    tasks: ["Disponibilità Google Calendar", "Prenota con Meet", "Promemoria", "Cancellazione"],
    href: "/agents/calendar-booking",
    accent: "bg-cyan-500",
  },
  {
    icon: UserPlus,
    eyeb: "Agenzia & Vendite",
    title: "Lead che non si perdono",
    problem: "Moduli senza follow-up, contatti non arricchiti.",
    agent: "Lead Capture Agent",
    tasks: ["Cattura da chat/modulo", "Arricchimento profilo", "Score", "Notifica Slack/HubSpot"],
    href: "/agents/lead-capture",
    accent: "bg-orange-500",
  },
  {
    icon: Star,
    eyeb: "Ristorazione & Locale",
    title: "Reputazione Google sotto controllo",
    problem: "Recensioni senza risposta, sentiment ignorato.",
    agent: "Reviews & Reputation Agent",
    tasks: ["Monitoraggio Google Business", "Analisi sentiment", "Bozza risposta", "Pubblica su approvazione"],
    href: "/agents/reviews-agent",
    accent: "bg-amber-500",
  },
];

export default function UseCasesSection() {
  return (
    <section id="casi" className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl 3xl:max-w-[1720px] px-4 sm:px-6 lg:px-8">
        <motion.div className="mx-auto max-w-3xl text-center" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
          <div className="mb-4 flex items-center justify-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-brand-400">Casi d’uso — solo agenti esistenti</span>
          </div>
          <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">Un agente per <span className="bg-linear-to-r from-brand-500 to-pink-500 bg-clip-text text-transparent">ogni lavoro ripetitivo</span></h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-7 text-neutral-400">Niente verticali inventati. Ogni caso usa <code className="rounded bg-white/5 px-1">tasks</code> e <code className="rounded bg-white/5 px-1">workflow</code> reali da <code className="rounded bg-white/5 px-1">src/lib/agents.ts</code>.</p>
        </motion.div>

        <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2">
          {CASES.map((c) => (
            <motion.div key={c.title} className="rounded-2xl border border-white/5 bg-neutral-900 p-5" initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35 }}>
              <div className="flex items-center gap-2">
                <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${c.accent} text-white`}><c.icon size={16} /></span>
                <span className="text-xs font-bold uppercase tracking-wide text-neutral-500">{c.eyeb}</span>
              </div>
              <p className="mt-3 text-sm font-bold text-white">{c.title}</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-amber-200/80">Problema: {c.problem}</p>
              <p className="mt-2 text-xs font-bold text-neutral-400">{c.agent}</p>
              <ul className="mt-2 grid grid-cols-2 gap-1.5">
                {c.tasks.map((t) => (
                  <li key={t} className="rounded-full bg-white/5 px-2.5 py-1 text-xs font-bold text-neutral-300">{t}</li>
                ))}
              </ul>
              <Link href={c.href} className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand-400 hover:text-brand-300">Prova l’agente <ArrowRight size={12} /></Link>
            </motion.div>
          ))}
        </div>

        <p className="mx-auto mt-6 max-w-5xl text-center text-xs font-semibold text-neutral-500">Visual: grid JSX/Tailwind con <code className="rounded bg-white/5 px-1">AgentIcon</code> e <code className="rounded bg-white/5 px-1">accent</code> reali — no immagini esterne.</p>
      </div>
    </section>
  );
}
