/**
 * Validazione e protezione SSRF per URL forniti dagli utenti (Phase 2).
 *
 * Perché esiste: WooCommerce non è OAuth standard — l'utente inserisce
 * l'URL del proprio store e il server deve chiamarlo. Un URL non validato
 * trasformerebbe il proxy in un ponte verso la rete interna del tenant di
 * Vercel: `http://169.254.169.254/...` (metadata GCP/AWS) o `http://127.0.0.1`
 * (servizi interni della stessa macchina).
 *
 * Il controllo è in due tempi, perché il DNS è ostile:
 *   1. `normalizeTenantUrl` — schema/host/porta/forma dell'URL, puramente
 *      sintattico, senza rete. Girare a ogni richiesta e nel callback.
 *   2. `assertPublicHost` — risolve l'host e scarta gli IP privati/riservati.
 *      Va chiamato subito prima del fetch: il DNS può cambiare fra la validazione
 *      e la connessione (DNS rebinding), per questo l'IP risolto va usato per la
 *      connessione quando l'host è puro indirizzo.
 */

/** IP che non devono mai essere raggiungibili da un URL fornito da un utente. */
function isBlockedIpv4(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) return true;
  const nums = parts.map((p) => {
    const n = Number(p);
    return Number.isInteger(n) && n >= 0 && n <= 255 ? n : Number.NaN;
  });
  if (nums.some((n) => Number.isNaN(n))) return true;
  const [a, b] = nums;

  // 0.0.0.0/8, 10/8, 100.64/10 (CGNAT), 127/8 (loopback)
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  // 169.254/16 — link-local,include i metadata cloud (169.254.169.254)
  if (a === 169 && b === 254) return true;
  // 172.16/12
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168/16
  if (a === 192 && b === 168) return true;
  // 192.0.0/24, 192.0.2/24 (TEST-NET-1), 198.18/15, 198.51.100/24 (TEST-NET-2)
  if (a === 192 && b === 0 && nums[2] === 0) return true;
  if (a === 192 && b === 0 && nums[2] === 2) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a === 198 && b === 51 && nums[2] === 100) return true;
  // 203.0.113/24 (TEST-NET-3)
  if (a === 203 && b === 0 && nums[2] === 113) return true;
  // multicast 224/4 e riservato 240/4
  if (a >= 224) return true;
  return false;
}

function isBlockedIpv6(ip: string): boolean {
  const v = ip.toLowerCase().split("%")[0];
  if (v === "::" || v === "::1") return true;
  // link-local fe80::/10 e unique-local fc00::/7
  if (/^fe[89ab]/.test(v)) return true;
  if (/^f[cd]/.test(v)) return true;
  // IPv4-mapped ::ffff:a.b.c.d — ricadi nelle regole IPv4
  const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedIpv4(mapped[1]);
  return false;
}

/**
 * True se la stringa è un indirizzo IP bloccato.
 * Attenzione: restituisce `false` per i nomi di dominio, anche se sembrano IP
 * (`mystore.com` ha 2 parti, non 4): un hostname va filtrato dal resolver in
 * `assertPublicHost`, non da qui.
 */
export function isBlockedIp(ip: string): boolean {
  if (!ip) return false;
  // IPv6: contiene ":" oppure è una forma compressa con "::".
  if (ip.includes(":")) return isBlockedIpv6(ip);
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return false;
  return isBlockedIpv4(ip);
}

/** Host che non sono IP ma sono comunque vietati (più avanti del resolver). */
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata",
]);

export type UrlValidation =
  | { ok: true; url: URL }
  | { ok: false; error: string };

/**
 * Valida sintatticamente un URL fornito dall'utente e lo normalizza.
 * Non fa richieste di rete: da usare per validare l'input e mostrarlo in UI.
 *
 * HTTPS obbligatorio: i Consumer Key/Secret WooCommerce viaggiano in
 * Authorization Basic e un store in chiaro li esporrebbe.
 */
export function normalizeTenantUrl(input: string): UrlValidation {
  const raw = String(input ?? "").trim();
  if (!raw) return { ok: false, error: "Missing URL" };
  if (raw.length > 2048) return { ok: false, error: "URL too long" };

  let url: URL;
  try {
    // Aggiunge lo schema se l'utente ha scritto solo il dominio ("mystore.com").
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return { ok: false, error: "Invalid URL" };
  }

  if (url.protocol !== "https:") {
    return { ok: false, error: "The URL must use https" };
  }

  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host) return { ok: false, error: "Invalid URL" };
  if (BLOCKED_HOSTNAMES.has(host)) return { ok: false, error: "Host not allowed" };
  if (host.endsWith(".localhost") || host.endsWith(".internal")) {
    return { ok: false, error: "Host not allowed" };
  }
  // Un hostname che è già un IP va bloccato qui: il resolver non viene
  // coinvolto, quindi il controllo deve stare in entrambe le funzioni. Per
  // IPv6 `URL.hostname` conserva le parentesi quadre, che vanno tolte prima.
  if (isBlockedIp(host.replace(/^\[|\]$/g, ""))) {
    return { ok: false, error: "Host not allowed" };
  }

  // Porta non standard: ammette solo 443 esplicito. Evita di puntare a servizi
  // interni che ascoltano su porte alte (admin panels, database).
  if (url.port && url.port !== "443") {
    return { ok: false, error: "Only port 443 is allowed" };
  }

  // Credenziali nell'URL sono quasi sempre un errore di copia-incolla e
  // finirebbero nel log e nella pagina di errore.
  if (url.username || url.password) {
    return { ok: false, error: "The URL must not contain credentials" };
  }

  // Path/query/fragment non hanno senso per una base API: si tiene solo l'origine.
  return { ok: true, url: new URL(`https://${host}`) };
}

/**
 * Risolve l'host e verifica che punti solo a IP pubblici.
 * Va chiamato subito prima del fetch di terze parti verso un host utente.
 */
export async function assertPublicHost(hostname: string): Promise<UrlValidation> {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (BLOCKED_HOSTNAMES.has(host)) return { ok: false, error: "Host not allowed" };

  // Se è già un IP non serve risolvere.
  if (isBlockedIp(host)) return { ok: false, error: "Host not allowed" };

  let addrs: Array<{ address: string }>;
  try {
    const dns = await import("node:dns/promises");
    addrs = await dns.lookup(host, { all: true, verbatim: true });
  } catch {
    return { ok: false, error: "Could not resolve host" };
  }
  if (addrs.length === 0) return { ok: false, error: "Could not resolve host" };

  // Tutti gli indirizzi devono essere pubblici: se uno solo è privato,
  // l'host è considerato malevolo (round-robin verso la rete interna).
  for (const a of addrs) {
    if (isBlockedIp(a.address)) return { ok: false, error: "Host not allowed" };
  }
  return { ok: true, url: new URL(`https://${host}`) };
}

/** Attenzione: da usare solo per messaggi già destinati a un umano. */
export function describeHostError(input: string): string {
  const host = (() => {
    try {
      return new URL(input).hostname;
    } catch {
      return "l'host";
    }
  })();
  return `The store URL was rejected by the security check (${host}). Use a public https address.`;
}