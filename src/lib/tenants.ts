/**
 * Store multi-tenant locale (JSON cifrato) per le credenziali dei test tenant.
 *
 * Come funziona: i token OAuth (Google/Shopify) dei tenant senza account
 * Supabase vengono salvati in `data/tenants.json` CIFRATI con AES-256-GCM.
 * La chiave deriva da `TENANT_STORE_KEY` (in produzione va impostata, altrimenti
 * si usa "dev-tenant-key"). Cifrare i token è obbligatorio: il file è su disco
 * e non deve mai contenere segreti in chiaro. Server-only (usa fs/crypto).
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";

export type TenantCredentials = {
  id: string;
  google?: { calendarId?: string; accessToken?: string; refreshToken?: string };
  shopify?: { shopDomain?: string; accessToken?: string };
};

const STORE_PATH = path.join(process.cwd(), "data", "tenants.json");

function keyFromEnv() {
  const k = process.env.TENANT_STORE_KEY || "dev-tenant-key";
  return crypto.createHash("sha256").update(k).digest();
}

function encrypt(text: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyFromEnv(), iv);
  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return {
    data: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

function decrypt(obj: { data: string; iv: string; tag: string }) {
  try {
    const iv = Buffer.from(obj.iv, "base64");
    const tag = Buffer.from(obj.tag, "base64");
    const decipher = crypto.createDecipheriv("aes-256-gcm", keyFromEnv(), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(obj.data, "base64")),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    return "";
  }
}

type StoredTenant = {
  id: string;
  google?: {
    calendarId?: string;
    accessToken?: { data: string; iv: string; tag: string };
    refreshToken?: { data: string; iv: string; tag: string };
  };
  shopify?: {
    shopDomain?: string;
    accessToken?: { data: string; iv: string; tag: string };
  };
};

function readStore(): Record<string, StoredTenant> {
  try {
    if (!fs.existsSync(STORE_PATH)) return {};
    const raw = fs.readFileSync(STORE_PATH, "utf8");
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, StoredTenant>) {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), {
      encoding: "utf8",
    });
  } catch {
    // ignora: la scrittura del file non deve mai rompere il flusso di login
  }
}

export function registerTenant(creds: TenantCredentials) {
  const store = readStore();
  const s: StoredTenant = { id: creds.id };
  if (creds.google) {
    s.google = { calendarId: creds.google.calendarId };
    if (creds.google.refreshToken)
      s.google.refreshToken = encrypt(creds.google.refreshToken);
    if (creds.google.accessToken)
      s.google.accessToken = encrypt(creds.google.accessToken);
  }
  if (creds.shopify) {
    s.shopify = { shopDomain: creds.shopify.shopDomain };
    if (creds.shopify.accessToken)
      s.shopify.accessToken = encrypt(creds.shopify.accessToken);
  }
  store[creds.id] = s;
  writeStore(store);
}

export function getTenantCredentials(
  tenantId: string,
): TenantCredentials | undefined {
  const store = readStore();
  const s = store[tenantId];
  if (!s) return undefined;
  const out: TenantCredentials = { id: s.id };
  if (s.google) {
    const g: NonNullable<TenantCredentials["google"]> = {
      calendarId: s.google.calendarId || undefined,
    };
    if (s.google.accessToken) g.accessToken = decrypt(s.google.accessToken);
    if (s.google.refreshToken) g.refreshToken = decrypt(s.google.refreshToken);
    out.google = g;
  }
  if (s.shopify) {
    const sh: NonNullable<TenantCredentials["shopify"]> = {
      shopDomain: s.shopify.shopDomain || undefined,
    };
    if (s.shopify.accessToken) sh.accessToken = decrypt(s.shopify.accessToken);
    out.shopify = sh;
  }
  return out;
}

export function updateTenantGoogleTokens(
  tenantId: string,
  accessToken?: string,
  refreshToken?: string,
) {
  const store = readStore();
  const s = store[tenantId] || { id: tenantId };
  s.google = s.google || {};
  if (accessToken) s.google.accessToken = encrypt(accessToken);
  if (refreshToken) s.google.refreshToken = encrypt(refreshToken);
  store[tenantId] = s;
  writeStore(store);
}

export function updateTenantShopifyCredentials(
  tenantId: string,
  shopDomain?: string,
  accessToken?: string,
) {
  const store = readStore();
  const s = store[tenantId] || { id: tenantId };
  s.shopify = s.shopify || {};
  if (shopDomain) s.shopify.shopDomain = shopDomain;
  if (accessToken) s.shopify.accessToken = encrypt(accessToken);
  store[tenantId] = s;
  writeStore(store);
}

/**
 * Cancella tutte le credenziali e i dati di un tenant (conformità GDPR / offboarding).
 */
export function deleteTenant(tenantId: string): boolean {
  const store = readStore();
  if (!store[tenantId]) return false;
  delete store[tenantId];
  writeStore(store);
  return true;
}

/**
 * Genera una API key del widget firmata crittograficamente per un tenant.
 *
 * Perché firmata: l'endpoint embed deve riconoscere in modo affidabile chi
 * chiama (qual è il tenantId). La chiave non è sequenziale: contiene un nonce
 * casuale e una firma HMAC, quindi non è indovinabile né falsificabile senza
 * conoscere `TENANT_STORE_KEY`.
 */
export function generateTenantApiKey(tenantId: string): string {
  const nonce = crypto.randomBytes(16).toString("hex");
  const payload = `${tenantId}:${nonce}`;
  const signature = crypto
    .createHmac("sha256", keyFromEnv())
    .update(payload)
    .digest("hex")
    .slice(0, 32);
  return `ac_${Buffer.from(payload).toString("base64url")}_${signature}`;
}

/**
 * Verifica una API key del widget ed estrae il tenantId autenticato.
 *
 * La verifica ricalcola l'HMAC e confronta le firme con `timingSafeEqual`
 * (confronto a tempo costante, per non rivelare informazioni via timing).
 */
export function verifyTenantApiKey(
  apiKey: string,
): { valid: boolean; tenantId?: string } {
  if (!apiKey || !apiKey.startsWith("ac_")) {
    return { valid: false };
  }

  try {
    const parts = apiKey.slice(3).split("_");
    if (parts.length !== 2) return { valid: false };

    const [b64Payload, signature] = parts;
    const payload = Buffer.from(b64Payload, "base64url").toString("utf8");
    const [tenantId] = payload.split(":");

    if (!tenantId) return { valid: false };

    const expectedSig = crypto
      .createHmac("sha256", keyFromEnv())
      .update(payload)
      .digest("hex")
      .slice(0, 32);

    const match = crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSig, "hex"),
    );

    return match ? { valid: true, tenantId } : { valid: false };
  } catch {
    return { valid: false };
  }
}

