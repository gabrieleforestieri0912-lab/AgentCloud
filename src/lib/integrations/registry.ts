import type { SupportedProvider, IntegrationProvider } from "./types";
import { stripeProvider } from "./providers/stripe";
import { notionProvider } from "./providers/notion";
import { slackProvider } from "./providers/slack";
import { hubspotProvider } from "./providers/hubspot";
import { googleSheetsProvider } from "./providers/googleSheets";

const registry: Record<SupportedProvider, IntegrationProvider> = {
  stripe: stripeProvider,
  notion: notionProvider,
  slack: slackProvider,
  hubspot: hubspotProvider,
  google_sheets: googleSheetsProvider,
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
