import type { Metadata } from "next";

import DashboardShell from "@/components/DashboardShell";
import ConnectAppsPanel from "@/components/ConnectAppsPanel";
import { accountIdentityFromUser } from "@/lib/account-identity";
import { describeMcpServers } from "@/lib/mcp/describe";
import { getLocale } from "@/lib/i18n/locale";
import { getMcpAppsCopy } from "@/lib/i18n/mcpApps";
import { getSessionUser } from "@/lib/supabase/server";

/**
 * /dashboard/apps — la pagina "Connetti app".
 *
 * Elenca le integrazioni (server MCP remoti, server MCP personalizzati e
 * connettori nativi) con lo stato per l'utente corrente.
 *
 * La pagina è un server component: i dati arrivano già filtrati per utente
 * e nessun segreto viene mai serializzato nel payload.
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const copy = getMcpAppsCopy(locale);
  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
  };
}

export default async function DashboardAppsPage({
  searchParams,
}: {
  searchParams: Promise<{ app?: string; status?: string; reason?: string }>;
}) {
  const locale = await getLocale();
  const copy = getMcpAppsCopy(locale);
  const sp = await searchParams;

  const user = await getSessionUser();
  const servers = user ? await describeMcpServers(user.id) : [];

  return (
    <DashboardShell email={user?.email ?? ""} account={accountIdentityFromUser(user)}>
      <section className="px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl 3xl:max-w-[1720px]">
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight text-white">{copy.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">
              {copy.subtitle}
            </p>
          </div>

          {sp.status && (
            <div
              className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
                sp.status === "connected"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : sp.status === "error"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                    : "border-white/10 bg-white/5 text-neutral-300"
              }`}
            >
              {sp.app ? `${sp.app}: ` : ""}
              {sp.status === "connected"
                ? copy.successConnected
                : sp.status === "error"
                  ? `${copy.errorGeneric}${sp.reason ? ` (${sp.reason})` : ""}`
                  : sp.status}
            </div>
          )}

          <ConnectAppsPanel servers={servers} locale={locale} />
        </div>
      </section>
    </DashboardShell>
  );
}
