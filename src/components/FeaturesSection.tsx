"use client";
/**
 * Funzionalità principali — 4 card con link alla pagina di dettaglio.
 * Agenti pronti, integrazioni, chat operativa, dashboard/report.
 *
 * I testi arrivano dal dizionario i18n (`dict.features`). Restano qui solo
 * ciò che non è contenuto: icone e rotte delle pagine di approfondimento.
 *
 * "Vedi dettagli" è un link, non un accordion: la card espansa mostrava solo
 * tre righe, mentre la pagina `/features/<slug>` spiega la funzionalità per
 * intero.
 */
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Bot,
  PlugZap,
  MessagesSquare,
  LayoutDashboard,
  ArrowRight,
} from "lucide-react";
import { useLanguage } from "./LanguageProvider";
import { t } from "@/lib/i18n/dictionaries";
import { AGENTS } from "@/lib/agents";
import { FEATURE_PATHS, FEATURE_SLUGS } from "@/lib/i18n/featureDetails";

// Icone allineate per indice con `dict.features.items`.
const FEATURE_ICONS = [Bot, PlugZap, MessagesSquare, LayoutDashboard];

export default function FeaturesSection() {
  const { dict } = useLanguage();
  const ft = dict.features;
  // Il primo pilastro cita quante categorie ha il catalogo: si conta qui.
  const categories = new Set(AGENTS.map((a) => a.category)).size;

  return (
    <section id="funzionalita" className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl 3xl:max-w-[1720px] px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto max-w-3xl text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-4 flex items-center justify-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-brand-400">
              {ft.badge}
            </span>
          </div>
          <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            {ft.titleA}{" "}
            <span className="bg-linear-to-r from-brand-500 to-pink-500 bg-clip-text text-transparent">
              {ft.titleB}
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-7 text-neutral-400">
            {ft.subtitle}
          </p>
        </motion.div>

        <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2">
          {ft.items.map((f, idx) => {
            const Icon = FEATURE_ICONS[idx] ?? Bot;
            const slug = FEATURE_SLUGS[idx];
            const href = slug ? FEATURE_PATHS[slug] : "/agents";
            // Il primo pilastro cita il numero di agenti del catalogo:
            // arriva dal catalogo, non dal dizionario, così non invecchia.
            const desc =
              idx === 0 ? t(f.desc, { count: AGENTS.length, cats: categories }) : f.desc;
            return (
              <motion.div
                key={f.title}
                className="flex flex-col rounded-2xl border border-white/5 bg-neutral-900 p-5"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35 }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300">
                  <Icon size={18} />
                </div>
                <p className="mt-3 text-base font-bold text-white">{f.title}</p>
                <p className="mt-1.5 text-sm font-medium leading-6 text-neutral-400">
                  {desc}
                </p>

                <Link
                  href={href}
                  className="mt-4 inline-flex w-fit items-center gap-1 text-sm font-bold text-brand-400 hover:text-brand-300"
                >
                  {ft.showDetails}
                  <ArrowRight size={14} />
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
