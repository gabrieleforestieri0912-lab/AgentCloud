"use client";

import Link from "next/link";
import { useState } from "react";
import { Trash2, ShoppingCart, ArrowRight, Loader2, Package, Users } from "lucide-react";
import { useCart } from "@/components/CartProvider";
import { useLanguage } from "@/components/LanguageProvider";
import AgentIcon from "@/components/AgentIcon";

export default function CartPageClient() {
  const { items, totalDisplay, totalCents, remove, clear } = useCart();
  const { locale, dict } = useLanguage();
  const isIt = locale === "it";
  const [checkingOut, setCheckingOut] = useState(false);

  async function handleCheckout() {
    setCheckingOut(true);
    try {
      // Se carrello contiene agenti, usa checkout multiplo; altrimenti errore
      const res = await fetch("/api/cart/checkout", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error === "unauthorized") {
        window.location.href = "/login";
      } else {
        alert(data.error || dict.cartPage.checkoutError);
      }
    } finally {
      setCheckingOut(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950">
      <section className="px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <Link href="/" className="mb-8 inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-500 hover:text-white transition-colors">
            <ArrowRight size={14} className="rotate-180" />
            {dict.cartPage.backToHome}
          </Link>
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
              <ShoppingCart size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{dict.cartPage.cartTitle}</h1>
              <p className="text-sm text-neutral-500">
                {items.length === 0
                  ? dict.cartPage.noAgentsInCart
                  : `${items.length} ${dict.cartPage.agentsLabel} — ${totalDisplay}`}
              </p>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-neutral-900 p-10 text-center">
              <ShoppingCart size={32} className="mx-auto text-neutral-600" />
              <p className="mt-4 text-sm font-semibold text-neutral-400">
                {dict.cartPage.emptyCartDesc}
              </p>
              <Link
                href="/agents"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-400"
              >
                {dict.cartPage.browseAgents} <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.agent_slug} className="flex items-center gap-4 rounded-xl border border-white/5 bg-neutral-900 p-4">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${item.type === "bundle" ? "bg-gradient-to-br from-brand-500 to-purple-600" : item.accent}`}>
                      {item.type === "bundle" ? (
                        <Package size={20} className="text-white" />
                      ) : (
                        <AgentIcon icon={item.icon} brand={item.brand} size={20} className="text-white" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white">{item.name}</p>
                        {item.type === "bundle" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] font-bold text-brand-300">
                            <Users size={10} />
                            {item.agentSlugs?.length} {dict.cartPage.bundleLabel}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500">
                        {item.type === "bundle"
                          ? `${item.price} · ${item.period === "monthly" ? dict.cartPage.monthlyLabel : item.period === "quarterly" ? dict.cartPage.quarterlyLabel : dict.cartPage.yearlyLabel}`
                          : `${item.price} / mese`}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-white">{item.price}</p>
                    <button
                      onClick={() => remove(item.agent_slug)}
                      aria-label="Rimuovi"
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-neutral-400 hover:bg-red-500/15 hover:text-red-300"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-white/5 bg-neutral-900 p-5">
                <div className="flex gap-3">
                  <button
                    onClick={() => clear()}
                    className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold text-neutral-400 hover:bg-white/5 hover:text-white"
                  >
                    {dict.cartPage.clearCart}
                  </button>
                  <Link
                    href="/agents"
                    className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/5"
                  >
                    {dict.cartPage.continueShopping}
                  </Link>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-neutral-500">{dict.cartPage.totalLabel}</p>
                    <p className="text-xl font-bold text-white">{totalDisplay}</p>
                    <p className="text-xs text-neutral-600">{dict.cartPage.vatIncluded} — {totalCents > 0 ? `${items.length} × abbonamento mensile` : ""}</p>
                  </div>
                  <button
                    onClick={handleCheckout}
                    disabled={checkingOut}
                    className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/20 hover:bg-brand-400 disabled:opacity-60"
                  >
                    {checkingOut ? <Loader2 size={16} className="animate-spin" /> : null}
                    {dict.cartPage.checkout} <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
