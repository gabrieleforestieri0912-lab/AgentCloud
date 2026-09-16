import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateReferralCode } from "@/lib/waitlist";

export async function GET() {
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "db not configured" }, { status: 500 });

  let email: string | null = null;
  let userId: string | null = null;

  // Prova da sessione Supabase
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      email = user.email;
      userId = user.id;
    }
  } catch {}

  // Fallback da cookie waitlist (per utenti non ancora con sessione Supabase ma con cookie joined)
  if (!email) {
    const c = await cookies();
    email = c.get("ac_wl_email")?.value ?? null;
  }

  if (!email) {
    return NextResponse.json({ error: "not authenticated or not in waitlist" }, { status: 401 });
  }

  // Trova waitlist row per email
  const { data: waitlistRow } = await admin
    .from("waitlist")
    .select("id, referral_code")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (!waitlistRow) {
    return NextResponse.json({ error: "not in waitlist" }, { status: 404 });
  }

  const waitlistId = (waitlistRow as { id: string }).id;

  // Prova a recuperare code da nuova tabella, altrimenti genera
  const code = await getOrCreateReferralCode(waitlistId);
  if (!code) {
    return NextResponse.json({ error: "failed to generate code" }, { status: 500 });
  }

  const shareUrl = `https://agentcloud.agency/waitlist/join?ref=${code}`;

  return NextResponse.json({
    code,
    referralCode: code, // alias for legacy UI
    shareUrl,
    // also legacy waitlist.referral_code
    waitlistReferralCode: (waitlistRow as { referral_code?: string | null }).referral_code ?? code,
  });
}
