"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingCart, Check, Loader2, MessageSquare } from "lucide-react";
import { useCart } from "./CartProvider";
import { useLanguage } from "./LanguageProvider";
import { useOwned } from "@/hooks/useOwned";

export default function AddToCartButton({
  slug,
  compact = false,
  className = "",
}: {
  slug: string;
  compact?: boolean;
  className?: string;
}) {
  const { add, isInCart } = useCart();
  const { isOwned } = useOwned();
  const { locale } = useLanguage();
  const isIt = locale === "it";
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const owned = isOwned(slug);
  const inCart = isInCart(slug);

  if (owned) {
    return (
      <Link
        href={`/chat?agent=${slug}`}
        className={`inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 ${className} ${compact ? "!px-3 !py-1.5 !text-xs" : ""}`}
      >
        <MessageSquare size={15} />
        {isIt ? "Apri in chat" : "Open in chat"}
      </Link>
    );
  }

  async function handle() {
    if (inCart) return;
    setLoading(true);
    const res = await add(slug);
    setLoading(false);
    if (res.ok) {
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    }
  }

  if (inCart) {
    return (
      <span
        className={`inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm font-bold text-emerald-300 ${className} ${compact ? "!px-3 !py-1.5 !text-xs" : ""}`}
      >
        <Check size={15} className="text-emerald-400" />
        {isIt ? "Nel carrello" : "In cart"}
      </span>
    );
  }

  return (
    <button
      onClick={handle}
      disabled={loading}
      className={`group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-purple-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/25 transition-all duration-200 hover:from-brand-400 hover:to-purple-400 hover:shadow-xl hover:shadow-brand-500/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100 ${className} ${compact ? "!px-3 !py-1.5 !text-xs" : ""}`}
    >
      {loading ? (
        <Loader2 size={15} className="animate-spin" />
      ) : done ? (
        <Check size={15} className="text-white" />
      ) : (
        <ShoppingCart size={15} className="transition-transform group-hover:scale-110" />
      )}
      {done
        ? isIt
          ? "Aggiunto!"
          : "Added!"
        : isIt
          ? "Aggiungi al carrello"
          : "Add to cart"}
    </button>
  );
}
