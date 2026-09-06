"use client";

import { useState } from "react";
import { motion, type Variants } from "framer-motion";
import {
  Check,
  AlertCircle,
  Loader2,
  Sparkles,
  ShieldCheck,
  Zap,
  BarChart3,
  Send,
  CreditCard,
  LayoutDashboard,
  Plug,
  MessageSquareText,
} from "lucide-react";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FloatingBrandBubbles, {
  type FloatingBubble,
} from "@/components/FloatingBrandBubbles";
import { useLanguage } from "@/components/LanguageProvider";
import { t } from "@/lib/i18n/dictionaries";

// Floating brand marks in the side gutters — same visual language as the hero
// constellation, kept clear of the two-column content.
const FLOATING_BUBBLES: FloatingBubble[] = [
  { top: "16%", left: "6%", size: "w-12 h-12", brand: "shopify", delay: "0s", anim: "animate-float-gentle" },
  { top: "14%", left: "88%", size: "w-11 h-11", brand: "stripe", delay: "1.2s", anim: "animate-float-reverse" },
  { top: "30%", left: "3%", size: "w-10 h-10", brand: "instagram", delay: "0.7s", anim: "animate-float-gentle" },
  { top: "28%", left: "93%", size: "w-12 h-12", brand: "gmail", delay: "1.9s", anim: "animate-float-reverse" },
  { top: "46%", left: "7%", size: "w-11 h-11", brand: "whatsapp", delay: "0.4s", anim: "animate-float-reverse" },
  { top: "44%", left: "90%", size: "w-10 h-10", brand: "notion", delay: "2.2s", anim: "animate-float-gentle" },
  { top: "62%", left: "4%", size: "w-10 h-10", brand: "hubspot", delay: "1.5s", anim: "animate-float-gentle" },
  { top: "60%", left: "92%", size: "w-12 h-12", brand: "facebook", delay: "0.9s", anim: "animate-float-reverse" },
  { top: "70%", left: "10%", size: "w-11 h-11", brand: "discord", delay: "1.8s", anim: "animate-float-gentle" },
  { top: "72%", left: "84%", size: "w-10 h-10", brand: "google", delay: "0.5s", anim: "animate-float-reverse" },
];

const BENEFIT_ICONS = [Zap, ShieldCheck, BarChart3];
const STEP_ICONS = [Send, CreditCard, LayoutDashboard, Plug, MessageSquareText];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

