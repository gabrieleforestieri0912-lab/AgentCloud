/**
 * Uso gratuito: il contatore UNICO dei messaggi gratuiti al giorno.
 *
 * Il freemium è un solo piano, non tre limiti diversi: 5 messaggi al giorno
 * IN TOTALE (demo della home, chat generica, agenti), con reset alla
 * mezzanotte UTC. Un utente che spende i suoi 5 messaggi nella demo non ne
 * ha più per gli agenti, e viceversa: è quello che la copy promette ("in
 * totale") e quello che il contatore deve misurare.
 *
 * PRIMA c'erano tre buchi diversi:
 *   - la demo home aveva 10 messaggi contati lato CLIENT (un refresh li
 *     azzerava: di fatto uso illimitato);
 *   - la chat generica in /chat non aveva alcun limite;
 *   - gli agenti avevano 5/giorno, server-side.
 * Adesso il limite è uno solo ed è enforced dal server.
 *
 * IL METRO
 * --------
 *   - utente autenticato → le run di oggi (`agent_runs`);
 *   - ospite con il contatore del DISPOSITIVO (cookie firmato dal server) →
 *     il contatore del dispositivo: è esatto e non penalizza chi sta dietro
 *     una NAT (vedi lib/billing/guest-counter.ts);
 *   - ospite senza contatore del dispositivo → il contatore per IP, che è la
 *     rete di sicurezza per bot e client che non conservano i cookie.
 *
 * Perché il dispositivo vince quando c'è: il contatore per IP arriva dal DB
 * e soffre di replica-lag (una richiesta può leggere il valore di una
 * richiesta precedente), quindi usarlo come metro renderebbe l'arbitragrio
 * anche per i browser normali. Il cookie, invece, è letto dalla richiesta:
 * è esatto.
 */

import {
  FREE_MESSAGES_PER_DAY,
  getFreeMessagesUsed,
  incrementAnonymousFreeCount,
} from "./free-limit";

export type FreeUsage = {
  /** false quando i messaggi gratuiti del giorno sono finiti. */
  allowed: boolean;
  /** Messaggi già consumati (dal metro "vero": dispositivo o IP). */
  used: number;
  /** Messaggi ancora disponibili. */
  remaining: number;
  limit: number;
};

/**
 * Quanti messaggi gratuiti ha ancora l'utente oggi.
 *
 * `ip` serve per gli anonimi (il contatore è per indirizzo).
 * `guestUsed` è il contatore del DISPOSITIVO: `null` se il visitatore non ha
 * un cookie valido (prima messaggio, o cookie perso/cancellato).
 */
export async function checkFreeUsage(
  userId: string,
  opts: { ip?: string; guestUsed?: number | null } = {},
): Promise<FreeUsage> {
  const limit = FREE_MESSAGES_PER_DAY;
  const ipUsed = await getFreeMessagesUsed(userId, opts.ip);
  const ipRemaining = Math.max(0, limit - ipUsed);

  // Utente autenticato: contatore unico (le run di oggi).
  if (userId !== "anonymous") {
    return {
      allowed: ipUsed < limit,
      used: ipUsed,
      remaining: ipRemaining,
      limit,
    };
  }

  // Ospite: se ha il contatore del dispositivo, quello è il metro (esatto,
  // e la NAT non penalizza nessuno). Altrimenti decide l'IP.
  const deviceRemaining =
    typeof opts.guestUsed === "number"
      ? Math.max(0, limit - opts.guestUsed)
      : null;

  if (deviceRemaining !== null) {
    return {
      allowed: deviceRemaining > 0,
      used: limit - deviceRemaining,
      remaining: deviceRemaining,
      limit,
    };
  }

  return {
    allowed: ipRemaining > 0,
    used: ipUsed,
    remaining: ipRemaining,
    limit,
  };
}

/**
 * Consuma un messaggio gratuito del contatore anonimo.
 *
 * Per gli utenti autenticati il contatore avanza da solo: la run finisce in
 * `agent_runs` e `getFreeMessagesUsed` la conta. Qui si occupa solo del
 * caso anonimo, che non ha una run salvata.
 */
export async function consumeFreeUsage(
  userId: string,
  ip?: string,
): Promise<void> {
  if (userId === "anonymous") {
    await incrementAnonymousFreeCount(ip ?? "unknown");
  }
}
