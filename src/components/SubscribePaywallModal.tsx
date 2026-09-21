"use client";

import Link from "next/link";
import { X, Lock, Sparkles } from "lucide-react";
import { useLanguage } from "./LanguageProvider";

export default function SubscribePaywallModal({
  open,
  onClose,
  agentName,
  agentSlug,
}: {
  open: boolean;
  onClose: () => void;
  agentName: string;
  agentSlug: string;
}) {
  const { dict } = useLanguage();
  if (!open) return null;

  const title = dict.paywallModal.title;
  const descTemplate = dict.paywallModal.description;
  const desc = descTemplate.replace("{agent}", agentName);
  const ctaSubscribe = dict.paywallModal.subscribe;
  const ctaView = dict.paywallModal.viewPlans;

  // Link to agent detail or marketplace: use /agents/[slug] for subscription
  const subscribeHref = `/agents/${agentSlug}`;
  const plansHref = `/marketplace`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-neutral-900 p-6 shadow-2xl">
        <button
          onClick={onClose}
          aria-label={dict.common.close}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white"
        >
          <X size={14} />
        </button>
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
          <Lock size={18} />
        </div>
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-neutral-400">{desc}</p>
        <p className="mt-3 text-xs font-semibold text-amber-300">
          {dict.paywallModal.limitReached} • 4/4
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Link
            href={subscribeHref}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-500 px-5 py-3 text-sm font-bold text-white hover:bg-brand-400"
          >
            <Sparkles size={16} />
            {ctaSubscribe}
          </Link>
          <Link
            href={plansHref}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white hover:bg-white/10"
          >
            {ctaView}
          </Link>
          <button
            onClick={onClose}
            className="text-xs font-semibold text-neutral-500 hover:text-neutral-300"
          >
            {dict.common.close}
          </button>
        </div>
      </div>
    </div>
  );
}
