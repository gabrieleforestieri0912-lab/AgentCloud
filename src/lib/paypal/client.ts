/**
 * PayPal REST client (server-only).
 * Secrets via PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET / PAYPAL_MODE (sandbox|live).
 * Mai esposto al browser — tutti i flow passano da /api/billing/paypal/*.
 */

function getBaseUrl(): string {
  const mode = (process.env.PAYPAL_MODE || "sandbox").toLowerCase();
  return mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

function getCredentials(): { id: string; secret: string } | null {
  const id = process.env.PAYPAL_CLIENT_ID || "";
  const secret = process.env.PAYPAL_CLIENT_SECRET || "";
  if (!id || !secret) return null;
  return { id, secret };
}

export function isPayPalConfigured(): boolean {
  return !!getCredentials();
}

export async function getPayPalAccessToken(): Promise<string> {
  const creds = getCredentials();
  if (!creds) throw new Error("PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET not configured");
  const basic = Buffer.from(`${creds.id}:${creds.secret}`).toString("base64");
  const res = await fetch(`${getBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const json = (await res.json().catch(() => ({}))) as { access_token?: string; error_description?: string };
  if (!res.ok || !json.access_token) throw new Error(json.error_description || "Failed to obtain PayPal access token");
  return json.access_token;
}

export async function createPayPalProduct(name: string, description: string): Promise<string> {
  const token = await getPayPalAccessToken();
  const res = await fetch(`${getBaseUrl()}/v1/catalogs/products`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name, description, type: "DIGITAL" }),
  });
  const json = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!res.ok || !json.id) throw new Error(json.message || "Failed to create PayPal product");
  return json.id;
}

export async function createPayPalBillingPlan(opts: {
  productId: string;
  name: string;
  description: string;
  priceCents: number;
  currency?: string;
}): Promise<string> {
  const token = await getPayPalAccessToken();
  const res = await fetch(`${getBaseUrl()}/v1/billing/plans`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      product_id: opts.productId,
      name: opts.name,
      description: opts.description,
      status: "ACTIVE",
      billing_cycles: [
        {
          frequency: { interval_unit: "MONTH", interval_count: 1 },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: { value: (opts.priceCents / 100).toFixed(2), currency_code: opts.currency || "EUR" },
          },
        },
      ],
      payment_preferences: { auto_bill_outstanding: true },
    }),
  });
  const json = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!res.ok || !json.id) throw new Error(json.message || "Failed to create PayPal billing plan");
  return json.id;
}

export async function createPayPalSubscription(opts: {
  planId: string;
  returnUrl: string;
  cancelUrl: string;
  customId: string;
}): Promise<{ id: string; approveUrl: string }> {
  const token = await getPayPalAccessToken();
  const res = await fetch(`${getBaseUrl()}/v1/billing/subscriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      plan_id: opts.planId,
      custom_id: opts.customId,
      application_context: {
        brand_name: "AgentCloud",
        return_url: opts.returnUrl,
        cancel_url: opts.cancelUrl,
        user_action: "SUBSCRIBE_NOW",
      },
    }),
  });
  const json = (await res.json().catch(() => ({}))) as { id?: string; links?: Array<{ rel: string; href: string }>; message?: string };
  if (!res.ok || !json.id) throw new Error(json.message || "Failed to create PayPal subscription");
  const approve = json.links?.find((l) => l.rel === "approve")?.href;
  if (!approve) throw new Error("No approve link in PayPal subscription response");
  return { id: json.id, approveUrl: approve };
}

export async function verifyPayPalWebhook(req: Request, rawBody: string): Promise<boolean> {
  // Best-effort verification via PayPal API. If PAYPAL_WEBHOOK_ID not set, skip verification (still process).
  const webhookId = process.env.PAYPAL_WEBHOOK_ID || "";
  if (!webhookId) return true;
  try {
    const token = await getPayPalAccessToken();
    const headers: Record<string, string> = {};
    req.headers.forEach((v, k) => (headers[k.toLowerCase()] = v));
    const res = await fetch(`${getBaseUrl()}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        transmission_id: headers["paypal-transmission-id"],
        transmission_time: headers["paypal-transmission-time"],
        cert_id: headers["paypal-cert-id"],
        auth_algo: headers["paypal-auth-algo"],
        transmission_sig: headers["paypal-transmission-sig"],
        webhook_id: webhookId,
        webhook_event: JSON.parse(rawBody),
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { verification_status?: string };
    return json.verification_status === "SUCCESS";
  } catch {
    return false;
  }
}
