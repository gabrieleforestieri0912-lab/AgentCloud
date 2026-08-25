"use client";

import { motion } from "framer-motion";
import BrandLogo from "./BrandLogo";
import { BRANDS } from "@/lib/brands";
import { useLanguage } from "./LanguageProvider";

// Brand slugs reference the central BRANDS registry (src/lib/brands.ts) so the
// bubbles use the same original brand marks as the integrations section.
const LEFT_BUBBLES = [
  { top: "12%", left: "10%", size: "w-10 h-10", brand: "google", delay: "0s", anim: "animate-float-gentle" },
  { top: "8%", left: "48%", size: "w-14 h-14", brand: "googledrive", delay: "0.4s", anim: "animate-float-reverse" },
  { top: "10%", left: "76%", size: "w-9 h-9", brand: "apple", delay: "1.3s", anim: "animate-float-gentle" },
  { top: "25%", left: "18%", size: "w-14 h-14", brand: "facebook", delay: "2.0s", anim: "animate-float-gentle" },
  { top: "22%", left: "68%", size: "w-10 h-10", brand: "github", delay: "0.7s", anim: "animate-float-reverse" },
  { top: "38%", left: "3%", size: "w-11 h-11", brand: "stripe", delay: "1.8s", anim: "animate-float-reverse" },
  { top: "40%", left: "42%", size: "w-14 h-14", brand: "instagram", delay: "1.1s", anim: "animate-float-gentle" },
  { top: "36%", left: "80%", size: "w-10 h-10", brand: "tiktok", delay: "2.5s", anim: "animate-float-gentle" },
  { top: "54%", left: "24%", size: "w-14 h-14", brand: "discord", delay: "0.3s", anim: "animate-float-reverse" },
  { top: "56%", left: "66%", size: "w-12 h-12", brand: "whatsapp", delay: "1.5s", anim: "animate-float-gentle" },
  { top: "72%", left: "8%", size: "w-11 h-11", brand: "gmail", delay: "2.2s", anim: "animate-float-gentle" },
  { top: "68%", left: "50%", size: "w-12 h-12", brand: "trello", delay: "0.9s", anim: "animate-float-reverse" },
  { top: "70%", left: "84%", size: "w-9 h-9", brand: "android", delay: "0.5s", anim: "animate-float-gentle" },
  { top: "86%", left: "18%", size: "w-13 h-13", brand: "dropbox", delay: "1.6s", anim: "animate-float-gentle" },
  { top: "84%", left: "56%", size: "w-12 h-12", brand: "hubspot", delay: "2.8s", anim: "animate-float-reverse" },
  { top: "90%", left: "35%", size: "w-13 h-13", brand: "shopify", delay: "1.9s", anim: "animate-float-gentle" },
];

// Agent avatars — role + initials bubbles mirroring the hero's right side.
const RIGHT_BUBBLES = [
  { top: "12%", left: "48%", size: "w-14 h-14", role: "Product Manager", initials: "PM", avatarBg: "bg-blue-500", delay: "0.2s", anim: "animate-float-gentle" },
  { top: "14%", left: "76%", size: "w-10 h-10", role: "Developer", initials: "DE", avatarBg: "bg-cyan-500", delay: "1.5s", anim: "animate-float-reverse" },
  { top: "26%", left: "8%", size: "w-14 h-14", role: "Marketer", initials: "MA", avatarBg: "bg-purple-500", delay: "0.8s", anim: "animate-float-gentle" },
  { top: "24%", left: "60%", size: "w-10 h-10", role: "Sales Rep", initials: "SR", avatarBg: "bg-amber-500", delay: "2.3s", anim: "animate-float-gentle" },
  { top: "38%", left: "30%", size: "w-12 h-12", role: "Solo Founder", initials: "SF", avatarBg: "bg-orange-500", delay: "1.7s", anim: "animate-float-reverse" },
  { top: "40%", left: "76%", size: "w-10 h-10", role: "Designer", initials: "DS", avatarBg: "bg-pink-500", delay: "0.5s", anim: "animate-float-gentle" },
  { top: "52%", left: "16%", size: "w-11 h-11", role: "Data Analyst", initials: "DA", avatarBg: "bg-indigo-500", delay: "1.2s", anim: "animate-float-reverse" },
  { top: "54%", left: "52%", size: "w-12 h-12", role: "Customer Success", initials: "CS", avatarBg: "bg-emerald-500", delay: "0.4s", anim: "animate-float-gentle" },
  { top: "68%", left: "24%", size: "w-14 h-14", role: "Community Lead", initials: "CL", avatarBg: "bg-red-500", delay: "1.1s", anim: "animate-float-gentle" },
  { top: "66%", left: "72%", size: "w-10 h-10", role: "Finance Ops", initials: "FO", avatarBg: "bg-teal-500", delay: "2.8s", anim: "animate-float-reverse" },
  { top: "82%", left: "8%", size: "w-11 h-11", role: "Operations", initials: "OP", avatarBg: "bg-neutral-600", delay: "0.6s", anim: "animate-float-gentle" },
  { top: "84%", left: "48%", size: "w-14 h-14", role: "Course Creator", initials: "CC", avatarBg: "bg-blue-600", delay: "1.6s", anim: "animate-float-reverse" },
];

