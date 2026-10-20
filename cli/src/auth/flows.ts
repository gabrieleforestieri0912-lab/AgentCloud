import open from "open";
import { saveCredentials } from "../config.js";
import { exchangeCliCode } from "../api.js";
import { startLoopback } from "./loopback.js";
import { CallbackTimeoutError, HeadlessFallbackRecommended } from "./errors.js";
import { challengeFromVerifier, createVerifier, randomState } from "./pkce.js";
import { deviceLoginFlow } from "./device.js";

/** Messaggi di stato per spinner/messaggi della TUI. */
export type LoginStatus = (message: string) => void;

const CALLBACK_TIMEOUT_MS = 5 * 60 * 1000;

export { CallbackTimeoutError, HeadlessFallbackRecommended };

/**
 * Login via browser con callback loopback + PKCE (stile gh/OpenCode).
 *
 * 1. genera state + PKCE verifier/challenge;
 * 2. apre il browser su SITE/cli/login?port&state&code_challenge;
 * 3. il sito (utente autenticato) crea un `code` usa-e-getta legato alla
 *    challenge e reindirizza a 127.0.0.1:port/callback?code&state;
 * 4. la CLI verifica lo state, scambia code+verifier con i token via
 *    POST /api/cli/token e salva le credenziali.
 *
 * Se il browser non si apre (SSH/WSL/headless) lancia
 * HeadlessFallbackRecommended: il chiamante (flows) rileva e prova il device flow.
 */
export async function browserLoginFlow(apiUrl: string, onStatus?: LoginStatus): Promise<void> {
  const say = onStatus || (() => {});
  const state = randomState();
  const verifier = createVerifier();
  const challenge = challengeFromVerifier(verifier);

  const loopback = startLoopback({ state, callbackTimeoutMs: CALLBACK_TIMEOUT_MS });
  const port = await loopback.ready;

  const authorizeUrl =
    `${apiUrl.replace(/\/$/, "")}/cli/login` +
    `?port=${port}&state=${encodeURIComponent(state)}&code_challenge=${encodeURIComponent(challenge)}`;

  say("Apro il browser…");
  try {
    await open(authorizeUrl);
  } catch {
    // Nessun browser (SSH, container, WSL minimale): tast possibile è il
    // device flow, dove l'utente completa da un secondo dispositivo.
    loopback.close();
    throw new HeadlessFallbackRecommended();
  }

  say("In attesa del browser… (durata max 5 minuti)");
  try {
    const { code } = await loopback.callback;
    say("Accesso autorizzato: scambio il codice…");
    await exchangeAndSave(apiUrl, code, verifier, say);
  } finally {
    loopback.close();
  }
}

/** Scambio code→token + salvataggio credenziali con email (best-effort). */
export async function exchangeAndSave(
  apiUrl: string,
  code: string,
  verifier: string,
  onStatus?: LoginStatus,
): Promise<void> {
  const say = onStatus || (() => {});
  const data = await exchangeCliCode(apiUrl, code, verifier);
  saveCredentials({
    accessToken: data.access_token,
    refreshToken: data.refresh_token || "",
    expiresAt: Date.now() + 55 * 60 * 1000,
    email: data.email,
  });
  say(`Accesso effettuato come ${data.email || "(email non disponibile)"}`);
}

/**
 * Login completo: prova il browser e, se l'ambiente non lo permette (SSH,
 * headless, `open` fallito) passa automaticamente al device flow.
 * Anche il CallbackTimeoutError fa passare al device? No: l'utente ha visto
 * "In attesa del browser…" — la scelta R/T resta nella schermata di login.
 */
export async function browserLoginWithFallback(apiUrl: string, onStatus?: LoginStatus): Promise<void> {
  const say = onStatus || (() => {});
  try {
    await browserLoginFlow(apiUrl, say);
  } catch (error) {
    if (error instanceof HeadlessFallbackRecommended) {
      say("Nessun browser disponibile: uso il login con codice device (da un secondo dispositivo).");
      await deviceLoginFlow(apiUrl, say);
      return;
    }
    throw error;
  }
}

export { deviceLoginFlow };
