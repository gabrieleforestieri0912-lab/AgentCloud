"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

const MAX_SPOTS = 7;

export default function WaitlistPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isFull, setIsFull] = useState(false);
  const [error, setError] = useState("");
  const [remainingSpots, setRemainingSpots] = useState(MAX_SPOTS);

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
          setError("This email is already on the waitlist");
        } else {
          setError(data.error || "Something went wrong");
        }
        setIsSubmitting(false);
        return;
      }

      setRemainingSpots((prev) => prev - 1);
      setIsSuccess(true);
      setEmail("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#0a0a0f_0%,#12121a_58%,#0a0a0f_100%)] flex items-center justify-center px-4 py-20">
      <motion.div
        className="w-full max-w-md"
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
            <h1 className="text-3xl font-extrabold text-white mb-3 text-center">
              Join the Waitlist
            </h1>
            <p className="text-neutral-400 text-center mb-6">
              Be among the first to experience AI-powered automation. Limited spots available.
            </p>

            {/* Spots Counter */}
            <div className="bg-neutral-800/50 border border-white/5 rounded-2xl p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-neutral-300">
                  Remaining Spots
                </span>
                <span className="text-2xl font-bold text-brand-400">
                  {remainingSpots}/{MAX_SPOTS}
                </span>
              </div>
              <div className="w-full bg-neutral-700 rounded-full h-2">
                <motion.div
                  className="bg-gradient-to-r from-brand-500 to-pink-500 h-2 rounded-full"
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
                  You're on the list!
                </h3>
                <p className="text-neutral-400 text-sm">
                  We'll notify you when AgentCloud is ready.
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
                  Waitlist is Full
                </h3>
                <p className="text-neutral-400 text-sm">
                  All spots have been taken. Check back later!
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full bg-neutral-800 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                    disabled={isSubmitting}
                  />
                  {error && (
                    <p className="text-red-400 text-sm mt-2">{error}</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || remainingSpots === 0}
                  className="w-full bg-gradient-to-r from-brand-500 to-pink-500 text-white font-semibold py-3 px-6 rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-500/25"
                >
                  {isSubmitting ? "Joining..." : "Join Waitlist"}
                </button>
              </form>
            )}

            <p className="text-neutral-500 text-xs text-center mt-6">
              By joining, you agree to receive updates about AgentCloud.
            </p>
          </motion.div>
        </div>

        {/* Back to home */}
        <Link
          href="/"
          className="block text-center text-neutral-400 hover:text-white text-sm mt-6 transition-colors"
        >
          ← Back to home
        </Link>
      </motion.div>
    </div>
  );
}
