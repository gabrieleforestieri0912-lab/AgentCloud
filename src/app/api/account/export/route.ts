import { NextResponse } from "next/server";
import { getSessionUser, createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/account/export
 *
 * Esporta tutti i dati personali dell'utente autenticato in formato JSON
 * (GDPR Art. 20 — diritto alla portabilità). Raccoglie ogni tabella che
 * contiene dati riconducibili all'utente e restituisce un unico payload.
 *
 * Per utenti mock (accesso via codice, senza sessione Supabase) restituisce
 * un export sintetico con nota esplicativa invece di 401, così il bottone
 * nelle impostazioni non appare rotto.
 */
export async function GET() {
  const user = await getSessionUser();

  // Utente mock (codice di accesso, nessuna sessione Supabase) -> export sintetico
  if (!user) {
    return NextResponse.json({
      exported_at: new Date().toISOString(),
      account: {
        email: "admin@agentcloud.agency",
        type: "mock_tenant",
        note: "Accesso tramite codice (mock admin). Nessun account Supabase reale: i dati mostrati sono sintetici.",
      },
      gdpr_notice:
        "Questo export è generato per l'utente mock. Accedi con un account reale per esportare i tuoi dati personali (Art. 20 GDPR).",
      profile: null,
      user_agents: [],
      subscriptions: [],
      agent_runs: [],
      agent_notifications: [],
      carts: [],
      cart_items: [],
      shopify_connections: [],
      google_connections: [],
      local_preferences_hint:
        "Le preferenze locali (notifiche, tema, lingua) sono salvate nel localStorage del browser e verranno aggiunte lato client al file scaricato.",
    });
  }

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const userId = user.id;
  const userIdText = userId; // colonne user_id text usano UUID come stringa

  // Preferiamo il service role (bypassa RLS) quando disponibile, altrimenti
  // usiamo il client autenticato (RLS filtra comunque per auth.uid()).
  const admin = createAdminClient();
  const supabase = admin ?? (await createClient());

  // Helper che non fa mai fallire l'intero export se una singola query fallisce
  // supabase-js ritorna PostgrestBuilder (thenable, non Promise esatta) -> tipizziamo come any
  async function safeQuery<T>(fn: () => PromiseLike<{ data: T | null; error: unknown }>, fallback: T): Promise<T> {
    try {
      const { data, error } = (await fn()) as { data: T | null; error: unknown };
      if (error) {
        console.warn("[export] query failed:", error);
        return fallback;
      }
      return (data as T) ?? fallback;
    } catch (e) {
      console.warn("[export] query exception:", e);
      return fallback;
    }
  }

  const [
    profile,
    userAgents,
    subscriptions,
    agentRuns,
    agentNotifications,
    carts,
    shopifyConnections,
    googleConnections,
  ] = await Promise.all([
    safeQuery(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      () => supabase.from("profiles").select("*").eq("id", userId).maybeSingle() as any,
      null as unknown as null
    ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    safeQuery(() => supabase.from("user_agents").select("*").eq("user_id", userIdText) as any, [] as unknown as unknown[]),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    safeQuery(() => supabase.from("subscriptions").select("*").eq("user_id", userIdText) as any, [] as unknown as unknown[]),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    safeQuery(() => supabase.from("agent_runs").select("*").eq("user_id", userIdText).order("started_at", { ascending: false }).limit(500) as any, [] as unknown as unknown[]),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    safeQuery(() => supabase.from("agent_notifications").select("*").eq("user_id", userIdText).order("created_at", { ascending: false }).limit(500) as any, [] as unknown as unknown[]),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    safeQuery(() => supabase.from("carts").select("*").eq("user_id", userIdText).order("created_at", { ascending: false }) as any, [] as unknown as unknown[]),
    // shopify/google potrebbero non esistere in installazioni vecchie -> fallback []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    safeQuery(
      () =>
        supabase
          .from("shopify_connections")
          .select("id, shop_domain, scope, installed_at, uninstalled_at, created_at, updated_at")
          .eq("user_id", userIdText) as any,
      [] as unknown as unknown[]
    ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    safeQuery(
      () =>
        supabase
          .from("google_connections")
          .select("id, google_email, scopes, expires_at, connected_at, updated_at")
          .eq("user_id", userId) as any,
      [] as unknown as unknown[]
    ),
  ]);

  // cart_items separati (join via carts.id) — se ci sono carrelli
  let cartItems: unknown[] = [];
  if (Array.isArray(carts) && carts.length > 0) {
    const cartIds = (carts as Array<{ id: string }>).map((c) => c.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cartItems = await safeQuery(() => supabase.from("cart_items").select("*").in("cart_id", cartIds) as any, [] as unknown as unknown[]);
  }

  const payload = {
    exported_at: new Date().toISOString(),
    gdpr_notice:
      "Export dei dati personali ai sensi dell'art. 20 GDPR (portabilità). I token OAuth sono omessi per sicurezza; le preferenze locali del browser verranno aggiunte lato client se disponibili.",
    account: {
      id: user.id,
      email: user.email ?? null,
      email_confirmed_at: (user as unknown as Record<string, unknown>).email_confirmed_at ?? null,
      created_at: (user as unknown as Record<string, unknown>).created_at ?? null,
      last_sign_in_at: (user as unknown as Record<string, unknown>).last_sign_in_at ?? null,
      user_metadata: user.user_metadata ?? null,
      app_metadata: user.app_metadata ?? null,
    },
    profile: profile ?? null,
    user_agents: userAgents ?? [],
    subscriptions: subscriptions ?? [],
    agent_runs: agentRuns ?? [],
    agent_notifications: agentNotifications ?? [],
    carts: carts ?? [],
    cart_items: cartItems,
    shopify_connections: shopifyConnections ?? [],
    google_connections: googleConnections ?? [],
    // conteggi utili per verifica rapida
    counts: {
      user_agents: Array.isArray(userAgents) ? userAgents.length : 0,
      subscriptions: Array.isArray(subscriptions) ? subscriptions.length : 0,
      agent_runs: Array.isArray(agentRuns) ? agentRuns.length : 0,
      agent_notifications: Array.isArray(agentNotifications) ? agentNotifications.length : 0,
      carts: Array.isArray(carts) ? carts.length : 0,
      cart_items: Array.isArray(cartItems) ? cartItems.length : 0,
      shopify_connections: Array.isArray(shopifyConnections) ? shopifyConnections.length : 0,
      google_connections: Array.isArray(googleConnections) ? googleConnections.length : 0,
    },
  };

  return NextResponse.json(payload, {
    headers: {
      // Suggerisce il nome file se il client rispetta l'header (il client imposta comunque il download)
      "Content-Disposition": `attachment; filename="agentcloud-export-${userId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
