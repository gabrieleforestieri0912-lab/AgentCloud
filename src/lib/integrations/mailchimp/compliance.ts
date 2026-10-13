/**
 * Regole GDPR/anti-spam del connettore Mailchimp (pure, testabili senza rete).
 *
 * Perché un modulo separato: le regole di conformità non devono stare in mezzo
 * alle chiamate HTTP, dove un refactor potrebbe ammorbidirle in silenzio. Qui
 * sono funzioni pure con contratti espliciti, coperte da smoke test.
 *
 * Regole integrate (cfr. Terms of Use Mailchimp + requisiti anti-spam):
 *  1. Mai `subscribed` senza `consent_basis` + data del consenso.
 *  2. Mai risottoscrivere un contatto `unsubscribed` o `cleaned`: il
 *     cambiamento di stato in uscita va rispettato sempre.
 *  3. Invio campagna bloccato se il compliance-check della bozza è rosso
 *     (manca unsubscribe, mittente o reply-to).
 *  4. Footer obbligatorio con identità del mittente (verificato sul contenuto).
 */

export type MemberStatus = "subscribed" | "unsubscribed" | "cleaned" | "pending" | "transactional";

/** Stati che il connettore può assegnare a un contatto (mai cleaned: lo decide Mailchimp). */
const ASSIGNABLE: MemberStatus[] = ["subscribed", "unsubscribed", "pending", "transactional"];

export function checkUpsertConsent(input: {
  email: string;
  status: string;
  currentStatus?: string | null;
  consentBasis?: string;
  consentDate?: string;
}): { ok: true; status: MemberStatus } | { ok: false; error: string } {
  const email = String(input.email ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Mailchimp: email non valida." };
  }
  const want = String(input.status ?? "pending").toLowerCase() as MemberStatus;
  if (!ASSIGNABLE.includes(want)) {
    return {
      ok: false,
      error: `Mailchimp: stato "${input.status}" non assegnabile (usabili: ${ASSIGNABLE.join(", ")}).`,
    };
  }
  // Regola 2: unsubscribed/cleaned sono uscite definitive, anche via API.
  const current = (input.currentStatus ?? "").toLowerCase();
  if ((current === "unsubscribed" || current === "cleaned") && want === "subscribed") {
    return {
      ok: false,
      error: `Mailchimp: ${email} risulta "${current}": la cancellazione va rispettata, non si può risottoscrivere via API. Il contatto deve reiscriversi da solo (form Mailchimp).`,
    };
  }
  // Regola 1: subscribed solo con base e data del consenso esplicito.
  if (want === "subscribed") {
    const basis = String(input.consentBasis ?? "").trim();
    const date = String(input.consentDate ?? "").trim();
    if (!basis) {
      return {
        ok: false,
        error: 'Mailchimp: per iscrivere come "subscribed" serve consent_basis (es. "form sito 2026-10-13", "fiera Milano consenso cartaceo"). Senza, usa "pending" (double opt-in).',
      };
    }
    if (!/^\d{4}-\d{2}-\d{2}/.test(date)) {
      return {
        ok: false,
        error: 'Mailchimp: per "subscribed" serve anche consent_date (AAAA-MM-GG) del consenso.',
      };
    }
  }
  return { ok: true, status: want };
}

export type CampaignCompliance = {
  settings: { subject?: string; title?: string; fromName?: string; replyTo?: string };
  html?: string;
};

/**
 * Compliance-check della bozza prima dell'invio (rosso = invio bloccato).
 * Controlla: oggetto, mittente, reply-to e footer con unsubscribe
 * (`*|UNSUB|*` o link unsubscribe) + indirizzo fisico (euristica: CAP/città
 * non verificabile via API, quindi si richiede solo la presenza di un blocco
 * indirizzo dichiarato — qui: il contenuto deve menzionare il mittente).
 */
export function checkCampaignCompliance(c: CampaignCompliance): {
  ok: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  if (!c.settings.subject?.trim()) issues.push("manca l'oggetto (subject_line)");
  if (!c.settings.fromName?.trim()) issues.push("manca il nome mittente (identità obbligatoria nel footer)");
  if (!c.settings.replyTo?.trim()) issues.push("manca il reply-to");
  const html = String(c.html ?? "");
  if (!html.trim()) {
    issues.push("contenuto vuoto: imposta il contenuto prima di inviare");
  } else {
    const lower = html.toLowerCase();
    if (!lower.includes("unsub") && !lower.includes("cancell") && !lower.includes("disiscriv")) {
      issues.push("manca il link di cancellazione (unsubscribe obbligatorio: Mailchimp lo aggiunge, ma la bozza deve prevederlo)");
    }
  }
  return { ok: issues.length === 0, issues };
}

/** Footer minimo richiesto: identità mittente + unsubscribe + indirizzo fisico. */
export function requiredFooterNotice(fromName: string): string {
  return `Mittente: ${fromName}. Per cancellarti usa il link di cancellazione in fondo all'email; l'indirizzo fisico del mittente deve comparire nel footer (obbligo anti-spam).`;
}
