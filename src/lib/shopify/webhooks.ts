import { getShopifyWebhookAddress } from "./oauth";

/**
 * Registra i webhook Shopify obbligatori per un negozio appena autorizzato.
 *
 * Perché: Shopify richiede la sottoscrizione di `APP_UNINSTALLED` più i tre
 * topic GDPR (`CUSTOMERS_DATA_REQUEST`, `CUSTOMERS_REDACT`, `SHOP_REDACT`).
 * Questi topic non richiedono scope OAuth extra, quindi la registrazione col
 * token appena scambiato riesce sempre. Gli errori non sono fatali (l'app può
 * registrarli anche dal Partner Dashboard) — logghiamo e si continua.
 */

const SHOPIFY_WEBHOOK_TOPICS = [
  "APP_UNINSTALLED",
  "CUSTOMERS_DATA_REQUEST",
  "CUSTOMERS_REDACT",
  "SHOP_REDACT",
] as const;

export async function registerShopifyWebhooks(
  shopDomain: string,
  accessToken: string,
): Promise<void> {
  const callbackUrl = getShopifyWebhookAddress();
  for (const topic of SHOPIFY_WEBHOOK_TOPICS) {
    try {
      const res = await fetch(
        `https://${shopDomain}/admin/api/2024-10/graphql.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": accessToken,
          },
          body: JSON.stringify({
            query: `
              mutation webhookSubscriptionCreate(
                $topic: WebhookSubscriptionTopic!
                $webhookSubscription: WebhookSubscriptionInput!
              ) {
                webhookSubscriptionCreate(
                  topic: $topic
                  webhookSubscription: $webhookSubscription
                ) {
                  webhookSubscription { id }
                  userErrors { field message }
                }
              }
            `,
            variables: {
              topic,
              webhookSubscription: { callbackUrl, format: "JSON" },
            },
          }),
        },
      );
      if (!res.ok) {
        console.error(
          `Shopify webhook ${topic} registration failed: ${res.status}`,
        );
        continue;
      }
      const json = await res.json();
      const errs = json?.data?.webhookSubscriptionCreate?.userErrors;
      if (errs?.length) {
        console.error(`Shopify webhook ${topic} userErrors:`, errs);
      }
    } catch (e) {
      console.error(
        `Shopify webhook ${topic} registration error:`,
        e instanceof Error ? e.message : String(e),
      );
    }
  }
}
