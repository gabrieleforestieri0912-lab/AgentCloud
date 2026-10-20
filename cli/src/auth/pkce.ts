import crypto from "node:crypto";

/**
 * PKCE (RFC 7636) per il login via browser della CLI.
 *
 * Perché serve: il vecchio flusso (/cli/auth) consegnavano il Supabase access
 * token direttamente nell'URL del redirect locale — finiva nella cronologia
 * del browser e nei log del terminale. Con PKCE il browser riceve un `code`
 * usa-e-getta legato al `code_challenge`; il token vero arriva solo in
 * risposta a POST /api/cli/token, dove la CLI Dimostra di possedere il
 * `code_verifier`. Chi intercetta il callback locale non può scambiare il
 * code senza il verifier.
 */

/** `state` casuale per verificare che il callback appartenga a questa run. */
export function randomState(): string {
  return crypto.randomBytes(16).toString("hex");
}

/** Verifier: base64url di 32 byte casuali (43 caratteri, RFC compliant). */
export function createVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/** S256 challenge: base64url(sha256(verifier)). */
export function challengeFromVerifier(verifier: string): string {
  return crypto.createHash("sha256").update(verifier, "ascii").digest("base64url");
}

/** Verifica S256: usata dai test e dal server nel flusso device. */
export function verifyChallenge(verifier: string, challenge: string): boolean {
  if (!verifier || !challenge) return false;
  try {
    // Timing-safe: l'attaccante conosce challenge (è nel URL), quindi il
    // confronto costante qui è prudenza più che necessità.
    const expected = Buffer.from(challengeFromVerifier(verifier), "ascii");
    const got = Buffer.from(challenge, "ascii");
    return expected.length === got.length && crypto.timingSafeEqual(expected, got);
  } catch {
    return false;
  }
}
