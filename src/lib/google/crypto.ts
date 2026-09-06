import crypto from "crypto";

/**
 * Cifratura server-only dei token OAuth Google a riposo.
 *
 * Perché cifrare: i token danno accesso a Gmail/Calendar dell'utente: se il
 * database venisse esposto, un token in chiaro sarebbe un incidente di
 * sicurezza. access_token e refresh_token vengono cifrati con AES-256-GCM
 * prima di finire in `google_connections` (envelope jsonb { data, iv, tag })
 * — stesso meccanismo di shopify_connections. La chiave arriva da
 * GOOGLE_TOKEN_ENCRYPTION_KEY (server-only), con fallback su TENANT_STORE_KEY
 * per comodità. MAI loggare il token in chiaro.
 */

const ALGO = "aes-256-gcm";

function keyFromEnv(): Buffer {
  const k =
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY || process.env.TENANT_STORE_KEY;
  if (!k) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "GOOGLE_TOKEN_ENCRYPTION_KEY (or TENANT_STORE_KEY) is not set; token encryption will use an insecure dev key.",
      );
    }
    return crypto.createHash("sha256").update("dev-google-key").digest();
  }
  return crypto.createHash("sha256").update(k).digest();
}

export type GoogleTokenEnvelope = {
  data: string;
  iv: string;
  tag: string;
};

export function encryptGoogleToken(plain: string): GoogleTokenEnvelope {
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

export function decryptGoogleToken(
  envelope: GoogleTokenEnvelope,
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