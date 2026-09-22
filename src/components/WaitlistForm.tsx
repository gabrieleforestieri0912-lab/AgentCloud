/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
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
import BrandLogo from "@/components/BrandLogo";
import BrandIcon from "@/components/BrandIcon";
import { BRANDS } from "@/lib/brands";
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

// La waitlist non espone dati live del marketplace: mostriamo solo una
// piccola anteprima degli agenti già disponibili.
const WAITLIST_FEATURED_AGENTS = AVAILABLE_AGENTS.slice(0, 3);

type DemoMessage = { role: "user" | "assistant"; content: string };

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
  const { dict, locale } = useLanguage();
  const w = dict.waitlist as unknown as Record<string, unknown> & {
    heroEyebrow: string; heroTitleA: string; heroTitleB: string; heroSub: string; heroTrust: string;
    heroCta: string; heroJoined: string; demoLiveBadge: string;
    demoInputPlaceholder: string; demoWelcome: string; demoSuggestions: string[]; howItWorksBadge: string; howItWorksTitle: string;
    step1Title: string; step1Desc: string; step1MockTitle: string; step1MockDesc: string;
    step2Title: string; step2Desc: string; step2Check1: string; step2Check2: string; step2Check3: string;
    step3Title: string; step3Desc: string; socialBadge: string; socialTitle: string;
    statAgents: string; statTasks: string; statTime: string; statUsers: string; inList: string;
    queueTitle: string; queueSubtitle: string; queuePosition: string; queueOf: string; queueInvited: string; queueFriends: string;
    queueLinkLabel: string; queueCopy: string; queueCopied: string; queueShare: string; queueRule: string;
    shareWhatsapp: string; shareX: string; shareEmail: string; shareSms: string; shareText: string;
    faqBadge: string; faqTitle: string; faqItems: { q: string; a: string }[]; footerCtaTitle: string; footerCtaSubtitle: string; noSpam: string;
    navJoin: string; navJoinShort: string; heroDateLabel: string; heroDateDetails: string; heroDateNote: string;
    chiSiamoBadge: string; chiSiamoTitle: string; chiSiamoSub: string;
    foundersGabBio: string; foundersAlleBio: string; foundersMatteoBio: string;
    teamPhotosNote: string; teamPhotosLink: string;
    integrazioniBadge: string; integrazioniTitle: string; integrazioniSub: string; integrazioniCta: string; integrazioniMore: string;
    socialPreviewBadge: string; agentPreviewNote: string;
    piattaformaBadge: string; piattaformaTitle: string; piattaformaSub: string;
    piattaformaF1Title: string; piattaformaF1Desc: string; piattaformaF2Title: string; piattaformaF2Desc: string;
    piattaformaF3Title: string; piattaformaF3Desc: string; agentiBadge: string; agentiTitle: string; agentiCta: string;
    rankTitle: string; rankPointsText: string; rankShareHint: string; rankPointsLabel: string;
    rankGenerating: string; rankAheadTitle: string; rankAheadRow: string; rankTopNote: string;
    welcomeNote: string; welcomeThanks: string; welcomeThanksName: string;
    demoTyping: string; modalClose: string;
    placeholder: string; joining: string; joinWaitlist: string; agreeNote: string; alreadyOnList: string; somethingWrong: string; networkError: string;
    continueWithGoogle: string; orWithEmail: string; redirectingToGoogle: string;
    welcomeTitle: string; welcomeSubtitle: string; welcomePlaceholder: string; welcomeSave: string; welcomeSkip: string; welcomeSaving: string; welcomeSaved: string; welcomeError: string; welcomeNameRequired: string;
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
  const [ranking, setRanking] = useState<{ position: number | null; total: number | null; points: number; referralsCompleted: number; instagramFollow: number; referralCode: string | null; breakdown: { referrals: number; instagram: number } } | null>(null);
  const [isSuccess, setIsSuccess] = useState(() => typeof document !== "undefined" && document.cookie.includes("ac_wl_joined=1"));
  const [total, setTotal] = useState<number>(initialTotal);
  const [showForm, setShowForm] = useState(false);
  const [refFromUrl, setRefFromUrl] = useState<string | null>(null);
  // Welcome popup after signup — chiede il nome
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeName, setWelcomeName] = useState("");
  const [welcomeSaving, setWelcomeSaving] = useState(false);
  const [welcomeError, setWelcomeError] = useState("");
  const [welcomeDone, setWelcomeDone] = useState(false);
  const [joinedEmail, setJoinedEmail] = useState<string | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const [demoInput, setDemoInput] = useState("");
  const [demoSending, setDemoSending] = useState(false);
  // Demo chat vuota all'avvio: l'utente parte da zero e scrive lui il primo messaggio.
  const [demoMessages, setDemoMessages] = useState<DemoMessage[]>([]);
  const demoBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref") || params.get("r");
    if (ref) {
      const cleanRef = ref.toLowerCase().slice(0, 32);
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
          // prova a recuperare email joinata da cookie per welcome popup
          try {
            const m = document.cookie.match(/(?:^|; )ac_wl_email=([^;]*)/);
            if (m) setJoinedEmail(decodeURIComponent(m[1]));
          } catch {}
          setQueue({
            position: data.position ?? null,
            total: data.total ?? total,
            referralCode: data.referralCode ?? null,
            referralCount: data.referralCount ?? 0,
          });
          if (Array.isArray(data.ahead)) setAhead(data.ahead);
          // Phase 5: fetch points-aware ranking
          fetch("/api/waitlist/ranking")
            .then((r) => (r.ok ? r.json() : null))
            .then((rankData) => {
              if (rankData && typeof rankData.position === "number") {
                setRanking(rankData);
                // Prefer ranking position over legacy queue position
                setQueue((q) => ({ ...q, position: rankData.position, total: rankData.total ?? q.total }));
              }
            })
            .catch(() => {});
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

  // Blocca scroll quando modal aperto (form o welcome)
  useEffect(() => {
    if (showForm || showWelcome) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [showForm, showWelcome]);

  // Phase 5: carica Space Grotesk + IBM Plex Sans per dashboard (palette spec)
  useEffect(() => {
    const id = "waitlist-dashboard-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
  }, []);

  const refreshRanking = () => {
    fetch("/api/waitlist/ranking")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d.position === "number") {
          setRanking(d);
          setQueue((q) => ({ ...q, position: d.position, total: d.total ?? q.total }));
        }
      })
      .catch(() => {});
  };

  const maybeShowWelcome = async (emailForWelcome: string) => {
    try {
      const r = await fetch("/api/waitlist/name");
      if (r.ok) {
        const j = await r.json();
        if (j?.full_name) return; // già salvato, non mostrare
      }
    } catch {}
    setJoinedEmail(emailForWelcome);
    setWelcomeName("");
    setWelcomeError("");
    setWelcomeDone(false);
    setShowForm(false);
    setShowWelcome(true);
  };

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
          setJoinedEmail(validation.email);
          if (typeof data.position === "number") {
            setQueue({ position: data.position, total: data.total ?? total, referralCode: data.referralCode ?? null, referralCount: data.referralCount ?? 0 });
          }
          if (Array.isArray(data.ahead)) setAhead(data.ahead);
          fetch("/api/waitlist/ranking").then((r) => (r.ok ? r.json() : null)).then((d) => { if (d && typeof d.position === "number") setRanking(d); }).catch(() => {});
          setError(w.alreadyOnList as string);
          // se già in lista ma nome mancante, mostra comunque welcome
          void maybeShowWelcome(validation.email);
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
      fetch("/api/waitlist/ranking").then((r) => (r.ok ? r.json() : null)).then((d) => { if (d && typeof d.position === "number") setRanking(d); }).catch(() => {});
      const savedEmail = validation.email;
      setEmail("");
      setJoinedEmail(savedEmail);
      // mostra popup benvenuto + nome dopo iscrizione riuscita
      void maybeShowWelcome(savedEmail);
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

  // Phase 5: use points-aware ranking code if available, and spec-compliant /waitlist/join URL
  const activeReferralCode = ranking?.referralCode ?? queue.referralCode;
  const referralLink = activeReferralCode
    ? `https://agentcloud.agency/waitlist/join?ref=${activeReferralCode}`
    : queue.referralCode
      ? `https://agentcloud.agency/waitlist?ref=${queue.referralCode}`
      : "";

  const shareTextEncoded = encodeURIComponent(`${w.shareText} ${referralLink}`);
  const copyLink = async () => {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendDemoText = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || demoSending) return;
    setDemoInput("");
    setDemoMessages((current) => [...current, { role: "user", content: trimmed }]);
    setDemoSending(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: "support-agent",
          messages: [...demoMessages, { role: "user", content: trimmed }],
        }),
      });
      if (!response.ok || !response.body) throw new Error("Demo unavailable");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let answer = "";
      const appendAnswer = (content: string) => {
        answer += content;
        setDemoMessages((current) => {
          const last = current[current.length - 1];
          if (last?.role === "assistant" && last.content === answer.slice(0, last.content.length)) {
            return [...current.slice(0, -1), { role: "assistant", content: answer }];
          }
          return [...current, { role: "assistant", content: answer }];
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || trimmedLine === "data: [DONE]") continue;
          if (!trimmedLine.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(trimmedLine.slice(6)) as { type?: string; content?: string; message?: string };
            if (data.type === "text" && data.content) appendAnswer(data.content);
            if (data.type === "error" && data.message) throw new Error(data.message);
          } catch (e) {
            if ((e as Error).message && (e as Error).message !== "Unexpected end of JSON input") {
              // Ignora righe SSE incomplete, ma propaga errori reali.
            }
          }
        }
      }
      if (!answer) throw new Error("Empty demo response");
    } catch {
      setDemoMessages((current) => [...current, { role: "assistant", content: w.networkError as string }]);
    } finally {
      setDemoSending(false);
    }
  };

  const handleDemoSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await sendDemoText(demoInput);
  };

  const handleDemoSuggestionClick = (suggestion: string) => {
    void sendDemoText(suggestion);
  };

  useEffect(() => {
    demoBodyRef.current?.scrollTo({ top: demoBodyRef.current.scrollHeight, behavior: "smooth" });
  }, [demoMessages, demoSending]);

  const openForm = () => setShowForm(true);
  const closeForm = () => setShowForm(false);

  const closeWelcome = () => {
    setShowWelcome(false);
    setWelcomeError("");
  };

  const handleWelcomeSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (welcomeSaving || welcomeDone) return;
    const trimmed = welcomeName.trim();
    if (!trimmed) {
      setWelcomeError(w.welcomeNameRequired as string);
      return;
    }
    if (trimmed.length > 80) {
      setWelcomeError("Il nome è troppo lungo (max 80).");
      return;
    }
    setWelcomeSaving(true);
    setWelcomeError("");
    try {
      const res = await fetch("/api/waitlist/name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, email: joinedEmail ?? undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setWelcomeError((data.error as string) || (w.welcomeError as string));
        return;
      }
      setWelcomeDone(true);
      setTimeout(() => setShowWelcome(false), 1400);
    } catch {
      setWelcomeError(w.welcomeError as string);
    } finally {
      setWelcomeSaving(false);
    }
  };

  return (
    <div className="relative overflow-x-hidden bg-[#1e1e24]">
      {/* Global background — schiarito: base meno nera, radiali più visibili */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-linear-to-b from-[#25252d] via-[#1e1e24] to-[#121214]" />
        <div
          className="absolute inset-0 opacity-[0.55]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 10%, rgba(3,139,254,.22), transparent 34%), radial-gradient(circle at 85% 12%, rgba(234,67,53,.16), transparent 30%), radial-gradient(circle at 50% 85%, rgba(168,85,247,.14), transparent 38%)",
          }}
        />
        <div className="absolute inset-0 bg-linear-to-t from-transparent via-transparent to-white/3" />
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-brand-500/25 to-transparent" />
      </div>
      <FloatingBrandBubbles bubbles={FLOATING_BUBBLES} />

      {/* NAVBAR fissa a tutta larghezza — logo a sinistra, bottoni all'estremo destro — sfondo sfumato per leggibilità in scroll */}
      <header className="fixed left-0 right-0 top-0 z-30 bg-[#1e1e24]/85 backdrop-blur-md">
        <div className="flex w-full items-center justify-between px-4 py-4 sm:px-6 lg:px-10 3xl:px-14 3xl:py-6">
          <div className="flex items-center gap-2.5">
            <div className="relative h-8 w-8">
              <Image src="/agentcloud.png" alt="AgentCloud" fill className="object-cover" sizes="32px" />
            </div>
            <span className="text-base font-bold tracking-tight text-white">AgentCloud</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openForm}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black shadow-lg shadow-white/10 transition hover:bg-neutral-100"
            >
              <span className="hidden sm:inline">{isSuccess ? (w.heroJoined as string) : (w.navJoin as string)}</span>
              <span className="sm:hidden">{isSuccess ? "✓" : (w.navJoinShort as string)}</span>
            </button>
          </div>
        </div>
      </header>

      {/* HERO centrato — titolo 2 righe + countdown al centro + bottone — dvh per mobile con barra indirizzi */}
      <section className="relative z-10 flex min-h-[88dvh] sm:min-h-[88vh] flex-col items-center justify-center px-4 pb-10 pt-28 sm:px-6 3xl:pt-36 3xl:pb-16">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="flex max-w-3xl 3xl:max-w-4xl flex-col items-center text-center">
          {/* Data di lancio — badge azzurro minimalista: una pillola, niente card */}
          <div className="mb-5 inline-flex max-w-full flex-wrap items-center justify-center gap-x-2.5 gap-y-0.5 rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-1.5 3xl:px-5 3xl:py-2 backdrop-blur">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
            <span className="text-xs 3xl:text-sm font-semibold tracking-wide text-sky-300">{w.heroDateLabel as string}</span>
            <span className="text-xs 3xl:text-sm font-bold text-white">1 OTTOBRE 2026</span>
            <span className="text-xs 3xl:text-sm font-medium text-sky-200/70">· {w.heroDateDetails as string}</span>
          </div>
          {/* Titolo 2 righe — responsive fluido: evita overflow su 320px, scala su 3xl */}
          <h1 className="text-[28px] xs:text-[34px] font-extrabold leading-[0.95] tracking-tight text-white sm:text-6xl 3xl:text-[76px]">
            <span className="block">{w.heroTitleA as string}</span>
            <span className="block bg-linear-to-r from-brand-400 to-pink-400 bg-clip-text text-transparent">{w.heroTitleB as string}</span>
          </h1>
          <p className="mt-4 max-w-xl 3xl:max-w-2xl text-[14px] xs:text-[15px] leading-relaxed text-neutral-300 sm:text-lg 3xl:text-xl">{w.heroSub as string}</p>

          {/* Countdown sotto al titolo al centro — full width su mobile per non tagliare */}
          <div className="mt-7 flex w-full max-w-[360px] xs:max-w-none flex-col items-center gap-3 px-2 xs:px-0 3xl:max-w-[520px] 3xl:gap-4">
            <CountdownTimer className="w-full xs:w-auto 3xl:w-full" />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs 3xl:text-sm font-medium text-neutral-300">
              <Users className="h-3.5 w-3.5 text-brand-400" /> {total.toLocaleString(locale === "it" ? "it-IT" : locale === "es" ? "es-ES" : locale === "de" ? "de-DE" : locale === "fr" ? "fr-FR" : "en-US")} {w.inList as string}
            </span>
          </div>

          {/* Bottone per unirsi — apre il form — touch target 46px minimo — più grande su 3xl */}
          <motion.button
            onClick={openForm}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="mt-8 inline-flex min-h-11.5 3xl:min-h-14 items-center gap-2 rounded-full bg-linear-to-r from-brand-500 to-pink-500 px-8 3xl:px-10 py-3.5 xs:py-4 3xl:py-4 text-[15px] xs:text-base 3xl:text-lg font-bold text-white shadow-xl shadow-brand-500/25 transition"
          >
            {isSuccess ? (w.heroJoined as string) : (w.heroCta as string)} <ArrowRight className="h-5 w-5" />
          </motion.button>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-neutral-500">
            <ShieldCheck className="h-3.5 w-3.5" /> {w.heroTrust as string}
          </p>

          {/* Classifica: dopo iscrizione, sotto il bottone — dashboard con points breakdown (Phase 5) — responsive su 320px + scala 3xl */}
          <AnimatePresence>
            {isSuccess && (queue.position || ranking?.position) && (
              <motion.div
                initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.3 }}
                className="mt-8 w-full max-w-xl 3xl:max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/80 text-left backdrop-blur"
                style={{ willChange: "transform, opacity" }}
              >
                {/* Header dark — stack su 320px */}
                <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2 bg-neutral-900 px-4 xs:px-5 py-3 xs:py-4">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    <BarChart3 className="h-4 w-4 shrink-0 text-[#E2A33D]" /> {w.rankTitle as string}
                  </h3>
                  <span className="shrink-0 rounded-full bg-[#E2A33D]/15 px-2.5 py-1 text-xs font-bold text-[#E2A33D]" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
                    #{ranking?.position ?? queue.position} su {ranking?.total ?? queue.total ?? total}
                  </span>
                </div>

                {/* Dashboard Paper — Ink/Paper/Amber/Moss */}
                <div className="bg-[#F7F5F0] p-4 xs:p-5" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
                  <div className="text-center">
                    <p className="text-sm font-bold" style={{ color: "#15231F", fontFamily: "'Space Grotesk', sans-serif" }}>
                      Sei <span style={{ color: "#E2A33D" }}>#{ranking?.position ?? queue.position}</span> in coda su {ranking?.total ?? queue.total ?? total}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed" style={{ color: "#4B6357" }}>
                      {ranking
                        ? (w.rankPointsText as string)
                            .replace("{points}", String(ranking.points))
                            .replace("{referrals}", String(ranking.breakdown.referrals))
                            .replace("{count}", String(ranking.referralsCompleted))
                            .replace("{instagram}", String(ranking.breakdown.instagram))
                        : (w.rankShareHint as string)}
                    </p>
                  </div>

                  {/* Points breakdown — più aria su mobile */}
                  {ranking && (
                    <div className="mt-4 grid grid-cols-3 gap-1.5 xs:gap-2">
                      <div className="rounded-xl border p-2.5 xs:p-3 text-center" style={{ backgroundColor: "#FFFFFF", borderColor: "#E2A33D", color: "#15231F" }}>
                        <p className="text-base xs:text-lg font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{ranking.points}</p>
                        <p className="text-[9px] xs:text-[10px] font-bold uppercase tracking-widest" style={{ color: "#4B6357" }}>{w.rankPointsLabel as string}</p>
                      </div>
                      <div className="rounded-xl border p-2.5 xs:p-3 text-center" style={{ backgroundColor: "#FFFFFF", borderColor: "#4B6357", color: "#15231F" }}>
                        <p className="text-base xs:text-lg font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{ranking.referralsCompleted}</p>
                        <p className="text-[9px] xs:text-[10px] font-bold uppercase tracking-widest" style={{ color: "#4B6357" }}>Referral ×3</p>
                      </div>
                      <div className="rounded-xl border p-2.5 xs:p-3 text-center" style={{ backgroundColor: "#FFFFFF", borderColor: "#4B6357", color: "#15231F" }}>
                        <p className="text-base xs:text-lg font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{ranking.instagramFollow}</p>
                        <p className="text-[9px] xs:text-[10px] font-bold uppercase tracking-widest" style={{ color: "#4B6357" }}>Instagram ×1</p>
                      </div>
                    </div>
                  )}

                  {/* Referral link — stack input+button su 320px solo se necessario, truncate gestito */}
                  <div className="mt-4 rounded-xl border bg-white p-3 xs:p-3" style={{ borderColor: "#4B6357" }}>
                    <p className="text-xs font-bold" style={{ color: "#15231F", fontFamily: "'Space Grotesk', sans-serif" }}>{w.queueLinkLabel as string}</p>
                    <div className="mt-2 flex gap-2">
                      <code className="min-w-0 flex-1 truncate rounded-full border px-3 py-2.5 text-xs" style={{ backgroundColor: "#F7F5F0", borderColor: "#4B6357", color: "#15231F" }}>{referralLink || (w.rankGenerating as string)}</code>
                      <button onClick={copyLink} className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-bold text-white" style={{ backgroundColor: "#15231F" }}>
                        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? (w.queueCopied as string) : (w.queueCopy as string)}
                      </button>
                    </div>
                    <div className="mt-3 grid grid-cols-4 gap-1.5 xs:gap-2">
                      <a href={`https://wa.me/?text=${shareTextEncoded}`} target="_blank" rel="noopener noreferrer" className="rounded-full py-2.5 text-center text-[11px] xs:text-xs font-bold text-white" style={{ backgroundColor: "#4B6357" }}>WA</a>
                      <a href={`https://twitter.com/intent/tweet?text=${shareTextEncoded}`} target="_blank" rel="noopener noreferrer" className="rounded-full border bg-white py-2.5 text-center text-[11px] xs:text-xs font-bold" style={{ borderColor: "#15231F", color: "#15231F" }}>X</a>
                      <a href={`mailto:?subject=${encodeURIComponent("AgentCloud Waitlist")}&body=${shareTextEncoded}`} className="rounded-full py-2.5 text-center text-[11px] xs:text-xs font-bold text-white" style={{ backgroundColor: "#15231F" }}>Email</a>
                      <a href={`sms:?&body=${shareTextEncoded}`} className="rounded-full py-2.5 text-center text-[11px] xs:text-xs font-bold text-white" style={{ backgroundColor: "#E2A33D", color: "#15231F" }}>SMS</a>
                    </div>
                  </div>

                  {/* 5 davanti */}
                  {ahead.length > 0 ? (
                    <div className="mt-4">
                      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#4B6357", fontFamily: "'Space Grotesk', sans-serif" }}>{w.rankAheadTitle as string}</p>
                      <ol className="mt-2 space-y-1.5">
                        {ahead.map((a) => (
                          <li key={a.rank} className="flex items-center justify-between gap-2 rounded-xl border bg-white px-2.5 xs:px-3 py-2" style={{ borderColor: "#4B6357" }}>
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: "#4B6357" }}>#{a.rank}</span>
                              <span className="truncate text-sm font-medium" style={{ color: "#15231F" }}>{a.emailMasked}</span>
                            </span>
                            <span className="shrink-0 text-[11px] xs:text-xs" style={{ color: "#4B6357" }}>{w.rankAheadRow as string}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : (
                    <p className="mt-3 rounded-xl px-3 py-2 text-center text-xs font-bold" style={{ backgroundColor: "#E2A33D", color: "#15231F" }}>
                      {w.rankTopNote as string}
                    </p>
                  )}
                </div>

                {/* Instagram card — still inside dashboard, but with Paper styling */}
                <div className="bg-[#F7F5F0] px-5 pb-5" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
                  <InstagramFollowCard onCompleted={refreshRanking} />
                </div>

                <div className="bg-neutral-900 px-5 py-3">
                  <button onClick={openForm} className="flex w-full items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/5 py-2.5 text-sm font-semibold text-white hover:bg-white/10">
                    <Copy className="h-4 w-4" /> Vedi dettagli referral
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Demo live: logo + benvenuto + 4 suggerimenti quando vuota, poi chat reale */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25 }} className="mt-10 w-full max-w-xl 3xl:max-w-2xl">
          <div className="rounded-3xl 3xl:rounded-[28px] border border-white/10 bg-neutral-900/70 p-3 3xl:p-4 shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur">
            <div className="rounded-2xl border border-white/5 bg-neutral-950 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/10 px-2.5 py-1 text-xs font-semibold text-brand-300">
                  <Sparkles className="h-3 w-3" /> {w.demoLiveBadge as string}
                </span>
                <span className={`h-2 w-2 rounded-full ${demoSending ? "animate-pulse bg-amber-400" : "animate-pulse bg-emerald-400"}`} />
              </div>
              {/* Altezza fissa con scroll interno: la card non si allunga al crescere dei messaggi */}
              <div ref={demoBodyRef} className="h-72 3xl:h-80 space-y-3 overflow-y-auto pr-1">
                {demoMessages.length === 0 ? (
                  <div className="flex flex-col items-center gap-4 py-2">
                    <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-white/10 bg-white shadow-sm">
                      <Image src="/agentcloud.png" alt="AgentCloud" fill className="object-cover" sizes="40px" />
                    </div>
                    <div className="w-full rounded-2xl rounded-bl-sm border border-brand-500/20 bg-linear-to-br from-brand-500/15 to-pink-500/15 px-4 py-3 text-left text-sm leading-relaxed text-white">
                      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-brand-300"><span className="h-5 w-5 rounded-full bg-linear-to-r from-brand-500 to-pink-500" /> AgentCloud</div>
                      <p className="whitespace-pre-line">{w.demoWelcome as string}</p>
                    </div>
                    <div className="grid w-full gap-2">
                      {((w.demoSuggestions as unknown as string[]) ?? []).map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => handleDemoSuggestionClick(suggestion)}
                          disabled={demoSending}
                          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-left text-sm leading-snug text-neutral-200 transition hover:border-brand-500/30 hover:bg-white/10 hover:text-white disabled:opacity-40"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  demoMessages.map((message, index) => (
                    <div key={`${index}-${message.role}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${message.role === "user" ? "rounded-br-sm bg-white text-neutral-900" : "rounded-bl-sm border border-brand-500/20 bg-linear-to-br from-brand-500/15 to-pink-500/15 text-white"}`}>
                        {message.role === "assistant" && <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-brand-300"><span className="h-5 w-5 rounded-full bg-linear-to-r from-brand-500 to-pink-500" /> AgentCloud</div>}
                        {message.content}
                      </div>
                    </div>
                  ))
                )}
                {demoSending && <div className="text-xs text-brand-300">{w.demoTyping as string}</div>}
              </div>
              <form onSubmit={handleDemoSubmit} className="mt-4 flex gap-2 border-t border-white/10 pt-3">
                <input value={demoInput} onChange={(event) => setDemoInput(event.target.value)} placeholder={w.demoInputPlaceholder as string} disabled={demoSending} className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-neutral-500 outline-none focus:border-brand-500" />
                <button type="submit" disabled={demoSending || !demoInput.trim()} className="rounded-full bg-white px-4 py-2.5 text-sm font-bold text-black disabled:cursor-not-allowed disabled:opacity-40" aria-label={w.demoInputPlaceholder as string}><ArrowRight className="h-4 w-4" /></button>
              </form>
            </div>
          </div>
        </motion.div>
      </section>

      {/* PIATTAFORMA — cos'è in 3 pillastri — 3xl: container largo + padding + typo */}
      <section className="relative z-10 mx-auto max-w-6xl 3xl:max-w-420 4xl:max-w-460 px-4 py-10 sm:px-6 3xl:px-8 3xl:py-16">
        <div className="mx-auto max-w-3xl 3xl:max-w-4xl text-center">
          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold tracking-widest text-neutral-400 3xl:text-sm">{w.piattaformaBadge as string}</span>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl 3xl:text-4xl">{w.piattaformaTitle as string}</h2>
          <p className="mx-auto mt-3 max-w-2xl 3xl:max-w-3xl text-sm 3xl:text-base leading-relaxed text-neutral-400">{w.piattaformaSub as string}</p>
        </div>
        <div className="mt-8 3xl:mt-10 grid gap-4 3xl:gap-6 sm:grid-cols-3">
          {[
            { icon: Zap, title: w.piattaformaF1Title as string, desc: w.piattaformaF1Desc as string },
            { icon: Users, title: w.piattaformaF2Title as string, desc: w.piattaformaF2Desc as string },
            { icon: ShieldCheck, title: w.piattaformaF3Title as string, desc: w.piattaformaF3Desc as string },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 3xl:p-7">
              <div className="flex h-9 w-9 3xl:h-11 3xl:w-11 items-center justify-center rounded-xl bg-linear-to-br from-brand-500 to-pink-500 text-white"><f.icon className="h-5 w-5 3xl:h-6 3xl:w-6" /></div>
              <h3 className="mt-3 text-sm 3xl:text-base font-bold text-white">{f.title}</h3>
              <p className="mt-1 text-sm 3xl:text-[15px] leading-relaxed text-neutral-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AGENTI — cosa fanno — 3xl: griglia più ariosa */}
      <section className="relative z-10 mx-auto max-w-6xl 3xl:max-w-420 4xl:max-w-460 px-4 py-8 sm:px-6 3xl:px-8 3xl:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs 3xl:text-sm font-semibold tracking-widest text-neutral-400">{w.agentiBadge as string}</span>
            <h2 className="mt-3 text-xl font-extrabold text-white sm:text-2xl 3xl:text-3xl">{w.agentiTitle as string}</h2>
          </div>
          <button onClick={openForm} className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm 3xl:text-base font-semibold text-white hover:bg-white/10">{w.agentiCta as string} <ArrowRight className="h-4 w-4" /></button>
        </div>
        <div className="mt-6 3xl:mt-8 grid gap-4 3xl:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {WAITLIST_FEATURED_AGENTS.map((agent) => (
            <div key={agent.slug} className="rounded-2xl border border-white/10 bg-neutral-900/60 p-5 3xl:p-7">
              <div className="text-xs 3xl:text-sm font-bold tracking-widest text-brand-400">{agent.category}</div>
              <h3 className="mt-1 text-sm 3xl:text-base font-bold text-white">{agent.name}</h3>
              <p className="mt-1 text-sm 3xl:text-[15px] leading-relaxed text-neutral-400">{agent.description}</p>
              <ul className="mt-3 3xl:mt-4 space-y-1">
                {agent.tasks.slice(0, 3).map((task) => (<li key={task} className="flex items-center gap-1.5 text-xs 3xl:text-sm font-medium text-emerald-300"><Check className="h-3.5 w-3.5" />{task}</li>))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* INTEGRAZIONI — dove vivi già — 3xl: container + padding */}
      <section className="relative z-10 mx-auto max-w-6xl 3xl:max-w-420 4xl:max-w-460 px-4 py-8 sm:px-6 3xl:px-8 3xl:py-12">
        <div className="rounded-3xl border border-white/10 bg-neutral-900/60 p-6 3xl:p-10 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs 3xl:text-sm font-semibold tracking-widest text-brand-400">{w.integrazioniBadge as string}</div>
              <h3 className="mt-1 text-lg 3xl:text-xl font-bold text-white">{w.integrazioniTitle as string}</h3>
              <p className="mt-1 text-sm 3xl:text-base text-neutral-400">{w.integrazioniSub as string}</p>
            </div>
            <button onClick={openForm} className="rounded-full bg-white px-5 py-2.5 text-sm 3xl:text-base 3xl:px-7 3xl:py-3 font-bold text-black">{w.integrazioniCta as string}</button>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-2 xs:grid-cols-3 sm:grid-cols-6 sm:gap-3 3xl:gap-4">
            {[
              { name: "Shopify", brand: "shopify" },
              { name: "Gmail", brand: "gmail" },
              { name: "Slack", brand: "slack" },
              { name: "Notion", brand: "notion" },
              { name: "HubSpot", brand: "hubspot" },
              { name: "Sheets", brand: "googlesheets" },
            ].map((it) => (
              <div key={it.name} className="flex flex-col items-center gap-1.5 xs:gap-2 rounded-2xl border border-white/5 bg-white/[0.03] px-1.5 xs:px-2 py-3 xs:py-4 text-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
                  <BrandLogo slug={it.brand} size={20} />
                </div>
                <span className="text-[11px] xs:text-xs font-semibold text-white">{it.name}</span>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">1 click</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-neutral-500">{w.integrazioniMore as string}</p>
        </div>
      </section>

      {/* CHI SIAMO — founders — 3xl: container largo, card più spaziose */}
      <section className="relative z-10 mx-auto max-w-6xl 3xl:max-w-420 4xl:max-w-460 px-4 py-10 sm:px-6 3xl:px-8 3xl:py-16">
        <div className="mx-auto max-w-3xl 3xl:max-w-4xl text-center">
          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs 3xl:text-sm font-semibold tracking-widest text-neutral-400">{w.chiSiamoBadge as string}</span>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl 3xl:text-4xl">{w.chiSiamoTitle as string}</h2>
          <p className="mx-auto mt-3 max-w-2xl 3xl:max-w-3xl text-sm 3xl:text-base leading-relaxed text-neutral-400">{w.chiSiamoSub as string}</p>
        </div>
        <div className="mt-8 3xl:mt-10 grid gap-6 3xl:gap-8 sm:grid-cols-3">
          {[
            {
              name: "Gabriele Forestieri",
              role: "Developer",
              img: "/founders/gabriele_forestieri.jpg",
              bio: w.foundersGabBio as string,
              instagram: "https://www.instagram.com/gabrieleforestieri_/",
            },
            {
              name: "Alle Cerchiari",
              role: "Social & Marketing",
              img: "/founders/alle_cerchiari.jpeg",
              bio: w.foundersAlleBio as string,
              instagram: "https://www.instagram.com/_allespy_/",
            },
            {
              name: "Matteo Parubi",
              role: "Stripe & Pricing",
              sub: "Paru",
              img: "/founders/matteo_parubi.jpeg",
              bio: w.foundersMatteoBio as string,
              instagram: "https://www.instagram.com/matteo.parubi/",
            },
          ].map((m) => (
            <div key={m.name} className="group rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-center backdrop-blur">
              <div className="relative mx-auto h-24 w-24 overflow-hidden rounded-full border border-white/10 bg-neutral-800">
                <Image src={m.img} alt={m.name} fill sizes="96px" className="object-cover" />
              </div>
              <h3 className="mt-4 text-base font-bold text-white">{m.name} {m.sub ? <span className="font-normal text-neutral-400">· {m.sub}</span> : null}</h3>
              <p className="mt-1 text-xs font-bold uppercase tracking-widest text-brand-300">{m.role}</p>
              <p className="mt-3 text-sm leading-relaxed text-neutral-400">{m.bio}</p>
              <a href={m.instagram} target="_blank" rel="noopener noreferrer" aria-label={`Instagram di ${m.name}`} className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:bg-white/10 hover:text-white">
                <BrandIcon brand={BRANDS.instagram} size={16} color="currentColor" /> Instagram
              </a>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-neutral-500">{w.teamPhotosNote as string} <a href="/about" className="font-semibold text-brand-400 hover:text-brand-300">{w.teamPhotosLink as string}</a>.</p>
      </section>

      {/* MODAL FORM — appare su click bottoni — mobile-safe: dvh + overscroll-contain + input 16px anti-zoom */}
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
              className="fixed inset-0 z-50 flex items-center justify-center p-3 xs:p-4"
            >
              <div className="relative w-full max-w-md max-h-[90dvh] sm:max-h-[90vh] overflow-y-auto overscroll-contain rounded-3xl border border-white/10 bg-neutral-900 p-4 xs:p-5 shadow-2xl sm:p-6">
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
                        inputMode="email"
                        className="w-full rounded-full border border-white/10 bg-neutral-800 px-5 py-3.5 sm:py-3 text-[16px] sm:text-sm text-white placeholder-neutral-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        disabled={isSubmitting || isGoogleLoading}
                      />
                      <button
                        type="submit"
                        disabled={isSubmitting || isGoogleLoading}
                        className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full bg-linear-to-r from-brand-500 to-pink-500 px-6 py-3.5 sm:py-3 text-[15px] sm:text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:opacity-90 disabled:opacity-50"
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
                            className="h-full rounded-full bg-linear-to-r from-brand-500 to-pink-500"
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
                          <code className="min-w-0 flex-1 truncate rounded-full border border-white/10 bg-neutral-900 px-3 py-2.5 text-xs text-neutral-200">{referralLink}</code>
                          <button onClick={copyLink} className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-xs font-semibold text-black">
                            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? (w.queueCopied as string) : (w.queueCopy as string)}
                          </button>
                        </div>
                        <p className="text-center text-xs font-medium text-brand-300">{w.queueShare as string}</p>
                        <div className="grid grid-cols-4 gap-1.5 xs:gap-2">
                          <a href={`https://wa.me/?text=${shareTextEncoded}`} target="_blank" rel="noopener noreferrer" className="rounded-full bg-[#25D366] py-2.5 text-center text-[11px] xs:text-xs font-bold text-white">WA</a>
                          <a href={`https://twitter.com/intent/tweet?text=${shareTextEncoded}`} target="_blank" rel="noopener noreferrer" className="rounded-full bg-black border border-white/10 py-2.5 text-center text-[11px] xs:text-xs font-bold text-white">X</a>
                          <a href={`mailto:?subject=${encodeURIComponent("AgentCloud Waitlist")}&body=${shareTextEncoded}`} className="rounded-full bg-neutral-800 border border-white/10 py-2.5 text-center text-[11px] xs:text-xs font-bold text-white">Email</a>
                          <a href={`sms:?&body=${shareTextEncoded}`} className="rounded-full bg-brand-500 py-2.5 text-center text-[11px] xs:text-xs font-bold text-white">SMS</a>
                        </div>
                        <p className="rounded-xl bg-white/5 px-3 py-2 text-center text-xs leading-relaxed text-neutral-400">{w.queueRule as string}</p>
                      </div>
                    )}
                    <InstagramFollowCard onCompleted={refreshRanking} />
                    <button onClick={closeForm} className="w-full rounded-full border border-white/10 bg-white/5 py-2.5 text-sm font-semibold text-white hover:bg-white/10">{w.modalClose as string}</button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* POPUP BENVENUTO + NOME — dopo iscrizione waitlist — mobile-optimized: dvh, anti-zoom 16px, safe area */}
      <AnimatePresence>
        {showWelcome && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeWelcome}
              className="fixed inset-0 z-60 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ type: "spring", damping: 24, stiffness: 260 }}
              className="fixed inset-0 z-61 flex items-center justify-center p-3 xs:p-4"
            >
              <div className="relative w-full max-w-md max-h-[90dvh] sm:max-h-[90vh] overflow-y-auto overscroll-contain rounded-3xl border border-white/10 bg-neutral-900 shadow-2xl">
                <button
                  onClick={closeWelcome}
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white"
                  aria-label="Chiudi"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="p-5 xs:p-6 sm:p-7">
                  {!welcomeDone ? (
                    <>
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-brand-500 to-pink-500 text-white shadow-lg shadow-brand-500/20">
                        <Sparkles className="h-6 w-6" />
                      </div>
                      <h3 className="mt-4 text-center text-lg xs:text-xl font-extrabold tracking-tight text-white">
                        {w.welcomeTitle as string}
                      </h3>
                      <p className="mt-2 text-center text-sm leading-relaxed text-neutral-400">
                        {w.welcomeSubtitle as string}
                      </p>

                      <form onSubmit={handleWelcomeSave} className="mt-6 space-y-3">
                        <div className="relative">
                          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">
                            <Users className="h-4 w-4" />
                          </span>
                          <input
                            type="text"
                            value={welcomeName}
                            onChange={(e) => {
                              setWelcomeName(e.target.value);
                              if (welcomeError) setWelcomeError("");
                            }}
                            placeholder={w.welcomePlaceholder as string}
                            autoFocus
                            maxLength={80}
                            className="w-full rounded-full border border-white/10 bg-neutral-800 py-3.5 sm:py-3 pl-11 pr-5 text-[16px] sm:text-sm text-white placeholder-neutral-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                            disabled={welcomeSaving}
                          />
                        </div>
                        {welcomeError && <p className="text-center text-sm text-red-400">{welcomeError}</p>}
                        <button
                          type="submit"
                          disabled={welcomeSaving}
                          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-linear-to-r from-brand-500 to-pink-500 px-6 py-3.5 sm:py-3 text-[15px] sm:text-sm font-bold text-white shadow-lg shadow-brand-500/25 hover:opacity-90 disabled:opacity-50"
                        >
                          {welcomeSaving ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" /> {w.welcomeSaving as string}
                            </>
                          ) : (
                            <>
                              {w.welcomeSave as string} <ArrowRight className="h-4 w-4" />
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={closeWelcome}
                          disabled={welcomeSaving}
                          className="min-h-11 w-full rounded-full border border-white/10 bg-white/5 py-3 text-sm font-semibold text-neutral-300 hover:bg-white/10 hover:text-white disabled:opacity-50"
                        >
                          {w.welcomeSkip as string}
                        </button>
                      </form>
                      <p className="mt-4 text-center text-xs text-neutral-500">{w.welcomeNote as string}</p>
                    </>
                  ) : (
                    <div className="py-2 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white">
                        <Check className="h-6 w-6" />
                      </div>
                      <h3 className="mt-4 text-lg font-bold text-white">{welcomeName ? (w.welcomeThanksName as string).replace("{name}", welcomeName) : (w.welcomeThanks as string)}</h3>
                      <p className="mt-2 text-sm text-neutral-400">{w.welcomeSaved as string}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 3 ATTI — 3xl: container + typo */}
      <section className="relative z-10 mx-auto max-w-6xl 3xl:max-w-420 4xl:max-w-460 px-4 py-10 sm:px-6 3xl:px-8 3xl:py-16">
        <div className="text-center">
          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs 3xl:text-sm font-semibold tracking-widest text-neutral-400">{w.howItWorksBadge as string}</span>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl 3xl:text-4xl">{w.howItWorksTitle as string}</h2>
        </div>

        <div className="relative mt-8 grid gap-6 md:grid-cols-3">
          <div className="hidden md:block absolute left-[16%] right-[16%] top-13 h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />
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
                  <div className="flex h-28">
                    {/* Sidebar fedele allo stile reale: bg-neutral-950/80 backdrop-blur-2xl border-r border-white/[0.06] */}
                    <div className="flex w-24 shrink-0 flex-col gap-1 border-r border-white/6 bg-neutral-950/80 p-2 backdrop-blur-2xl">
                      <div className="mb-1 flex items-center gap-1.5 border-b border-white/6 pb-1.5">
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
                          className={`flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-[8px] font-semibold ${active ? "bg-white/6 text-white border border-white/8" : "text-neutral-500"}`}
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
                          <motion.div key={i} initial={{ height: 0 }} whileInView={{ height: `${h}%` }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="rounded-t-sm bg-linear-to-t from-brand-500/60 to-pink-400/60" />
                        ))}
                      </div>
                      <div className="mt-1.5 flex gap-1">
                        <span className="text-[7px] text-neutral-500">7 giorni</span>
                      </div>
                    </div>
                  </div>
                </div>
              ),
            },
          ].map((s) => (
            <div key={s.n} className="relative rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-linear-to-br from-brand-500 to-pink-500 text-white">
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

      {/* Social proof — 3xl: container + stats più ariose */}
      <section className="relative z-10 mx-auto max-w-6xl 3xl:max-w-420 4xl:max-w-460 px-4 py-8 sm:px-6 3xl:px-8 3xl:py-12">
        <div className="rounded-3xl border border-white/10 bg-neutral-900/60 p-6 3xl:p-10 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs 3xl:text-sm font-semibold tracking-widest text-brand-400">{w.socialBadge as string}</div>
              <h3 className="mt-1 text-lg 3xl:text-xl font-bold text-white">{w.socialTitle as string}</h3>
            </div>
            <span className="rounded-full bg-white/5 px-3 py-1 text-xs 3xl:text-sm text-neutral-400">{w.socialPreviewBadge as string}</span>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {WAITLIST_FEATURED_AGENTS.map((agent) => (
              <div key={agent.slug} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-center">
                <Users className="mx-auto h-5 w-5 text-brand-400" />
                <div className="mt-2 text-sm font-extrabold text-white">{agent.name}</div>
                <div className="mt-1 text-xs text-neutral-500">{w.agentPreviewNote as string}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ — 3xl: max-w e typo */}
      <section className="relative z-10 mx-auto max-w-3xl 3xl:max-w-4xl px-4 py-8 sm:px-6 3xl:px-8 3xl:py-12">
        <div className="text-center">
          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs 3xl:text-sm font-semibold tracking-widest text-neutral-400">{w.faqBadge as string}</span>
          <h2 className="mt-3 text-2xl 3xl:text-3xl font-bold text-white">{w.faqTitle as string}</h2>
        </div>
        <div className="mt-6 3xl:mt-8 space-y-3 3xl:space-y-4">
          {(w.faqItems as { q: string; a: string }[]).map((item, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
              <button onClick={() => setShowFaq(showFaq === i ? null : i)} className="flex w-full items-center justify-between px-5 3xl:px-6 py-4 3xl:py-5 text-left">
                <span className="text-sm 3xl:text-base font-semibold text-white">{item.q}</span>
                <ChevronDown className={`h-4 w-4 3xl:h-5 3xl:w-5 text-neutral-400 transition ${showFaq === i ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {showFaq === i && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <p className="px-5 3xl:px-6 pb-4 3xl:pb-5 text-sm 3xl:text-[15px] leading-relaxed text-neutral-400">{item.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-xs 3xl:text-sm text-neutral-500">{w.noSpam as string}</p>
      </section>

      {/* Footer CTA — 3xl allargata */}
      <section className="relative z-10 mx-auto max-w-6xl 3xl:max-w-420 4xl:max-w-460 px-4 pb-10 sm:px-6 3xl:px-8 3xl:pb-16">
        <div className="rounded-[28px] 3xl:rounded-4xl border border-brand-500/20 bg-linear-to-r from-brand-600 via-brand-500 to-pink-500 p-px">
          <div className="rounded-[27px] 3xl:rounded-[31px] bg-neutral-950 px-6 py-8 text-center sm:px-10 sm:py-10 3xl:px-14 3xl:py-14">
            <h2 className="text-2xl font-extrabold text-white sm:text-3xl 3xl:text-4xl">{w.footerCtaTitle as string}</h2>
            <p className="mx-auto mt-2 max-w-xl 3xl:max-w-2xl text-sm 3xl:text-base text-neutral-400">{w.footerCtaSubtitle as string}</p>
            <button onClick={openForm} className="mt-6 3xl:mt-8 inline-flex items-center gap-2 rounded-full bg-white px-8 3xl:px-10 py-3 3xl:py-4 text-sm 3xl:text-base font-bold text-black">
              {isSuccess ? (w.heroJoined as string) : (w.heroCta as string)} <ArrowRight className="h-4 w-4 3xl:h-5 3xl:w-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer contatto + social — sfondo opaco: dietro c'è il gradiente globale fixed, e il footer trasparente lascerebbe trasparire il contenuto durante lo scroll */}
      <div className="relative z-10 bg-[#121214]">
        <Footer />
      </div>
    </div>
  );
}
