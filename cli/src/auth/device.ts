import { saveCredentials } from "../config.js";
import type { LoginStatus } from "./flows.js";

/**
 * Device flow (fallback per SSH/WSL/headless): la CLI mostra un codice
 * breve, l'utente visita SITE/device da qualunque dispositivo, inserisce il
 * codice e approva; la CLI fa polling finché l'approvazione arriva.
 *
 * Nota backend: lo stato dei device code vive in memoria sul server con TTL
 * (vedi SITE api/cli/device). Per distribuzioni multi-istanza il passo
 * successivo è una tabella Supabase — vedi la sezione "Resta da fare".
 */

export type DeviceStart = {
  device_code: string;
  user_code: string;
  verify_url?: string;
  interval?: number;
  expires_in?: number;
};

/** Avvio: chiede device_code + user_code al server. */
async function startDevice(apiUrl: string): Promise<DeviceStart> {
  const response = await fetch(`${apiUrl.replace(/\/$/, "")}/api/cli/device`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client: "cli" }),
  });
  if (!response.ok) throw new Error(`Impossibile avviare il device login (${response.status}).`);
  const data = (await response.json()) as Partial<DeviceStart>;
  if (!data.device_code || !data.user_code) throw new Error("Risposta device login non valida.");
  return data as DeviceStart;
}

export async function deviceLoginFlow(apiUrl: string, onStatus?: LoginStatus): Promise<void> {
  const say = onStatus || (() => {});
  const base = apiUrl.replace(/\/$/, "");
  const start = await startDevice(base);
  const verifyUrl = start.verify_url || `${base}/device`;
  say(`Codice: ${start.user_code} — apri ${verifyUrl} da qualunque dispositivo e inserisci il codice.`);
  say("In attesa di approvazione…");
  const intervalMs = Math.max(2, start.interval || 5) * 1000;
  const deadline = Date.now() + Math.min(15 * 60 * 1000, start.expires_in || 10 * 60 * 1000);

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const response = await fetch(`${base}/api/cli/device/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_code: start.device_code }),
    });
    if (response.ok) {
      const data = (await response.json()) as { access_token?: string; refresh_token?: string; email?: string };
      if (!data.access_token) continue;
      saveCredentials({
        accessToken: data.access_token,
        refreshToken: data.refresh_token || "",
        expiresAt: Date.now() + 55 * 60 * 1000,
        email: data.email,
      });
      say(`Accesso effettuato come ${data.email || "(email non disponibile)"}`);
      return;
    }
    if (response.status === 400 || response.status === 404) {
      // device_code non riconosciuto o scaduto: nonHa senso proseguire.
      throw new Error("Device login scaduto o non valido: riprova.");
    }
    // 202/pending o errori transitori: si riprova fino alla deadline.
  }
  throw new Error("Tempo scaduto in attesa di approvazione del device login (15 minuti).");
}
