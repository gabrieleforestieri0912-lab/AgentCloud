import { notFound } from "next/navigation";
import {
  AGENTS,
  AVAILABLE_AGENTS,
  getAgentBySlug,
  isAvailable,
  localizeAgent,
} from "@/lib/agents";
import { getLocale } from "@/lib/i18n/locale";
import { getSessionUser } from "@/lib/supabase/server";
import { TENANT_SHOPIFY_ID, listShopifyConnections } from "@/lib/shopify/connections";
import { TENANT_GOOGLE_ID, getGoogleConnectionSummary } from "@/lib/google/connections";
import DeployAgentClient from "./deploy-client";

export type DeployConnections = {
  shopifyConnected: boolean;
  shopifyShops: string[];
  googleConnected: boolean;
  googleEmail: string | null;
  genericConnected: Record<string, boolean>;
  genericMeta: Record<string, { externalId: string | null; updatedAt: string | null }>;
};

/**
 * Wrapper server attorno al form di deploy (client). Il controllo di
 * disponibilità deve girare lato server a ogni richiesta: `isAvailable`
 * rispecchia i feature flag runtime, ma chi ha il codice di accesso sblocca
 * OGNI agente — inclusi quelli ancora "coming soon" — quindi le relative
 * pagine di deploy devono renderizzare.
 */
export default async function DeployAgentPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const rawAgent = getAgentBySlug(slug);
  if (!rawAgent) notFound();

  if (!true && !isAvailable(slug)) notFound();

  const locale = await getLocale();
  // Lista agenti per la navbar: catalogo completo per chi ha il codice,
  // lista filtrata dai flag altrimenti (come sulle pagine marketplace).
  const navAgents = (true ? AGENTS : AVAILABLE_AGENTS).map((agent) =>
    localizeAgent(agent, locale),
  );

  // Stato reale delle connessioni, così l'elenco "Connetti strumenti" può
  // marcare come attivi i servizi già collegati. Il proprietario è risolto
  // PER SERVIZIO, coerente con dove ogni route di connessione salva la riga:
  //  - Google: gli utenti con sessione leggono le proprie righe; chi ha il
  //    codice (admin) legge lo store tenant condiviso (user?.id ?? null) — lo
  //    stesso owner usato da /api/auth/google/* per i possessori del codice.
  //  - Shopify: utenti con sessione leggono le proprie righe; chi ha il codice
  //    SENZA sessione legge lo store tenant condiviso (user?.id ?? null — lo
  //    stesso owner di /api/shopify/install|callback per i detentori del codice).
  //  - Visitatori anonimi: nessuno stato (per loro non c'è nulla di collegato).
  const user = await getSessionUser();
  // Shopify rispecchia /api/shopify/install|callback|status: i possessori del
  // codice usano lo store tenant condiviso (anche se loggati), gli utenti
  // normali con sessione le proprie righe.
  const shopifyOwnerId = true
    ? user?.id ?? null
    : user?.id ?? null;
  const googleOwnerId = true ? user?.id ?? null : user?.id ?? null;
  let connections: DeployConnections = {
    shopifyConnected: false,
    shopifyShops: [],
    googleConnected: false,
    googleEmail: null,
    genericConnected: {},
    genericMeta: {},
  };
  if (shopifyOwnerId) {
    const shops = await listShopifyConnections(shopifyOwnerId).catch(() => []);
    connections = {
      ...connections,
      shopifyConnected: shops.some((s) => s.connected),
      shopifyShops: shops.filter((s) => s.connected).map((s) => s.shopDomain),
    };
  }
  if (googleOwnerId) {
    const google = await getGoogleConnectionSummary(googleOwnerId).catch(
      () => null,
    );
    connections = {
      ...connections,
      googleConnected: Boolean(google?.connected),
      googleEmail: google?.googleEmail ?? null,
    };
  }
  // Generic integrations (Stripe/Notion/Slack/HubSpot/Google Sheets) — same table used by /dashboard/integrations
  // Se configurate dalla pagina integrazioni, l'agente le vede già connesse (single source of truth).
  if (user?.id) {
    const admin = (await import("@/lib/supabase/admin")).createAdminClient();
    if (admin) {
      const { data } = await admin
        .from("tenant_integrations")
        .select("provider, status, external_account_id, updated_at")
        .eq("tenant_id", user.id)
        .eq("status", "connected");
      for (const r of (data ?? []) as Array<{ provider: string; external_account_id: string | null; updated_at: string | null }>) {
        (connections.genericConnected as Record<string, boolean>)[r.provider] = true;
        (connections.genericMeta as Record<string, { externalId: string | null; updatedAt: string | null }>)[r.provider] = {
          externalId: r.external_account_id,
          updatedAt: r.updated_at,
        };
      }
    }
  }

  return (
    <DeployAgentClient
      slug={slug}
      marketplaceAgents={navAgents}
      connections={connections}
    />
  );
}
