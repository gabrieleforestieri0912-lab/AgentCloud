"use client";

import { useEffect, useState } from "react";

/**
 * Stato admin per la UI (client).
 *
 * Perché esiste: l'admin ha accesso a TUTTI gli agenti e non deve mai vedere
 * o usare i checkout Stripe/PayPal. Il ruolo è risolto lato server da
 * /api/user/role (sessione verificata, mai dal client), qui lo usiamo solo
 * per nascondere le CTA di pagamento e mostrare "Apri in chat" / avvisi.
 */
export function useIsAdmin(): { isAdmin: boolean; loading: boolean } {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch("/api/user/role", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { isAdmin?: boolean } | null) => {
        if (!mounted) return;
        setIsAdmin(data?.isAdmin === true);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return { isAdmin, loading };
}
