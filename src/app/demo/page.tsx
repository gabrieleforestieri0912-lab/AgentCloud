/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState } from "react";
import {
  Check,
  AlertCircle,
  Loader2,
  Sparkles,
  ShieldCheck,
  Zap,
  BarChart3,
} from "lucide-react";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const BENEFITS = [
  {
    icon: Zap,
    title: "AI-powered automation",
    text: "Deploy agents that handle support, sales, finance, and operations autonomously.",
  },
  {
    icon: ShieldCheck,
    title: "Enterprise-grade security",
    text: "Your data is encrypted, isolated, and compliant with industry standards.",
  },
  {
    icon: BarChart3,
    title: "Measurable results",
    text: "Track runs, success rates, and ROI from a single dashboard.",
  },
];

export default function DemoPage() {
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
        throw new Error(data.error || "Failed to send request");
      }

      setSuccess(true);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950">
      <Navbar />

      <section className="px-4 pb-24 pt-32 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-16 lg:grid-cols-[1fr_420px] lg:items-start">
            {/* Product presentation */}
            <div>
              <div className="mb-6 flex items-center gap-2">
                <Sparkles size={13} className="text-brand-400" />
                <span className="text-xs font-bold uppercase tracking-[0.08em] text-brand-400">
                  Demo
                </span>
              </div>

              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                See AgentCloud
                <br />
                <span className="text-brand-400">in action.</span>
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-neutral-400">
                Book a personalized walkthrough. We'll show you how AI agents
                can automate your support, sales, finance, and operational
                workflows — no code required.
              </p>

              <div className="mt-12 space-y-8">
                {BENEFITS.map((ben) => (
                  <div key={ben.title} className="flex gap-4">
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
                  </div>
                ))}
              </div>

              <div className="mt-12 rounded-2xl border border-white/5 bg-neutral-900 p-6">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Image
                    src="/agentcloud.png"
                    alt="AgentCloud"
                    width={18}
                    height={18}
                    className="text-brand-400"
                  />
                  What to expect
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    "30-minute live demo tailored to your business",
                    "Walkthrough of pre-built agents and custom workflows",
                    "Q&A with our product team",
                    "No commitment — explore at your pace",
                  ].map((item) => (
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
              </div>
            </div>

            {/* Form */}
            <div className="rounded-2xl border border-white/5 bg-neutral-900 p-8 shadow-xl shadow-black/30">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white">Request a demo</h2>
                <p className="mt-1 text-sm text-neutral-400">
                  Fill in your details and we'll get back to you within 24
                  hours.
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
                    First name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John"
                    required
                    disabled={success}
                    className="w-full rounded-xl border border-white/5 bg-neutral-800 px-4 py-2.5 text-sm text-white placeholder-neutral-500 outline-none transition-all focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-300 mb-1.5">
                    Last name
                  </label>
                  <input
                    type="text"
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                    placeholder="Doe"
                    required
                    disabled={success}
                    className="w-full rounded-xl border border-white/5 bg-neutral-800 px-4 py-2.5 text-sm text-white placeholder-neutral-500 outline-none transition-all focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-300 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@company.com"
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
                  Request demo
                </button>

                <p className="text-center text-xs text-neutral-500">
                  We'll reach out to schedule a personalized demo
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
                      Request sent!
                    </h3>
                    <p className="mt-2 text-sm text-neutral-400">
                      Thanks, {name}. We've received your demo request and
                      will reach out within 24 hours.
                    </p>
                    <button
                      onClick={() => setSuccess(false)}
                      className="mt-6 w-full rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/20"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
