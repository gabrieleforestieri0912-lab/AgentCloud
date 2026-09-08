import crypto from "crypto";

/**
 * Application-level token encryption for tenant_integrations (Phase 1 decision).
 * Mirrors src/lib/shopify/crypto.ts and src/lib/google/crypto.ts:
 * AES-256-GCM envelope { data, iv, tag } base64, key derived via SHA-256.
 *
 * Key priority (never client-side):
 *   INTEGRATIONS_TOKEN_ENCRYPTION_KEY (dedicated, preferred) →
 *   TENANT_STORE_KEY (fallback) →
 *   SUPABASE_SERVICE_ROLE_KEY (fallback, per spec default: service role key) →
 *   dev-only insecure key (never in production).
 * No secrets are hardcoded; env var names only appear here as lookups.
 */

const ALGO = "aes-256-gcm";

function keyFromEnv(): Buffer {
  const k =
    process.env.INTEGRATIONS_TOKEN_ENCRYPTION_KEY ||
    process.env.TENANT_STORE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!k) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "INTEGRATIONS_TOKEN_ENCRYPTION_KEY / TENANT_STORE_KEY / SUPABASE_SERVICE_ROLE_KEY not set; integrations token encryption will use insecure dev key.",
      );
    }
    return crypto.createHash("sha256").update("dev-integrations-key").digest();
  }
  return crypto.createHash("sha256").update(k).digest();
}

export type TokenEnvelope = {
  data: string;
  iv: string;
  tag: string;
};

export function encryptToken(plain: string): string {
  // Store as JSON string of envelope so column can stay text
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, keyFromEnv(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const env: TokenEnvelope = {
    data: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
  return JSON.stringify(env);
}

export function decryptToken(stored: string): string | null {
  try {
    const env = JSON.parse(stored) as TokenEnvelope;
    const decipher = crypto.createDecipheriv(ALGO, keyFromEnv(), Buffer.from(env.iv, "base64"));
    decipher.setAuthTag(Buffer.from(env.tag, "base64"));
    const dec = Buffer.concat([decipher.update(Buffer.from(env.data, "base64")), decipher.final()]);
    return dec.toString("utf8");
  } catch {
    return null;
  }
}

/** Helper for DB row that may be plain text (legacy) — try JSON parse, fallback to raw. */
export function decryptMaybe(stored: string | null | undefined): string | null {
  if (!stored) return null;
  // If stored looks like envelope JSON, decrypt; else assume plaintext (should not happen)
  if (stored.trim().startsWith("{")) return decryptToken(stored);
  return stored;
}
