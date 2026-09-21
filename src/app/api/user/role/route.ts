import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { resolveIsAdmin } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/user/role — ruolo minimo per la UI (admin vs utente normale).
 * Restituisce { isAdmin, role } senza esporre ADMIN_EMAILS o altri dettagli.
 * La UI lo usa SOLO per nascondere i checkout (Stripe/PayPal) agli admin,
 * che hanno accesso a tutti gli agenti e non devono pagare.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ isAdmin: false, role: null });
  const isAdmin = await resolveIsAdmin(user);
  let role: string | null = null;
  try {
    const admin = createAdminClient();
    if (admin) {
      const { data } = await admin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      role = (data as { role?: string | null } | null)?.role ?? null;
    }
  } catch {
    // ignora: isAdmin resta la fonte autoritativa
  }
  return NextResponse.json(
    { isAdmin, role },
    { headers: { "Cache-Control": "no-store" } },
  );
}
