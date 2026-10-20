/**
 * Autenticazione della CLI (`agentcloud`) via sito: firma HMAC dei "code"
 * usa-e-getta (login browser PKCE) e registro in memoria dei device code
 * (fallback SSH/headless).
 *
 * Perché così: i token Supabase dell'utente NON vengono mai salvati su
 * disco lato server né passati in chiaro nell'URL del redirect locale.
 * Il `code` è un envelope firmato (HMAC-SHA256) che contiene i token,
 * scadente in 2 minuti, e la POST /api/cli/token li consegna solo a chi
 * possiede il code_verifier corrispondente alla challenge incapsulata.
 * L'in-memory device store richiede istanza singola (o sticky
 * routing): timestamp di creazione e scadenza servono anche a pulizia.
 *
 * Solo Web Crypto (subtle + getRandomValues), come src/lib/supabase/pat.ts.
 */

const ENVELOPE_VERSION = "v1";
/** Lifetime del code: il round-trip browser→CLI è istantaneo, 2 min bastano. */
export const CODE_TTL_SECONDS = 120;

export type CliCodePayload = {
  v: string;
  /** Supabase access token. */
  at: string;
  /** Supabase refresh token (richiesto per rinnovare la sessione della CLI). */
  rt: string;
  /** PKCE code_challenge (S256) del client che ha aperto il login. */
  ch: string;
  /** Email dell'utente (per "Accesso effettuato come <email>"). */
  em?: string;
  /** Porta locale del callback (127.0.0.1:port) — validata prima della firma. */
  p: number;
  /** Identificativo usa-e-getta. */
  jti: string;
  /** Scadenza (secondi da epoch). */
  exp: number;
};

function secret(): string {
  return (
    process.env.AGENTCLOUD_CLI_SECRET ||
    process.env.INTEGRATIONS_STATE_SECRET ||
    ""
  );
}

async function hmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function b64urlEncode(json: string): string {
  return Buffer.from(json, "utf8").toString("base64url");
}

function b64urlDecode(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

/** Crea il `code` firmato (usa-e-getta) per il flusso browser→CLI. */
export async function signCliCode(payload: Omit<CliCodePayload, "v" | "exp">): Promise<string> {
  const full: CliCodePayload = {
    ...payload,
    v: ENVELOPE_VERSION,
    exp: Math.floor(Date.now() / 1000) + CODE_TTL_SECONDS,
  };
  const body = b64urlEncode(JSON.stringify(full));
  const mac = await hmac(body);
  return `${body}.${mac}`;
}

export type CodeVerifyResult =
  | { ok: true; payload: CliCodePayload }
  | { ok: false; error: "invalid" | "expired" | "misconfigured" };

/** Verifica firma + scadenza; il controllo PKCE resta al chiamante. */
export async function verifyCliCode(code: string): Promise<CodeVerifyResult> {
  if (!secret()) return { ok: false, error: "misconfigured" };
  const dot = code.lastIndexOf(".");
  if (dot <= 0) return { ok: false, error: "invalid" };
  const body = code.slice(0, dot);
  const mac = code.slice(dot + 1);
  const expected = await hmac(body);
  if (mac.length !== expected.length) return { ok: false, error: "invalid" };
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ mac.charCodeAt(i);
  }
  if (mismatch !== 0) return { ok: false, error: "invalid" };
  try {
    const payload = JSON.parse(b64urlDecode(body)) as CliCodePayload;
    if (payload.v !== ENVELOPE_VERSION) return { ok: false, error: "invalid" };
    if (!payload.at || !payload.ch) return { ok: false, error: "invalid" };
    if (payload.exp < Math.floor(Date.now() / 1000)) return { ok: false, error: "expired" };
    return { ok: true, payload };
  } catch {
    return { ok: false, error: "invalid" };
  }
}

