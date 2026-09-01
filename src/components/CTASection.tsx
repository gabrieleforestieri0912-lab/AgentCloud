"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "./LanguageProvider";

export default function CTASection() {
  const { dict } = useLanguage();
  return (
    <section
      id="demo"
      className="relative overflow-hidden px-4 py-24 sm:px-6 lg:px-8"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />

      <motion.div
        className="relative mx-auto max-w-5xl rounded-2xl border border-white/5 bg-[linear-gradient(135deg,#101014_0%,#12121f_58%,#0f1410_100%)] p-8 text-center shadow-2xl shadow-brand-500/10 sm:p-12"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={{
          hidden: { opacity: 0, y: 40 },
          visible: {
            opacity: 1,
            y: 0,
            transition: {
              duration: 0.6,
              ease: "easeOut",
              staggerChildren: 0.1,
              delayChildren: 0.1,
            },
          },
        }}
      >
        <motion.div
          className="mb-7 inline-flex h-12 w-12 items-center justify-center"
          variants={{
            hidden: { opacity: 0, scale: 0.8 },
            visible: {
              opacity: 1,
              scale: 1,
              transition: { type: "spring", stiffness: 100 },
            },
          }}
        >
          <Image
            src="/agentcloud.png"
            alt="AgentCloud"
            width={48}
            height={48}
            className="rounded-xl"
          />
        </motion.div>

        <motion.h2
          className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl"
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
          }}
        >
          {dict.cta.titleA}
          <br />
          <span className="text-brand-400">{dict.cta.titleB}</span>
        </motion.h2>

        <motion.p
          className="mx-auto mt-6 max-w-xl text-lg leading-8 text-neutral-400"
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
          }}
        >
          {dict.cta.subtitle}
        </motion.p>

        <motion.div
          className="mt-10 flex flex-col justify-center gap-3 sm:flex-row"
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
          }}
        >
          <Link
            href="/agents"
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-8 py-4 text-base font-bold text-white shadow-xl shadow-brand-500/20 transition-all hover:bg-brand-400 hover:-translate-y-0.5"
          >
            <Sparkles
              size={18}
              className="transition-transform group-hover:rotate-12"
            />
            {dict.cta.browseMarketplace}
            <ArrowRight
              size={18}
              className="transition-transform group-hover:translate-x-1"
            />
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-neutral-900 px-8 py-4 text-base font-bold text-white shadow-sm transition-all hover:border-white/20 hover:-translate-y-0.5"
          >
            {dict.cta.seeDashboard}
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
