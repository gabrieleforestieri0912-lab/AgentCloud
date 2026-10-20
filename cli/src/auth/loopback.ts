import http from "node:http";
import { CallbackTimeoutError } from "./errors.js";

export type CallbackResult = { code: string };

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Pagina "Accesso completato, puoi tornare al terminale" nel look del sito
 * (bg #0A0A0F, brand #038BFE, verde #10B981 — vedi src/app/globals.css).
 */
function successPage(): string {
  return `<!doctype html><html lang="it"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Accesso completato — AgentCloud CLI</title>
<style>
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         background:#0A0A0F; color:#F4F4F5; font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; }
  .card { max-width:420px; margin:16px; padding:32px; text-align:center;
          border:1px solid #27272A; border-radius:16px; background:#13131A; }
  .badge { width:48px; height:48px; margin:0 auto 12px; border-radius:50%;
           display:flex; align-items:center; justify-content:center;
           background:rgba(16,185,129,.15); color:#10B981; font-size:22px; }
  h1 { font-size:18px; margin:0 0 8px; }
  p { color:#8E8FA4; font-size:13px; margin:0; }
  .brand { color:#038BFE; font-weight:700; }
</style></head><body>
<div class="card"><div class="badge">&#10003;</div>
<h1>Accesso completato</h1>
<p>Puoi chiudere questa pagina e tornare al terminale. <span class="brand">AgentCloud</span></p>
</div></body></html>`;
}

function errorPage(message: string): string {
  return `<!doctype html><html lang="it"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Accesso non riuscito — AgentCloud CLI</title>
<style>
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         background:#0A0A0F; color:#F4F4F5; font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; }
  .card { max-width:420px; margin:16px; padding:32px; text-align:center;
          border:1px solid rgba(248,113,113,.2); border-radius:16px; background:#13131A; }
  .badge { width:48px; height:48px; margin:0 auto 12px; border-radius:50%;
           display:flex; align-items:center; justify-content:center;
           background:rgba(248,113,113,.15); color:#F87171; font-size:22px; }
  h1 { font-size:18px; margin:0 0 8px; }
  p { color:#8E8FA4; font-size:13px; margin:0; word-break:break-word; }
</style></head><body>
<div class="card"><div class="badge">!</div>
<h1>Accesso non riuscito</h1>
<p>${esc(message)}</p>
</div></body></html>`;
}

function defer<T>(): { promise: Promise<T>; resolve: (v: T) => void; reject: (e: unknown) => void } {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

export type Loopback = {
  /** Si risolve con la porta effimera quando il server è in ascolto. */
  ready: Promise<number>;
  /** Si risolve con il code verificato, o respinge (timeout / errore). */
  callback: Promise<CallbackResult>;
  /** Chiude il server e annulla l'attesa (idempotente). */
  close: () => void;
};

/**
 * Server HTTP loopback per il callback del login browser.
 *
 * Ascolta su 127.0.0.1 con porta effimera e risolve quando il browser chiama
 * `GET /callback?code=...&state=...`. Lo `state` casuale è verificato qui:
 * un altro processo locale o un'altra scheda non può iniettare un code
 * estraneo. Il timeout produce CallbackTimeoutError, che la TUI converte
 * nella scelta "R riprova · T token".
 */
export function startLoopback(opts: { state: string; callbackTimeoutMs: number }): Loopback {
  const readyDeferred = defer<number>();
  const callbackDeferred = defer<CallbackResult>();
  // Le promise sono "gestite" fin da subito: una richiesta stray (state
  // sbagliato, doppio callback) può arrivare PRIMA che il chiamante
  // attacchi il suo handler, e una rejection non gestita in Node termina il
  // processo. Il consumatore riceve comunque l'errore.
  readyDeferred.promise.catch(() => {});
  callbackDeferred.promise.catch(() => {});

  const timer = setTimeout(finishWithTimeout, opts.callbackTimeoutMs);

  const server = http.createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (url.pathname !== "/callback") {
      res.statusCode = 404;
      res.end("not found");
      return;
    }
    const gotCode = url.searchParams.get("code") || "";
    const gotState = url.searchParams.get("state") || "";
    const gotError = url.searchParams.get("error") || "";

    const finalize = (message: string, ok: boolean, code?: string) => {
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.end(ok ? successPage() : errorPage(message));
      // Un solo callback chiude: le richieste successive trovano il server
      // già spento (o ricevono 404) e la Promise non cambia più valore.
      if (finalized) return;
      finalized = true;
      clearTimeout(timer);
      server.close();
      if (ok) callbackDeferred.resolve({ code: code || "" });
      else callbackDeferred.reject(new Error(message));
    };

    /**
     * Richiesta non valida (state sbagliato, callback incompleto): si
     * risponde con la pagina di errore ma il server RESTA APERTO. Il login
     * è ancora in corso: una richiesta stray (doppia finestra, prefetch del
     * browser, vecchio tab) non deve buttare giù l'attesa del callback
     * legittimo.
     */
    const refuse = (message: string) => {
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.end(errorPage(message));
    };

    // Ordine di controllo: errore provider → risposta incompleta → state.
    if (gotError) { finalize(gotError, false); return; }
    if (!gotCode || !gotState) {
      refuse("richiesta incompleta: rilancia `agentcloud login`.");
      return;
    }
    if (gotState !== opts.state) {
      refuse("state non valido: forse hai più finestre di login contemporaneamente. Riprova dal terminale.");
      return;
    }
    finalize("", true, gotCode);
  });

  let finalized = false;
  let errored = false;

  function finishWithTimeout() {
    if (finalized || errored) return;
    finalized = true;
    server.close();
    callbackDeferred.reject(new CallbackTimeoutError());
  }

  server.on("error", (err) => {
    if (finalized) return;
    finalized = true;
    errored = true;
    clearTimeout(timer);
    try { server.close(); } catch { /* non ancora in ascolto */ }
    readyDeferred.reject(err);
    callbackDeferred.reject(err instanceof Error ? err : new Error(String(err)));
  });

  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address || typeof address === "string") {
      if (finalized) return;
      finalized = true;
      clearTimeout(timer);
      server.close();
      const err = new Error("Impossibile aprire la porta locale per il login.");
      readyDeferred.reject(err);
      callbackDeferred.reject(err);
      return;
    }
    readyDeferred.resolve(address.port);
  });

  return {
    ready: readyDeferred.promise,
    callback: callbackDeferred.promise,
    close: () => {
      if (finalized) return;
      finalized = true;
      clearTimeout(timer);
      server.close();
    },
  };
}
