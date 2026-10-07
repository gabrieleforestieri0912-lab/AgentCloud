import type { ImplementedProvider, IntegrationProvider } from "./types";
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
import { microsoftProvider } from "./providers/microsoft";

/**
 * Mappa adapter: `Record<ImplementedProvider, IntegrationProvider>` è
 * deliberatamente non opzionale, quindi se IMPLEMENTED_PROVIDERS cresce senza
 * un adapter corrispondente il typecheck fallisce. È il vincolo che rende
 * sicuro l'aggiornamento del catalogo.
 *
 * Si usa `ImplementedProvider` e non `SupportedProvider`: il catalogo dichiara
 * in anticipo anche i provider dei connettori futuri (scope, brand, guide) e
 * non possono stare in questa mappa finché non esistono.
 */
const registry: Record<ImplementedProvider, IntegrationProvider> = {
  notion: notionProvider,
  slack: slackProvider,
  hubspot: hubspotProvider,
  google_sheets: googleSheetsProvider,
  github: githubProvider,
  clickup: clickupProvider,
  asana: asanaProvider,
  google_drive: googleDriveProvider,
  airtable: airtableProvider,
  trello: trelloProvider,
  woocommerce: woocommerceProvider,
  mailchimp: mailchimpProvider,
  microsoft: microsoftProvider,
};

export function getProvider(provider: string): IntegrationProvider | null {
  if (!provider) return null;
  return (registry as Record<string, IntegrationProvider>)[provider] ?? null;
}

export function getRedirectUri(reqUrl: string, provider: ImplementedProvider): string {
  // Microsoft accetta di registrare un solo redirect: se MS_REDIRECT_URI è
  // impostato lo si usa, purché valga la pena. Auth e callback chiamano
  // entrambi questa funzione, quindi i due passi restano coerenti per
  // costruzione (un redirect_uri diverso fra authorize e token exchange fa
  // fallire lo scambio Microsoft con AADSTS50011).
  if (provider === "microsoft" && process.env.MS_REDIRECT_URI) {
    try {
      return new URL(process.env.MS_REDIRECT_URI).toString();
    } catch {
      // env malformato: si ricade sul calcolo sotto, che è sicuramente valido.
    }
  }
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
