"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Agent } from "@/lib/agents";
import { getAgentBySlug } from "@/lib/agents";
import type { Bundle, BundlePeriod } from "@/lib/bundles";
import { getBundleBySlug, getBundleAgents, formatPrice } from "@/lib/bundles";

export type CartItemType = "agent" | "bundle";

export type CartItem = {
  agent_slug: string;
  quantity: number;
  name: string;
  shortName: string;
  priceCents: number;
  price: string;
  accent: string;
  icon: Agent["icon"];
  brand?: Agent["brand"];
  type: CartItemType;
  bundleSlug?: string;
  agentSlugs?: string[];
  period?: BundlePeriod;
};

type CartContextType = {
  items: CartItem[];
  totalCents: number;
  totalDisplay: string;
  count: number;
  loading: boolean;
  add: (slug: string) => Promise<{ ok: boolean; error?: string }>;
  addBundle: (bundleSlug: string, period: BundlePeriod) => Promise<{ ok: boolean; error?: string }>;
  remove: (slug: string) => Promise<void>;
  clear: () => Promise<void>;
  refresh: () => Promise<void>;
  isInCart: (slug: string) => boolean;
  isBundleInCart: (slug: string) => boolean;
};

const CartContext = createContext<CartContextType | null>(null);

const LOCAL_KEY = "agentcloud_cart_v1";

function formatTotal(cents: number) {
  return `€${(cents / 100).toFixed(2).replace(".", ",")}`;
}

function enrichLocal(slug: string, quantity = 1): CartItem | null {
  const ag = getAgentBySlug(slug);
  if (!ag) return null;
  return {
    agent_slug: slug,
    quantity,
    name: ag.name,
    shortName: ag.shortName,
    priceCents: ag.priceCents,
    price: ag.price,
    accent: ag.accent,
    icon: ag.icon,
    brand: ag.brand,
    type: "agent",
  };
}

