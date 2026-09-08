import { getServiceClient, getTenantIdFromAuth, corsHeaders } from "../_shared/supabase.ts";
import { getValidAccessToken } from "../_shared/refresh.ts";

// Slack proxy — post messages / read channel list
// POST { action: "postMessage" | "listChannels", channel?: string, text?: string, limit?: number }

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });

  const tenantId = await getTenantIdFromAuth(req);
  if (!tenantId) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });

  const supa = getServiceClient();
  const { data: row } = await supa.from("tenant_integrations").select("*").eq("tenant_id", tenantId).eq("provider", "slack").maybeSingle();
  if (!row || row.status !== "connected") return new Response(JSON.stringify({ error: "not_connected" }), { status: 404, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });

  let accessToken: string;
  try { ({ accessToken } = await getValidAccessToken(row as never)); } catch (e) { return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "decrypt_failed" }), { status: 500, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }); }

  const body = await req.json().catch(() => ({})) as { action?: string; channel?: string; text?: string; limit?: number };
  const action = body.action;

  const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };

  if (action === "postMessage") {
    if (!body.channel || !body.text) return new Response(JSON.stringify({ error: "channel and text required" }), { status: 400, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });
    const slackRes = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST", headers,
      body: JSON.stringify({ channel: body.channel, text: body.text }),
    });
    const json = await slackRes.json().catch(() => ({}));
    if (!json.ok) return new Response(JSON.stringify({ error: json.error || "slack_error", raw: json }), { status: 400, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ data: json }), { status: 200, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });
  }

  if (action === "listChannels") {
    const slackRes = await fetch(`https://slack.com/api/conversations.list?limit=${body.limit ?? 100}`, { headers: { Authorization: `Bearer ${accessToken}` } });
    const json = await slackRes.json().catch(() => ({}));
    if (!json.ok) return new Response(JSON.stringify({ error: json.error || "slack_error", raw: json }), { status: 400, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ data: json }), { status: 200, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ error: `unsupported action ${action}` }), { status: 400, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });
});
