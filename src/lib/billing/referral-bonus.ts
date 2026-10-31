/**
 * Bonus messaggi da referral: il pool di crediti una tantum che integra il
 * limite giornaliero del freemium.
 *
 * REGOLA
 * ------
 * Chi non ha abbonamento attivo e finisce i 5 messaggi gratuiti del giorno può
 * continuare a scrivere consumando un POOL DI CREDITI: 3 messaggi per ogni
 * persona che si è registrata completando l'auth dal suo link
 * (/signup?ref=<codice>). I crediti:
 *   - sono una tantum (non si ricaricano ogni giorno, non scadono);
 *   - si consumano SOLO dopo i 5 base del giorno (glicine: prima il daily, poi
 *     il pool);
 *   - valgono solo per utenti autenticati: gli ospiti non hanno un profilo su
 *     cui accumulare inviti.
 *
 * Dove si decide
 * --------------
 * Il totale (base + bonus) passa da `checkFreeUsage`, che è l'unico punto che
 * risponde "posso ancora scrivere?" per /api/chat, /api/agent/run e
 * /api/v1/run. La UI legge lo stesso calcolo via /api/agent/limit: numero e
 * copy non possono quindi discostarsi dall'enforcement.
 *
 * Calcolo (la parte pesante vive nella RPC `referral_bonus_state`, vedi
 * supabase/schema-referral-message-bonus.sql):
 *   earned = 3 × referral validi (una riga in referral_message_grants ciascuno)
 *   spent  = Σ sui giorni UTC dal primo accredito di max(0, run_del_giorno − base)
 *   available = min(earned, TETTO) − spent
 *
 * FAIL-SILENT, sempre: se la migrazione non è ancora applicata (tabella o RPC
 * assenti) o Supabase non risponde, il modulo torna uno stato vuoto e il
 * freemium resta identico a prima — 5 messaggi al giorno, niente inviti.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Messaggi extra concessi per ogni referral valido. */
export const REFERRAL_MESSAGES_PER_REFERRAL = 3;
/**
 * Tetto di sicurezza sul bonus maturato: anche con moltissimi inviti validi il
 * pool non supera questo numero di messaggi. È un numero di righe, non un env
 * var: serve a impedire che un bug a monte trasformi gli inviti in run
 * illimitate, non è un parametro di business da tarare.
 */
export const REFERRAL_BONUS_CAP = 300;

export type ReferralBonusState = {
  /** Messaggi extra ancora disponibili oltre i base del giorno. */
  available: number;
  /** Messaggi extra totali maturati (3 × referral validi, tetto applicato). */
  earned: number;
  /** Messaggi extra già consumati (uso oltre i base, per giorno UTC). */
  spent: number;
  /** Quanti referral validi ha l'utente. */
  referrals: number;
  /** Codice invito del profilo, per costruire il link /signup?ref=… */
  code: string | null;
};

const EMPTY_BONUS: ReferralBonusState = {
  available: 0,
  earned: 0,
  spent: 0,
  referrals: 0,
  code: null,
};

/**
 * Stato del bonus per un utente autenticato.
 *
 * `basePerDay` è il free tier configurabile (FREE_MESSAGES_PER_DAY): lo passa
 * il chiamante perché è lì che vive la configurazione, e la RPC deve drenare
 * il pool esattamente con la stessa base usata per bloccare il messaggio.
 */
export async function getReferralBonusState(
  userId: string,
  basePerDay: number,
): Promise<ReferralBonusState> {
  if (!userId || userId === "anonymous") return EMPTY_BONUS;

  const db = createAdminClient() ?? (await createClient());
  if (!db) return EMPTY_BONUS;

  try {
    const { data, error } = await db.rpc("referral_bonus_state", {
      p_user_id: userId,
      p_base: basePerDay,
    });
    // RPC assente (migrazione non applicata) o errore di rete/permessi:
    // si torna allo stato vuoto, il freemium resta ai 5 base.
    if (error) return EMPTY_BONUS;

    const row = (Array.isArray(data) ? data[0] : data) as
      | { referrals?: number | string; spent?: number | string; code?: string | null }
      | null;
    if (!row) return EMPTY_BONUS;

    const referrals = Math.max(0, Number(row.referrals) || 0);
    const spent = Math.max(0, Number(row.spent) || 0);
    const earned = Math.min(
      referrals * REFERRAL_MESSAGES_PER_REFERRAL,
      REFERRAL_BONUS_CAP,
    );
    const code = typeof row.code === "string" && row.code ? row.code : null;

    return {
      available: Math.max(0, earned - spent),
      earned,
      spent,
      referrals,
      code,
    };
  } catch {
    return EMPTY_BONUS;
  }
}
