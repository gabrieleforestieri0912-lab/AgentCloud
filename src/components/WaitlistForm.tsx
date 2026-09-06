"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail } from "lucide-react";
import Image from "next/image";
import FloatingBrandBubbles, {
  type FloatingBubble,
} from "@/components/FloatingBrandBubbles";
import CountdownTimer from "@/components/CountdownTimer";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/components/LanguageProvider";
import { PUBLIC_SUPPORT_EMAIL } from "@/lib/email-config";
import { MAX_SPOTS } from "@/lib/waitlist-constants";

// Cookie flags (mirrors the server-side constants in /api/waitlist).
const JOINED_COOKIE = "ac_wl_joined";
const JOINED_EMAIL_COOKIE = "ac_wl_email";

// Floating brand marks echoing the hero constellation — ties the waitlist into
// the landing page's visual language. A rich spread of companies (density is
// deliberate: on the landing page the waitlist reads as "the whole market is
// waiting for it").
const FLOATING_BUBBLES: FloatingBubble[] = [
  { top: "5%", left: "27%", size: "w-12 h-12", brand: "google", delay: "0.6s", anim: "animate-float-gentle" },
  { top: "8%", left: "7%", size: "w-12 h-12", brand: "shopify", delay: "0s", anim: "animate-float-gentle" },
  { top: "10%", left: "57%", size: "w-11 h-11", brand: "discord", delay: "1.4s", anim: "animate-float-gentle" },
  { top: "14%", left: "85%", size: "w-11 h-11", brand: "stripe", delay: "1.2s", anim: "animate-float-reverse" },
  { top: "22%", left: "3%", size: "w-10 h-10", brand: "calendly", delay: "1.1s", anim: "animate-float-reverse" },
  { top: "20%", left: "88%", size: "w-11 h-11", brand: "mailchimp", delay: "0.3s", anim: "animate-float-gentle" },
  { top: "32%", left: "91%", size: "w-12 h-12", brand: "gmail", delay: "1.9s", anim: "animate-float-reverse" },
  { top: "36%", left: "4%", size: "w-10 h-10", brand: "instagram", delay: "0.7s", anim: "animate-float-gentle" },
  { top: "44%", left: "7%", size: "w-12 h-12", brand: "trello", delay: "1.8s", anim: "animate-float-reverse" },
  { top: "46%", left: "84%", size: "w-10 h-10", brand: "paypal", delay: "0.5s", anim: "animate-float-gentle" },
  { top: "56%", left: "87%", size: "w-10 h-10", brand: "notion", delay: "2.2s", anim: "animate-float-gentle" },
  { top: "60%", left: "9%", size: "w-11 h-11", brand: "whatsapp", delay: "0.4s", anim: "animate-float-reverse" },
  { top: "64%", left: "22%", size: "w-11 h-11", brand: "github", delay: "1.0s", anim: "animate-float-reverse" },
  { top: "66%", left: "70%", size: "w-12 h-12", brand: "dropbox", delay: "1.7s", anim: "animate-float-gentle" },
  { top: "80%", left: "16%", size: "w-10 h-10", brand: "hubspot", delay: "1.5s", anim: "animate-float-gentle" },
  { top: "82%", left: "78%", size: "w-12 h-12", brand: "facebook", delay: "0.9s", anim: "animate-float-reverse" },
  { top: "89%", left: "42%", size: "w-10 h-10", brand: "woocommerce", delay: "2.4s", anim: "animate-float-gentle" },
  { top: "92%", left: "5%", size: "w-11 h-11", brand: "meta", delay: "1.3s", anim: "animate-float-reverse" },
];

