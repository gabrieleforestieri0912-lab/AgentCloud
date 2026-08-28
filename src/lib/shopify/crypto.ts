import crypto from "crypto";

/**
 * Server-only encryption for Shopify access tokens at rest.
 *
 * Tokens are encrypted with AES-256-GCM before being written to
 * `shopify_connections.access_token` (jsonb envelope { data, iv, tag }).
 * The key comes from SHOPIFY_TOKEN_ENCRYPTION_KEY (server-only), falling back
 * to TENANT_STORE_KEY for convenience. NEVER log the plaintext token.
 */

const ALGO = "aes-256-gcm";

function keyFromEnv(): Buffer {
  const k =
    process.env.SHOPIFY_TOKEN_ENCRYPTION_KEY || process.env.TENANT_STORE_KEY;
  if (!k) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "SHOPIFY_TOKEN_ENCRYPTION_KEY (or TENANT_STORE_KEY) is not set; token encryption will use an insecure dev key.",
      );
    }
    return crypto.createHash("sha256").update("dev-shopify-key").digest();
  }
  return crypto.createHash("sha256").update(k).digest();
}

export type ShopifyTokenEnvelope = {
  data: string;
  iv: string;
  tag: string;
};

export function encryptShopifyToken(plain: string): ShopifyTokenEnvelope {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, keyFromEnv(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return {
    data: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

export function decryptShopifyToken(
  envelope: ShopifyTokenEnvelope,
): string | null {
  try {
    const decipher = crypto.createDecipheriv(
      ALGO,
      keyFromEnv(),
      Buffer.from(envelope.iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(envelope.data, "base64")),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}