/**
 * Decorative floating constellations from the hero — app brand marks on the
 * left, agent avatars on the right. Absolutely positioned so the parent must
 * be `relative`; hidden below `lg`. Float keyframes live in globals.css.
 */
export default function HeroBubbles() {
  const { dict } = useLanguage();
  const roles = dict.hero.roles;

  return (
    <>
      {/* LEFT FLOATING CONSTELLATION (apps) */}
      <motion.div
        className="hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 w-80 xl:w-96 h-150 pointer-events-none select-none z-0"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: {
              staggerChildren: 0.05,
              delayChildren: 0.1,
            },
          },
        }}
        aria-hidden="true"
      >
        {LEFT_BUBBLES.map((b, idx) => {
          if (!BRANDS[b.brand]) return null;
          // Icon scaled to the bubble size (e.g. w-12 = 48px → 20px mark).
          // The digit in `w-12` is a Tailwind spacing index: px = index × 4.
          const bubblePx = Number(b.size.match(/\d+/)?.[0] ?? 12) * 4;
          const iconSize = Math.round(bubblePx * 0.42);
          return (
            <motion.div
              key={idx}
              className={`absolute rounded-full border border-white/10 bg-neutral-900 flex items-center justify-center shadow-[0_6px_20px_rgba(0,0,0,0.3)] transition-all ${b.size} ${b.anim}`}
              style={{
                top: b.top,
                left: b.left,
                animationDelay: b.delay,
              }}
              variants={{
                hidden: { opacity: 0, scale: 0 },
                visible: {
                  opacity: 1,
                  scale: 1,
                  transition: { type: "spring", stiffness: 80, damping: 12 },
                },
              }}
            >
              <BrandLogo slug={b.brand} size={iconSize} />
            </motion.div>
          );
        })}
      </motion.div>

      {/* RIGHT FLOATING CONSTELLATION (agents) */}
      <motion.div
        className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 w-80 xl:w-96 h-150 pointer-events-none select-none z-0"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: {
              staggerChildren: 0.05,
              delayChildren: 0.15,
            },
          },
        }}
        aria-hidden="true"
      >
        {RIGHT_BUBBLES.map((b, idx) => (
          <motion.div
            key={idx}
            className={`absolute flex flex-col items-center ${b.anim}`}
            style={{
              top: b.top,
              left: b.left,
              animationDelay: b.delay,
            }}
            variants={{
              hidden: { opacity: 0, scale: 0 },
              visible: {
                opacity: 1,
                scale: 1,
                transition: { type: "spring", stiffness: 80, damping: 12 },
              },
            }}
          >
            <span className="text-[9px] font-bold text-white/70 uppercase tracking-wider whitespace-nowrap mb-1.5 bg-black/40 backdrop-blur-sm rounded-full px-2 py-0.5 leading-none pointer-events-auto">
              {roles[idx] ?? b.role}
            </span>
            <div
              className={`rounded-full border border-white/10 bg-neutral-900 flex items-center justify-center shadow-[0_6px_20px_rgba(0,0,0,0.3)] ${b.size}`}
            >
              <div
                className={`w-full h-full rounded-full ${b.avatarBg} flex items-center justify-center scale-95 border-2 border-white/20 shadow-inner`}
              >
                <span className="text-[11px] font-bold text-white leading-none tracking-tight select-none">
                  {b.initials}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </>
  );
}
