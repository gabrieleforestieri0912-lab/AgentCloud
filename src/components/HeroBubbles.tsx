"use client";

/**
 * Costellazione di marchi/agenti della hero (e di altre sezioni):
 * app e agenti mischiati insieme, animazioni framer-motion in float.
 * Puramente decorativa — nascosta sotto lg.
 */
import { motion } from "framer-motion";
import BrandLogo from "./BrandLogo";
import AgentIcon from "./AgentIcon";
import { BRANDS } from "@/lib/brands";
import { AGENTS, localizeAgent } from "@/lib/agents";
import { useLanguage } from "./LanguageProvider";
import type { Locale } from "@/lib/i18n/constants";

// Bubble unificato: brand (logo app) OPPURE agente (icona + nome)
type Bubble =
  | { kind: "brand"; top: string; left: string; size: string; brand: string; delay: string; anim: string }
  | { kind: "agent"; top: string; left: string; size: string; agentSlug: string; delay: string; anim: string };

// Lista mista app + agenti, distribuita organicamente su entrambi i lati.
// Gli agenti usano il loro icon e accent; le app usano BrandLogo.
const BUBBLES: Bubble[] = [
  // ── Lato sinistro — zigzag su tutta la larghezza (0-60%)
  //    Altezza residua = ~580px; con 12 bolle ≈ 48px di gap verticale minimo.
  //    Alterniamo posizione orizzontale (destra/sinistra) per evitare sovrapposizioni.
  { kind: "brand",  top: "4%",  left: "5%",  size: "w-10 h-10", brand: "google",       delay: "0s",   anim: "animate-float-gentle" },
  { kind: "agent",  top: "12%", left: "32%", size: "w-11 h-11", agentSlug: "shopify-agent",  delay: "0.5s", anim: "animate-float-reverse" },
  { kind: "brand",  top: "21%", left: "8%",  size: "w-9 h-9",   brand: "facebook",     delay: "1.1s", anim: "animate-float-gentle" },
  { kind: "agent",  top: "30%", left: "38%", size: "w-10 h-10", agentSlug: "lead-capture",  delay: "0.3s", anim: "animate-float-gentle" },
  { kind: "brand",  top: "39%", left: "3%",  size: "w-11 h-11", brand: "instagram",    delay: "1.7s", anim: "animate-float-reverse" },
  { kind: "agent",  top: "48%", left: "28%", size: "w-9 h-9",   agentSlug: "support-agent",  delay: "0.8s", anim: "animate-float-gentle" },
  { kind: "brand",  top: "57%", left: "12%", size: "w-10 h-10", brand: "discord",      delay: "0.4s", anim: "animate-float-gentle" },
  { kind: "agent",  top: "66%", left: "40%", size: "w-10 h-10", agentSlug: "seo-agent",     delay: "1.4s", anim: "animate-float-reverse" },
  { kind: "brand",  top: "75%", left: "5%",  size: "w-9 h-9",   brand: "gmail",        delay: "2.0s", anim: "animate-float-gentle" },
  { kind: "agent",  top: "84%", left: "30%", size: "w-9 h-9",   agentSlug: "copywriter",    delay: "0.6s", anim: "animate-float-reverse" },
  { kind: "brand",  top: "92%", left: "10%", size: "w-10 h-10", brand: "shopify",      delay: "1.3s", anim: "animate-float-gentle" },

  // ── Lato destro — zigzag su tutta la larghezza (40-100%)
  { kind: "agent",  top: "6%",  left: "55%", size: "w-10 h-10", agentSlug: "business-manager", delay: "0.2s", anim: "animate-float-gentle" },
  { kind: "brand",  top: "15%", left: "80%", size: "w-9 h-9",   brand: "stripe",          delay: "0.9s", anim: "animate-float-reverse" },
  { kind: "agent",  top: "24%", left: "62%", size: "w-11 h-11", agentSlug: "email-manager",   delay: "0.5s", anim: "animate-float-gentle" },
  { kind: "brand",  top: "33%", left: "85%", size: "w-10 h-10", brand: "github",          delay: "1.5s", anim: "animate-float-gentle" },
  { kind: "agent",  top: "42%", left: "55%", size: "w-9 h-9",   agentSlug: "reviews-agent",   delay: "0.7s", anim: "animate-float-reverse" },
  { kind: "brand",  top: "51%", left: "78%", size: "w-10 h-10", brand: "whatsapp",       delay: "1.2s", anim: "animate-float-gentle" },
  { kind: "agent",  top: "60%", left: "65%", size: "w-10 h-10", agentSlug: "social-media-agent", delay: "0.3s", anim: "animate-float-gentle" },
  { kind: "brand",  top: "69%", left: "88%", size: "w-8 h-8",   brand: "hubspot",        delay: "2.1s", anim: "animate-float-reverse" },
  { kind: "agent",  top: "78%", left: "58%", size: "w-11 h-11", agentSlug: "quote-agent",     delay: "1.0s", anim: "animate-float-gentle" },
  { kind: "brand",  top: "87%", left: "82%", size: "w-9 h-9",   brand: "trello",         delay: "0.5s", anim: "animate-float-reverse" },
  { kind: "agent",  top: "95%", left: "68%", size: "w-9 h-9",   agentSlug: "personal-assistant", delay: "1.6s", anim: "animate-float-gentle" },
];

