import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/supabase/server";
import { accountIdentityFromUser } from "@/lib/account-identity";
import { resolveIsAdmin } from "@/lib/admin-access";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import AccountClient from "./account-client";
import SettingsClient from "../settings/settings-client";
import SettingsShell from "@/components/SettingsShell";
import { listShopifyConnections } from "@/lib/shopify/connections";
import { getGoogleConnectionSummary } from "@/lib/google/connections";
import { createAdminClient } from "@/lib/supabase/admin";
import { KeyRound } from "lucide-react";

export default async function AccountPage() {
  const locale = await getLocale();

  const user = await getSessionUser();
  if (!user) redirect("/login");

  const email = user.email ?? "";
  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "";
  const firstName = fullName.split(" ")[0] || email.split("@")[0] || "Utente";
  const isAdmin = await resolveIsAdmin(user);
  const createdAt =
    (user as unknown as { created_at?: string })?.created_at ?? null;

  let plan: string | null = null;
  let shopifyShops: string[] = [];
  let googleEmail: string | null = null;

  const db = createAdminClient();
  if (db) {
    const { data: agents } = await db
      .from("user_agents")
      .select("agent_slug")
      .eq("user_id", user.id)
      .limit(1);
    plan = agents?.[0]?.agent_slug ?? null;
  }
  shopifyShops = (await listShopifyConnections(user.id).catch(() => []))
    .filter((c) => c.connected)
    .map((c) => c.shopDomain);
  const g = await getGoogleConnectionSummary(user.id).catch(() => null);
  googleEmail = g?.googleEmail ?? null;

  const dict = getDictionary(locale);

  return (
    <SettingsShell email={email} account={accountIdentityFromUser(user)}>
      <div>
        <h1 className="text-3xl font-bold text-white">
          {dict.accountPage.title}
        </h1>
        <p className="mt-2 text-neutral-400">
          {dict.accountPage.subtitle}
        </p>

        <AccountClient
          initialEmail={email}
          initialName={fullName}
          firstName={firstName}
          isAdmin={isAdmin}
          isMock={false}
          createdAt={createdAt}
          plan={plan}
          shopifyShops={shopifyShops}
          googleEmail={googleEmail}
          locale={locale}
        />

        <div className="mt-8 border-t border-white/5 pt-8">
          {/* Area riservata: la generazione di credenziali non è più inlinea */}
          <div id="developer" className="scroll-mt-24">
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6">
              <h3 className="flex items-center gap-2 text-lg font-bold text-amber-200">
                <KeyRound size={16} className="text-amber-400" />
                {dict.accountPage.apiAreaTitle}
              </h3>
              <p className="mt-2 text-sm text-amber-100/70">
                {dict.accountPage.apiAreaDesc}
              </p>
              <a
                href="/account/developer"
                className="mt-4 inline-flex rounded-full bg-amber-500 px-5 py-2.5 text-sm font-bold text-neutral-950 transition-colors hover:bg-amber-400"
              >
                {dict.accountPage.apiAreaOpen} →
              </a>
            </div>
          </div>

          {/* Preferenze: lingua, notifiche, aspetto, privacy e dati */}
          <div id="preferences" className="mt-8 scroll-mt-24">
            <SettingsClient isMock={false} email={email} />
          </div>
        </div>
      </div>
    </SettingsShell>
  );
}
