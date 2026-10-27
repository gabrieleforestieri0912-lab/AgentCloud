import { redirect } from "next/navigation";
import { getSessionUser, createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/DashboardShell";
import ApprovalsManager, {
  type ApprovalView,
  type AutonomyView,
} from "@/components/ApprovalsManager";
import { accountIdentityFromUser } from "@/lib/account-identity";
import { PROMOTION_THRESHOLD } from "@/lib/agents/autonomy";

/**
 * Pagina Approvazioni (Fase 4): le proposte d'azione degli agenti L1 aspettano
 * una decisione umana qui. Server component: carica approvazioni (client
 * utente, quindi la RLS filtra già per tenant) e righe di autonomia con lo
 * stesso client — nessun dato altrui attraversa la pagina.
 */
export default async function ApprovalsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const client = await createClient();
  const [approvalsRows, autonomyRows] = await Promise.all([
    client
      .from("agent_approvals")
      .select("*")
      .eq("tenant_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),
    client
      .from("agent_autonomy")
      .select("*")
      .eq("tenant_id", user.id)
      .order("agent_slug"),
  ]);

  const rows = (approvalsRows.data ?? []) as ApprovalView[];
  const pending = rows.filter((r) => r.stato === "pending");
  const decided = rows
    .filter((r) => r.stato !== "pending")
    .slice(0, 30);
  const autonomy = (autonomyRows.data ?? []) as AutonomyView[];

  return (
    <DashboardShell
      email={user?.email ?? ""}
      account={accountIdentityFromUser(user)}
    >
      <ApprovalsManager
        pending={pending}
        decided={decided}
        autonomy={autonomy}
        promotionThreshold={PROMOTION_THRESHOLD}
      />
    </DashboardShell>
  );
}
