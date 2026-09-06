/**
 * Client Resend condiviso (singleton) per l'invio delle email transazionali.
 *
 * Perché esiste: istanziare un nuovo client a ogni chiamata spreca risorse e
 * rischia di superare i limiti di connessione; il client viene creato una
 * sola volta e riusato. L'API key viene letta dall'ambiente al primo uso e
 * manca solo se non è configurata.
 */
import { Resend } from "resend";

let _resend: Resend | null = null;

export function getResend(): Resend {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Missing RESEND_API_KEY environment variable. Set it in .env.local or your hosting provider.",
      );
    }
    _resend = new Resend(apiKey);
  }
  return _resend;
}