function enrichBundleLocal(bundleSlug: string, period: BundlePeriod, quantity = 1): CartItem | null {
  const bundle = getBundleBySlug(bundleSlug);
  if (!bundle) return null;
  const agents = getBundleAgents(bundle);
  const monthlyCents = period === "monthly" ? bundle.pricing.monthly : period === "quarterly" ? bundle.pricing.quarterly : bundle.pricing.yearly;
  const totalCents = period === "monthly" ? monthlyCents : period === "quarterly" ? bundle.pricing.quarterlyTotal : bundle.pricing.yearlyTotal;
  return {
    agent_slug: `bundle:${bundleSlug}`,
    quantity,
    name: bundle.name,
    shortName: bundle.name,
    priceCents: monthlyCents,
    price: formatPrice(monthlyCents) + "/mo",
    accent: agents[0]?.accent || "bg-brand-500",
    icon: agents[0]?.icon || "bot",
    type: "bundle",
    bundleSlug,
    agentSlugs: bundle.agentSlugs,
    period,
  };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const authedRef = useRef(false);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const authed = !!data.session;
    authedRef.current = authed;
    setIsAuthed(authed);
    try {
      // Se loggato o mock admin (hasAccess), prova a mergiare il localStorage nel DB
      if (authed) {
        const raw = localStorage.getItem(LOCAL_KEY);
        if (raw) {
          try {
            const slugs = JSON.parse(raw) as string[];
            if (slugs.length > 0) {
              for (const slug of slugs) {
                // Skip bundle slugs for API sync (bundles are stored locally for now)
                if (slug.startsWith("bundle:")) continue;
                await fetch("/api/cart", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ agentSlug: slug }),
                }).catch(() => {});
              }
              // Keep bundle slugs in localStorage, remove only agent slugs
              const bundleSlugs = slugs.filter(s => s.startsWith("bundle:"));
              if (bundleSlugs.length > 0) {
                localStorage.setItem(LOCAL_KEY, JSON.stringify(bundleSlugs));
              } else {
                localStorage.removeItem(LOCAL_KEY);
              }
            }
          } catch {}
        }
      }
      const res = await fetch("/api/cart");
      if (res.ok) {
        const data = await res.json();
        const apiItems = (data.items ?? []) as Array<{ agent_slug: string; quantity: number }>;
        const enrichedApi = apiItems.map((it) => enrichLocal(it.agent_slug, it.quantity)).filter(Boolean) as CartItem[];
        // Bundle: solo localStorage (API non gestisce bundle: bundle:slug), mergia per badge rosso immediato
        const rawBundles = localStorage.getItem(LOCAL_KEY);
        const bundleSlugs = rawBundles ? (JSON.parse(rawBundles) as string[]).filter((s) => s.startsWith("bundle:")) : [];
        const bundleItems = bundleSlugs
          .map((s) => {
            const bSlug = s.slice(7);
            const storedPeriod = (localStorage.getItem(`bundle_period_${bSlug}`) as BundlePeriod) || "monthly";
            return enrichBundleLocal(bSlug, storedPeriod);
          })
          .filter(Boolean) as CartItem[];
        // Evita duplicati se API dovesse mai restituire bundle
        const apiSlugs = new Set(enrichedApi.map((i) => i.agent_slug));
        const merged = [...enrichedApi, ...bundleItems.filter((b) => !apiSlugs.has(b.agent_slug))];
        setItems(merged);
      } else if (res.status === 401) {
        // True anon senza codice: fallback localStorage
        const raw = localStorage.getItem(LOCAL_KEY);
        if (raw) {
          const slugs = JSON.parse(raw) as string[];
          setItems(slugs.map((s) => {
            if (s.startsWith("bundle:")) {
              const bSlug = s.slice(7);
              const storedPeriod = localStorage.getItem(`bundle_period_${bSlug}`) as BundlePeriod || "monthly";
              return enrichBundleLocal(bSlug, storedPeriod);
            }
            return enrichLocal(s);
          }).filter(Boolean) as CartItem[]);
        } else {
          setItems([]);
        }
      } else {
        // Altro errore: fallback localStorage se presente
        const raw = localStorage.getItem(LOCAL_KEY);
        if (raw) {
          const slugs = JSON.parse(raw) as string[];
          if (slugs.length > 0) {
            setItems(slugs.map((s) => {
              if (s.startsWith("bundle:")) {
                const bSlug = s.slice(7);
                const storedPeriod = localStorage.getItem(`bundle_period_${bSlug}`) as BundlePeriod || "monthly";
                return enrichBundleLocal(bSlug, storedPeriod);
              }
              return enrichLocal(s);
            }).filter(Boolean) as CartItem[]);
          } else {
            setItems([]);
          }
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const supabase = createClient();
    const { data: sub } = supabase.auth.onAuthStateChange(() => refresh());
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOCAL_KEY) refresh();
    };
    window.addEventListener("storage", onStorage);
    // custom event for cart updates from any component
    const onCartUpdate = () => refresh();
    window.addEventListener("cart:updated", onCartUpdate);
    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("cart:updated", onCartUpdate);
    };
  }, [refresh]);

  const add = useCallback(
    async (slug: string) => {
      // Prova sempre API prima (copre sia utente reale che mock admin via codice).
      // Se 401 → true anon senza codice → fallback localStorage.
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentSlug: slug }),
      }).catch(() => null as unknown as Response);
      if (res && res.ok) {
        await refresh();
        window.dispatchEvent(new CustomEvent("cart:updated"));
        return { ok: true };
      }
      if (res) {
        const data = await res.json().catch(() => ({}));
        if (data.error === "already_owned") return { ok: false, error: "already_owned" };
        if (res.status === 401) {
          // Fallback localStorage per anon senza codice
          const raw = localStorage.getItem(LOCAL_KEY);
          const slugs: string[] = raw ? JSON.parse(raw) : [];
          if (slugs.includes(slug)) return { ok: false, error: "already_in_cart" };
          const next = [...slugs, slug];
          localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
          setItems(next.map((s) => enrichLocal(s)).filter(Boolean) as CartItem[]);
          window.dispatchEvent(new CustomEvent("cart:updated"));
          return { ok: true };
        }
        if (data.error && data.error !== "unauthorized") {
          return { ok: false, error: data.error ?? "error" };
        }
      }
      // Fallback generico
      const raw = localStorage.getItem(LOCAL_KEY);
      const slugs: string[] = raw ? JSON.parse(raw) : [];
      if (slugs.includes(slug)) return { ok: false, error: "already_in_cart" };
      const next = [...slugs, slug];
      localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
      setItems(next.map((s) => enrichLocal(s)).filter(Boolean) as CartItem[]);
      window.dispatchEvent(new CustomEvent("cart:updated"));
      return { ok: true };
    },
    [refresh],
  );

  const remove = useCallback(
    async (slug: string) => {
      const res = await fetch(`/api/cart?agentSlug=${encodeURIComponent(slug)}`, { method: "DELETE" }).catch(() => null);
      if (res && res.ok) {
        await refresh();
      } else if (res && res.status === 401) {
        const raw = localStorage.getItem(LOCAL_KEY);
        const slugs: string[] = raw ? JSON.parse(raw) : [];
        const next = slugs.filter((s) => s !== slug);
        localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
        setItems(next.map((s) => enrichLocal(s)).filter(Boolean) as CartItem[]);
      } else if (res && res.ok === false && res.status !== 401) {
        await refresh();
      } else {
        const raw = localStorage.getItem(LOCAL_KEY);
        const slugs: string[] = raw ? JSON.parse(raw) : [];
        const next = slugs.filter((s) => s !== slug);
        localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
        setItems(next.map((s) => enrichLocal(s)).filter(Boolean) as CartItem[]);
      }
      window.dispatchEvent(new CustomEvent("cart:updated"));
    },
    [refresh],
  );

  const clear = useCallback(async () => {
    // Pulisci subito localStorage (agenti + bundle) per feedback immediato e per evitare che refresh ri-mergi i bundle
    localStorage.removeItem(LOCAL_KEY);
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith("bundle_period_")) localStorage.removeItem(k!);
    }
    setItems([]);
    window.dispatchEvent(new CustomEvent("cart:updated"));
    try {
      await fetch("/api/cart", { method: "DELETE" });
    } catch {}
    await refresh().catch(() => {});
  }, [refresh]);

  const isInCart = useCallback((slug: string) => items.some((i) => i.agent_slug === slug && i.type === "agent"), [items]);

  const isBundleInCart = useCallback((bundleSlug: string) => items.some((i) => i.type === "bundle" && i.bundleSlug === bundleSlug), [items]);

  const addBundle = useCallback(
    async (bundleSlug: string, period: BundlePeriod) => {
      // For now, store bundle in localStorage (same pattern as agent add for anon)
      const bundleKey = `bundle:${bundleSlug}`;
      if (isBundleInCart(bundleSlug)) return { ok: false, error: "already_in_cart" } as const;
      try {
        const res = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentSlug: bundleKey, period }),
        }).catch(() => null as unknown as Response);
        if (res && res.ok) {
          await refresh();
          window.dispatchEvent(new CustomEvent("cart:updated"));
          return { ok: true } as const;
        }
      } catch {}
      // Fallback localStorage — salva periodo PRIMA di enrich per badge corretto
      const raw = localStorage.getItem(LOCAL_KEY);
      const slugs: string[] = raw ? JSON.parse(raw) : [];
      if (slugs.includes(bundleKey)) return { ok: false, error: "already_in_cart" } as const;
      localStorage.setItem(`bundle_period_${bundleSlug}`, period);
      const next = [...slugs, bundleKey];
      localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
      // Enrich e set immediato per notifica rossa istantanea (senza attendere refresh)
      const enriched = next
        .map((s) => {
          if (s.startsWith("bundle:")) {
            const bSlug = s.slice(7);
            const storedPeriod = (localStorage.getItem(`bundle_period_${bSlug}`) as BundlePeriod) || period;
            return enrichBundleLocal(bSlug, storedPeriod);
          }
          return enrichLocal(s);
        })
        .filter(Boolean) as CartItem[];
      setItems(enriched);
      window.dispatchEvent(new CustomEvent("cart:updated"));
      // Allinea anche via refresh per merge con API (agents)
      refresh().catch(() => {});
      return { ok: true } as const;
    },
    [refresh, isBundleInCart],
  );

  const totalCents = items.reduce((sum, it) => sum + it.priceCents * it.quantity, 0);
  const totalDisplay = formatTotal(totalCents);

  return (
    <CartContext.Provider
      value={{ items, totalCents, totalDisplay, count: items.length, loading, add, addBundle, remove, clear, refresh, isInCart, isBundleInCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
