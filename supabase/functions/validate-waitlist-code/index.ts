/**
 * Edge Function: validate-waitlist-code
 *
 * POST { code: string }
 * Auth: NOT required (user hasn't signed up yet)
 *
 * Flow:
 *   1. Check ENABLE_WAITLIST_BETA_BYPASS env flag → 403 if false
 *   2. Look up code, validate: exists, used_count < max_uses, not expired
 *   3. Create row in waitlist_pending_sessions with random session_token
 *   4. Return session_token (client sets it as httpOnly cookie)
 *   5. User is then redirected to normal signup/login
 *
 * Does NOT increment used_count or touch profiles — that happens in Step B.
 */

import { getServiceClient, corsHeaders } from "../_shared/supabase.ts";

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  // --- Guard: feature flag ---
  const bypassEnabled = Deno.env.get("ENABLE_WAITLIST_BETA_BYPASS") === "true";
  if (!bypassEnabled) {
    return new Response(
      JSON.stringify({ error: "Beta bypass is not enabled" }),
      { status: 403, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
    );
  }

  // --- Parse input ---
  const body = await req.json().catch(() => ({})) as { code?: string };
  const code = body.code?.trim().toUpperCase();
  if (!code) {
    return new Response(
      JSON.stringify({ error: "code_required", message: "Please enter a code" }),
      { status: 400, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
    );
  }

  const supa = getServiceClient();

  // 1. Look up the code
  const { data: codeRow, error: codeError } = await supa
    .from("waitlist_codes")
    .select("id, role, max_uses, used_count, expires_at")
    .eq("code", code)
    .maybeSingle();

  if (codeError || !codeRow) {
    return new Response(
      JSON.stringify({ error: "invalid_code", message: "Codice non valido" }),
      { status: 404, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
    );
  }

  // 2. Validate: not expired
  if (codeRow.expires_at && new Date(codeRow.expires_at) < new Date()) {
    return new Response(
      JSON.stringify({ error: "expired", message: "Il codice è scaduto" }),
      { status: 410, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
    );
  }

  // 3. Validate: not exhausted
  if (codeRow.used_count >= codeRow.max_uses) {
    return new Response(
      JSON.stringify({ error: "exhausted", message: "Il codice è già stato utilizzato al massimo" }),
      { status: 409, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
    );
  }

  // 4. Create pending session (30 min expiry)
  const sessionToken = generateToken();
  const { error: sessionError } = await supa
    .from("waitlist_pending_sessions")
    .insert({
      session_token: sessionToken,
      code_id: codeRow.id,
    });

  if (sessionError) {
    console.error("Failed to create pending session:", sessionError);
    return new Response(
      JSON.stringify({ error: "session_error", message: "Errore interno, riprova" }),
      { status: 500, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
    );
  }

  // 5. Return session token — client sets it as httpOnly cookie
  return new Response(
    JSON.stringify({
      success: true,
      session_token: sessionToken,
      expires_in: 1800, // 30 minutes in seconds
      role: codeRow.role,
    }),
    {
      status: 200,
      headers: {
        ...corsHeaders(origin),
        "Content-Type": "application/json",
      },
    },
  );
});
