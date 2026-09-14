"use client";

/**
 * FoundingSpotsBanner — offerta a scarsità limitata con posti rimasti.
 *
 * Server deve passare spotsRemaining/totalSpots già risolti (getRemainingSpots()).
 * Stesso pattern dismiss di LaunchCountdownBanner (localStorage per offerId),
 * animazioni solo transform/opacity, focus visibile, colori AgentCloud ad alto contrasto.
 */
import { useEffect, useState, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { X, Users, Flame } from "lucide-react";

type Props = {
  spotsRemaining: number;
  totalSpots: number;
  offerId?: string;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  dismissible?: boolean;
};

const DEFAULT_OFFER_ID = "founding-20";

export default function FoundingSpotsBanner({
  spotsRemaining,
  totalSpots,
  offerId = DEFAULT_OFFER_ID,
  title = "Diventa Founding Member",
  subtitle = "Posti limitati con benefici permanenti.",
  ctaLabel = "Blocca il tuo posto",
  ctaHref = "/waitlist",
  dismissible = true,
}: Props) {
  const reduce = useReducedMotion();
  const [dismissed, setDismissed] = useState(false);

  const taken = Math.max(0, totalSpots - spotsRemaining);
  const pct = totalSpots > 0 ? Math.min(100, Math.round((taken / totalSpots) * 100)) : 0;
  const isSoldOut = spotsRemaining <= 0;

  useEffect(() => {
    try {
      if (localStorage.getItem(`ac_banner_dismiss_${offerId}`) === "1") setDismissed(true);
    } catch {}
  }, [offerId]);

  const handleDismiss = useCallback(() => {
    try {
      localStorage.setItem(`ac_banner_dismiss_${offerId}`, "1");
    } catch {}
    setDismissed(true);
  }, [offerId]);

  if (dismissed || isSoldOut) return null;

  const urgency = spotsRemaining <= 3 ? "Altissima richiesta" : spotsRemaining <= 7 ? "Ultimi posti" : "Offerta founding";

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: -8 }}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      role="region"
      aria-label="Posti founding rimanenti"
      className="relative isolate overflow-hidden border-b border-white/10"
      style={{
        background:
          "linear-gradient(90deg, #0a0a0f 0%, #1a0b1e 18%, #7a2b56 38%, #e879a8 58%, #f97316 100%)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-15"
        style={{
          background:
            "radial-gradient(circle at 88% 50%, rgba(255,255,255,0.4), transparent 20%), radial-gradient(circle at 12% 20%, rgba(255,255,255,0.25), transparent 18%)",
        }}
      />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-6 lg:px-8">
        <div className="flex flex-1 items-center gap-3 min-w-0">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 border border-white/20 backdrop-blur">
            <Users className="h-4 w-4 text-white" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 text-sm font-extrabold leading-none text-white">
              {title}
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs font-black text-pink-700">
                <Flame className="h-3 w-3" />
                {urgency}
              </span>
              <span className="text-white/90 font-black">
                {spotsRemaining}/{totalSpots} rimasti
              </span>
            </p>
            <p className="hidden sm:block text-xs font-medium text-white/90">{subtitle}</p>
            {/* progress */}
            <div
              className="mt-2 h-1.5 w-full max-w-[280px] overflow-hidden rounded-full bg-white/20"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Avanzamento posti founding"
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={reduce ? { duration: 0 } : { duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full bg-white"
                style={{ opacity: 0.95 }}
              />
            </div>
          </div>
        </div>

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
              aria-label="Chiudi banner posti"
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
