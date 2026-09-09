/**
 * /admin/waitlist-codes
 *
 * Internal-only page (not linked from public nav) to manage beta access codes.
 * Gated behind admin email auth.
 *
 * Features:
 * - Generate new codes (role, max_uses, expiry)
 * - List existing codes with used_count / status
 * - Manually expire/revoke a code
 */

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import AppHeader from "@/components/AppHeader";
import WaitlistCodesManager from "@/components/WaitlistCodesManager";

export const dynamic = "force-dynamic";

export default async function AdminWaitlistCodesPage() {
  const user = await getSessionUser();
  const isAdmin = (user && isAdminEmail(user.email));
  if (!isAdmin) redirect("/login");

  const db = createAdminClient();
  if (!db) {
    return (
      <main className="min-h-screen bg-neutral-950">
        <AppHeader variant="chat" />
        <div className="p-8 text-center text-neutral-400">DB non configurato</div>
      </main>
    );
  }

  // Fetch all codes
  const { data: codes } = await db
    .from("waitlist_codes")
    .select("*")
    .order("created_at", { ascending: false });

  // Fetch all redemptions with user email
  const { data: redemptions } = await db
    .from("waitlist_redemptions")
    .select("*, profiles!inner(email)")
    .order("redeemed_at", { ascending: false });

  return (
    <main className="min-h-screen bg-neutral-950">
      <AppHeader variant="chat" />
      <div className="px-4 sm:px-6 py-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">Gestione Codici Beta Access</h1>
            <p className="text-sm text-neutral-400 mt-1">
              Genera e gestisci i codici di accesso beta per i tester.
            </p>
          </div>
          <WaitlistCodesManager
            codes={(codes ?? []) as Array<{
              id: string;
              code: string;
              role: string;
              max_uses: number;
              used_count: number;
              expires_at: string | null;
              created_at: string;
              created_by: string | null;
            }>}
            redemptions={(redemptions ?? []) as Array<{
              id: string;
              code_id: string;
              user_id: string;
              redeemed_at: string;
              profiles: { email: string | null } | null;
            }>}
          />
        </div>
      </div>
    </main>
  );
}
