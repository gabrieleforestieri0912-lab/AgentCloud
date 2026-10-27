/**
 * Email di pausa automatica di uno schedule dopo fallimenti consecutivi
 * (Fase 7) — best-effort: se Resend manca, resta la pausa (già persistita).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { getResend } from "@/lib/resend";
import { maskSecrets } from "./mask";
import { siteOrigin } from "./approval-email";

type Params = {
  userId: string;
  scheduleName: string;
  agentSlug: string;
  failures: number;
  errore: string | null;
};

export async function sendSchedulePausedEmail(params: Params): Promise<void> {
  const client = createAdminClient();
  if (!client) return;
  if (!process.env.RESEND_API_KEY) return;
  try {
    const { data } = await client
      .from("profiles")
      .select("email")
      .eq("id", params.userId)
      .maybeSingle();
    const email = data?.email;
    if (!email) return;

    const detail = params.errore
      ? maskSecrets(params.errore).slice(0, 500)
      : "errore non registrato";
    const from = process.env.QUOTE_FROM_EMAIL || "notifiche@agentcloud.agency";
    await getResend().emails.send({
      from,
      to: email,
      subject: `AgentCloud: piano "${params.scheduleName}" messo in pausa (${params.failures} fallimenti)`,
      text:
        `L'agente ${params.agentSlug} ha fallito ${params.failures} esecuzioni di fila ` +
        `per "${params.scheduleName}": il piano è stato messo in pausa automaticamente.\n\n` +
        `Ultimo errore: ${detail}\n\n` +
        `Verifica l'errore nel Replay (${siteOrigin()}/dashboard/runs), correggi ` +
        `l'istruzione o le connessioni, poi riattiva il piano dalla pagina di pianificazione.`,
    });
  } catch {
    // best-effort
  }
}
