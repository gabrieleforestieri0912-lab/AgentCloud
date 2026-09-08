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
        className={`inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm font-bold text-emerald-300 ${className}`}
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
      className={`group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-purple-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/25 transition-all duration-200 hover:from-brand-400 hover:to-purple-400 hover:shadow-xl hover:shadow-brand-500/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100 ${className}`}
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
          ? "Aggiungi bundle al carrello"
          : "Add bundle to cart"}
    </button>
  );
}
