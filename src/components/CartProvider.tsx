"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Agent } from "@/lib/agents";
import { getAgentBySlug } from "@/lib/agents";
import type { BundlePeriod } from "@/lib/bundles";
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

function parseStoredBundleSlug(stored: string): { bundleSlug: string; period: BundlePeriod } | null {
  if (!stored.startsWith("bundle:")) return null;
  const rest = stored.slice(7);
  const [slug, per] = rest.split(":");
  const period = (per as BundlePeriod) || "monthly";
  const valid: BundlePeriod[] = ["monthly", "quarterly", "yearly"];
  return { bundleSlug: slug, period: valid.includes(period) ? period : "monthly" };
}

function bundleDbSlug(bundleSlug: string, period: BundlePeriod): string {
  return `bundle:${bundleSlug}:${period}`;
}

function enrichLocal(slug: string, quantity = 1): CartItem | null {
  // supporta sia agent che bundle con periodo già codificato
  if (slug.startsWith("bundle:")) {
    const parsed = parseStoredBundleSlug(slug);
    if (!parsed) return null;
    return enrichBundleLocal(parsed.bundleSlug, parsed.period, quantity);
  }
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
  const totalCents = period === "quarterly" ? bundle.pricing.quarterlyTotal : period === "yearly" ? bundle.pricing.yearlyTotal : bundle.pricing.monthly;
  const displayMonthly = period === "monthly" ? bundle.pricing.monthly : period === "quarterly" ? bundle.pricing.quarterly : bundle.pricing.yearly;
  return {
    agent_slug: bundleDbSlug(bundleSlug, period),
    quantity,
    name: bundle.name,
    shortName: bundle.name,
    priceCents: totalCents,
    price: formatPrice(displayMonthly) + "/mo",
    accent: agents[0]?.accent || "bg-brand-500",
    icon: agents[0]?.icon || "bot",
    type: "bundle",
    bundleSlug,
    agentSlugs: bundle.agentSlugs,
    period,
  };
}

// Migra vecchi record: bundle:slug + bundle_period_* → bundle:slug:period
function normalizeStoredSlugs(slugs: string[]): string[] {
  return slugs.map((s) => {
    if (s.startsWith("bundle:") && !s.split(":").at(2)) {
      const bSlug = s.slice(7);
      try {
        const per = (localStorage.getItem(`bundle_period_${bSlug}`) as BundlePeriod) || "monthly";
        const valid: BundlePeriod[] = ["monthly", "quarterly", "yearly"];
        const p = valid.includes(per) ? per : "monthly";
        return bundleDbSlug(bSlug, p);
      } catch {
        return s;
      }
    }
    return s;
  });
}

