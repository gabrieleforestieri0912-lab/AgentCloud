"use client";

import { useState } from "react";
import { ShoppingCart, Check, Loader2 } from "lucide-react";
import { useCart } from "./CartProvider";
import { useLanguage } from "./LanguageProvider";
import type { BundlePeriod } from "@/lib/bundles";

export default function AddBundleToCartButton({
  bundleSlug,
  period = "monthly",
  className = "",
}: {
  bundleSlug: string;
  period?: BundlePeriod;
  className?: string;
}) {
  const { addBundle, isBundleInCart } = useCart();
  const { locale } = useLanguage();
  const isIt = locale === "it";
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const inCart = isBundleInCart(bundleSlug);

  async function handle() {
    if (inCart) return;
    setLoading(true);
    const res = await addBundle(bundleSlug, period);
    setLoading(false);
    if (res.ok) {
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    }
  }

  if (inCart) {
    return (
      <span
        className={`inline-flex items-center justify-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-bold text-emerald-300 ${className}`}
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
      className={`inline-flex items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/10 disabled:opacity-60 ${className}`}
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : done ? (
        <Check size={14} className="text-emerald-400" />
      ) : (
        <ShoppingCart size={14} />
      )}
      {done
        ? isIt
          ? "Aggiunto"
          : "Added"
        : isIt
          ? "Aggiungi bundle al carrello"
          : "Add bundle to cart"}
    </button>
  );
}
