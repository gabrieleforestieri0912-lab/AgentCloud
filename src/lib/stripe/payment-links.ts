/**
 * Stripe Payment Links utility
 *
 * Retrieves static payment links from environment variables.
 * Payment links are created once from Stripe Dashboard and stored as env vars.
 */

export function getPaymentLink(agentId: string): string | null {
  const envKey = `STRIPE_PAYMENT_LINK_${agentId.replace(/[^a-z0-9]/gi, "_").toUpperCase()}`;
  return process.env[envKey] || null;
}

export function getAllPaymentLinks(): Record<string, string> {
  const links: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith("STRIPE_PAYMENT_LINK_") && value) {
      const agentId = key
        .replace("STRIPE_PAYMENT_LINK_", "")
        .toLowerCase()
        .replace(/_/g, "-");
      links[agentId] = value;
    }
  }

  return links;
}

export function buildPaymentLinkUrl(
  agentId: string,
  options?: {
    userId?: string;
    email?: string;
    metadata?: Record<string, string>;
  },
): string | null {
  const baseLink = getPaymentLink(agentId);
  if (!baseLink) return null;

  const url = new URL(baseLink);

  if (options?.userId) {
    url.searchParams.set("client_reference_id", options.userId);
  }

  if (options?.email) {
    url.searchParams.set("prefilled_email", options.email);
  }

  // Add agent_id metadata
  url.searchParams.set("metadata[agent_id]", agentId);
  url.searchParams.set("metadata[source]", "agentcloud");

  // Add custom metadata
  if (options?.metadata) {
    for (const [key, value] of Object.entries(options.metadata)) {
      url.searchParams.set(`metadata[${key}]`, value);
    }
  }

  return url.toString();
}
