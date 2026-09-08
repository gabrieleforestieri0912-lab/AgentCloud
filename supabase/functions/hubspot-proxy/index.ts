import { getServiceClient, getTenantIdFromAuth, corsHeaders } from "../_shared/supabase.ts";
import { getValidAccessToken } from "../_shared/refresh.ts";

// HubSpot proxy — read/write contacts (minimal, per spec)
// POST { action: "listContacts" | "createContact" | "updateContact", contactId?: string, properties?: Record<string,string>, limit?: number }

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });

  const tenantId = await getTenantIdFromAuth(req);
  if (!tenantId) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });

  const supa = getServiceClient();
  const { data: row } = await supa.from("tenant_integrations").select("*").eq("tenant_id", tenantId).eq("provider", "hubspot").maybeSingle();
  if (!row || row.status !== "connected") return new Response(JSON.stringify({ error: "not_connected" }), { status: 404, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });

  let accessToken: string;
  try { ({ accessToken } = await getValidAccessToken(row as never)); } catch (e) { return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "decrypt_failed" }), { status: 500, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }); }

  const body = await req.json().catch(() => ({})) as { action?: string; contactId?: string; properties?: Record<string, string>; limit?: number; email?: string };
  const action = body.action;
  const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };

  if (action === "listContacts") {
    const res = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts?limit=${body.limit ?? 10}`, { headers });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return new Response(JSON.stringify({ error: json.message || "hubspot_error", raw: json }), { status: res.status, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ data: json }), { status: 200, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });
  }

  if (action === "createContact") {
    if (!body.properties) return new Response(JSON.stringify({ error: "properties required" }), { status: 400, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });
    const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
      method: "POST", headers,
      body: JSON.stringify({ properties: body.properties }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return new Response(JSON.stringify({ error: json.message || "hubspot_error", raw: json }), { status: res.status, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ data: json }), { status: 200, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });
  }

  if (action === "updateContact" && body.contactId) {
    if (!body.properties) return new Response(JSON.stringify({ error: "properties required" }), { status: 400, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });
    const res = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${body.contactId}`, {
      method: "PATCH", headers,
      body: JSON.stringify({ properties: body.properties }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return new Response(JSON.stringify({ error: json.message || "hubspot_error", raw: json }), { status: res.status, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ data: json }), { status: 200, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ error: `unsupported action ${action}` }), { status: 400, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });
});
