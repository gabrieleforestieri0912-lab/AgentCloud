import { getServiceClient, getTenantIdFromAuth, corsHeaders } from "../_shared/supabase.ts";
import { getValidAccessToken } from "../_shared/refresh.ts";

// Notion proxy — query/create/update pages or database entries
// POST { action: "queryDatabase" | "createPage" | "updatePage" | "getPage", databaseId?: string, pageId?: string, payload?: unknown }

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });

  const tenantId = await getTenantIdFromAuth(req);
  if (!tenantId) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });

  const supa = getServiceClient();
  const { data: row } = await supa.from("tenant_integrations").select("*").eq("tenant_id", tenantId).eq("provider", "notion").maybeSingle();
  if (!row || row.status !== "connected") return new Response(JSON.stringify({ error: "not_connected" }), { status: 404, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });

  let accessToken: string;
  try { ({ accessToken } = await getValidAccessToken(row as never)); } catch (e) { return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "decrypt_failed" }), { status: 500, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }); }

  const body = await req.json().catch(() => ({})) as { action?: string; databaseId?: string; pageId?: string; payload?: unknown; filter?: unknown; sorts?: unknown };
  const action = body.action;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
  };

  let url = "";
  let method: string = "POST";
  let fetchBody: string | undefined;

  if (action === "queryDatabase" && body.databaseId) {
    url = `https://api.notion.com/v1/databases/${body.databaseId}/query`;
    fetchBody = JSON.stringify({ filter: body.filter, sorts: body.sorts });
  } else if (action === "createPage") {
    url = "https://api.notion.com/v1/pages";
    fetchBody = JSON.stringify(body.payload ?? {});
  } else if (action === "updatePage" && body.pageId) {
    url = `https://api.notion.com/v1/pages/${body.pageId}`;
    method = "PATCH";
    fetchBody = JSON.stringify(body.payload ?? {});
  } else if (action === "getPage" && body.pageId) {
    url = `https://api.notion.com/v1/pages/${body.pageId}`;
    method = "GET";
  } else {
    return new Response(JSON.stringify({ error: `unsupported action ${action}` }), { status: 400, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });
  }

  const notionRes = await fetch(url, { method, headers, body: fetchBody });
  const json = await notionRes.json().catch(() => ({}));
  if (!notionRes.ok) return new Response(JSON.stringify({ error: json.message || "notion_error", raw: json }), { status: notionRes.status, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });
  return new Response(JSON.stringify({ data: json }), { status: 200, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });
});
