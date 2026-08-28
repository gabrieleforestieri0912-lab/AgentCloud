"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "./LanguageProvider";

export default function Footer() {
  const { dict } = useLanguage();

  const socialLinks = [
    { label: "X (Twitter)", href: "https://x.com/AgentCloud2k" },
    { label: "Instagram", href: "https://www.instagram.com/_agentcloud/" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/agent-cloud-323218431/" },
  ];

  const companyLinks = [
    { label: dict.footer.about, href: "/about" },
    { label: dict.footer.faq, href: "#faq" },
    { label: dict.footer.contact, href: "/demo" },
  ];

  const productLinks = [
    { label: dict.navbar.marketplace, href: "/agents" },
    { label: dict.navbar.solutions, href: "/#solutions" },
    { label: dict.navbar.integrations, href: "/#integrations" },
  ];

  return (
    <motion.footer
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="relative border-t border-white/5 bg-[#101018] text-white"
    >
      {/* Hairline + subtle brand glow so the dark footer reads as a distinct block */}
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-brand-500/70 to-transparent" />
      <div
        className="pointer-events-none absolute inset-0 select-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 0%, rgba(3,139,254,0.08), transparent 45%), radial-gradient(circle at 85% 100%, rgba(217,70,239,0.05), transparent 50%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8 py-20 border-b border-white/10">
          {/* Brand column */}
          <div className="lg:col-span-2 flex flex-col items-start gap-4">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative h-8 w-8">
                <Image
                  src="/agentcloud.png"
                  alt="AgentCloud"
                  fill
                  className="object-cover"
                  sizes="32px"
                />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                AgentCloud
              </span>
            </Link>
            <p className="text-sm font-semibold text-neutral-400 select-none">
              {dict.footer.tagline}
            </p>
          </div>

          {/* Product column */}
          <div className="flex flex-col gap-3.5">
            <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">
              {dict.navbar.marketplace}
            </span>
            <ul className="flex flex-col gap-3">
              {productLinks.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-base font-bold text-neutral-300 hover:text-white transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social column */}
          <div className="flex flex-col gap-3.5">
            <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">
              {dict.footer.follow}
            </span>
            <ul className="flex flex-col gap-3">
              {socialLinks.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-base font-bold text-neutral-300 hover:text-white transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company column */}
          <div className="flex flex-col gap-3.5">
            <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">
              {dict.footer.company}
            </span>
            <ul className="flex flex-col gap-3">
              {companyLinks.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-base font-bold text-neutral-300 hover:text-white transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="py-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-semibold text-neutral-500">
            <span className="select-none">{dict.footer.rights}</span>
            <Link
              href="/privacy"
              className="text-neutral-400 hover:text-brand-400 transition-colors"
            >
              {dict.footer.privacy}
            </Link>
            <Link
              href="/terms"
              className="text-neutral-400 hover:text-brand-400 transition-colors"
            >
              {dict.footer.terms}
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {socialLinks.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-500 hover:text-white transition-colors"
                aria-label={label}
              >
                <span className="sr-only">{label}</span>
                {/* Simple icon placeholders - in production you'd use actual SVG icons */}
                <div className="h-5 w-5 rounded-full bg-neutral-700" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </motion.footer>
  );
}
