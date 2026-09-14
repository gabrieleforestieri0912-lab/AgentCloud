/**
 * Indirizzi email centralizzati del dominio AgentCloud.
 *
 * Perché esiste: tutta la posta in uscita parte dal dominio verificato su
 * Resend e le notifiche di supporto/feedback devono finire su caselle note.
 * Avere qui un'unica fonte evita indirizzi sparsi nel codice. Ogni valore è
 * sovrascrivibile via variabile d'ambiente, senza toccare il codice.
 */

export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@agentcloud.agency";

export const FEEDBACK_EMAIL =
  process.env.FEEDBACK_EMAIL || "feedback@agentcloud.agency";

/**
 * Mittenti specifici dei tool che inviano documenti ai clienti finali
 * (preventivi, solleciti di pagamento). Il dominio di default è
 * `agentcloud.agency`, l'unico verificato sul provider email: usare un domino
 * diverso farebbe fallire l'invio.
 */
export const QUOTE_FROM_EMAIL =
  process.env.QUOTE_FROM_EMAIL || "preventivi@agentcloud.agency";

export const FINANCE_FROM_EMAIL =
  process.env.FINANCE_FROM_EMAIL || "finance@agentcloud.agency";

/** Mittente con brand usato per tutte le email transazionali / di notifica. */
export const FROM_EMAIL = `AgentCloud <${SUPPORT_EMAIL}>`;

/** Variante client-safe (le NEXT_PUBLIC_* vengono iniettate a build-time). */
export const PUBLIC_SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL || SUPPORT_EMAIL;