function cleanupLegacyBundlePeriodKeys() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith("bundle_period_")) localStorage.removeItem(k);
    }
  } catch {}
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (!raw) return [];
      let slugs = JSON.parse(raw) as string[];
      slugs = normalizeStoredSlugs(slugs);
      // salva normalizzato
      if (JSON.stringify(slugs) !== raw) {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(slugs));
        cleanupLegacyBundlePeriodKeys();
      }
      return slugs.map((s) => enrichLocal(s)).filter(Boolean) as CartItem[];
    } catch {
      return [];
    }
  });
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
      if (authed) {
        const raw = localStorage.getItem(LOCAL_KEY);
        if (raw) {
          try {
            let slugs = JSON.parse(raw) as string[];
            slugs = normalizeStoredSlugs(slugs);
            if (slugs.length > 0) {
              for (const slug of slugs) {
                await fetch("/api/cart", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ agentSlug: slug }),
                }).catch(() => {});
              }
              localStorage.removeItem(LOCAL_KEY);
              cleanupLegacyBundlePeriodKeys();
            }
          } catch {}
        }
      }
      const res = await fetch("/api/cart");
      if (res.ok) {
        const data = await res.json();
        const apiItems = (data.items ?? []) as Array<{ agent_slug: string; quantity: number }>;
        const enrichedApi = apiItems.map((it) => enrichLocal(it.agent_slug, it.quantity)).filter(Boolean) as CartItem[];
        // fallback bundle da localStorage se API 401 non aveva ancora migrato (anon)
        const rawBundles = !authed ? localStorage.getItem(LOCAL_KEY) : null;
        let bundleItems: CartItem[] = [];
        if (rawBundles) {
          try {
            let slugs = JSON.parse(rawBundles) as string[];
            slugs = normalizeStoredSlugs(slugs);
            bundleItems = slugs.filter((s) => s.startsWith("bundle:")).map((s) => enrichLocal(s)).filter(Boolean) as CartItem[];
          } catch {}
        }
        const apiSlugs = new Set(enrichedApi.map((i) => i.agent_slug));
        // Per bundle, evita duplicati per stesso bundleSlug (qualsiasi periodo) — l'API ha già il periodo corretto
        const bundleSlugsInApi = new Set(enrichedApi.filter((i) => i.type === "bundle").map((i) => i.bundleSlug));
        const merged = [
          ...enrichedApi,
          ...bundleItems.filter((b) => !apiSlugs.has(b.agent_slug) && !bundleSlugsInApi.has(b.bundleSlug!)),
        ];
        setItems(merged);
      } else if (res.status === 401) {
        const raw = localStorage.getItem(LOCAL_KEY);
        if (raw) {
          let slugs = JSON.parse(raw) as string[];
          slugs = normalizeStoredSlugs(slugs);
          setItems(slugs.map((s) => enrichLocal(s)).filter(Boolean) as CartItem[]);
        }
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const supabase = createClient();
    const { data: sub } = supabase.auth.onAuthStateChange(() => refresh());
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOCAL_KEY) refresh();
    };
    window.addEventListener("storage", onStorage);
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
          const raw = localStorage.getItem(LOCAL_KEY);
          const slugs: string[] = raw ? JSON.parse(raw) : [];
          const norm = normalizeStoredSlugs(slugs);
          if (norm.includes(slug) || norm.some((s) => s === slug)) return { ok: false, error: "already_in_cart" };
          const next = [...norm, slug];
          localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
          setItems(next.map((s) => enrichLocal(s)).filter(Boolean) as CartItem[]);
          window.dispatchEvent(new CustomEvent("cart:updated"));
          return { ok: true };
        }
        if (data.error && data.error !== "unauthorized") {
          return { ok: false, error: data.error ?? "error" };
        }
      }
      const raw = localStorage.getItem(LOCAL_KEY);
      const slugs: string[] = raw ? JSON.parse(raw) : [];
      const norm = normalizeStoredSlugs(slugs);
      if (norm.includes(slug)) return { ok: false, error: "already_in_cart" };
      const next = [...norm, slug];
      localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
      setItems(next.map((s) => enrichLocal(s)).filter(Boolean) as CartItem[]);
      window.dispatchEvent(new CustomEvent("cart:updated"));
      return { ok: true };
    },
    [refresh],
  );

  const remove = useCallback(
    async (slug: string) => {
      const isBundle = slug.startsWith("bundle:");
      const res = await fetch(`/api/cart?agentSlug=${encodeURIComponent(slug)}`, { method: "DELETE" }).catch(() => null);
      if (res && res.ok) {
        await refresh();
      } else if (res && res.status === 401) {
        const raw = localStorage.getItem(LOCAL_KEY);
        const slugs: string[] = raw ? JSON.parse(raw) : [];
        const norm = normalizeStoredSlugs(slugs);
        const next = isBundle
          ? norm.filter((s) => {
              const p = parseStoredBundleSlug(s);
              const q = parseStoredBundleSlug(slug);
              if (p && q) return p.bundleSlug !== q.bundleSlug;
              return s !== slug;
            })
          : norm.filter((s) => s !== slug);
        localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
        setItems(next.map((s) => enrichLocal(s)).filter(Boolean) as CartItem[]);
      } else if (res && res.ok === false && res.status !== 401) {
        await refresh();
      } else {
        const raw = localStorage.getItem(LOCAL_KEY);
        const slugs: string[] = raw ? JSON.parse(raw) : [];
        const norm = normalizeStoredSlugs(slugs);
        const next = isBundle
          ? norm.filter((s) => {
              const p = parseStoredBundleSlug(s);
              const q = parseStoredBundleSlug(slug);
              if (p && q) return p.bundleSlug !== q.bundleSlug;
              return s !== slug;
            })
          : norm.filter((s) => s !== slug);
        localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
        setItems(next.map((s) => enrichLocal(s)).filter(Boolean) as CartItem[]);
      }
      window.dispatchEvent(new CustomEvent("cart:updated"));
    },
    [refresh],
  );

  const clear = useCallback(async () => {
    localStorage.removeItem(LOCAL_KEY);
    cleanupLegacyBundlePeriodKeys();
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
      const bundleKey = bundleDbSlug(bundleSlug, period);
      if (isBundleInCart(bundleSlug)) return { ok: false, error: "already_in_cart" } as const;
      try {
        const res = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentSlug: bundleKey }),
        }).catch(() => null as unknown as Response);
        if (res && res.ok) {
          await refresh();
          window.dispatchEvent(new CustomEvent("cart:updated"));
          return { ok: true } as const;
        }
        if (res && res.status === 401) {
          // fallback anon
          const raw = localStorage.getItem(LOCAL_KEY);
          const slugs: string[] = raw ? JSON.parse(raw) : [];
          const norm = normalizeStoredSlugs(slugs);
          if (norm.some((s) => parseStoredBundleSlug(s)?.bundleSlug === bundleSlug)) return { ok: false, error: "already_in_cart" } as const;
          const next = [...norm, bundleKey];
          localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
          setItems(next.map((s) => enrichLocal(s)).filter(Boolean) as CartItem[]);
          window.dispatchEvent(new CustomEvent("cart:updated"));
          return { ok: true } as const;
        }
        if (res) {
          const data = await res.json().catch(() => ({}));
          if (data.error) return { ok: false, error: data.error } as const;
        }
      } catch {}
      const raw = localStorage.getItem(LOCAL_KEY);
      const slugs: string[] = raw ? JSON.parse(raw) : [];
      const norm = normalizeStoredSlugs(slugs);
      if (norm.some((s) => parseStoredBundleSlug(s)?.bundleSlug === bundleSlug)) return { ok: false, error: "already_in_cart" } as const;
      const next = [...norm, bundleKey];
      localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
      setItems(next.map((s) => enrichLocal(s)).filter(Boolean) as CartItem[]);
      window.dispatchEvent(new CustomEvent("cart:updated"));
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
