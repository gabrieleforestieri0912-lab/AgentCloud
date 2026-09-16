"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Copy,
  Check,
  Sparkles,
  MessageCircle,
  ShoppingBag,
  BarChart3,
  Users,
  Zap,
  Clock,
  ShieldCheck,
  ArrowRight,
  ChevronDown,
  Loader2,
  X,
  LogIn,
  LayoutDashboard,
  MessageSquare,
  Store,
  Plug,
} from "lucide-react";
import Image from "next/image";
import FloatingBrandBubbles, { type FloatingBubble } from "@/components/FloatingBrandBubbles";
import CountdownTimer from "@/components/CountdownTimer";
import LanguageToggle from "@/components/LanguageToggle";
import BrandLogo from "@/components/BrandLogo";
import Footer from "@/components/Footer";
import InstagramFollowCard from "@/components/InstagramFollowCard";
import { AVAILABLE_AGENTS } from "@/lib/agents";
import { useLanguage } from "@/components/LanguageProvider";
import { createClient } from "@/lib/supabase/client";
import { PUBLIC_SUPPORT_EMAIL } from "@/lib/email-config";
import { validateAndSanitizeEmail, HONEYPOT_FIELD_NAME } from "@/lib/forms-security";

const JOINED_COOKIE = "ac_wl_joined";
const JOINED_EMAIL_COOKIE = "ac_wl_email";
const REF_COOKIE = "ac_wl_ref";

const FLOATING_BUBBLES: FloatingBubble[] = [
  { top: "4%", left: "18%", size: "w-11 h-11", brand: "google", delay: "0.6s", anim: "animate-float-gentle" },
  { top: "7%", left: "72%", size: "w-10 h-10", brand: "shopify", delay: "0s", anim: "animate-float-gentle" },
  { top: "12%", left: "4%", size: "w-10 h-10", brand: "discord", delay: "1.4s", anim: "animate-float-gentle" },
  { top: "15%", left: "88%", size: "w-10 h-10", brand: "stripe", delay: "1.2s", anim: "animate-float-reverse" },
  { top: "28%", left: "2%", size: "w-9 h-9", brand: "calendly", delay: "1.1s", anim: "animate-float-reverse" },
  { top: "32%", left: "92%", size: "w-10 h-10", brand: "mailchimp", delay: "0.3s", anim: "animate-float-gentle" },
  { top: "55%", left: "3%", size: "w-9 h-9", brand: "whatsapp", delay: "0.4s", anim: "animate-float-reverse" },
  { top: "60%", left: "90%", size: "w-10 h-10", brand: "notion", delay: "2.2s", anim: "animate-float-gentle" },
  { top: "78%", left: "6%", size: "w-10 h-10", brand: "github", delay: "1.0s", anim: "animate-float-reverse" },
  { top: "82%", left: "85%", size: "w-10 h-10", brand: "facebook", delay: "0.9s", anim: "animate-float-reverse" },
];

type QueueState = {
  position: number | null;
  total: number | null;
  referralCode: string | null;
  referralCount: number;
};

