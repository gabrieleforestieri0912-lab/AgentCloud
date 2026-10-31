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
 * BONUS REFERRAL: per gli autenticati il limite del giorno è 5 + i crediti
 * maturati invitando persone (/signup?ref=…, vedi referral-bonus.ts). Il pool
 * è una tantum e si consuma solo dopo i 5 base; gli ospiti no.
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
import {
  getReferralBonusState,
  type ReferralBonusState,
} from "./referral-bonus";

export type FreeUsage = {
  /** false quando i messaggi gratuiti del giorno sono finiti. */
  allowed: boolean;
  /** Messaggi già consumati (dal metro "vero": dispositivo o IP). */
  used: number;
  /** Messaggi ancora disponibili (base del giorno + bonus referral). */
  remaining: number;
  /** Massimo del giorno: base + bonus referral ancora disponibili. */
  limit: number;
  /** Bonus referral (zero per gli ospiti e per chi non ha inviti validi). */
  bonus: ReferralBonusState;
};

const NO_BONUS: ReferralBonusState = {
  available: 0,
  earned: 0,
  spent: 0,
  referrals: 0,
  code: null,
};

/**
 * Quanti messaggi gratuiti ha ancora l'utente oggi.
 *
 * `ip` serve per gli anonimi (il contatore è per indirizzo).
 * `guestUsed` è il contatore del DISPOSITIVO: `null` se il visitatore non ha
 * un cookie valido (prima messaggio, o cookie perso/cancellato).
 *
 * Per gli UTENTI AUTENTICATI il limite del giorno è base + bonus referral
 * (pool di crediti una tantum, vedi referral-bonus.ts): gli ospiti restano ai
 * base, perché non hanno un profilo su cui accumulare inviti.
 */
export async function checkFreeUsage(
  userId: string,
  opts: { ip?: string; guestUsed?: number | null } = {},
): Promise<FreeUsage> {
  const base = FREE_MESSAGES_PER_DAY;

  // Utente autenticato: contatore unico (le run di oggi) + pool di crediti.
  // Le due query sono indipendenti: partono insieme.
  if (userId !== "anonymous") {
    const [bonus, used] = await Promise.all([
      getReferralBonusState(userId, base),
      getFreeMessagesUsed(userId, opts.ip),
    ]);
    const limit = base + bonus.available;
    return {
      allowed: used < limit,
      used,
      remaining: Math.max(0, limit - used),
      limit,
      bonus,
    };
  }

  // Ospite: se ha il contatore del dispositivo, quello è il metro (esatto,
  // e la NAT non penalizza nessuno). Altrimenti decide l'IP.
  const ipUsed = await getFreeMessagesUsed(userId, opts.ip);
  const ipRemaining = Math.max(0, base - ipUsed);
  const deviceRemaining =
    typeof opts.guestUsed === "number"
      ? Math.max(0, base - opts.guestUsed)
      : null;

  if (deviceRemaining !== null) {
    return {
      allowed: deviceRemaining > 0,
      used: base - deviceRemaining,
      remaining: deviceRemaining,
      limit: base,
      bonus: NO_BONUS,
    };
  }

  return {
    allowed: ipRemaining > 0,
    used: ipUsed,
    remaining: ipRemaining,
    limit: base,
    bonus: NO_BONUS,
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
