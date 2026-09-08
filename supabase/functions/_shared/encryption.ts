// Shared token encryption helper for Edge Functions (Deno).
// Compatible with src/lib/integrations/encryption.ts (Node AES-256-GCM envelope {data,iv,tag} base64).
// Key: SHA-256 of INTEGRATIONS_TOKEN_ENCRYPTION_KEY || TENANT_STORE_KEY || SUPABASE_SERVICE_ROLE_KEY

async function keyBytes(): Promise<CryptoKey> {
  const raw =
    Deno.env.get("INTEGRATIONS_TOKEN_ENCRYPTION_KEY") ||
    Deno.env.get("TENANT_STORE_KEY") ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
    "dev-integrations-key";
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export type TokenEnvelope = { data: string; iv: string; tag: string };

function b64decode(s: string): Uint8Array {
  // handle base64 (not base64url) — envelope is base64
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
function b64encode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export async function encryptToken(plain: string): Promise<string> {
  const key = await keyBytes();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain));
  // WebCrypto returns ciphertext + tag concatenated; we split last 16 bytes as tag
  const buf = new Uint8Array(enc);
  const tag = buf.slice(buf.length - 16);
  const data = buf.slice(0, buf.length - 16);
  const env: TokenEnvelope = { data: b64encode(data), iv: b64encode(iv), tag: b64encode(tag) };
  return JSON.stringify(env);
}

export async function decryptToken(stored: string): Promise<string | null> {
  try {
    const env = JSON.parse(stored) as TokenEnvelope;
    const key = await keyBytes();
    const iv = b64decode(env.iv);
    const data = b64decode(env.data);
    const tag = b64decode(env.tag);
    const combined = new Uint8Array(data.length + tag.length);
    combined.set(data, 0);
    combined.set(tag, data.length);
    const dec = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, combined);
    return new TextDecoder().decode(dec);
  } catch {
    return null;
  }
}

export async function decryptMaybe(stored: string | null | undefined): Promise<string | null> {
  if (!stored) return null;
  if (stored.trim().startsWith("{")) return decryptToken(stored);
  return stored;
}
