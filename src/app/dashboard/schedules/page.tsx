import { redirect } from "next/navigation";
import { getSessionUser, createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/DashboardShell";
import SchedulesManager, { type ScheduleCard, type AgentOption } from "@/components/SchedulesManager";
import { accountIdentityFromUser } from "@/lib/account-identity";
import { AGENTS, localizeAgent } from "@/lib/agents";
import { nextRuns } from "@/lib/agents/cron";
import { getLocale } from "@/lib/i18n/locale";
import type { AgentScheduleRow } from "@/types/agents-db";

/**
 * Pagina Pianificazione (Fase 3): gli agenti eseguono da soli, a orari
 * programmati, con le stesse istruzioni catturate ogni scatto. Server
 * component: carica schedule + agenti posseduti e calcola l'anteprima delle
 * prossime esecuzioni con lo stesso modulo usato dallo scheduler.
 */
export default async function SchedulesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const locale = await getLocale();
  const client = await createClient();
  const [scheduleRows, ownedRows] = await Promise.all([
    client
      .from("agent_schedules")
      .select("*")
      .eq("tenant_id", user.id)
      .order("created_at", { ascending: false }),
    client
      .from("user_agents")
      .select("agent_slug, status")
      .eq("user_id", user.id)
      .eq("status", "active"),
  ]);

  const schedules: ScheduleCard[] = ((scheduleRows.data ?? []) as AgentScheduleRow[]).map(
    (row) => {
      let upcoming: string[] = [];
      try {
        upcoming = nextRuns(row.cron, row.timezone, 5);
      } catch {
        // cron non interpretabile: l'anteprima resta vuota (il badge di
        // stato del form lo mostrerà come invalido al prossimo edit).
      }
      return { ...row, upcoming };
    },
  );

  const ownedAgents: AgentOption[] = (ownedRows.data ?? [])
    .map((row) => {
      const slug = String(row.agent_slug);
      const catalog = AGENTS.find((a) => a.slug === slug);
      return {
        slug,
        name: catalog ? localizeAgent(catalog, locale).shortName : slug,
      };
    })
    .filter((option, index, list): option is AgentOption =>
      list.findIndex((o) => o.slug === option.slug) === index,
    );

  const email = user?.email ?? "";

  return (
    <DashboardShell email={email} account={accountIdentityFromUser(user)}>
      <SchedulesManager schedules={schedules} agents={ownedAgents} />
    </DashboardShell>
  );
}