export default function DemoPage() {
  const { dict } = useLanguage();
  const benefits = dict.demo.benefits.map((b, i) => ({
    ...b,
    icon: BENEFIT_ICONS[i] ?? Zap,
  }));
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/demo/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, surname, email }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || dict.demo.failedRequest);
      }

      setSuccess(true);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError(dict.demo.somethingWrong);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#0a0a0f_0%,#12121a_58%,#0a0a0f_100%)]">
      <Navbar />

      {/* Decorative background — same language as the hero section */}
      <div className="absolute inset-x-0 top-16 h-px bg-linear-to-r from-transparent via-brand-500/30 to-transparent" />
      <div
        className="absolute inset-0 opacity-40 pointer-events-none select-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 20%, rgba(3,139,254,.18), transparent 32%), radial-gradient(circle at 85% 15%, rgba(234,67,53,.14), transparent 28%), radial-gradient(circle at 50% 92%, rgba(168,85,247,.14), transparent 36%)",
        }}
      />
      <FloatingBrandBubbles bubbles={FLOATING_BUBBLES} />

      <section className="relative z-10 px-4 pb-24 pt-32 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-16 lg:grid-cols-[1fr_420px] lg:items-start">
            {/* Product presentation */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              variants={{
                hidden: {},
                visible: {
                  transition: { staggerChildren: 0.12, delayChildren: 0.05 },
                },
              }}
            >
              <motion.div
                variants={fadeUp}
                className="mb-6 flex items-center gap-2"
              >
                <Sparkles size={13} className="text-brand-400" />
                <span className="text-xs font-bold uppercase tracking-[0.08em] text-brand-400">
                  {dict.demo.badge}
                </span>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl"
              >
                {dict.demo.titleA}
                <br />
                <span className="text-brand-400">{dict.demo.titleB}</span>
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="mt-6 max-w-xl text-lg leading-8 text-neutral-400"
              >
                {dict.demo.subtitle}
              </motion.p>

              <motion.div
                variants={{
                  hidden: {},
                  visible: {
                    transition: { staggerChildren: 0.1 },
                  },
                }}
                className="mt-12 space-y-8"
              >
                {benefits.map((ben) => (
                  <motion.div
                    key={ben.title}
                    variants={fadeUp}
                    className="flex gap-4"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400">
                      <ben.icon size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">
                        {ben.title}
                      </h3>
                      <p className="mt-1 text-sm text-neutral-400">
                        {ben.text}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              <motion.div
                variants={fadeUp}
                className="mt-12 rounded-2xl border border-white/5 bg-neutral-900 p-6"
              >
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Image
                    src="/agentcloud.png"
                    alt="AgentCloud"
                    width={18}
                    height={18}
                    className="text-brand-400"
                  />
                  {dict.demo.whatToExpect}
                </div>
                <div className="mt-4 space-y-3">
                  {dict.demo.expectations.map((item) => (
                    <div
                      key={item}
                      className="flex items-start gap-2.5 text-sm text-neutral-400"
                    >
                      <Check
                        size={16}
                        className="mt-0.5 text-purple-400 shrink-0"
                      />
                      {item}
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>

            {/* Form */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
              className="rounded-2xl border border-white/5 bg-neutral-900 p-8 shadow-xl shadow-black/30"
            >
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white">{dict.demo.requestDemo}</h2>
                <p className="mt-1 text-sm text-neutral-400">
                  {dict.demo.requestDemoHint}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
                    <AlertCircle size={16} className="text-red-400 shrink-0" />
                    <p className="text-sm font-semibold text-red-400">
                      {error}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-neutral-300 mb-1.5">
                    {dict.demo.firstName}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={dict.demo.firstNamePh}
                    required
                    disabled={success}
                    className="w-full rounded-xl border border-white/5 bg-neutral-800 px-4 py-2.5 text-sm text-white placeholder-neutral-500 outline-none transition-all focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-300 mb-1.5">
                    {dict.demo.lastName}
                  </label>
                  <input
                    type="text"
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                    placeholder={dict.demo.lastNamePh}
                    required
                    disabled={success}
                    className="w-full rounded-xl border border-white/5 bg-neutral-800 px-4 py-2.5 text-sm text-white placeholder-neutral-500 outline-none transition-all focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-300 mb-1.5">
                    {dict.demo.email}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={dict.demo.emailPh}
                    required
                    disabled={success}
                    className="w-full rounded-xl border border-white/5 bg-neutral-800 px-4 py-2.5 text-sm text-white placeholder-neutral-500 outline-none transition-all focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 disabled:opacity-50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || success}
                  className="w-full rounded-xl bg-brand-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/20 transition-all hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  {dict.demo.requestButton}
                </button>

                <p className="text-center text-xs text-neutral-500">
                  {dict.demo.scheduleNote}
                </p>
              </form>

              {/* Overlay + Success Modal */}
              {success && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
                  <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-neutral-900 p-8 shadow-2xl shadow-black/40 text-center animate-fade-in">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500">
                        <Check size={22} className="text-white" />
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-white">
                      {dict.demo.successTitle}
                    </h3>
                    <p className="mt-2 text-sm text-neutral-400">
                      {t(dict.demo.successText, { name })}
                    </p>
                    <button
                      onClick={() => setSuccess(false)}
                      className="mt-6 w-full rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/20"
                    >
                      {dict.demo.close}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* How it works after the demo request — explains the journey from
          request to a working agent for the client. */}
      <section className="relative z-10 px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mb-12 text-center"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-4 py-1.5">
              <Sparkles size={13} className="text-brand-400" />
              <span className="text-xs font-bold uppercase tracking-[0.08em] text-brand-400">
                {dict.demo.howToUse.badge}
              </span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {dict.demo.howToUse.titleA}{" "}
              <span className="text-brand-400">
                {dict.demo.howToUse.titleB}
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-neutral-400">
              {dict.demo.howToUse.subtitle}
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.12 } },
            }}
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {dict.demo.howToUse.steps.map((step, i) => {
              const Icon = STEP_ICONS[i] ?? Sparkles;
              return (
                <motion.div
                  key={step.title}
                  variants={fadeUp}
                  className="group relative rounded-2xl border border-white/5 bg-neutral-900 p-6 transition-all duration-300 hover:border-brand-500/30 hover:bg-neutral-900/60"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 transition-colors group-hover:bg-brand-500/20">
                      <Icon size={20} />
                    </div>
                    <span className="text-xs font-black tracking-widest text-white/15">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-neutral-400">
                    {step.text}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      <div className="relative z-10">
        <Footer />
      </div>
    </main>
  );
}
