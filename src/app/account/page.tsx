import { redirect } from "next/navigation";

// Pagina account: guscio server che applica i controlli di accesso (sessione
// Supabase + codice di accesso) e delega il rendering interattivo al client
// (AccountClient), passando solo i dati già autorizzati.

import { getSessionUser } from "@/lib/supabase/server";
import { hasPlatformAccess } from "@/lib/access-code";
import { isAdminEmail } from "@/lib/admin-access";
import { getLocale } from "@/lib/i18n/locale";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AccountClient from "./account-client";
import SettingsClient from "../settings/settings-client";
import { listShopifyConnections } from "@/lib/shopify/connections";
import { getGoogleConnectionSummary, TENANT_GOOGLE_ID } from "@/lib/google/connections";
import { createAdminClient } from "@/lib/supabase/admin";
import { TENANT_SHOPIFY_ID } from "@/lib/shopify/connections";

export default async function AccountPage() {
  const locale = await getLocale();
  const isIt = locale === "it";

  const user = await getSessionUser();
  const hasAccess = await hasPlatformAccess();
  if (!user && !hasAccess) redirect("/login");

  const isMock = !user && hasAccess;
  const email = isMock ? "admin@agentcloud.agency" : (user?.email ?? "");
  const fullName = isMock
    ? "Admin"
    : typeof user?.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "";
  const firstName = isMock ? "Admin" : fullName.split(" ")[0] || email.split("@")[0] || "Utente";
  const isAdmin = isMock || isAdminEmail(user?.email);
  const createdAt = isMock ? new Date().toISOString() : (user as unknown as { created_at?: string })?.created_at ?? null;

  // Carica dati reali solo per utenti reali, non per l'admin simulato
  // (nessuna scrittura sul DB)
  let plan: string | null = null;
  let shopifyShops: string[] = [];
  let googleEmail: string | null = null;
  if (!isMock && user) {
    const db = createAdminClient();
    if (db) {
      const { data: agents } = await db.from("user_agents").select("agent_slug").eq("user_id", user.id).limit(1);
      plan = agents?.[0]?.agent_slug ?? null;
    }
    shopifyShops = (await listShopifyConnections(user.id).catch(() => [])).filter((c) => c.connected).map((c) => c.shopDomain);
    const g = await getGoogleConnectionSummary(user.id).catch(() => null);
    googleEmail = g?.googleEmail ?? null;
  } else if (isMock) {
    const shops = await listShopifyConnections(TENANT_SHOPIFY_ID).catch(() => []);
    shopifyShops = shops.filter((c) => c.connected).map((c) => c.shopDomain);
    const g = await getGoogleConnectionSummary(TENANT_GOOGLE_ID).catch(() => null);
    googleEmail = g?.googleEmail ?? null;
  }

  return (
    <main className="min-h-screen bg-neutral-950">
      <Navbar />
      <section className="px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white">{isIt ? "Account" : "Account"}</h1>
            <p className="mt-2 text-neutral-400">
              {isIt ? "Gestisci il tuo profilo, piano e connessioni." : "Manage your profile, plan and connections."}
            </p>
          </div>



          <AccountClient
            initialEmail={email}
            initialName={fullName}
            firstName={firstName}
            isAdmin={isAdmin}
            isMock={isMock}
            createdAt={createdAt}
            plan={plan}
            shopifyShops={shopifyShops}
            googleEmail={googleEmail}
            locale={locale}
          />

          <div className="mt-8 border-t border-white/5 pt-8">
            <h2 className="text-2xl font-bold text-white mb-6">{isIt ? "Impostazioni" : "Settings"}</h2>
            <SettingsClient isMock={isMock} email={email} />
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
