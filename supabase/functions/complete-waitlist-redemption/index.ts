/**
 * Edge Function: complete-waitlist-redemption
 *
 * POST { session_token: string }
 * Auth: requires Bearer token (just-signed-up / just-logged-in user)
 *
 * Flow:
 *   1. Check ENABLE_WAITLIST_BETA_BYPASS env flag → 403 if false
 *   2. Authenticate user via JWT
 *   3. Look up waitlist_pending_sessions by session_token
 *   4. Validate: not expired, not already consumed
 *   5. Re-validate code: still within max_uses (race condition guard)
 *   6. Set profiles.role to code's role
 *   7. Insert into waitlist_redemptions
 *   8. Increment waitlist_codes.used_count
 *   9. Mark pending session consumed_at = now()
 *  10. Return success (client clears cookie)
 *
 * Steps 3-9 in best-effort transaction (Supabase Edge Functions).
 * If code exhausted between Step A and Step B → graceful failure:
 *   the user keeps their normal account, just doesn't get beta role.
 */

import { getServiceClient, getTenantIdFromAuth, corsHeaders } from "../_shared/supabase.ts";

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

  // --- Auth ---
  const userId = await getTenantIdFromAuth(req);
  if (!userId) {
    return new Response(
      JSON.stringify({ error: "unauthorized" }),
      { status: 401, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
    );
  }

  // --- Parse input ---
  const body = await req.json().catch(() => ({})) as { session_token?: string };
  const sessionToken = body.session_token?.trim();
  if (!sessionToken) {
    return new Response(
      JSON.stringify({ error: "session_token_required" }),
      { status: 400, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
    );
  }

  const supa = getServiceClient();

  // 1. Look up pending session
  const { data: pending, error: pendingError } = await supa
    .from("waitlist_pending_sessions")
    .select("id, code_id, expires_at, consumed_at")
    .eq("session_token", sessionToken)
    .maybeSingle();

  if (pendingError || !pending) {
    return new Response(
      JSON.stringify({ error: "invalid_session", message: "Sessione non valida" }),
      { status: 404, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
    );
  }

  // 2. Validate: not expired
  if (new Date(pending.expires_at) < new Date()) {
    return new Response(
      JSON.stringify({ error: "expired", message: "Sessione scaduta, riprova con un nuovo codice" }),
      { status: 410, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
    );
  }

  // 3. Validate: not already consumed
  if (pending.consumed_at) {
    return new Response(
      JSON.stringify({ success: true, message: "Already redeemed" }),
      { status: 200, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
    );
  }

  // 4. Look up the code
  const { data: codeRow, error: codeError } = await supa
    .from("waitlist_codes")
    .select("id, role, max_uses, used_count")
    .eq("id", pending.code_id)
    .maybeSingle();

  if (codeError || !codeRow) {
    return new Response(
      JSON.stringify({ error: "code_not_found", message: "Codice non trovato" }),
      { status: 404, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
    );
  }

  // 5. Re-validate: code still within max_uses (race condition guard)
  if (codeRow.used_count >= codeRow.max_uses) {
    // Graceful failure: mark consumed but don't assign role
    await supa
      .from("waitlist_pending_sessions")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", pending.id);

    return new Response(
      JSON.stringify({
        success: false,
        error: "code_exhausted",
        message: "Il codice è stato esaurito nel frattempo. Il tuo account è stato creato normalmente.",
      }),
      {
        status: 200,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      },
    );
  }

  // 6. Check if user already has a beta role (idempotent)
  const { data: profile } = await supa
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.role === codeRow.role) {
    // Already has this role — just mark consumed
    await supa
      .from("waitlist_pending_sessions")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", pending.id);

    return new Response(
      JSON.stringify({ success: true, message: "Already has role", role: codeRow.role }),
      { status: 200, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
    );
  }

  // 7. Set user's role
  const { error: roleError } = await supa
    .from("profiles")
    .update({ role: codeRow.role })
    .eq("id", userId);

  if (roleError) {
    console.error("Failed to set role:", roleError);
    return new Response(
      JSON.stringify({ error: "role_update_failed", message: roleError.message }),
      { status: 500, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
    );
  }

  // 8. Insert redemption record
  const { error: redemptionError } = await supa
    .from("waitlist_redemptions")
    .insert({ code_id: codeRow.id, user_id: userId });

  if (redemptionError) {
    // Roll back role
    await supa.from("profiles").update({ role: "member" }).eq("id", userId);
    console.error("Failed to insert redemption:", redemptionError);
    return new Response(
      JSON.stringify({ error: "redemption_failed", message: redemptionError.message }),
      { status: 500, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
    );
  }

  // 9. Increment used_count
  const { error: countError } = await supa
    .rpc("increment_used_count", { code_id: codeRow.id })
    .single();

  if (countError) {
    await supa
      .from("waitlist_codes")
      .update({ used_count: codeRow.used_count + 1 })
      .eq("id", codeRow.id);
  }

  // 10. Mark pending session consumed
  await supa
    .from("waitlist_pending_sessions")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", pending.id);

  return new Response(
    JSON.stringify({
      success: true,
      role: codeRow.role,
      message: `Accesso beta attivato: ${codeRow.role}`,
    }),
    { status: 200, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
  );
});
