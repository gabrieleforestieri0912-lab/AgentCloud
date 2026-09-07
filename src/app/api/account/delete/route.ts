/**
 * POST /api/account/delete
 *
 * Cancella definitivamente l'account utente e tutti i dati associati:
 * - Profilo Supabase Auth
 * - Connessioni Shopify
 * - Connessioni Google
 * - Abbonamenti e agenti
 * - Dati waitlist
 *
 * Richiede sessione Supabase valida. L'utente viene disconnesso dopo
 * la cancellazione.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  try {
    // Verifica sessione utente
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: "Service not configured" },
        { status: 500 },
      );
    }

    const userId = user.id;

    // 1. Elimina connessioni Shopify
    await admin.from("shopify_connections").delete().eq("user_id", userId);

    // 2. Elimina connessioni Google
    await admin.from("google_connections").delete().eq("user_id", userId);

    // 3. Elimina abbonamenti/agenti utente
    await admin.from("user_agents").delete().eq("user_id", userId);

    // 4. Elimina dalla waitlist
    await admin.from("waitlist").delete().eq("email", user.email || "");

    // 5. Elimina richieste demo
    await admin.from("demo_requests").delete().eq("email", user.email || "");

    // 6. Elimina l'utente Supabase Auth
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("Failed to delete user:", deleteError);
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 },
      );
    }

    // 7. Disconnetti la sessione corrente
    await supabase.auth.signOut();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Account deletion error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
