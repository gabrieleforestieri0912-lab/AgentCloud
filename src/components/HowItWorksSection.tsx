"use client";
/**
 * Come funziona — 4 passi per il cliente: scegli → collega → delega → gestisci.
 * Visual: stepper + esempio concreto (agente, collegamento, chat).
 * Solo transform/opacity, no layout anim.
 */
import Link from "next/link";
import { motion } from "framer-motion";
import { Bot, PlugZap, MessageSquare, LayoutDashboard, ArrowRight, Check } from "lucide-react";

const STEPS = [
  {
    n: "01",
    icon: Bot,
    title: "Scegli l’agente",
    desc: "15 agenti in 6 categorie: E-commerce, Marketing, Customer Service, Business Ops, Design e Finanza. Prezzi chiari (€9,99/€14,99 al mese) e attivazione in giornata.",
  },
  {
    n: "02",
    icon: PlugZap,
    title: "Collega i tuoi strumenti",
    desc: "Shopify, Gmail, Calendar e gli altri tool si collegano in 2 click con accesso sicuro. Niente chiavi da copiare, niente configurazioni complicate.",
  },
  {
    n: "03",
    icon: MessageSquare,
    title: "L’agente lavora per te",
    desc: "Chiedi in chat e l’agente esegue: cerca prodotti, crea link al carrello, prenota appuntamenti, invia email. Provalo gratis con 4 messaggi.",
  },
  {
    n: "04",
    icon: LayoutDashboard,
    title: "Gestisci tutto da un posto",
    desc: "Agenti attivi, attività svolte e abbonamento sotto controllo dalla tua dashboard, in qualsiasi momento.",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="come-funziona" className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl 3xl:max-w-[1720px] px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto max-w-3xl text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-4 flex items-center justify-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-brand-400">Come funziona</span>
          </div>
          <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Dal primo messaggio <span className="bg-linear-to-r from-brand-500 to-pink-500 bg-clip-text text-transparent">al risultato in 4 passi</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-7 text-neutral-400">
            Scegli l’agente, collega i tuoi strumenti e delega il lavoro: al resto pensa lui.
          </p>
        </motion.div>

        <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <motion.div
              key={s.n}
              className="relative rounded-2xl border border-white/5 bg-neutral-900 p-5"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-widest text-brand-400">{s.n}</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-brand-300">
                  <s.icon size={14} />
                </span>
              </div>
              <p className="mt-3 text-sm font-bold text-white">{s.title}</p>
              <p className="mt-1.5 text-xs font-semibold leading-5 text-neutral-400">{s.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Visual — esempio concreto: dal prodotto al carrello */}
        <motion.div
          className="mx-auto mt-8 max-w-5xl rounded-2xl border border-white/5 bg-neutral-900 p-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-bold text-neutral-400">Esempio: dal prodotto al carrello, senza uscire dalla chat</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/5 bg-neutral-950 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">1. Scegli</p>
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-white/5 bg-neutral-900 p-2.5">
                <span className="h-8 w-8 rounded-lg bg-green-500/20" />
                <div><p className="text-xs font-bold text-white">Shopify Agent</p><p className="text-xs text-neutral-500">€9,99/mese • Pronto oggi</p></div>
                <Check size={12} className="ml-auto text-emerald-400" />
              </div>
            </div>
            <div className="rounded-xl border border-white/5 bg-neutral-950 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">2. Collega</p>
              <div className="mt-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-xs font-bold text-emerald-300"><Check size={12} className="mr-1 inline-block -translate-y-px" />Negozio Shopify collegato</div>
            </div>
            <div className="rounded-xl border border-white/5 bg-neutral-950 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">3. Delega</p>
              <div className="mt-2 rounded-lg bg-brand-500 p-2.5 text-xs font-bold text-white">Link carrello pronto → invia al cliente</div>
            </div>
          </div>
        </motion.div>

        <div className="mt-8 text-center">
          <Link href="/agents" className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-7 py-3 text-sm font-bold text-white hover:bg-brand-400">
            Scegli un agente <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
