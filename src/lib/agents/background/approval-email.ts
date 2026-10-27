/**
 * Email di richiesta approvazione (D7) — best-effort, mai fatale per il run.
 * Destinatario: il profilo dell'utente (colonna email di `profiles`).
 * Messaggio breve: quale agente, quale azione, dove decidere.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { getResend } from "@/lib/resend";
import type { AgentRunRow, AgentApprovalRow } from "@/types/agents-db";

function siteOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_URL ||
    "https://www.agentcloud.agency";
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw.replace(/\/$/, "");
  }
  return `https://${raw}`;
}

export { siteOrigin };

export function approvalsUrl(): string {
  return `${siteOrigin()}/dashboard/approvals`;
}

export async function fetchUserEmail(tenantId: string): Promise<string | null> {
  const client = createAdminClient();
  if (!client) return null;
  try {
    const { data } = await client
      .from("profiles")
      .select("email")
      .eq("id", tenantId)
      .maybeSingle();
    return data?.email ?? null;
  } catch {
    return null;
  }
}

export async function sendApprovalRequestedEmail(
  run: AgentRunRow,
  approval: AgentApprovalRow,
): Promise<void> {
  const email = await fetchUserEmail(run.user_id);
  if (!email) return;
  if (!process.env.RESEND_API_KEY) return;
  const from = process.env.QUOTE_FROM_EMAIL || "notifiche@agentcloud.agency";
  await getResend().emails.send({
    from,
    to: email,
    subject: `AgentCloud: ${run.agent_slug} chiede la tua approvazione`,
    text:
      `L'agente ${run.agent_slug} vuole eseguire un'azione con effetti: ` +
      `${approval.azione.tool}.\n` +
      `Apri questo link per approvare, modificare o rifiutare: ${approvalsUrl()}\n\n` +
      `Il livello di autonomia va cambiato solo quando decidi tu.`,
  });
}
