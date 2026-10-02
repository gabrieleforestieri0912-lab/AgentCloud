"use client";
/**
 * Casi d’uso per tipo di attività: 4 esempi concreti.
 * Testi dal dizionario i18n; icone, accenti e link per indice.
 */
import Link from "next/link";
import { motion } from "framer-motion";
import { ShoppingBag, CalendarDays, UserPlus, Star, ArrowRight } from "lucide-react";
import { useLanguage } from "./LanguageProvider";

const META = [
  { icon: ShoppingBag, href: "/agents/shopify-agent", accent: "bg-green-500" },
  { icon: CalendarDays, href: "/agents/calendar-booking", accent: "bg-cyan-500" },
  { icon: UserPlus, href: "/agents/lead-capture", accent: "bg-orange-500" },
  { icon: Star, href: "/agents/reviews-agent", accent: "bg-amber-500" },
];

export default function UseCasesSection() {
  const { dict } = useLanguage();
  const uc = dict.useCases;
  return (
    <section id="casi" className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl 3xl:max-w-[1720px] px-4 sm:px-6 lg:px-8">
        <motion.div className="mx-auto max-w-3xl text-center" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
          <div className="mb-4 flex items-center justify-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-brand-400">{uc.eyebrow}</span>
          </div>
          <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">{uc.titleA} <span className="bg-linear-to-r from-brand-500 to-pink-500 bg-clip-text text-transparent">{uc.titleB}</span></h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-7 text-neutral-400">{uc.subtitle}</p>
        </motion.div>

        <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2">
          {uc.cases.map((c, i) => {
            const meta = META[i] ?? META[0];
            return (
            <motion.div key={c.title} className="rounded-2xl border border-white/5 bg-neutral-900 p-5" initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35 }}>
              <div className="flex items-center gap-2">
                <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${meta.accent} text-white`}><meta.icon size={16} /></span>
                <span className="text-xs font-bold uppercase tracking-wide text-neutral-500">{c.eyeb}</span>
              </div>
              <p className="mt-3 text-sm font-bold text-white">{c.title}</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-amber-200/80">{uc.problemPrefix}{c.problem}</p>
              <p className="mt-2 text-xs font-bold text-neutral-400">{c.agent}</p>
              <ul className="mt-2 grid grid-cols-2 gap-1.5">
                {c.tasks.map((task) => (
                  <li key={task} className="rounded-full bg-white/5 px-2.5 py-1 text-xs font-bold text-neutral-300">{task}</li>
                ))}
              </ul>
              <Link href={meta.href} className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand-400 hover:text-brand-300">{uc.tryAgent} <ArrowRight size={12} /></Link>
            </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
