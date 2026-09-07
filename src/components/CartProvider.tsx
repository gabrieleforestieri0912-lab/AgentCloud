"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Agent } from "@/lib/agents";
import { getAgentBySlug } from "@/lib/agents";

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
};

type CartContextType = {
  items: CartItem[];
  totalCents: number;
  totalDisplay: string;
  count: number;
  loading: boolean;
  add: (slug: string) => Promise<{ ok: boolean; error?: string }>;
  remove: (slug: string) => Promise<void>;
  clear: () => Promise<void>;
  refresh: () => Promise<void>;
  isInCart: (slug: string) => boolean;
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
    if (authed) {
      try {
        // Merge localStorage cart into DB cart on login
        const raw = localStorage.getItem(LOCAL_KEY);
        if (raw) {
          try {
            const slugs = JSON.parse(raw) as string[];
            if (slugs.length > 0) {
              for (const slug of slugs) {
                await fetch("/api/cart", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ agentSlug: slug }),
                }).catch(() => {});
              }
              localStorage.removeItem(LOCAL_KEY);
            }
          } catch {}
        }
        const res = await fetch("/api/cart");
        if (res.ok) {
          const data = await res.json();
          const apiItems = (data.items ?? []) as Array<{ agent_slug: string; quantity: number }>;
          const enriched = apiItems.map((it) => enrichLocal(it.agent_slug, it.quantity)).filter(Boolean) as CartItem[];
          setItems(enriched);
        } else {
          const fallbackRaw = localStorage.getItem(LOCAL_KEY);
          if (fallbackRaw) {
            const slugs = JSON.parse(fallbackRaw) as string[];
            setItems(slugs.map((s) => enrichLocal(s)).filter(Boolean) as CartItem[]);
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    } else {
      try {
        const raw = localStorage.getItem(LOCAL_KEY);
        if (raw) {
          const slugs = JSON.parse(raw) as string[];
          setItems(slugs.map((s) => enrichLocal(s)).filter(Boolean) as CartItem[]);
        } else {
          setItems([]);
        }
      } catch {
        setItems([]);
      }
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
      if (authedRef.current) {
        const res = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentSlug: slug }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data.error === "already_owned") return { ok: false, error: "already_owned" };
          return { ok: false, error: data.error ?? "error" };
        }
        await refresh();
        window.dispatchEvent(new CustomEvent("cart:updated"));
        return { ok: true };
      } else {
        const raw = localStorage.getItem(LOCAL_KEY);
        const slugs: string[] = raw ? JSON.parse(raw) : [];
        if (slugs.includes(slug)) return { ok: false, error: "already_in_cart" };
        const next = [...slugs, slug];
        localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
        setItems(next.map((s) => enrichLocal(s)).filter(Boolean) as CartItem[]);
        window.dispatchEvent(new CustomEvent("cart:updated"));
        return { ok: true };
      }
    },
    [refresh],
  );

  const remove = useCallback(
    async (slug: string) => {
      if (authedRef.current) {
        await fetch(`/api/cart?agentSlug=${encodeURIComponent(slug)}`, { method: "DELETE" });
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
    if (authedRef.current) {
      await fetch("/api/cart", { method: "DELETE" });
      await refresh();
    } else {
      localStorage.removeItem(LOCAL_KEY);
      setItems([]);
    }
    window.dispatchEvent(new CustomEvent("cart:updated"));
  }, [refresh]);

  const isInCart = useCallback((slug: string) => items.some((i) => i.agent_slug === slug), [items]);

  const totalCents = items.reduce((sum, it) => sum + it.priceCents * it.quantity, 0);
  const totalDisplay = formatTotal(totalCents);

  return (
    <CartContext.Provider
      value={{ items, totalCents, totalDisplay, count: items.length, loading, add, remove, clear, refresh, isInCart }}
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
