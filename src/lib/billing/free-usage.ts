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
 *
 * Per l'ospite contano DUE contatori:
 *   - il contatore del DISPOSITIVO (cookie firmato dal server): è esatto e
 *     non penalizza chi sta dietro una NAT (vedi lib/billing/guest-counter.ts);
 *   - il contatore per IP: rete di sicurezza per chi non ha il cookie (bot,
 *     client che non lo conserva) e per chi lo cancella per ripartire da zero.
 *
 * Quando il dispositivo ha un contatore proprio, quello fa autorità: il
 * contatore per IP arriva dal DB e soffre di replica-lag (una richiesta può
 * leggere un valore di una richiesta precedente), quindi usarlo come metro
 * renderebbe l'arbitragrio anche per i browser normali. Chi non ha il cookie
 * viene giudicato dall'IP.
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

  // Ospite con contatore del dispositivo: fa autorità (esatto, NAT-friendly).
  if (typeof opts.guestUsed === "number") {
    const guestRemaining = Math.max(0, limit - opts.guestUsed);
    return {
      allowed: guestRemaining > 0,
      used: opts.guestUsed,
      remaining: guestRemaining,
      limit,
    };
  }

  // Ospite senza contatore del dispositivo: metro l'IP.
  return {
    allowed: ipUsed < limit,
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