export default function WaitlistForm({ initialTotal }: { initialTotal: number }) {
  const { dict } = useLanguage();
  const w = dict.waitlist as unknown as Record<string, unknown> & {
    heroEyebrow: string; heroTitleA: string; heroTitleB: string; heroSub: string; heroTrust: string;
    heroCta: string; heroJoined: string; demoLiveBadge: string; demoUserMsg: string; demoAgentMsg: string;
    demoResolved: string; demoInputPlaceholder: string; howItWorksBadge: string; howItWorksTitle: string;
    step1Title: string; step1Desc: string; step1MockTitle: string; step1MockDesc: string;
    step2Title: string; step2Desc: string; step2Check1: string; step2Check2: string; step2Check3: string;
    step3Title: string; step3Desc: string; socialBadge: string; socialTitle: string;
    statAgents: string; statTasks: string; statTime: string; statUsers: string; inList: string;
    queueTitle: string; queueSubtitle: string; queuePosition: string; queueOf: string; queueInvited: string; queueFriends: string;
    queueLinkLabel: string; queueCopy: string; queueCopied: string; queueShare: string; queueRule: string;
    shareWhatsapp: string; shareX: string; shareEmail: string; shareSms: string; shareText: string;
    faqBadge: string; faqTitle: string; faqItems: { q: string; a: string }[]; footerCtaTitle: string; footerCtaSubtitle: string; noSpam: string;
    placeholder: string; joining: string; joinWaitlist: string; agreeNote: string; alreadyOnList: string; somethingWrong: string; networkError: string;
    continueWithGoogle: string; orWithEmail: string; redirectingToGoogle: string;
  };

  const [email, setEmail] = useState("");
  const [honeypotValue, setHoneypotValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showFaq, setShowFaq] = useState<number | null>(null);
  const [queue, setQueue] = useState<QueueState>({ position: null, total: initialTotal, referralCode: null, referralCount: 0 });
  const [ahead, setAhead] = useState<Array<{ rank: number; emailMasked: string }>>([]);
  const [isSuccess, setIsSuccess] = useState(() => typeof document !== "undefined" && document.cookie.includes("ac_wl_joined=1"));
  const [total, setTotal] = useState<number>(initialTotal);
  const [showForm, setShowForm] = useState(false);
  const [refFromUrl, setRefFromUrl] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref") || params.get("r");
    if (ref) {
      const cleanRef = ref.toLowerCase().slice(0, 32);
      setRefFromUrl(cleanRef);
      document.cookie = `${REF_COOKIE}=${encodeURIComponent(cleanRef)}; max-age=3600; path=/; SameSite=Lax`;
    }
  }, []);

  useEffect(() => {
    fetch("/api/waitlist")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        if (typeof data.total === "number") setTotal(data.total);
        if (Array.isArray(data.ahead)) setAhead(data.ahead);
        if (data.verified === true && data.joined === false) {
          document.cookie = `${JOINED_COOKIE}=; max-age=0; path=/`;
          document.cookie = `${JOINED_EMAIL_COOKIE}=; max-age=0; path=/`;
          setIsSuccess(false);
        } else if (data.joined === true) {
          setIsSuccess(true);
          setQueue({
            position: data.position ?? null,
            total: data.total ?? total,
            referralCode: data.referralCode ?? null,
            referralCount: data.referralCount ?? 0,
          });
          if (Array.isArray(data.ahead)) setAhead(data.ahead);
        } else if (typeof data.total === "number") {
          setQueue((q) => ({ ...q, total: data.total }));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 4000);
    return () => clearTimeout(t);
  }, [error]);

  // Blocca scroll quando modal aperto
  useEffect(() => {
    if (showForm) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [showForm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (honeypotValue.trim().length > 0) {
      setError("Richiesta non valida.");
      return;
    }
    const validation = validateAndSanitizeEmail(email, true);
    if (!validation.valid || !validation.email) {
      setError((validation.error as string) || (w.somethingWrong as string));
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: validation.email,
          [HONEYPOT_FIELD_NAME]: honeypotValue,
          ref: refFromUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (typeof data.total === "number") setTotal(data.total);
        if (Array.isArray(data.ahead)) setAhead(data.ahead);
        if (res.status === 409) {
          setIsSuccess(true);
          if (typeof data.position === "number") {
            setQueue({ position: data.position, total: data.total ?? total, referralCode: data.referralCode ?? null, referralCount: data.referralCount ?? 0 });
          }
          if (Array.isArray(data.ahead)) setAhead(data.ahead);
          setError(w.alreadyOnList as string);
        } else {
          setError(data.error || (w.somethingWrong as string));
        }
        setIsSubmitting(false);
        return;
      }
      if (typeof data.total === "number") setTotal(data.total);
      if (Array.isArray(data.ahead)) setAhead(data.ahead);
      if (data.accessGranted) {
        window.location.href = "/";
        return;
      }
      setIsSuccess(true);
      setQueue({
        position: data.position ?? data.total ?? total + 1,
        total: data.total ?? total + 1,
        referralCode: data.referralCode ?? null,
        referralCount: data.referralCount ?? 0,
      });
      if (Array.isArray(data.ahead)) setAhead(data.ahead);
      setEmail("");
    } catch {
      setError(w.networkError as string);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    if (isGoogleLoading) return;
    setError("");
    setIsGoogleLoading(true);
    try {
      const supabase = createClient();
      const params = new URLSearchParams(window.location.search);
      const refParam = params.get("ref") || params.get("r") || refFromUrl;
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("next", "/waitlist");
      if (refParam) callbackUrl.searchParams.set("ref", refParam);
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl.toString(),
          scopes: "email profile",
          queryParams: { access_type: "offline", prompt: "select_account" },
        },
      });
      if (oauthError) setError(w.somethingWrong as string);
    } catch {
      setError(w.networkError as string);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const referralLink = queue.referralCode
    ? `https://agentcloud.agency/waitlist?ref=${queue.referralCode}`
    : "";

  const shareTextEncoded = encodeURIComponent(`${w.shareText} ${referralLink}`);
  const copyLink = async () => {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openForm = () => setShowForm(true);
  const closeForm = () => setShowForm(false);

  return (
    <div className="relative overflow-x-hidden bg-[#1e1e24]">
      {/* Global background — schiarito: base meno nera, radiali più visibili */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#25252d] via-[#1e1e24] to-[#121214]" />
        <div
          className="absolute inset-0 opacity-[0.55]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 10%, rgba(3,139,254,.22), transparent 34%), radial-gradient(circle at 85% 12%, rgba(234,67,53,.16), transparent 30%), radial-gradient(circle at 50% 85%, rgba(168,85,247,.14), transparent 38%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white/[0.03]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/25 to-transparent" />
      </div>
      <FloatingBrandBubbles bubbles={FLOATING_BUBBLES} />

      {/* NAVBAR trasparente */}
      <header className="absolute left-0 right-0 top-0 z-30 bg-transparent">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="relative h-8 w-8">
              <Image src="/agentcloud.png" alt="AgentCloud" fill className="object-cover" sizes="32px" />
            </div>
            <span className="text-base font-bold tracking-tight text-white">AgentCloud</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <button
              onClick={openForm}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black shadow-lg shadow-white/10 transition hover:bg-neutral-100"
            >
              <span className="hidden sm:inline">{isSuccess ? (w.heroJoined as string) : "Join the waitlist"}</span>
              <span className="sm:hidden">{isSuccess ? "✓" : "Join"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* HERO centrato — titolo 2 righe + countdown al centro + bottone */}
      <section className="relative z-10 flex min-h-[88vh] flex-col items-center justify-center px-4 pb-10 pt-28 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="flex max-w-3xl flex-col items-center text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-brand-400" />
            {w.heroEyebrow as string}
          </div>
          {/* Titolo 2 righe */}
          <h1 className="text-[34px] font-extrabold leading-[0.95] tracking-tight text-white sm:text-6xl">
            <span className="block">{w.heroTitleA as string}</span>
            <span className="block bg-gradient-to-r from-brand-400 to-pink-400 bg-clip-text text-transparent">{w.heroTitleB as string}</span>
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-neutral-300 sm:text-lg">{w.heroSub as string}</p>

          {/* Countdown sotto al titolo al centro */}
          <div className="mt-7 flex flex-col items-center gap-3">
            <CountdownTimer className="scale-95 sm:scale-100" />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium text-neutral-300">
              <Users className="h-3.5 w-3.5 text-brand-400" /> {total.toLocaleString("it-IT")} {w.inList as string}
            </span>
          </div>

          {/* Bottone per unirsi — apre il form */}
          <motion.button
            onClick={openForm}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-500 to-pink-500 px-8 py-4 text-base font-bold text-white shadow-xl shadow-brand-500/25 transition"
          >
            {isSuccess ? (w.heroJoined as string) : (w.heroCta as string)} <ArrowRight className="h-5 w-5" />
          </motion.button>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-neutral-500">
            <ShieldCheck className="h-3.5 w-3.5" /> {w.heroTrust as string}
          </p>

          {/* Classifica: dopo iscrizione, sotto il bottone — tuo numero + 5 davanti */}
          <AnimatePresence>
            {isSuccess && queue.position && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-8 w-full max-w-xl rounded-3xl border border-white/10 bg-neutral-900/80 p-5 text-left backdrop-blur"
              >
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                    <BarChart3 className="h-4 w-4 text-brand-400" /> La tua posizione in classifica
                  </h3>
                  <span className="rounded-full bg-brand-500/15 px-2.5 py-1 text-xs font-bold text-brand-300">
                    #{queue.position} su {queue.total ?? total}
                  </span>
                </div>
                <div className="mt-3 rounded-2xl border border-brand-500/20 bg-brand-500/10 px-4 py-3 text-center">
                  <p className="text-sm font-bold text-white">
                    Sei <span className="text-brand-400">#{queue.position}</span> su {queue.total ?? total} in coda
                  </p>
                  <p className="mt-1 text-xs text-neutral-400">Condividi il tuo link per scalare — ogni amico ti fa salire.</p>
                </div>

                {ahead.length > 0 ? (
                  <div className="mt-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">I 5 davanti a te</p>
                    <ol className="mt-2 space-y-1.5">
                      {ahead.map((a) => (
                        <li key={a.rank} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
                          <span className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">#{a.rank}</span>
                            <span className="text-sm font-medium text-neutral-300">{a.emailMasked}</span>
                          </span>
                          <span className="text-xs text-neutral-500">davanti a te</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : (
                  <p className="mt-3 rounded-xl bg-emerald-500/10 px-3 py-2 text-center text-xs font-bold text-emerald-300">
                    Sei tra i primi! Nessuno davanti a te — invita amici per restare in testa.
                  </p>
                )}

                <button onClick={openForm} className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/5 py-2.5 text-sm font-semibold text-white hover:bg-white/10">
                  <Copy className="h-4 w-4" /> Vedi link referral e condividi
                </button>

                {/* Phase 3: Instagram follow self-report — honor system, +1 punto una tantum */}
                <div className="mt-4">
                  <InstagramFollowCard />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Demo live compatta sotto al CTA (opzionale, resta centrata) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25 }} className="mt-10 w-full max-w-xl">
          <div className="rounded-[24px] border border-white/10 bg-neutral-900/70 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur">
            <div className="rounded-2xl border border-white/5 bg-neutral-950 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/10 px-2.5 py-1 text-xs font-semibold text-brand-300">
                  <Sparkles className="h-3 w-3" /> {w.demoLiveBadge as string}
                </span>
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-white px-4 py-3 text-sm text-neutral-900">{w.demoUserMsg as string}</div>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-brand-500/20 bg-gradient-to-br from-brand-500/15 to-pink-500/15 px-4 py-3 text-sm leading-relaxed text-white">
                    <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-brand-300">
                      <span className="h-5 w-5 rounded-full bg-gradient-to-r from-brand-500 to-pink-500" /> AgentCloud
                    </div>
                    {w.demoAgentMsg as string}
                  </div>
                </div>
                <div className="inline-flex rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                  {w.demoResolved as string}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* PIATTAFORMA — cos'è in 3 pillastri */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold tracking-widest text-neutral-400">La piattaforma</span>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Automatizza senza scrivere codice</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-neutral-400">AgentCloud è un marketplace di agenti AI autonomi: scegli, colleghi i tuoi strumenti e lasci che lavorino per te — 24/7, su WhatsApp, Email, Shopify e oltre.</p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Zap, title: "Agenti autonomi", desc: "Ogni agente ha un obiettivo chiaro: vendere, rispondere, prenotare, fatturare. Decidono e agiscono da soli." },
            { icon: Users, title: "Integrato ai tuoi tool", desc: "Shopify, Gmail, Calendar, Sheets, Slack, Notion, HubSpot — colleghi in 2 minuti." },
            { icon: ShieldCheck, title: "Senza codice, sicuro", desc: "Setup guidato, token cifrati, GDPR-ready. Nessun dato per training." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-pink-500 text-white"><f.icon className="h-5 w-5" /></div>
              <h3 className="mt-3 text-sm font-bold text-white">{f.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-neutral-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AGENTI — cosa fanno */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold tracking-widest text-neutral-400">Agenti in azione</span>
            <h2 className="mt-3 text-xl font-extrabold text-white sm:text-2xl">Scegli l’agente, lui fa il resto</h2>
          </div>
          <button onClick={openForm} className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">Vedi marketplace <ArrowRight className="h-4 w-4" /></button>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { name: "Shopify Agent", role: "E-commerce", desc: "Cerca prodotti, crea carrelli, verifica ordini e spedizioni.", points: ["Ricerca catalogo", "Link carrello", "Stato ordine"] },
            { name: "Email Manager", role: "Inbox", desc: "Smista, priorizza e prepara bozze. Tu approvi con un click.", points: ["Classifica email", "Bozze pronte", "Follow-up"] },
            { name: "Lead Capture", role: "Marketing", desc: "Cattura lead dal sito, arricchisce e avvisa Slack/HubSpot.", points: ["Form → CRM", "Arricchimento", "Notifica vendite"] },
            { name: "Support Agent", role: "Assistenza", desc: "Risponde a domande su prodotti e ordini 24/7.", points: ["FAQ auto", "Ordini", "Resi"] },
            { name: "Calendar Booking", role: "Agenda", desc: "Propone slot, prenota e invia inviti con reminder.", points: ["Disponibilità", "Prenota", "Reminder"] },
            { name: "Finance Manager", role: "Pagamenti", desc: "Fatture, cashflow da CSV/Stripe, solleciti gentili.", points: ["Fatture", "Incassi", "Solleciti"] },
          ].map((a) => (
            <div key={a.name} className="rounded-2xl border border-white/10 bg-neutral-900/60 p-5">
              <div className="text-xs font-bold tracking-widest text-brand-400">{a.role}</div>
              <h3 className="mt-1 text-sm font-bold text-white">{a.name}</h3>
              <p className="mt-1 text-sm leading-relaxed text-neutral-400">{a.desc}</p>
              <ul className="mt-3 space-y-1">
                {a.points.map((p) => (<li key={p} className="flex items-center gap-1.5 text-xs font-medium text-emerald-300"><Check className="h-3.5 w-3.5" />{p}</li>))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* INTEGRAZIONI — dove vivi già */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="rounded-3xl border border-white/10 bg-neutral-900/60 p-6 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold tracking-widest text-brand-400">Integrazioni</div>
              <h3 className="mt-1 text-lg font-bold text-white">Collegato a ciò che usi già</h3>
              <p className="mt-1 text-sm text-neutral-400">Colleghi in 2 minuti, token cifrati, disconnessione 1 click.</p>
            </div>
            <button onClick={openForm} className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black">Collega il primo →</button>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
            {[
              { name: "Shopify", brand: "shopify" },
              { name: "Gmail", brand: "gmail" },
              { name: "Slack", brand: "slack" },
              { name: "Notion", brand: "notion" },
              { name: "HubSpot", brand: "hubspot" },
              { name: "Sheets", brand: "googlesheets" },
            ].map((it) => (
              <div key={it.name} className="flex flex-col items-center gap-2 rounded-2xl border border-white/5 bg-white/[0.03] px-2 py-4 text-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
                  <BrandLogo slug={it.brand} size={20} />
                </div>
                <span className="text-xs font-semibold text-white">{it.name}</span>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">1 click</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-neutral-500">E altri in arrivo: WhatsApp, WooCommerce, PayPal, Stripe, TikTok, Analytics…</p>
        </div>
      </section>

      {/* CHI SIAMO — founders */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold tracking-widest text-neutral-400">Chi siamo</span>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Tre persone, una piattaforma</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-neutral-400">Costruiamo AgentCloud con ruoli chiari e zero fronzoli: prodotto solido, comunicazione chiara, conti in ordine.</p>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {[
            {
              name: "Gabriele Forestieri",
              role: "Developer",
              img: "/founders/gabriele_forestieri.jpg",
              bio: "Sviluppa la piattaforma, gli agenti e le integrazioni. Full-stack, ossessionato da velocità, dettagli e DX.",
              instagram: "#",
            },
            {
              name: "Alle Cerchiari",
              role: "Social & Marketing",
              img: "/founders/alle_cerchiari.jpeg",
              bio: "Racconta AgentCloud sui social e nel marketing. Traduce la complessità in storie semplici e campagne che funzionano.",
              instagram: "#",
            },
            {
              name: "Matteo Parubi",
              role: "Stripe & Pricing",
              sub: "Paru",
              img: "/founders/matteo_parubi.jpeg",
              bio: "Gestisce pagamenti, piani e prezzi via Stripe. Tiene i conti in ordine e l'esperienza di acquisto fluida.",
              instagram: "#",
            },
          ].map((m) => (
            <div key={m.name} className="group rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-center backdrop-blur">
              <div className="relative mx-auto h-24 w-24 overflow-hidden rounded-full border border-white/10 bg-neutral-800">
                <Image src={m.img} alt={m.name} fill sizes="96px" className="object-cover" />
              </div>
              <h3 className="mt-4 text-base font-bold text-white">{m.name} {m.sub ? <span className="font-normal text-neutral-400">· {m.sub}</span> : null}</h3>
              <p className="mt-1 text-xs font-bold uppercase tracking-widest text-brand-300">{m.role}</p>
              <p className="mt-3 text-sm leading-relaxed text-neutral-400">{m.bio}</p>
              <a href={m.instagram} target={m.instagram === "#" ? undefined : "_blank"} rel={m.instagram === "#" ? undefined : "noopener noreferrer"} className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:bg-white/10 hover:text-white">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-[8px] font-bold text-white">IG</span> Instagram {m.instagram === "#" ? "· placeholder" : ""}
              </a>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-neutral-500">Foto reali del team — non placeholder. Contattaci su <a href="/about" className="font-semibold text-brand-400 hover:text-brand-300">Chi siamo</a>.</p>
      </section>

      {/* MODAL FORM — appare su click bottoni */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeForm}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: "spring", damping: 24, stiffness: 260 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-neutral-900 p-5 shadow-2xl sm:p-6">
                <button onClick={closeForm} className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white">
                  <X className="h-4 w-4" />
                </button>

                {!isSuccess ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <h3 className="text-lg font-bold text-white">{w.heroCta as string}</h3>
                      <p className="mt-1 text-sm text-neutral-400">{w.heroSub as string}</p>
                    </div>

                    <div
                      style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0, width: 0, overflow: "hidden" }}
                      aria-hidden="true"
                    >
                      <input type="text" name={HONEYPOT_FIELD_NAME} value={honeypotValue} onChange={(e) => setHoneypotValue(e.target.value)} tabIndex={-1} autoComplete="off" />
                    </div>



                    <form onSubmit={handleSubmit} className="space-y-2">
                      <input
                        type="text"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); if (error) setError(""); }}
                        placeholder={w.placeholder as string}
                        autoComplete="off"
                        className="w-full rounded-full border border-white/10 bg-neutral-800 px-5 py-3 text-sm text-white placeholder-neutral-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        disabled={isSubmitting || isGoogleLoading}
                      />
                      <button
                        type="submit"
                        disabled={isSubmitting || isGoogleLoading}
                        className="flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-brand-500 to-pink-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:opacity-90 disabled:opacity-50"
                      >
                        {isSubmitting ? (w.joining as string) : (w.heroCta as string)} <ArrowRight className="h-4 w-4" />
                      </button>
                      {error && <p className="text-center text-sm text-red-400">{error}</p>}
                    </form>

                    <p className="flex items-center justify-center gap-1.5 text-center text-xs text-neutral-500">
                      <ShieldCheck className="h-3.5 w-3.5" /> {w.heroTrust as string}
                    </p>
                    <p className="text-center text-xs text-neutral-500">{w.agreeNote as string}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white">
                        <Check className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-bold text-white">{w.heroJoined as string}</span>
                    </div>
                    {queue.position && (
                      <div>
                        <div className="text-sm font-semibold text-white">
                          {w.queuePosition as string} <span className="text-brand-400">#{queue.position}</span> {w.queueOf as string} {queue.total ?? total}
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-800">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-pink-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${queue.position && queue.total ? Math.max(5, ((queue.total - queue.position + 1) / queue.total) * 100) : 30}%` }}
                          />
                        </div>
                        <p className="mt-2 text-xs text-neutral-400">
                          {w.queueInvited as string} <span className="font-bold text-white">{queue.referralCount}</span> {w.queueFriends as string} — {w.queueSubtitle as string}
                        </p>
                      </div>
                    )}
                    {referralLink && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-neutral-300">{w.queueLinkLabel as string}</span>
                        </div>
                        <div className="flex gap-2">
                          <code className="flex-1 truncate rounded-full border border-white/10 bg-neutral-900 px-3 py-2 text-xs text-neutral-200">{referralLink}</code>
                          <button onClick={copyLink} className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-black">
                            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? (w.queueCopied as string) : (w.queueCopy as string)}
                          </button>
                        </div>
                        <p className="text-center text-xs font-medium text-brand-300">{w.queueShare as string}</p>
                        <div className="grid grid-cols-4 gap-2">
                          <a href={`https://wa.me/?text=${shareTextEncoded}`} target="_blank" rel="noopener noreferrer" className="rounded-full bg-[#25D366] px-2 py-2.5 text-center text-xs font-bold text-white">WA</a>
                          <a href={`https://twitter.com/intent/tweet?text=${shareTextEncoded}`} target="_blank" rel="noopener noreferrer" className="rounded-full bg-black border border-white/10 px-2 py-2.5 text-center text-xs font-bold text-white">X</a>
                          <a href={`mailto:?subject=${encodeURIComponent("AgentCloud Waitlist")}&body=${shareTextEncoded}`} className="rounded-full bg-neutral-800 border border-white/10 px-2 py-2.5 text-center text-xs font-bold text-white">Email</a>
                          <a href={`sms:?&body=${shareTextEncoded}`} className="rounded-full bg-brand-500 px-2 py-2.5 text-center text-xs font-bold text-white">SMS</a>
                        </div>
                        <p className="rounded-xl bg-white/5 px-3 py-2 text-center text-xs leading-relaxed text-neutral-400">{w.queueRule as string}</p>
                      </div>
                    )}
                    <InstagramFollowCard />
                    <button onClick={closeForm} className="w-full rounded-full border border-white/10 bg-white/5 py-2.5 text-sm font-semibold text-white hover:bg-white/10">Chiudi</button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 3 ATTI */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="text-center">
          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold tracking-widest text-neutral-400">{w.howItWorksBadge as string}</span>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">{w.howItWorksTitle as string}</h2>
        </div>

        <div className="relative mt-8 grid gap-6 md:grid-cols-3">
          <div className="hidden md:block absolute left-[16%] right-[16%] top-[52px] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          {[
            {
              n: "01",
              icon: Sparkles,
              title: w.step1Title as string,
              desc: w.step1Desc as string,
              mock: (
                <div className="rounded-2xl border border-white/10 bg-neutral-900 p-4">
                  <div className="text-xs font-bold text-white">{w.step1MockTitle as string}</div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {["Shopify", "Support", "Lead"].map((k) => (
                      <div key={k} className="rounded-xl bg-white/5 px-2 py-3 text-center text-xs font-semibold text-neutral-200">{k}</div>
                    ))}
                  </div>
                  <div className="mt-2 text-xs text-neutral-500">{w.step1MockDesc as string}</div>
                </div>
              ),
            },
            {
              n: "02",
              icon: Zap,
              title: w.step2Title as string,
              desc: w.step2Desc as string,
              mock: (
                <div className="rounded-2xl border border-white/10 bg-neutral-900 p-4 space-y-2">
                  {[w.step2Check1, w.step2Check2, w.step2Check3].map((c, i) => (
                    <motion.div key={String(c)} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.2 }} className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300">
                      <Check className="h-4 w-4" /> {c as string}
                    </motion.div>
                  ))}
                </div>
              ),
            },
            {
              n: "03",
              icon: BarChart3,
              title: w.step3Title as string,
              desc: w.step3Desc as string,
              mock: (
                // Dashboard preview compatta — altezza ridotta e sidebar fedele a DashboardShell
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-950">
                  <div className="flex h-[112px]">
                    {/* Sidebar fedele allo stile reale: bg-neutral-950/80 backdrop-blur-2xl border-r border-white/[0.06] */}
                    <div className="flex w-[96px] shrink-0 flex-col gap-1 border-r border-white/[0.06] bg-neutral-950/80 p-2 backdrop-blur-2xl">
                      <div className="mb-1 flex items-center gap-1.5 border-b border-white/[0.06] pb-1.5">
                        <div className="relative h-4 w-4 overflow-hidden rounded-md">
                          <Image src="/agentcloud.png" alt="" fill className="object-cover" sizes="16px" />
                        </div>
                        <span className="text-[7px] font-bold tracking-tight text-white">AgentCloud</span>
                      </div>
                      {[
                        { label: "Dashboard", icon: LayoutDashboard, active: true },
                        { label: "Chat", icon: MessageSquare, active: false },
                        { label: "Agenti", icon: Store, active: false },
                        { label: "Integrazioni", icon: Plug, active: false },
                      ].map(({ label, icon: Icon, active }) => (
                        <div
                          key={label}
                          className={`flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-[8px] font-semibold ${active ? "bg-white/[0.06] text-white border border-white/[0.08]" : "text-neutral-500"}`}
                        >
                          <span className={`flex h-4 w-4 items-center justify-center rounded-md ${active ? "bg-brand-500/15 text-brand-400" : "bg-white/5"}`}>
                            <Icon size={8} />
                          </span>
                          {label}
                        </div>
                      ))}
                      <div className="mt-auto flex items-center gap-1 rounded-lg bg-white/[0.03] p-1">
                        <div className="h-4 w-4 rounded-full bg-brand-500/20" />
                        <span className="text-[7px] font-semibold text-neutral-400">Admin</span>
                      </div>
                    </div>
                    {/* Main — compatto */}
                    <div className="flex min-w-0 flex-1 flex-col bg-neutral-950 p-2.5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[9px] font-semibold uppercase tracking-widest text-neutral-500">Task completati</span>
                        <span className="flex items-center gap-1 text-xs font-bold text-white">— <span className="rounded bg-amber-500/15 px-1 py-0.5 text-[7px] font-bold text-amber-300">Esempio</span></span>
                      </div>
                      <div className="mt-2 grid h-10 flex-1 grid-cols-7 items-end gap-1 opacity-60">
                        {[40, 65, 45, 80, 60, 90, 75].map((h, i) => (
                          <motion.div key={i} initial={{ height: 0 }} whileInView={{ height: `${h}%` }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="rounded-t-sm bg-gradient-to-t from-brand-500/60 to-pink-400/60" />
                        ))}
                      </div>
                      <div className="mt-1.5 flex gap-1">
                        <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[7px] font-bold text-amber-300">Dati di esempio</span>
                        <span className="text-[7px] text-neutral-500">7 giorni</span>
                      </div>
                    </div>
                  </div>
                </div>
              ),
            },
          ].map((s) => (
            <div key={s.n} className="relative rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-pink-500 text-white">
                <s.icon className="h-5 w-5" />
              </div>
              <div className="text-xs font-bold tracking-widest text-brand-400">{s.n}</div>
              <h3 className="mt-1 text-base font-bold text-white">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-400">{s.desc}</p>
              <div className="mt-4">{s.mock}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-center">
          <button onClick={openForm} className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black">
            {w.heroCta as string} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* Social proof */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="rounded-3xl border border-white/10 bg-neutral-900/60 p-6 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold tracking-widest text-brand-400">{w.socialBadge as string}</div>
              <h3 className="mt-1 text-lg font-bold text-white">{w.socialTitle as string}</h3>
            </div>
            <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-neutral-400">{total.toLocaleString("it-IT")} {w.inList as string} • countdown attivo</span>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { v: `${AVAILABLE_AGENTS.length}`, l: w.statAgents as string, icon: Users, example: false },
              { v: "—", l: w.statTasks as string, icon: Zap, example: true },
              { v: "—", l: w.statTime as string, icon: Clock, example: true },
              { v: total.toLocaleString("it-IT"), l: w.statUsers as string, icon: BarChart3, example: false },
            ].map((s) => (
              <div key={s.l} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-center">
                <s.icon className="mx-auto h-5 w-5 text-brand-400" />
                <div className="mt-2 flex items-center justify-center gap-1.5 text-xl font-extrabold text-white">{s.v} {s.example && <span className="rounded bg-amber-500/15 px-1 py-0.5 text-[8px] font-bold text-amber-300">Esempio</span>}</div>
                <div className="text-xs text-neutral-500">{s.l}</div>
                {s.example && <div className="mt-1 text-[9px] font-semibold text-amber-300/70">Dati reali dal lancio</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative z-10 mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="text-center">
          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold tracking-widest text-neutral-400">{w.faqBadge as string}</span>
          <h2 className="mt-3 text-2xl font-bold text-white">{w.faqTitle as string}</h2>
        </div>
        <div className="mt-6 space-y-3">
          {(w.faqItems as { q: string; a: string }[]).map((item, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
              <button onClick={() => setShowFaq(showFaq === i ? null : i)} className="flex w-full items-center justify-between px-5 py-4 text-left">
                <span className="text-sm font-semibold text-white">{item.q}</span>
                <ChevronDown className={`h-4 w-4 text-neutral-400 transition ${showFaq === i ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {showFaq === i && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <p className="px-5 pb-4 text-sm leading-relaxed text-neutral-400">{item.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-neutral-500">{w.noSpam as string}</p>
      </section>

      {/* Footer CTA */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 pb-10 sm:px-6">
        <div className="rounded-[28px] border border-brand-500/20 bg-gradient-to-r from-brand-600 via-brand-500 to-pink-500 p-[1px]">
          <div className="rounded-[27px] bg-neutral-950 px-6 py-8 text-center sm:px-10 sm:py-10">
            <h2 className="text-2xl font-extrabold text-white sm:text-3xl">{w.footerCtaTitle as string}</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-neutral-400">{w.footerCtaSubtitle as string}</p>
            <button onClick={openForm} className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-8 py-3 text-sm font-bold text-black">
              {isSuccess ? (w.heroJoined as string) : (w.heroCta as string)} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer contatto + social */}
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}
