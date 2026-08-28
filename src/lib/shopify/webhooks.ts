import { getShopifyWebhookAddress } from "./oauth";

/**
 * Register the mandatory Shopify webhooks for a freshly authorized shop.
 *
 * Shopify requires `APP_UNINSTALLED` plus the three GDPR topics
 * (`CUSTOMERS_DATA_REQUEST`, `CUSTOMERS_REDACT`, `SHOP_REDACT`) to be
 * subscribed. These topics need no extra OAuth scope, so registration with the
 * just-exchanged token always succeeds. Failures are non-fatal (the app can
 * also register them from the Partner Dashboard) — we log and continue.
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
