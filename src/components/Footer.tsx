"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

const SOCIAL_LINKS = [
  { label: "X (Twitter)", href: "https://x.com/agentcloud" },
  { label: "Instagram", href: "https://www.instagram.com/agentcloud/" },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/agentcloud" },
];

const COMPANY_LINKS = [
  { label: "About", href: "/" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "/demo" },
];

export default function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="relative bg-white text-neutral-900"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-brand-500 to-transparent" />

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8 py-20 border-b border-neutral-200">
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
              <span className="text-xl font-bold tracking-tight text-neutral-900">
                AgentCloud
              </span>
            </Link>
            <p className="text-sm font-semibold text-neutral-700 select-none">
              AgentCloud — The AI Agent Platform
            </p>
          </div>

          <div className="flex flex-col gap-3.5">
            <span className="text-xs font-bold uppercase tracking-widest text-neutral-600">
              FOLLOW
            </span>
            <ul className="flex flex-col gap-3">
              {SOCIAL_LINKS.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-base font-bold text-neutral-700 hover:text-neutral-900 transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-3.5">
            <span className="text-xs font-bold uppercase tracking-widest text-neutral-600">
              COMPANY
            </span>
            <ul className="flex flex-col gap-3">
              {COMPANY_LINKS.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-base font-bold text-neutral-700 hover:text-neutral-900 transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="py-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-semibold text-neutral-600">
          <span className="select-none">
            &copy; 2026 AgentCloud. All rights reserved.
          </span>
          <Link
            href="/privacy"
            className="text-neutral-700 hover:text-neutral-900 transition-colors"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="text-neutral-700 hover:text-neutral-900 transition-colors"
          >
            Terms
          </Link>
        </div>
      </div>
    </motion.footer>
  );
}
