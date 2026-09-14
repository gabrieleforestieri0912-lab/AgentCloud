"use client";

/**
 * LaunchCountdownBanner — offerta a tempo limitato con countdown live.
 *
 * Adattato a AgentCloud: riusa font esistenti (Manrope/Inter via --font-sans),
 * palette brand ad alto contrasto (gradient brand-600 → orange-600 + glow),
 * animazioni solo transform/opacity, rispetta prefers-reduced-motion,
 * focus visibile CTA/close, dismiss persistito in localStorage per offerId.
 *
 * Props non hardcodate: deadline ISO, offerId, cta href/label.
 * Server deve passare deadline già risolta; il componente non fa fetch.
 */
import { useEffect, useSyncExternalStore, useState, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { X, Clock, Sparkles } from "lucide-react";

type Props = {
  deadline: string; // ISO 8601
  offerId?: string;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  dismissible?: boolean;
};

const DEFAULT_OFFER_ID = "launch-2026-09-15";

function getDeadlineMs(iso: string): number {
  return new Date(iso).getTime();
}

function getTimeLeft(deadlineMs: number) {
  const diff = Math.max(0, deadlineMs - Date.now());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds, totalMs: diff };
}

// useSyncExternalStore per evitare re-render inutili (solo quando cambia il secondo)
let snap: ReturnType<typeof getTimeLeft> = getTimeLeft(Date.now() + 100000000);
let deadlineRef = 0;

function subscribe(cb: () => void) {
  const id = setInterval(cb, 1000);
  return () => clearInterval(id);
}
function getSnapshot() {
  const next = getTimeLeft(deadlineRef);
  if (
    next.days !== snap.days ||
    next.hours !== snap.hours ||
    next.minutes !== snap.minutes ||
    next.seconds !== snap.seconds
  ) {
    snap = next;
  }
  return snap;
}
function getServerSnapshot() {
  return snap;
}

export default function LaunchCountdownBanner({
  deadline,
  offerId = DEFAULT_OFFER_ID,
  title = "Offerta di lancio — 30% di sconto",
  subtitle = "Attiva entro la scadenza e blocca il prezzo founding per sempre.",
  ctaLabel = "Sblocca l'offerta",
  ctaHref = "/agents",
  dismissible = true,
}: Props) {
  const reduce = useReducedMotion();
  const [dismissed, setDismissed] = useState(false);
  const deadlineMs = getDeadlineMs(deadline);

  // init reduced-motion + localStorage + deadline ref
  useEffect(() => {
    deadlineRef = deadlineMs;
    snap = getTimeLeft(deadlineMs);
    try {
      if (localStorage.getItem(`ac_banner_dismiss_${offerId}`) === "1") setDismissed(true);
    } catch {}
  }, [deadlineMs, offerId]);

  const time = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const expired = time.totalMs <= 0;

  const handleDismiss = useCallback(() => {
    try {
      localStorage.setItem(`ac_banner_dismiss_${offerId}`, "1");
    } catch {}
    setDismissed(true);
  }, [offerId]);

  if (dismissed || expired) return null;

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: -8 }}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      exit={reduce ? undefined : { opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      role="region"
      aria-label="Offerta di lancio a tempo limitato"
      className="relative isolate overflow-hidden border-b border-white/10"
      style={{
        background:
          "linear-gradient(90deg, #022a5a 0%, #026fcb 22%, #038bfe 38%, #f97316 72%, #e879a8 100%)",
      }}
    >
      {/* glow overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          background:
            "radial-gradient(circle at 15% 50%, rgba(255,255,255,0.35), transparent 22%), radial-gradient(circle at 85% 30%, rgba(255,255,255,0.25), transparent 18%)",
        }}
      />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 lg:px-8">
        {/* left: icon + copy + countdown */}
        <div className="flex flex-1 items-center gap-3 min-w-0">
          <span className="hidden sm:inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur border border-white/20">
            <Clock className="h-4 w-4 text-white" />
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-extrabold leading-none text-white">
              <Sparkles className="h-3.5 w-3.5 text-white/90 sm:hidden" />
              {title}
            </p>
            <p className="hidden sm:block text-xs font-medium text-white/90">{subtitle}</p>
          </div>
          {/* countdown blocks */}
          <div className="ml-auto flex items-center gap-1 sm:ml-4" aria-live="polite" aria-atomic="true">
            {[
              { v: time.days, l: "GG" },
              { v: time.hours, l: "H" },
              { v: time.minutes, l: "M" },
              { v: time.seconds, l: "S" },
            ].map((u, i, arr) => (
              <span key={u.l} className="flex items-center gap-1">
                <span className="inline-flex min-w-[2.2rem] justify-center rounded-md bg-black/25 px-1.5 py-1 text-sm font-extrabold tabular-nums text-white border border-white/15 backdrop-blur">
                  {String(u.v).padStart(2, "0")}
                </span>
                <span className="text-[10px] font-bold tracking-widest text-white/80">{u.l}</span>
                {i < arr.length - 1 && <span className="mx-0.5 text-white/40">:</span>}
              </span>
            ))}
          </div>
        </div>

        {/* right: CTA + close */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={ctaHref}
            className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-extrabold text-neutral-900 shadow-lg shadow-black/20 transition hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          >
            {ctaLabel}
          </a>
          {dismissible && (
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Chiudi banner offerta"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white border border-white/20 backdrop-blur transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
