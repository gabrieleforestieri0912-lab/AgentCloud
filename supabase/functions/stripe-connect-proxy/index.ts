import { getServiceClient, getTenantIdFromAuth, corsHeaders } from "../_shared/supabase.ts";
import { getValidAccessToken } from "../_shared/refresh.ts";

// Stripe Connect proxy — read balance/charges/customers via Stripe-Account header
// POST { action: "balance" | "customers" | "charges", params?: { limit?: number } }

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });

  const tenantId = await getTenantIdFromAuth(req);
  if (!tenantId) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });

  const supa = getServiceClient();
  const { data: row, error } = await supa.from("tenant_integrations").select("*").eq("tenant_id", tenantId).eq("provider", "stripe").maybeSingle();
  if (error || !row || row.status !== "connected") return new Response(JSON.stringify({ error: "not_connected" }), { status: 404, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });

  let accessToken: string;
  try {
    ({ accessToken } = await getValidAccessToken(row as never));
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "decrypt_failed" }), { status: 500, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });
  }

  const body = await req.json().catch(() => ({})) as { action?: string; params?: Record<string, unknown> };
  const action = body.action || "balance";
  const stripeAccount = (row as { external_account_id?: string }).external_account_id || undefined;

  // Use access_token as Bearer; for Connect, Stripe expects the connected account via header
  const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` };
  if (stripeAccount) headers["Stripe-Account"] = stripeAccount;

  let url = "";
  if (action === "balance") url = "https://api.stripe.com/v1/balance";
  else if (action === "customers") url = `https://api.stripe.com/v1/customers?limit=${(body.params?.limit as number) ?? 10}`;
  else if (action === "charges") url = `https://api.stripe.com/v1/charges?limit=${(body.params?.limit as number) ?? 10}`;
  else return new Response(JSON.stringify({ error: `unsupported action ${action}` }), { status: 400, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });

  const stripeRes = await fetch(url, { headers });
  const json = await stripeRes.json().catch(() => ({}));
  if (!stripeRes.ok) return new Response(JSON.stringify({ error: json.error?.message || "stripe_error", raw: json }), { status: stripeRes.status, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });

  return new Response(JSON.stringify({ data: json }), { status: 200, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });
});
