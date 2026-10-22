"use client";
/**
 * Fiducia e sicurezza in linguaggio cliente: dati separati, connessioni
 * cifrate, pagamenti sicuri, controllo GDPR.
 *
 * Le sei card spiegano i punti; il link porta alla privacy per i dettagli.
 * Qui non c'è più il diagramma "come viaggiano i tuoi dati": era un'immagine
 * (un SVG con testo dentro) e su una pagina in un'altra lingua il testo
 * dell'immagine restava in italiano — l'incoerenza più visibile della sezione,
 * e un'immagine non è leggibile dagli screen reader.
 */
import Link from "next/link";
import { reveal } from "@/lib/motion";
import { motion } from "framer-motion";
import { ShieldCheck, Lock, KeyRound, Server, Database, EyeOff } from "lucide-react";
import { useLanguage } from "./LanguageProvider";

// Icone allineate per indice con `dict.security.points`.
const POINT_ICONS = [Database, Lock, Server, KeyRound, EyeOff, ShieldCheck];

export default function SecuritySection() {
  const { dict } = useLanguage();
  const sec = dict.security;

  return (
    <section id="sicurezza" className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl 3xl:max-w-[1720px] px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto max-w-3xl text-center"
          {...reveal(16, 0.5)}
        >
          <div className="mb-4 flex items-center justify-center gap-2">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-300">{sec.badge}</span>
          </div>
          <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            {sec.titleA}{" "}
            <span className="bg-linear-to-r from-emerald-400 to-brand-400 bg-clip-text text-transparent">{sec.titleB}</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-7 text-neutral-400">{sec.subtitle}</p>
        </motion.div>

        <div className="mx-auto mt-10 grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sec.points.map((p, idx) => {
            const Icon = POINT_ICONS[idx] ?? ShieldCheck;
            return (
              <motion.div key={p.title} className="rounded-2xl border border-white/5 bg-neutral-900 p-4" initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35 }}>
                <Icon size={16} className="text-emerald-400" />
                <p className="mt-2 text-sm font-bold text-white">{p.title}</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-neutral-400">{p.desc}</p>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Link href="/privacy" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-bold text-white hover:bg-white/10">{sec.cta}</Link>
        </div>
      </div>
    </section>
  );
}