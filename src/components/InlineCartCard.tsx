"use client";

import Link from "next/link";
import { ShoppingCart, CheckCircle2 } from "lucide-react";
import { getAgentBySlug } from "@/lib/agents";

/**
 * Card inline mostrata quando l'agente aggiunge un agente al carrello
 * su richiesta esplicita dell'utente (tool marketplace_add_to_cart,
 * marker [[CART:slug]]). Link diretto al checkout.
 */
export default function InlineCartCard({ slug }: { slug: string }) {
  const agent = getAgentBySlug(slug);
  const name = agent?.name ?? slug;
  const price = agent?.price ?? "";
  return (
    <div className="my-3 rounded-2xl border border-emerald-400/25 bg-emerald-500/[0.06] p-4">
      <p className="flex items-center gap-1.5 text-sm font-bold text-emerald-200">
        <CheckCircle2 size={14} className="shrink-0" aria-hidden />
        {name} nel carrello{price ? ` · ${price}` : ""}
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-neutral-300">
        L&apos;agente lo ha aggiunto su tua richiesta. Completa l&apos;acquisto quando vuoi.
      </p>
      <Link
        href="/cart"
        className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-400"
      >
        <ShoppingCart size={13} aria-hidden />
        Vai al carrello
      </Link>
    </div>
  );
}
