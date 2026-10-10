"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { Trash2, ShoppingCart, ArrowRight, Loader2, Package, Users, ShieldCheck, Sparkles, Check, Tag } from "lucide-react";
import { useCart, type CartItem } from "@/components/CartProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import AgentIcon from "@/components/AgentIcon";
import { t as interpolate } from "@/lib/i18n/dictionaries";
import { getBundleBySlug, getBundleAgents } from "@/lib/bundles";
import { COUPON_CODE, couponIsApplicable, couponDiscountCents, couponRawDiscountCents } from "@/lib/coupon";
import FloatingBrandBubbles, { type FloatingBubble } from "@/components/FloatingBrandBubbles";

const CLAIMED_KEY = "coupon_agentcloud50_claimed";

/**
 * Icone delle app che si collegano, fluttuanti come sulla landing.
 *
 * Stesse costellazioni del marketplace ma più rade: qui il contenuto è una
 * colonna sola al centro, quindi le icone restano ai lati senza finire sotto
 * le card. Sono puramente decorative.
 */
const CART_BUBBLES: FloatingBubble[] = [
  { top: "8%", left: "6%", size: "w-10 h-10", brand: "shopify", delay: "0s", anim: "animate-float-gentle" },
  { top: "22%", left: "88%", size: "w-11 h-11", brand: "slack", delay: "1.2s", anim: "animate-float-reverse" },
  { top: "46%", left: "4%", size: "w-9 h-9", brand: "gmail", delay: "0.6s", anim: "animate-float-reverse" },
  { top: "62%", left: "90%", size: "w-10 h-10", brand: "notion", delay: "1.8s", anim: "animate-float-gentle" },
  { top: "80%", left: "8%", size: "w-10 h-10", brand: "googlecalendar", delay: "0.9s", anim: "animate-float-gentle" },
  { top: "88%", left: "86%", size: "w-9 h-9", brand: "woocommerce", delay: "2.1s", anim: "animate-float-reverse" },
];

/**
 * Sconto reale del bundle rispetto all'acquisto dei singoli agenti.
 * `null` quando il bundle non ha un prezzo di confronto (agenti mancanti).
 */
function bundleSavings(item: CartItem): number | null {
  if (item.type !== "bundle" || !item.bundleSlug) return null;
  const bundle = getBundleBySlug(item.bundleSlug);
  if (!bundle) return null;
  const agents = getBundleAgents(bundle);
  if (agents.length === 0) return null;
  const sumCents = agents.reduce((s, a) => s + a.priceCents, 0);
  // priceCents è il totale del periodo per quarterly/yearly, il confronto va
  // fatto sullo stesso periodo o il risparmio risulterebbe sempre enorme.
  const months = item.period === "quarterly" ? 3 : item.period === "yearly" ? 12 : 1;
  const baseline = sumCents * months;
  if (baseline <= 0 || item.priceCents >= baseline) return null;
  return Math.round((1 - item.priceCents / baseline) * 100);
}

/**
 * Calcola lo sconto coupon per gli elementi idonei nel carrello.
 * Il coupon dà 50% su agenti con prezzo 4,99 €-9,99 € e 50% sui bundle
 * (totali fuori fascia, sconto sempre applicabile).
 */
function calculateCouponDiscount(items: CartItem[]): { discountCents: number; eligibleItems: CartItem[] } {
  let claimed = false;
  try {
    claimed = localStorage.getItem(CLAIMED_KEY) === "true";
  } catch {
    claimed = false;
  }
  if (!claimed) return { discountCents: 0, eligibleItems: [] };

  const eligibleItems = items.filter(
    (item) =>
      (item.type === "agent" && couponIsApplicable(item.priceCents)) ||
      item.type === "bundle"
  );
  const discountCents = eligibleItems.reduce(
    (sum, item) =>
      sum +
      (item.type === "bundle"
        ? couponRawDiscountCents(item.priceCents)
        : couponDiscountCents(item.priceCents)) *
        item.quantity,
    0
  );
  return { discountCents, eligibleItems };
}

