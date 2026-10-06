import type { SupportedProvider, IntegrationProvider } from "./types";
import { notionProvider } from "./providers/notion";
import { slackProvider } from "./providers/slack";
import { hubspotProvider } from "./providers/hubspot";
import { googleSheetsProvider } from "./providers/googleSheets";
import { githubProvider } from "./providers/github";
import { clickupProvider } from "./providers/clickup";
import { asanaProvider } from "./providers/asana";
import { googleDriveProvider } from "./providers/googleDrive";
import { airtableProvider } from "./providers/airtable";
import { trelloProvider } from "./providers/trello";
import { woocommerceProvider } from "./providers/woocommerce";
import { mailchimpProvider } from "./providers/mailchimp";

/**
 * Mappa adapter: `Record<SupportedProvider, IntegrationProvider>` è deliberatamente
 * non opzionale, quindi se PROVIDER_CATALOG cresce senza un adapter corrispondente
 * il typecheck fallisce. È il vincolo che rende sicuro il catalogo unico.
 */
const registry: Record<SupportedProvider, IntegrationProvider> = {
  notion: notionProvider,
  slack: slackProvider,
  hubspot: hubspotProvider,
  google_sheets: googleSheetsProvider,
  github: githubProvider,
  clickup: clickupProvider,
  asana: asanaProvider,
  // Batch 2: gli adapter arrivano nella Fase 3, uno per commit.
  google_drive: googleDriveProvider,
  airtable: airtableProvider,
  trello: trelloProvider,
  woocommerce: woocommerceProvider,
  mailchimp: mailchimpProvider,
};

export function getProvider(provider: string): IntegrationProvider | null {
  if (!provider) return null;
  return (registry as Record<string, IntegrationProvider>)[provider] ?? null;
}

export function getRedirectUri(reqUrl: string, provider: SupportedProvider): string {
  // Prefer env NEXT_PUBLIC_SITE_URL / NEXT_PUBLIC_URL (prod), fallback to request origin.
  const base = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_URL;
  if (base) {
    try {
      const u = new URL(base);
      return `${u.origin}/api/integrations/${provider}/callback`;
    } catch {
      // fall through
    }
  }
  const url = new URL(reqUrl);
  return `${url.origin}/api/integrations/${provider}/callback`;
}
