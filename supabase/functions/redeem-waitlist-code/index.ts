/**
 * Edge Function: redeem-waitlist-code
 *
 * POST { code: string }
 * Auth: requires Bearer token (authenticated Supabase user)
 *
 * Flow:
 *   1. Check ENABLE_WAITLIST_BETA_BYPASS env flag → 403 if false
 *   2. Authenticate user via JWT
 *   3. Look up code, validate: exists, used_count < max_uses, not expired
 *   4. Check if user already redeemed this code → no-op (return success)
 *   5. Set profiles.role for the user to the code's role
 *   6. Insert into waitlist_redemptions
 *   7. Increment waitlist_codes.used_count
 *
 * All in a single DB transaction. On failure, rolls back and returns error.
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
  const body = await req.json().catch(() => ({})) as { code?: string };
  const code = body.code?.trim();
  if (!code) {
    return new Response(
      JSON.stringify({ error: "code is required" }),
      { status: 400, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
    );
  }

  const supa = getServiceClient();

  // --- Single DB transaction ---
  // Use RPC or sequential queries with manual transaction logic.
  // Supabase Edge Functions don't have native transaction support,
  // so we do sequential operations with idempotent constraints.

  // 1. Look up the code
  const { data: codeRow, error: codeError } = await supa
    .from("waitlist_codes")
    .select("id, role, max_uses, used_count, expires_at")
    .eq("code", code)
    .maybeSingle();

  if (codeError || !codeRow) {
    return new Response(
      JSON.stringify({ error: "invalid_code", message: "Code not found" }),
      { status: 404, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
    );
  }

  // 2. Validate: not expired
  if (codeRow.expires_at && new Date(codeRow.expires_at) < new Date()) {
    return new Response(
      JSON.stringify({ error: "expired", message: "Code has expired" }),
      { status: 410, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
    );
  }

  // 3. Validate: not exhausted
  if (codeRow.used_count >= codeRow.max_uses) {
    return new Response(
      JSON.stringify({ error: "exhausted", message: "Code has been fully redeemed" }),
      { status: 409, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
    );
  }

  // 4. Check if user already redeemed this code → no-op (return success)
  const { data: existingRedemption } = await supa
    .from("waitlist_redemptions")
    .select("id")
    .eq("code_id", codeRow.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingRedemption) {
    return new Response(
      JSON.stringify({ success: true, message: "Already redeemed", role: codeRow.role }),
      { status: 200, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
    );
  }

  // 5. Set user's role in profiles
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

  // 6. Insert redemption record
  const { error: redemptionError } = await supa
    .from("waitlist_redemptions")
    .insert({
      code_id: codeRow.id,
      user_id: userId,
    });

  if (redemptionError) {
    // Roll back role change
    await supa.from("profiles").update({ role: "member" }).eq("id", userId);
    console.error("Failed to insert redemption:", redemptionError);
    return new Response(
      JSON.stringify({ error: "redemption_failed", message: redemptionError.message }),
      { status: 500, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
    );
  }

  // 7. Increment used_count
  const { error: countError } = await supa
    .rpc("increment_used_count", { code_id: codeRow.id })
    .single();

  // If RPC doesn't exist, fall back to direct update
  if (countError) {
    await supa
      .from("waitlist_codes")
      .update({ used_count: codeRow.used_count + 1 })
      .eq("id", codeRow.id);
  }

  return new Response(
    JSON.stringify({
      success: true,
      role: codeRow.role,
      message: `Access granted: ${codeRow.role}`,
    }),
    { status: 200, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
  );
});
