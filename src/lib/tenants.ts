import fs from "fs";
import path from "path";
import crypto from "crypto";

export type TenantCredentials = {
  id: string;
  google?: { calendarId: string; accessToken?: string; refreshToken?: string };
  shopify?: { shopDomain: string; accessToken: string };
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
  } catch (e) {
    // ignore
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
    const g: any = { calendarId: s.google.calendarId || undefined };
    if (s.google.accessToken) g.accessToken = decrypt(s.google.accessToken);
    if (s.google.refreshToken) g.refreshToken = decrypt(s.google.refreshToken);
    out.google = g;
  }
  if (s.shopify) {
    const sh: any = { shopDomain: s.shopify.shopDomain || undefined };
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