export default function CartPageClient() {
  const { items, totalDisplay, totalCents, remove, clear } = useCart();
  const { dict } = useLanguage();
  const { isAdmin } = useIsAdmin();
  const [checkingOut, setCheckingOut] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  // Ricalcola lo sconto coupon quando cambiano gli items (deriva da `items`,
  // quindi va calcolato in render: un useEffect creerebbe un render extra).
  const couponData = useMemo(
    () => calculateCouponDiscount(items),
    [items],
  );

  async function handleCheckout() {
    // Doppia guardia client: l'admin non deve mai avviare uno checkout
    // (il server rifiuta comunque con 403 — vedi /api/cart/checkout).
    if (isAdmin) return;
    setCheckingOut(true);
    try {
      // Se carrello contiene agenti, usa checkout multiplo; altrimenti errore.
      // Coupon già reclamato dal banner → sconto server-side come prezzo
      // già scontato (niente UI coupon su Stripe).
      let claimedCoupon: string | null = null;
      try {
        claimedCoupon =
          localStorage.getItem(CLAIMED_KEY) === "true" ? COUPON_CODE : null;
      } catch {
        claimedCoupon = null;
      }
      const res = await fetch("/api/cart/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(claimedCoupon ? { couponCode: claimedCoupon } : {}),
      });
      const data = await res.json().catch(() => ({}));
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error === "unauthorized") {
        window.location.href = "/login";
      } else if (data.error === "admin_no_checkout") {
        window.location.href = "/chat";
      } else {
        alert(data.error || dict.cartPage.checkoutError);
      }
    } finally {
      setCheckingOut(false);
    }
  }

  return (
    // Sfondo in tre strati, lo stesso della landing: gradiente verticale,
    // radiali colorati e hairline in alto. Il contenuto sta su z-10 mentre
    // gradiente e icone restano dietro (z-0, pointer-events-none).
    <main className="relative min-h-dvh overflow-x-hidden bg-neutral-950">
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        <div className="absolute inset-0 dark-gradient-main" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 10%, rgba(3,139,254,.18), transparent 32%), radial-gradient(circle at 85% 12%, rgba(234,67,53,.14), transparent 28%), radial-gradient(circle at 50% 85%, rgba(168,85,247,.12), transparent 36%)",
          }}
        />
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-brand-500/20 to-transparent" />
      </div>
      <FloatingBrandBubbles bubbles={CART_BUBBLES} />
      <section className="relative z-10 px-4 pb-16 pt-8 sm:px-6 lg:px-8">
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
              <p className="text-sm text-neutral-500">                {items.length === 0
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
              <ul className="space-y-3">
                {items.map((item) => {
                  const isBundle = item.type === "bundle";
                  const savings = bundleSavings(item);
                  const bundleAgents =
                    isBundle && item.bundleSlug
                      ? (() => {
                          const b = getBundleBySlug(item.bundleSlug);
                          return b ? getBundleAgents(b) : [];
                        })()
                      : [];
                  const billingNote =
                    item.period === "quarterly"
                      ? interpolate(dict.cartPage.billedEvery, { n: 3 })
                      : item.period === "yearly"
                        ? interpolate(dict.cartPage.billedEvery, { n: 12 })
                        : dict.cartPage.billedMonthly;
                  const busy = removing === item.agent_slug;
                  return (
                    <li
                      key={item.agent_slug}
                      className={`overflow-hidden rounded-xl border border-white/5 bg-neutral-900 transition-opacity ${
                        busy ? "opacity-50" : ""
                      }`}
                    >
                      <div className="flex items-start gap-4 p-4">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
                            isBundle
                              ? "bg-gradient-to-br from-brand-500 to-purple-600"
                              : item.accent
                          }`}
                        >
                          {isBundle ? (
                            <Package size={20} className="text-white" />
                          ) : (
                            <AgentIcon icon={item.icon} brand={item.brand} size={20} className="text-white" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <p className="text-sm font-bold text-white">{item.name}</p>
                            {isBundle && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] font-bold text-brand-300">
                                <Users size={10} />
                                {item.agentSlugs?.length} {dict.cartPage.bundleLabel}
                              </span>
                            )}
                            {savings !== null && savings > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                                <Sparkles size={10} />
                                {interpolate(dict.cartPage.savingsBadge, { pct: savings })}
                              </span>
                            )}
                          </div>

                          <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                            {isBundle ? (
                              <>
                                <span className="font-semibold text-neutral-400">
                                  {dict.cartPage.periodSuffix[
                                    item.period === "quarterly"
                                      ? "quarterly"
                                      : item.period === "yearly"
                                        ? "yearly"
                                        : "monthly"
                                  ]}
                                </span>
                                {" · "}
                                {billingNote}
                              </>
                            ) : (
                              interpolate(dict.cartPage.pricePerMonth, { price: item.price })
                            )}
                          </p>

                          {isBundle && bundleAgents.length > 0 && (
                            <div className="mt-2.5 border-t border-white/5 pt-2.5">
                              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-neutral-600">
                                {dict.cartPage.bundleIncludes}
                              </p>
                              <ul className="flex flex-wrap gap-1.5">
                                {bundleAgents.map((a) => (
                                  <li
                                    key={a.slug}
                                    className="inline-flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-1 text-[11px] font-semibold text-neutral-300"
                                  >
                                    <Check size={10} className="text-emerald-400" />
                                    {a.shortName}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <p className="text-sm font-bold text-white">{item.price}</p>
                          <p className="text-[10px] font-semibold text-neutral-500">{billingNote}</p>
                        </div>

                        <button
                          onClick={() => {
                            setRemoving(item.agent_slug);
                            void remove(item.agent_slug).finally(() =>
                              setRemoving((cur) => (cur === item.agent_slug ? null : cur)),
                            );
                          }}
                          disabled={busy}
                          aria-label={interpolate(dict.cartPage.removeItem, { name: item.name })}
                          title={interpolate(dict.cartPage.removeItem, { name: item.name })}
                          className="flex h-11 w-11 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-neutral-400 transition-colors hover:bg-red-500/15 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {busy ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>

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
                    {couponData.discountCents > 0 && couponData.eligibleItems.length > 0 && (
                      <div className="mb-1 flex items-center justify-end gap-1.5 text-sm font-bold text-emerald-400">
                        <Tag size={12} />
                        <span>
                          -{interpolate(dict.cartPage.couponDiscount, {
                            discount: `€${(couponData.discountCents / 100).toFixed(2).replace(".", ",")}`,
                          })}
                        </span>
                      </div>
                    )}
                    <p className="text-xl font-bold text-white">
                      {couponData.discountCents > 0
                        ? `€${((totalCents - couponData.discountCents) / 100).toFixed(2).replace(".", ",")}`
                        : totalDisplay}
                    </p>
                    <p className="text-xs text-neutral-600">
                      {dict.cartPage.vatIncluded}
                      {couponData.discountCents > 0 && (
                        <>
                          {" — "}
                          {interpolate(dict.cartPage.couponApplied, {
                            code: COUPON_CODE,
                            count: couponData.eligibleItems.length,
                          })}
                        </>
                      )}
                      {/* La nota "{n} x abbonamento mensile" ha senso solo se
                          tutto il carrello è mensile: con un bundle trimestrale/
                          annuale il totale è il primo ciclo di fatturazione, non
                          un importo mensile. */}
                      {totalCents > 0 &&
                        items.length > 0 &&
                        items.every((i) => !i.period || i.period === "monthly") && (
                        <>{" — "}{interpolate(dict.cartPage.perMonthNote, { count: items.length })}</>
                      )}
                    </p>
                  </div>
                  {isAdmin ? (
                    <div className="flex flex-col items-end gap-2">
                      <p className="flex max-w-[260px] items-center gap-1.5 text-right text-xs font-semibold text-emerald-300">
                        <ShieldCheck size={14} className="shrink-0" />
                        {dict.cartPage.adminNoCheckout}
                      </p>
                      <Link
                        href="/chat"
                        className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-400"
                      >
                        {dict.cartPage.adminOpenChat} <ArrowRight size={16} />
                      </Link>
                    </div>
                  ) : (
                    <button
                      onClick={handleCheckout}
                      disabled={checkingOut}
                      className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/20 hover:bg-brand-400 disabled:opacity-60"
                    >
                      {checkingOut ? <Loader2 size={16} className="animate-spin" /> : null}
                      {dict.cartPage.checkout} <ArrowRight size={16} />
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