/* ------------------------------------------------------------------ *
 * PKCE S256 (RFC 7636) lato server: il verifier della CLI vs challenge.
 * ------------------------------------------------------------------ */

export async function s256Challenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  const bytes = new Uint8Array(digest);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function verifyPkce(verifier: string, challenge: string): Promise<boolean> {
  if (!verifier || !challenge || verifier.length < 43 || verifier.length > 128) return false;
  return (await s256Challenge(verifier)) === challenge;
}

/* ------------------------------------------------------------------ *
 * Device store (fallback SSH/headless).
 * In memoria + TTL: sufficiente per una istanza (Vercel fluid compute);
 * su multi-istanza serve una tabella Supabase (vedi "Resta da fare").
 * ------------------------------------------------------------------ */

export type DeviceGrant = {
  deviceCode: string;
  userCode: string;
  status: "pending" | "approved" | "expired";
  // Token consegnati SOLO al poll dopo approvazione, poi cancellati.
  tokens?: { access_token: string; refresh_token?: string; email?: string };
  createdAt: number;
  expiresAt: number;
};

const DEVICE_TTL_MS = 10 * 60 * 1000;

const deviceStore = ((): Map<string, DeviceGrant> => {
  const g = globalThis as { __agentcloudDeviceStore?: Map<string, DeviceGrant> };
  if (!g.__agentcloudDeviceStore) g.__agentcloudDeviceStore = new Map();
  return g.__agentcloudDeviceStore;
})();

function randomCode(len: number, separators = false): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // senza I/O/0/1
  let out = "";
  const values = crypto.getRandomValues(new Uint8Array(len));
  for (let i = 0; i < len; i++) {
    out += alphabet[values[i] % alphabet.length];
    if (separators && i === Math.ceil(len / 2) - 1) out += "-";
  }
  return out;
}

/** Nuovo device grant: pending, il sito lo approverà via /device. */
export function createDeviceGrant(): DeviceGrant {
  pruneDevices();
  const now = Date.now();
  const grant: DeviceGrant = {
    deviceCode: randomCode(40),
    userCode: randomCode(8, true),
    status: "pending",
    createdAt: now,
    expiresAt: now + DEVICE_TTL_MS,
  };
  deviceStore.set(grant.deviceCode, grant);
  deviceStore.set(`u:${grant.userCode}`, grant); // lookup per user_code
  return grant;
}

export function lookupByUserCode(userCode: string): DeviceGrant | null {
  const grant = deviceStore.get(`u:${(userCode || "").toUpperCase()}`);
  if (!grant) return null;
  if (Date.now() > grant.expiresAt) {
    grant.status = "expired";
    return grant;
  }
  return grant;
}

export function lookupByDeviceCode(deviceCode: string): DeviceGrant | null {
  const grant = deviceStore.get(deviceCode || "");
  if (!grant) return null;
  if (Date.now() > grant.expiresAt) {
    grant.status = "expired";
    return grant;
  }
  return grant;
}

/** Approvazione: aggancia i token del browser al grant in attesa. */
export function approveDeviceGrant(
  grant: DeviceGrant,
  tokens: { access_token: string; refresh_token?: string; email?: string },
): void {
  grant.status = "approved";
  grant.tokens = tokens;
  deviceStore.set(grant.deviceCode, grant);
}

/** Consegna una tantum: il poll svuota i token, il grant muore lì. */
export function consumeDeviceGrant(grant: DeviceGrant): { access_token: string; refresh_token?: string; email?: string } | null {
  const tokens = grant.tokens ? { ...grant.tokens } : null;
  delete grant.tokens;
  grant.status = "expired";
  deviceStore.delete(grant.deviceCode);
  deviceStore.delete(`u:${grant.userCode}`);
  return tokens;
}

function pruneDevices(): void {
  const now = Date.now();
  for (const [key, grant] of deviceStore) {
    if (now > grant.expiresAt) {
      deviceStore.delete(key);
    }
  }
}