/**
 * Costellazioni decorative fluttuanti — app e agenti mischiati su entrambi i
 * lati. Posizionate in assoluto: il genitore deve essere `relative`; nascoste
 * sotto `lg`. I keyframe di float vivono in globals.css.
 */
export default function HeroBubbles() {
  const { locale } = useLanguage();

  // Split: prime 11 = sinistra, resto = destra
  const leftBubbles = BUBBLES.slice(0, 11);
  const rightBubbles = BUBBLES.slice(11);

  return (
    <>
      {/* COSTELLAZIONE SINISTRA */}
      <motion.div
        className="hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 w-80 xl:w-96 h-150 pointer-events-none select-none z-0"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
        }}
        aria-hidden="true"
      >
        {leftBubbles.map((b, idx) => (
          <BubbleItem key={idx} bubble={b} locale={locale} />
        ))}
      </motion.div>

      {/* COSTELLAZIONE DESTRA */}
      <motion.div
        className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 w-80 xl:w-96 h-150 pointer-events-none select-none z-0"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.05, delayChildren: 0.15 } },
        }}
        aria-hidden="true"
      >
        {rightBubbles.map((b, idx) => (
          <BubbleItem key={idx} bubble={b} locale={locale} />
        ))}
      </motion.div>
    </>
  );
}

function BubbleItem({ bubble, locale }: { bubble: Bubble; locale: Locale }) {
  if (bubble.kind === "brand") {
    const brandData = BRANDS[bubble.brand];
    if (!brandData) return null;
    const bubblePx = Number(bubble.size.match(/\d+/)?.[0] ?? 12) * 4;
    const iconSize = Math.round(bubblePx * 0.42);
    return (
      <motion.div
        className={`absolute rounded-full border border-white/10 bg-neutral-900 flex items-center justify-center shadow-[0_6px_20px_rgba(0,0,0,0.3)] transition-all ${bubble.size} ${bubble.anim}`}
        style={{ top: bubble.top, left: bubble.left, animationDelay: bubble.delay }}
        variants={{
          hidden: { opacity: 0, scale: 0 },
          visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 80, damping: 12 } },
        }}
      >
        <BrandLogo slug={bubble.brand} size={iconSize} />
      </motion.div>
    );
  }

  // Agent bubble: icona + nome
  const agent = AGENTS.find((a) => a.slug === bubble.agentSlug);
  if (!agent) return null;
  const localized = localizeAgent(agent, locale);
  const bubblePx = Number(bubble.size.match(/\d+/)?.[0] ?? 12) * 4;
  const iconSize = Math.round(bubblePx * 0.42);

  return (
    <motion.div
      className={`absolute flex flex-col items-center ${bubble.anim}`}
      style={{ top: bubble.top, left: bubble.left, animationDelay: bubble.delay }}
      variants={{
        hidden: { opacity: 0, scale: 0 },
        visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 80, damping: 12 } },
      }}
    >
      <span className="text-[9px] font-bold text-white/70 uppercase tracking-wider whitespace-nowrap mb-1.5 bg-black/40 backdrop-blur-sm rounded-full px-2 py-0.5 leading-none pointer-events-auto">
        {localized.shortName}
      </span>
      <div
        className={`rounded-full border border-white/10 bg-neutral-900 flex items-center justify-center shadow-[0_6px_20px_rgba(0,0,0,0.3)] ${bubble.size}`}
      >
        <div className={`w-full h-full rounded-full ${localized.accent} flex items-center justify-center scale-95 border-2 border-white/20 shadow-inner`}>
          <AgentIcon icon={localized.icon} brand={localized.brand} size={iconSize} className="text-white" />
        </div>
      </div>
    </motion.div>
  );
}
