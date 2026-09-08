"use client";

import { useEffect, useState, useCallback } from "react";

export function useOwned() {
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/user/owned", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { owned: string[] };
        setOwned(new Set(data.owned ?? []));
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener("agentcloud:owned-refresh", refresh as EventListener);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("agentcloud:owned-refresh", refresh as EventListener);
    };
  }, [refresh]);

  return { owned, loading, refresh, isOwned: (slug: string) => owned.has(slug) };
}
