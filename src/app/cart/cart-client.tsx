"use client";

import Link from "next/link";
import { useState } from "react";
import { Trash2, ShoppingCart, ArrowRight, Loader2 } from "lucide-react";
import { useCart } from "@/components/CartProvider";
import { useLanguage } from "@/components/LanguageProvider";
import AgentIcon from "@/components/AgentIcon";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function CartPageClient() {
  const { items, totalDisplay, totalCents, remove, clear } = useCart();
  const { locale } = useLanguage();
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
        alert(data.error || (isIt ? "Errore checkout" : "Checkout error"));
      }
    } finally {
      setCheckingOut(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950">
      <Navbar />
      <section className="px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
              <ShoppingCart size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{isIt ? "Carrello" : "Cart"}</h1>
              <p className="text-sm text-neutral-500">
                {items.length === 0
                  ? isIt
                    ? "Nessun agente nel carrello"
                    : "No agents in cart"
                  : `${items.length} ${isIt ? "agenti" : "agents"} — ${totalDisplay}`}
              </p>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-neutral-900 p-10 text-center">
              <ShoppingCart size={32} className="mx-auto text-neutral-600" />
              <p className="mt-4 text-sm font-semibold text-neutral-400">
                {isIt ? "Il carrello è vuoto. Aggiungi agenti dal marketplace." : "Your cart is empty. Add agents from the marketplace."}
              </p>
              <Link
                href="/agents"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-400"
              >
                {isIt ? "Sfoglia agenti" : "Browse agents"} <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.agent_slug} className="flex items-center gap-4 rounded-xl border border-white/5 bg-neutral-900 p-4">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${item.accent}`}>
                      <AgentIcon icon={item.icon} brand={item.brand} size={20} className="text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white">{item.name}</p>
                      <p className="text-xs text-neutral-500">{item.price} / mese</p>
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
                    {isIt ? "Svuota carrello" : "Clear cart"}
                  </button>
                  <Link
                    href="/agents"
                    className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/5"
                  >
                    {isIt ? "Continua acquisti" : "Continue shopping"}
                  </Link>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-neutral-500">{isIt ? "Totale" : "Total"}</p>
                    <p className="text-xl font-bold text-white">{totalDisplay}</p>
                    <p className="text-xs text-neutral-600">{isIt ? "IVA inclusa" : "VAT included"} — {totalCents > 0 ? `${items.length} × abbonamento mensile` : ""}</p>
                  </div>
                  <button
                    onClick={handleCheckout}
                    disabled={checkingOut}
                    className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/20 hover:bg-brand-400 disabled:opacity-60"
                  >
                    {checkingOut ? <Loader2 size={16} className="animate-spin" /> : null}
                    {isIt ? "Vai al checkout" : "Checkout"} <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}
