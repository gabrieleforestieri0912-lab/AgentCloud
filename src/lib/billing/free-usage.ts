/**
 * Uso gratuito: il contitore UNICO dei messaggi gratuiti al giorno.
 *
 * Il freemium è un solo piano, non tre limiti diversi: 5 messaggi al giorno
 * IN TOTALE (demo della home, chat generica, agenti), con reset alla
 * mezzanotte UTC. Un utente che spende i suoi 5 messaggi nella demo non ne
 * ha più per gli agenti, e viceversa: è quello che la copy promette ("in
 * totale su tutti gli agenti") e quello che il contatore deve misurare.
 *
 * PRIMA c'erano tre buchi diversi:
 *   - la demo home aveva 10 messaggi contati lato CLIENT (un refresh li
 *     azzerava: di fatto uso illimitato);
 *   - la chat generica in /chat non aveva alcun limite;
 *   - gli agenti avevano 5/giorno, server-side.
 * Adesso il limite è uno solo ed è enforced dal server.
 *
 * Il meccanismo di conteggio resta quello esistente:
 *   - utente autenticato → numero di run di oggi su `agent_runs`;
 *   - anonimo → bucket "free-chat" su `rate_limits`, chiave = IP.
 */

import {
  FREE_MESSAGES_PER_DAY,
  getFreeMessagesUsed,
  incrementAnonymousFreeCount,
} from "./free-limit";

export type FreeUsage = {
  /** false quando i messaggi gratuiti del giorno sono finiti. */
  allowed: boolean;
  used: number;
  remaining: number;
  limit: number;
};

/**
 * Quanti messaggi gratuiti ha ancora l'utente oggi.
 *
 * `ip` serve per gli anonimi (il contatore è per indirizzo).
 * `guestUsed` è il contatore del DISPOSITIVO (cookie firmato): per gli ospiti
 * si tiene il più generoso fra IP e dispositivo, così chi sta dietro una NAT
 * non paga per i colleghi (vedi lib/billing/guest-counter.ts).
 */
export async function checkFreeUsage(
  userId: string,
  opts: { ip?: string; guestUsed?: number } = {},
): Promise<FreeUsage> {
  const limit = FREE_MESSAGES_PER_DAY;
  const ipUsed = await getFreeMessagesUsed(userId, opts.ip);
  const ipRemaining = Math.max(0, limit - ipUsed);

  // Solo per gli ospiti ha senso il contatore del dispositivo.
  if (userId !== "anonymous") {
    return {
      allowed: ipUsed < limit,
      used: ipUsed,
      remaining: ipRemaining,
      limit,
    };
  }

  const guestUsed = opts.guestUsed ?? 0;
  const guestRemaining = Math.max(0, limit - guestUsed);
  const remaining = Math.max(ipRemaining, guestRemaining);
  return {
    allowed: remaining > 0,
    used: limit - remaining,
    remaining,
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
