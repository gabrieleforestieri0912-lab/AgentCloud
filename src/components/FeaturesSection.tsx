"use client";
import Link from "next/link";
import {
  Mail,
  MessageSquare,
  BarChart3,
  Megaphone,
  Users,
  Briefcase,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "./LanguageProvider";

const FEATURE_ICONS = [MessageSquare, Megaphone, BarChart3, Users, Mail, Briefcase];

export default function FeaturesSection() {
  const { dict } = useLanguage();
  const features = dict.features.items;

  return (
    <section id="solutions" className="py-24">
      <div className="max-w-7xl 3xl:max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="mb-6 flex items-center justify-center gap-2">
            <Sparkles size={13} className="text-brand-400" />
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-brand-400">
              {dict.features.badge}
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
            {dict.features.titleA}
            <br />
            <span className="bg-linear-to-r from-brand-500 to-pink-500 bg-clip-text text-transparent">
              {dict.features.titleB}
            </span>
          </h2>
          <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
            {dict.features.subtitle}
          </p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-3 3xl:grid-cols-4 gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: 0.08,
              },
            },
          }}
        >
          {features.map((feature, i) => {
            const Icon = FEATURE_ICONS[i] ?? Sparkles;
            return (
              <motion.div
                key={feature.title}
                className="bg-neutral-900 rounded-2xl border border-white/5 p-6 hover:border-brand-500/30 hover:shadow-lg hover:shadow-brand-500/5 hover:-translate-y-1 transition-all duration-300 group"
                variants={{
                  hidden: { opacity: 0, scale: 0.95 },
                  visible: {
                    opacity: 1,
                    scale: 1,
                    transition: { duration: 0.5, ease: "easeOut" },
                  },
                }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl mb-4 bg-neutral-800 text-neutral-400 group-hover:bg-brand-500 group-hover:text-white transition-all duration-300">
                  <Icon size={20} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm font-semibold text-neutral-400">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Link
            href="/agents"
            className="inline-flex items-center gap-2 bg-brand-500 text-white px-8 py-3.5 rounded-full font-medium hover:bg-brand-400 hover:-translate-y-0.5 transition-all"
          >
            {dict.features.cta}
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