export default function WaitlistForm({
  initialRemaining,
}: {
  // Authoritative remaining count read from the database server-side, so the
  // number is correct on the very first render (no fake 10/10 flash).
  initialRemaining: number;
}) {
  const { dict, locale } = useLanguage();
  // The field accepts an email (join the waitlist) OR the access code (enter
  // the platform directly) — the server tells them apart.
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(
    () =>
      typeof document !== "undefined" &&
      document.cookie.includes("ac_wl_joined=1"),
  );
  const [error, setError] = useState("");
  // Starts from the server-provided value (no client-only fallback), so a
  // refresh keeps the real count. Updated again on mount and after submit to
  // stay in sync with the database.
  const [remainingSpots, setRemainingSpots] = useState(initialRemaining);

  // Re-sync with the database on mount: authoritative spots count, and (when
  // a previous join is remembered) whether the signup still exists. If the
  // owner deleted the entry, clear the cookies so the form shows again instead
  // of a stale success message.
  useEffect(() => {
    fetch("/api/waitlist")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        if (typeof data.remaining === "number") {
          setRemainingSpots(data.remaining);
        }
        if (data.verified === true && data.joined === false) {
          document.cookie = `${JOINED_COOKIE}=; max-age=0; path=/`;
          document.cookie = `${JOINED_EMAIL_COOKIE}=; max-age=0; path=/`;
          setIsSuccess(false);
        } else if (data.joined === true) {
          setIsSuccess(true);
        }
      })
      .catch(() => {
        // keep the client-side state on network errors
      });
  }, []);

  // Error messages are transient alerts: auto-clear after a few seconds so they
  // only briefly warn the user without blocking the form.
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 4000);
    return () => clearTimeout(t);
  }, [error]);
  // Derived — the waitlist is full when no spots are left (no separate setter).
  const isFull = remainingSpots <= 0;
  // The counter shows spots TAKEN (out of MAX_SPOTS), so it reads "4/20" and
  // grows as people join — the bar below fills with the same ratio.
  const takenSpots = Math.min(MAX_SPOTS, Math.max(0, MAX_SPOTS - remainingSpots));
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [message, setMessage] = useState("");

  const handleEmailSend = () => {
    const subject =
      locale === "it" ? "Richiesta AgentCloud" : "AgentCloud inquiry";
    window.location.href = `mailto:${PUBLIC_SUPPORT_EMAIL}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(message)}`;
    setShowEmailModal(false);
    setMessage("");
  };

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
        // The 409 response carries the authoritative remaining count too, so
        // the counter stays in sync even when the join was a duplicate.
        if (typeof data.remaining === "number") {
          setRemainingSpots(data.remaining);
        }
        if (res.status === 409) {
          setError(dict.waitlist.alreadyOnList);
        } else {
          setError(data.error || dict.waitlist.somethingWrong);
        }
        setIsSubmitting(false);
        return;
      }

      if (typeof data.remaining === "number") {
        setRemainingSpots(data.remaining);
      }
      // Access-code holders (validated server-side) are let straight into the
      // platform — every agent is unlocked for them, no success card needed.
      if (data.accessGranted) {
        window.location.href = "/";
        return;
      }
      setIsSuccess(true);
      setEmail("");
    } catch {
      setError(dict.waitlist.networkError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="relative flex min-h-dvh overflow-x-hidden bg-[linear-gradient(180deg,#0a0a0f_0%,#12121a_58%,#0a0a0f_100%)] px-4 py-6 sm:py-10">
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

      {/* Language toggle — top-right of the page */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageToggle />
      </div>

      <motion.div
        className="relative z-10 m-auto w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 justify-center mb-8">
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
        </div>

        {/* Card */}
        <div className="bg-neutral-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-5 sm:p-8 shadow-[0_12px_36px_rgba(0,0,0,0.4)]">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-3xl font-extrabold text-white mb-2 text-center">
              {dict.waitlist.title} <span className="text-brand-400">{dict.waitlist.titleAccent}</span>
            </h1>
            <p className="text-neutral-400 text-center mb-6">
              {dict.waitlist.subtitle}
            </p>

            {/* Countdown Timer */}
            <CountdownTimer locale={locale} />

            {/* Spots — compact inline */}
            <div className="flex items-center justify-center gap-2 mb-5">
              <span className="text-xs font-semibold text-neutral-500">
                {dict.waitlist.takenSpots}:
              </span>
              <span className="text-sm font-bold text-brand-400">
                {takenSpots}/{MAX_SPOTS}
              </span>
              <div className="w-20 bg-neutral-700 rounded-full h-1.5">
                {/* Barra dei posti OCCUPATI: si riempie con le iscrizioni, quindi
                    quando la waitlist è piena (0 rimanenti) la barra è piena. */}
                <motion.div
                  className="bg-linear-to-r from-brand-500 to-pink-500 h-1.5 rounded-full"
                  initial={{ width: `${((MAX_SPOTS - remainingSpots) / MAX_SPOTS) * 100}%` }}
                  animate={{ width: `${((MAX_SPOTS - remainingSpots) / MAX_SPOTS) * 100}%` }}
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
                <p className="text-neutral-400 text-sm mb-4">
                  {dict.waitlist.successText}
                </p>
                <p className="text-xs font-semibold text-neutral-500 mb-3">
                  {locale === "it"
                    ? "Seguici per gli aggiornamenti:"
                    : "Follow us for updates:"}
                </p>
                <div className="flex items-center justify-center gap-4">
                  <a
                    href="https://www.instagram.com/_agentcloud/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-neutral-400 hover:text-white transition-colors"
                  >
                    Instagram
                  </a>
                  <a
                    href="https://www.linkedin.com/in/agent-cloud-323218431/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-neutral-400 hover:text-white transition-colors"
                  >
                    LinkedIn
                  </a>
                  <a
                    href="https://x.com/AgentCloud2k"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-neutral-400 hover:text-white transition-colors"
                  >
                    X
                  </a>
                </div>
              </motion.div>
            ) : (
              <>
                {/* Waitlist-full notice: blocks only new email signups — the
                    access code still works below. */}
                {isFull && (
                  <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-center">
                    <h3 className="text-sm font-bold text-white">
                      {dict.waitlist.fullTitle}
                    </h3>
                    <p className="mt-1 text-sm text-neutral-400">
                      {dict.waitlist.fullText}
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowEmailModal(true)}
                      className="mt-3 inline-flex items-center justify-center gap-2 rounded-full bg-linear-to-r from-brand-500 to-pink-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:opacity-90"
                    >
                      <Mail size={14} />
                      {dict.waitlist.emailButton}
                    </button>
                  </div>
                )}

                {/* Single field: an email joins the waitlist, the access code
                    unlocks the platform directly (server-side check). */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <input
                      type="text"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError("");
                      }}
                      placeholder={dict.waitlist.placeholder}
                      autoComplete="off"
                      className="w-full bg-neutral-800 border border-white/10 rounded-full px-5 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                      disabled={isSubmitting}
                    />
                    {error && (
                      <p className="text-red-400 text-sm mt-2">{error}</p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      // The waitlist being full blocks only new email signups.
                      (isFull && email.trim() !== "" && !email.includes("@"))
                    }
                    className="w-full bg-linear-to-r from-brand-500 to-pink-500 text-white font-semibold py-3 px-6 rounded-full hover:opacity-90 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 shadow-lg shadow-brand-500/25 hover:shadow-xl hover:shadow-brand-500/30"
                  >
                    {isSubmitting
                      ? dict.waitlist.joining
                      : dict.waitlist.joinWaitlist}
                  </button>
                </form>
              </>
            )}

            <p className="text-neutral-500 text-xs text-center mt-6">
              {dict.waitlist.agreeNote}
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* Email popup — shown when the waitlist is full */}
      <AnimatePresence>
        {showEmailModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEmailModal(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-900 p-6 shadow-2xl">
                <h3 className="mb-1 text-lg font-bold text-white">
                  {dict.waitlist.emailModalTitle}
                </h3>
                <p className="mb-4 text-sm text-neutral-400">
                  {PUBLIC_SUPPORT_EMAIL}
                </p>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={dict.waitlist.emailModalPlaceholder}
                  rows={5}
                  className="w-full resize-none rounded-xl border border-white/10 bg-neutral-800 px-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowEmailModal(false)}
                    className="flex-1 rounded-full border border-white/10 px-4 py-2.5 text-sm font-semibold text-neutral-300 transition-colors hover:bg-white/5"
                  >
                    {dict.waitlist.emailModalCancel}
                  </button>
                  <button
                    type="button"
                    onClick={handleEmailSend}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-linear-to-r from-brand-500 to-pink-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:opacity-90"
                  >
                    <Mail size={16} />
                    {dict.waitlist.emailModalSend}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}