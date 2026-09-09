/**
 * POST /api/waitlist/redeem
 *
 * Proxies the request to the Supabase Edge Function `redeem-waitlist-code`.
 * Requires authenticated user (Bearer token from Supabase client).
 *
 * Body: { code: string }
 * Response: { success: boolean, role?: string, error?: string }
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // 1. Check if beta bypass is enabled
  if (process.env.ENABLE_WAITLIST_BETA_BYPASS !== "true") {
    return NextResponse.json(
      { error: "Beta bypass is not enabled" },
      { status: 403 },
    );
  }

  // 2. Authenticate
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 3. Parse body
  const body = await request.json().catch(() => ({}));
  const code = body.code?.trim();
  if (!code) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }

  // 4. Call Edge Function
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 },
    );
  }

  try {
    // Get the user's access token for the Edge Function
    // We use the service role key server-side to call the Edge Function
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const edgeRes = await fetch(
      `${supabaseUrl}/functions/v1/redeem-waitlist-code`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey || anonKey}`,
          "apikey": anonKey,
        },
        body: JSON.stringify({ code }),
      },
    );

    const data = await edgeRes.json();

    return NextResponse.json(data, { status: edgeRes.status });
  } catch (err) {
    console.error("Edge Function call failed:", err);
    return NextResponse.json(
      { error: "Failed to redeem code", message: err instanceof Error ? err.message : "unknown" },
      { status: 500 },
    );
  }
}
