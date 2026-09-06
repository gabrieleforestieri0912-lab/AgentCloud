/**
 * Audit logging leggero per gli eventi di sicurezza (rate limit, tentativi
 * di accesso, riscatto codici, ecc.).
 *
 * Server-only. Scrive ogni evento sia nella console sia su un file giornaliero
 * (`logs/audit-<data>.log`) per avere una traccia persistente senza dipendere
 * dal database. Qualsiasi errore viene inghiottito: la registrazione non deve
 * MAI bloccare la richiesta che l'ha generata.
 */
import fs from "fs";
import path from "path";

export function logAudit(
  action: string,
  payload: Record<string, unknown>,
) {
  try {
    const entry = {
      ts: new Date().toISOString(),
      action,
      payload,
    };
    // Persistenza su console e su file a rotazione giornaliera (implementazione base)
    console.info("AUDIT", JSON.stringify(entry));
    try {
      const logDir = path.join(process.cwd(), "logs");
      if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
      const file = path.join(
        logDir,
        `audit-${new Date().toISOString().slice(0, 10)}.log`,
      );
      fs.appendFileSync(file, JSON.stringify(entry) + "\n");
    } catch {
      // ignora gli errori di scrittura file negli ambienti senza filesystem
    }
  } catch (e) {
    // l'audit non deve mai lanciare eccezioni verso il chiamante
    console.error("AUDIT ERROR", e);
  }
}
