"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import FloatingBrandBubbles, {
  type FloatingBubble,
} from "@/components/FloatingBrandBubbles";
import { useLanguage } from "@/components/LanguageProvider";

const MAX_SPOTS = 7;

// Floating brand marks echoing the hero constellation — ties the waitlist into
// the landing page's visual language.
const FLOATING_BUBBLES: FloatingBubble[] = [
  { top: "8%", left: "7%", size: "w-12 h-12", brand: "shopify", delay: "0s", anim: "animate-float-gentle" },
  { top: "14%", left: "85%", size: "w-11 h-11", brand: "stripe", delay: "1.2s", anim: "animate-float-reverse" },
  { top: "36%", left: "4%", size: "w-10 h-10", brand: "instagram", delay: "0.7s", anim: "animate-float-gentle" },
  { top: "32%", left: "91%", size: "w-12 h-12", brand: "gmail", delay: "1.9s", anim: "animate-float-reverse" },
  { top: "60%", left: "9%", size: "w-11 h-11", brand: "whatsapp", delay: "0.4s", anim: "animate-float-reverse" },
  { top: "56%", left: "87%", size: "w-10 h-10", brand: "notion", delay: "2.2s", anim: "animate-float-gentle" },
  { top: "80%", left: "16%", size: "w-10 h-10", brand: "hubspot", delay: "1.5s", anim: "animate-float-gentle" },
  { top: "82%", left: "78%", size: "w-12 h-12", brand: "facebook", delay: "0.9s", anim: "animate-float-reverse" },
];

export default function WaitlistPage() {
  const { dict } = useLanguage();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const [remainingSpots, setRemainingSpots] = useState(MAX_SPOTS);
  // Derived — the waitlist is full when no spots are left (no separate setter).
  const isFull = remainingSpots <= 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setError(dict.waitlist.alreadyOnList);
        } else {
          setError(data.error || dict.waitlist.somethingWrong);
        }
        setIsSubmitting(false);
        return;
      }

      setRemainingSpots((prev) => prev - 1);
      setIsSuccess(true);
      setEmail("");
    } catch {
      setError(dict.waitlist.networkError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="relative flex min-h-dvh overflow-hidden bg-[linear-gradient(180deg,#0a0a0f_0%,#12121a_58%,#0a0a0f_100%)] px-4 py-16 sm:py-20">
      {/* Decorative background — same language as the hero section */}
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-brand-500/30 to-transparent" />
      <div
        className="absolute inset-0 opacity-40 pointer-events-none select-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 20%, rgba(3,139,254,.18), transparent 32%), radial-gradient(circle at 85% 15%, rgba(234,67,53,.14), transparent 28%), radial-gradient(circle at 50% 92%, rgba(168,85,247,.14), transparent 36%)",
        }}
      />

      {/* Floating brand constellation */}
      <FloatingBrandBubbles bubbles={FLOATING_BUBBLES} />

      <motion.div
        className="relative z-10 m-auto w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 justify-center mb-8">
          <div className="relative h-10 w-10">
            <Image
              src="/agentcloud.png"
              alt="AgentCloud"
              fill
              className="object-cover"
              sizes="40px"
            />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">
            AgentCloud
          </span>
        </Link>

        {/* Card */}
        <div className="bg-neutral-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-[0_12px_36px_rgba(0,0,0,0.4)]">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {/* Live badge */}
            <div className="flex justify-center mb-5">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-neutral-950/60 px-3.5 py-1.5 text-xs font-bold tracking-wide text-neutral-300">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-400" />
                </span>
                {dict.waitlist.limitedAccess}
              </span>
            </div>

            <h1 className="text-3xl font-extrabold text-white mb-3 text-center">
              {dict.waitlist.title} <span className="text-brand-400">{dict.waitlist.titleAccent}</span>
            </h1>
            <p className="text-neutral-400 text-center mb-6">
              {dict.waitlist.subtitle}
            </p>

            {/* Spots Counter */}
            <div className="bg-neutral-800/50 border border-white/5 rounded-2xl p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-neutral-300">
                  {dict.waitlist.remainingSpots}
                </span>
                <span className="text-2xl font-bold text-brand-400">
                  {remainingSpots}/{MAX_SPOTS}
                </span>
              </div>
              <div className="w-full bg-neutral-700 rounded-full h-2">
                <motion.div
                  className="bg-linear-to-r from-brand-500 to-pink-500 h-2 rounded-full"
                  initial={{ width: "100%" }}
                  animate={{ width: `${(remainingSpots / MAX_SPOTS) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            {isSuccess ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center"
              >
                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  {dict.waitlist.successTitle}
                </h3>
                <p className="text-neutral-400 text-sm">
                  {dict.waitlist.successText}
                </p>
              </motion.div>
            ) : isFull ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center"
              >
                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  {dict.waitlist.fullTitle}
                </h3>
                <p className="text-neutral-400 text-sm">
                  {dict.waitlist.fullText}
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={dict.waitlist.placeholder}
                    className="w-full bg-neutral-800 border border-white/10 rounded-full px-5 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                    disabled={isSubmitting}
                  />
                  {error && (
                    <p className="text-red-400 text-sm mt-2">{error}</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || remainingSpots === 0}
                  className="w-full bg-linear-to-r from-brand-500 to-pink-500 text-white font-semibold py-3 px-6 rounded-full hover:opacity-90 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 shadow-lg shadow-brand-500/25 hover:shadow-xl hover:shadow-brand-500/30"
                >
                  {isSubmitting ? dict.waitlist.joining : dict.waitlist.joinWaitlist}
                </button>
              </form>
            )}

            <p className="text-neutral-500 text-xs text-center mt-6">
              {dict.waitlist.agreeNote}
            </p>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
