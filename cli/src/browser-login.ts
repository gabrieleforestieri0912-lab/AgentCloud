import crypto from "node:crypto";
import http from "node:http";
import open from "open";
import { saveCredentials } from "./config.js";

/**
 * Login via browser (flusso OAuth-like con callback locale).
 *
 * Come funziona: apre `/cli/auth?port=...&state=...` nel browser, dove l'utente
 * è (o accede e) autorizza; la pagina reindirizza il token Supabase a un mini
 * server locale su 127.0.0.1. Lo `state` casuale impedisce a un altro processo
 * locale di iniettare un token. Timeout di 5 minuti, poi si rilancia il login.
 */
export async function browserLogin(apiUrl: string): Promise<void> {
  const state = crypto.randomBytes(16).toString("hex");
  const server = http.createServer();
  await new Promise<void>((resolve, reject) => {
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Impossibile aprire la porta locale per il login.");
  }
  const authUrl = `${apiUrl}/cli/auth?port=${address.port}&state=${state}`;

  console.log("Apro il browser per accedere…");
  console.log(`Se non si apre da solo, incolla questo indirizzo: ${authUrl}`);
  try {
    await open(authUrl);
  } catch {
    console.log("Apertura automatica non riuscita: usa il link qui sopra.");
  }

  const tokens = await new Promise<{ accessToken: string; refreshToken: string }>(
    (resolve, reject) => {
      const timer = setTimeout(() => {
        server.close();
        reject(new Error("Tempo scaduto (5 minuti): rilancia `agentcloud login`."));
      }, 5 * 60 * 1000);
      server.on("request", (req, res) => {
        const url = new URL(req.url || "/", "http://127.0.0.1");
        if (url.pathname !== "/callback") {
          res.statusCode = 404;
          res.end("not found");
          return;
        }
        const gotState = url.searchParams.get("state");
        const accessToken = url.searchParams.get("token") || "";
        const refreshToken = url.searchParams.get("refresh_token") || "";
        if (gotState !== state || !accessToken) {
          res.statusCode = 400;
          res.end("Richiesta non valida: rilancia `agentcloud login` dal terminale.");
          return;
        }
        clearTimeout(timer);
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end("<h1>Accesso completato</h1><p>Puoi chiudere questa pagina e tornare al terminale.</p>");
        server.close();
        resolve({ accessToken, refreshToken });
      });
    },
  );

  // Il JWT dura ~1h: con il refresh token la CLI lo rinnova da sola, senza
  // si torna al login alla scadenza (vedi api.ts).
  saveCredentials({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: Date.now() + 55 * 60 * 1000,
  });
}
