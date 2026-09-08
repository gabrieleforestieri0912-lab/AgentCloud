import { getServiceClient, getTenantIdFromAuth, corsHeaders } from "../_shared/supabase.ts";
import { getValidAccessToken } from "../_shared/refresh.ts";

// Google Sheets proxy — read/write spreadsheet ranges, reuses Google token refresh logic (same as gmail/calendar)
// POST { action: "getValues" | "updateValues" | "appendValues", spreadsheetId: string, range: string, values?: unknown[][], valueInputOption?: string }

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });

  const tenantId = await getTenantIdFromAuth(req);
  if (!tenantId) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });

  const supa = getServiceClient();
  const { data: row } = await supa.from("tenant_integrations").select("*").eq("tenant_id", tenantId).eq("provider", "google_sheets").maybeSingle();
  if (!row || row.status !== "connected") return new Response(JSON.stringify({ error: "not_connected" }), { status: 404, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });

  let accessToken: string;
  try { ({ accessToken } = await getValidAccessToken(row as never)); } catch (e) { return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "decrypt_failed" }), { status: 500, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }); }

  const body = await req.json().catch(() => ({})) as { action?: string; spreadsheetId?: string; range?: string; values?: unknown[][]; valueInputOption?: string };
  const action = body.action;

  if (!body.spreadsheetId || !body.range) {
    return new Response(JSON.stringify({ error: "spreadsheetId and range required" }), { status: 400, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });
  }

  const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` };

  if (action === "getValues") {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(body.spreadsheetId)}/values/${encodeURIComponent(body.range)}`;
    const sheetsRes = await fetch(url, { headers });
    const json = await sheetsRes.json().catch(() => ({}));
    if (!sheetsRes.ok) return new Response(JSON.stringify({ error: json.error?.message || "sheets_error", raw: json }), { status: sheetsRes.status, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ data: json }), { status: 200, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });
  }

  if (action === "updateValues") {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(body.spreadsheetId)}/values/${encodeURIComponent(body.range)}?valueInputOption=${encodeURIComponent(body.valueInputOption || "USER_ENTERED")}`;
    const sheetsRes = await fetch(url, { method: "PUT", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ range: body.range, majorDimension: "ROWS", values: body.values ?? [] }) });
    const json = await sheetsRes.json().catch(() => ({}));
    if (!sheetsRes.ok) return new Response(JSON.stringify({ error: json.error?.message || "sheets_error", raw: json }), { status: sheetsRes.status, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ data: json }), { status: 200, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });
  }

  if (action === "appendValues") {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(body.spreadsheetId)}/values/${encodeURIComponent(body.range)}:append?valueInputOption=${encodeURIComponent(body.valueInputOption || "USER_ENTERED")}`;
    const sheetsRes = await fetch(url, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ range: body.range, majorDimension: "ROWS", values: body.values ?? [] }) });
    const json = await sheetsRes.json().catch(() => ({}));
    if (!sheetsRes.ok) return new Response(JSON.stringify({ error: json.error?.message || "sheets_error", raw: json }), { status: sheetsRes.status, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ data: json }), { status: 200, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ error: `unsupported action ${action}` }), { status: 400, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });
});
