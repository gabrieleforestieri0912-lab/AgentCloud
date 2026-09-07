"use client";

import { useState } from "react";
import { ShoppingCart, Check, Loader2 } from "lucide-react";
import { useCart } from "./CartProvider";
import { useLanguage } from "./LanguageProvider";

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
  const { locale } = useLanguage();
  const isIt = locale === "it";
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const inCart = isInCart(slug);

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
        className={`inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-300 ${className} ${compact ? "px-3 py-1.5" : ""}`}
      >
        <Check size={14} />
        {isIt ? "Nel carrello" : "In cart"}
      </span>
    );
  }

  return (
    <button
      onClick={handle}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-white/10 disabled:opacity-60 ${className} ${compact ? "px-3 py-1.5" : ""}`}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : done ? <Check size={14} className="text-emerald-400" /> : <ShoppingCart size={14} />}
      {done ? (isIt ? "Aggiunto" : "Added") : isIt ? "Aggiungi al carrello" : "Add to cart"}
    </button>
  );
}
