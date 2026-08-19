"use client";

import { useState } from "react";
import {
  Check,
  AlertCircle,
  Loader2,
  Mail,
  MessageSquare,
  Sparkles,
  Send,
} from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/components/LanguageProvider";
import { t } from "@/lib/i18n/dictionaries";

const CONTACT_REASON_ICONS = [MessageSquare, Sparkles, Mail, Sparkles, MessageSquare];

export default function ContactPage() {
  const { dict } = useLanguage();
  const contactReasons = dict.contact.reasons.map((label, i) => ({
    label,
    icon: CONTACT_REASON_ICONS[i] ?? MessageSquare,
  }));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || dict.contact.failedSend);
      }

      setSuccess(true);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError(dict.contact.somethingWrong);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950">
      <Navbar />

      <section className="px-4 pb-24 pt-32 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-16 lg:grid-cols-[1fr_480px] lg:items-start">
            {/* Left: Info */}
            <div>
              <div className="mb-6 flex items-center gap-2">
                <Sparkles size={13} className="text-brand-400" />
                <span className="text-xs font-bold uppercase tracking-[0.08em] text-brand-400">
                  {dict.contact.badge}
                </span>
              </div>

              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                {dict.contact.title}
              </h1>

              <p className="mt-4 max-w-xl text-lg leading-8 text-neutral-400">
                {dict.contact.subtitle}
              </p>

              <div className="mt-10 space-y-6">
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400">
                    <Mail size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{dict.contact.emailUs}</h3>
                    <Link
                      href="mailto:info@agentcloud.io"
                      className="text-sm font-semibold text-neutral-400 hover:text-brand-400 transition-colors"
                    >
                      info@agentcloud.io
                    </Link>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400">
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {dict.contact.scheduleCall}
                    </h3>
                    <Link
                      href="/demo"
                      className="text-sm font-semibold text-neutral-400 hover:text-brand-400 transition-colors"
                    >
                      {dict.contact.bookDemo}
                    </Link>
                  </div>
                </div>
              </div>

              <div className="mt-12 rounded-2xl border border-white/5 bg-neutral-900 p-6">
                <h3 className="text-sm font-bold text-white">
                  {dict.contact.responseTime}
                </h3>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2.5 text-sm text-neutral-400">
                    <Check size={16} className="text-purple-400 shrink-0" />
                    {dict.contact.reply24}
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-neutral-400">
                    <Check size={16} className="text-purple-400 shrink-0" />
                    {dict.contact.weekdays}
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-neutral-400">
                    <Check size={16} className="text-purple-400 shrink-0" />
                    {dict.contact.enterprise}
                  </div>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="rounded-2xl border border-white/5 bg-neutral-900 p-8 shadow-xl shadow-black/30">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white">{dict.contact.sendMessage}</h2>
                <p className="mt-1 text-sm text-neutral-400">
                  {dict.contact.sendMessageHint}
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
                  <label className="mb-1.5 block text-sm font-semibold text-neutral-300">
                    {dict.contact.name}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={dict.contact.namePh}
                    required
                    disabled={success}
                    className="w-full rounded-xl border border-white/5 bg-neutral-800 px-4 py-2.5 text-sm text-white placeholder-neutral-500 outline-none transition-all focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-neutral-300">
                    {dict.contact.email}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={dict.contact.emailPh}
                    required
                    disabled={success}
                    className="w-full rounded-xl border border-white/5 bg-neutral-800 px-4 py-2.5 text-sm text-white placeholder-neutral-500 outline-none transition-all focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-neutral-300">
                    {dict.contact.subject}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {contactReasons.map((r) => {
                      const selected = subject === r.label;
                      return (
                        <button
                          key={r.label}
                          type="button"
                          disabled={success}
                          onClick={() => setSubject(r.label)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                            selected
                              ? "bg-brand-500 text-white"
                              : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
                          } disabled:opacity-50`}
                        >
                          <r.icon size={12} />
                          {r.label}
                        </button>
                      );
                    })}
                  </div>
                  {subject && (
                    <p className="mt-1.5 text-xs text-brand-400">
                      {t(dict.contact.selected, { subject })}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-neutral-300">
                    {dict.contact.message}
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={dict.contact.messagePh}
                    required
                    disabled={success}
                    rows={5}
                    className="w-full rounded-xl border border-white/5 bg-neutral-800 px-4 py-2.5 text-sm text-white placeholder-neutral-500 outline-none transition-all focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 disabled:opacity-50 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || success || !subject}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/20 transition-all hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  <Send size={16} />
                  {dict.contact.sendButton}
                </button>
              </form>

              {success && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
                  <div className="w-full max-w-sm animate-fade-in rounded-2xl border border-white/10 bg-neutral-900 p-8 text-center shadow-2xl shadow-black/40">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500">
                        <Check size={22} className="text-white" />
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-white">
                      {dict.contact.successTitle}
                    </h3>
                    <p className="mt-2 text-sm text-neutral-400">
                      {t(dict.contact.successText, { name })}
                    </p>
                    <button
                      onClick={() => setSuccess(false)}
                      className="mt-6 w-full rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/20"
                    >
                      {dict.contact.close}
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