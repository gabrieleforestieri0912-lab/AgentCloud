/**
 * Controllo di conformità deterministico del Network Marketing Agent.
 *
 * Perché esiste accanto al prompt: il system prompt dice all'LLM di essere
 * conforme, ma un'istruzione non è una garanzia — questo modulo applica liste
 * di pattern deterministiche su ogni bozza (messaggio, post, email, script)
 * prima che venga mostrata all'utente, e restituisce un semaforo:
 * verde (ok) / giallo (rischio: riscrittura proposta) / rosso (bloccato:
 * non copiabile né inviabile finché non viene corretto).
 *
 * Le regole mappano il quadro di riferimento (Legge 173/2005, Codice del
 * Consumo D.Lgs. 206/2005, GDPR + art. 130 Codice Privacy, Reg. CE
 * 1924/2006): la mappatura normativa va verificata con un legale prima del
 * rilascio (vedi docs/network-marketing/nota-legale.md).
 */

export type ComplianceStatus = "green" | "yellow" | "red";

export type ComplianceFinding = {
  /** ID regola stabile, usato anche in nm_compliance_events. */
  ruleId: string;
  severity: "yellow" | "red";
  /** Spiegazione breve (1 riga) mostrata in UI. */
  message: string;
  /** Frammento di testo che ha fatto scattare la regola (troncato). */
  matched: string;
};

export type ComplianceResult = {
  status: ComplianceStatus;
  findings: ComplianceFinding[];
  /** Suggerimento di riscrittura generico quando c'è almeno un finding. */
  rewriteHint: string | null;
};

type PatternRule = {
  ruleId: string;
  severity: "yellow" | "red";
  message: string;
  patterns: RegExp[];
};

const INCOME_RED: PatternRule = {
  ruleId: "NM-01-guadagni",
  severity: "red",
  message:
    "Promessa di guadagno: niente guadagni garantiti, cifre di reddito tipiche o stili di vita come risultato atteso.",
  patterns: [
    /guadagn[oi]\s+(garantit|sicuri|facili|assicurati)/i,
    /guadagn[oi]?\s+fino\s+a\s+€?\s?\d/i,
    /libert[àa]\s+finanziaria/i,
    /rendita\s+(automatica|passiva|garantita)/i,
    /entrate\s+(passive|automatiche|garantite)/i,
    /€\s?\d[\d.]*\s?(al\s+mese|mensili|al\s+giorno|a\s+settimana)/i,
    /\d[\d.]*\s?€\s?(al\s+mese|mensili|al\s+giorno|a\s+settimana|garantiti)/i,
    /\d[\d.]*\s*(euro|€)\s*(al\s+mese|mensili|al\s+giorno|a\s+settimana)/i,
    /lascia\s+il\s+(lavoro|tuo\s+lavoro)/i,
    /licenziati/i,
    /divent\w*\s+(milionari|ricc\w+|ricco)/i,
    /arricchir\w*/i,
    /reddito\s+(garantito|assicurato|extra\s+garantito)/i,
    /soldi\s+facili/i,
    /senza\s+lavorare/i,
  ],
};

const HEALTH_RED: PatternRule = {
  ruleId: "NM-02-salute",
  severity: "red",
  message:
    "Claim di salute non verificabile: usa solo claim presenti nei materiali ufficiali caricati, altrimenti descrivi il prodotto senza claim.",
  patterns: [
    /\bcura\b/i,
    /\bcurano\b/i,
    /guarisc\w+/i,
    /\bguarire\b/i,
    /previene\s+(il\s+)?(cancro|tumore|diabete|alzheimer|malattie)/i,
    /anti-?(cancro|tumorale|tumorali)/i,
    /dimagrisc\w*\s+garantito/i,
    /perdi\s+\d+\s*kg/i,
    /perso\s+\d+\s*kg/i,
    /-\d+\s*kg\s+in/i,
    /clinicamente\s+provato/i,
    /approvato\s+dal\s+ministero/i,
    /\bdetox\b/i,
    /disintossica/i,
    /rafforza\s+il\s+sistema\s+immunitario/i,
    /abbassa\s+(il\s+)?colesterolo/i,
  ],
};

const TRANSPARENCY_RED: PatternRule = {
  ruleId: "NM-03-trasparenza",
  severity: "red",
  message:
    "Natura commerciale nascosta: il messaggio deve chiarire chi scrive e che è una proposta commerciale/di collaborazione.",
  patterns: [
    /colloquio\s+di\s+lavoro/i,
    /offerta\s+di\s+lavoro(?!\s+come\s+incaricat)/i,
    /non\s+[èe]\s+(una\s+)?vendita/i,
    /non\s+devi\s+vendere\s+(nulla|niente)/i,
    /senza\s+vendere/i,
  ],
};

const RECRUITMENT_RED: PatternRule = {
  ruleId: "NM-04-reclutamento",
  severity: "red",
  message:
    "Reclutamento come guadagno autonomo: il guadagno non può essere presentato come indipendente dalla vendita di prodotti a clienti finali.",
  patterns: [
    /guadagn\w*\s+(solo\s+)?(reclutando|invitando|portando\s+persone)/i,
    /guadagno\s+dal\s+reclutamento/i,
    /pagat[oa]\s+per\s+reclutare/i,
    /non\s+serve\s+vendere(\s+nulla)?,/i,
  ],
};

const PRESSURE_YELLOW: PatternRule = {
  ruleId: "NM-05-pressione",
  severity: "yellow",
  message:
    "Possibile pressione/falsa urgenza: usa scadenze e disponibilità reali e verificabili, mai inventate.",
  patterns: [
    /ultimi\s+posti/i,
    /solo\s+oggi/i,
    /offerta\s+scade/i,
    /scade\s+(domani|stasera|a\s+mezzanotte)/i,
    /affrettati/i,
    /non\s+perdere\s+(questa\s+)?occasione/i,
    /ultima\s+occasione/i,
    /posti\s+limitati/i,
    /se\s+non\s+decidi\s+ora/i,
    /solo\s+per\s+i\s+primi\s+\d+/i,
  ],
};

const NO_RISK_YELLOW: PatternRule = {
  ruleId: "NM-06-senza-rischio",
  severity: "yellow",
  message:
    "Assenza di rischio dichiarata: ogni attività ha costi e impegno — descrivi i fatti, non azzerare il rischio.",
  patterns: [/nessun\s+rischio/i, /senza\s+rischi/i, /zero\s+rischi/i, /nessun\s+costo\s+nascosto/i],
};

const TESTIMONIAL_YELLOW: PatternRule = {
  ruleId: "NM-07-testimonianze",
  severity: "yellow",
  message:
    "Testimonianza o risultato personale: usala solo se reale, verificabile e con contesto (non come risultato tipico).",
  patterns: [
    /ho\s+guadagnato\s+€?\s?\d/i,
    /guadagno\s+\d/i,
    /prima\s+e\s+dopo/i,
    /risultat[oi]\s+in\s+solo\s+\d+\s+giorni/i,
    /trasformato\s+la\s+mia\s+vita/i,
  ],
};

const VULNERABLE_YELLOW: PatternRule = {
  ruleId: "NM-08-vulnerabili",
  severity: "yellow",
  message:
    "Possibile targeting di persone vulnerabili: non indirizzare chi è in difficoltà economica, anziani vulnerabili o minori.",
  patterns: [
    /disoccupat\w*/i,
    /senza\s+reddito/i,
    /debiti/i,
    /pensione\s+non\s+basta/i,
    /arrotondare\s+la\s+pensione/i,
  ],
};

const RULES: PatternRule[] = [
  INCOME_RED,
  HEALTH_RED,
  TRANSPARENCY_RED,
  RECRUITMENT_RED,
  PRESSURE_YELLOW,
  NO_RISK_YELLOW,
  TESTIMONIAL_YELLOW,
  VULNERABLE_YELLOW,
];

export type ComplianceOptions = {
  /** Se true, i claim di reddito coperti da income disclosure ufficiale non sono rossi. */
  hasOfficialIncomeData?: boolean;
  /** Se true, i claim di salute presenti nei materiali ufficiali non sono rossi. */
  hasOfficialHealthClaim?: boolean;
};

export function checkCompliance(text: string, opts: ComplianceOptions = {}): ComplianceResult {
  const findings: ComplianceFinding[] = [];
  const input = text ?? "";

  for (const rule of RULES) {
    if (rule.ruleId === "NM-01-guadagni" && opts.hasOfficialIncomeData) continue;
    if (rule.ruleId === "NM-02-salute" && opts.hasOfficialHealthClaim) continue;
    for (const pattern of rule.patterns) {
      const match = input.match(pattern);
      if (match) {
        findings.push({
          ruleId: rule.ruleId,
          severity: rule.severity,
          message: rule.message,
          matched: match[0].slice(0, 80),
        });
        break;
      }
    }
  }

  const hasRed = findings.some((f) => f.severity === "red");
  const status: ComplianceStatus = hasRed ? "red" : findings.length > 0 ? "yellow" : "green";

  return {
    status,
    findings,
    rewriteHint:
      status === "green"
        ? null
        : "Riscrivi senza la frase segnalata: parla del prodotto e della tua esperienza reale, indica chi sei (incaricato indipendente di [azienda]), e chiudi con un invito senza pressione. I contenuti lunghi vanno in file scaricabile.",
  };
}

/** Tetto giornaliero di default per bozze di approccio a contatti nuovi. */
export const DEFAULT_DAILY_APPROACH_CAP = 15;
/** Max tentativi di follow-up senza risposta prima di proporre la chiusura. */
export const MAX_FOLLOWUP_ATTEMPTS = 3;

/** Contatto minimo necessario per decidere se una bozza è consentita. */
export type DraftGateContact = {
  doNotContact: boolean;
  hasRelationshipOrConsent: boolean;
};

export type DraftGateResult = { allowed: boolean; reason: string };

/**
 * Cancello anti-spam/consenso: decide se una nuova bozza verso un contatto
 * può essere generata. La lista "Non contattare" e il tetto giornaliero
 * bloccano sempre; senza relazione o consenso si rifiuta.
 */
export function draftGate(
  contact: DraftGateContact,
  approachesToday: number,
  cap: number = DEFAULT_DAILY_APPROACH_CAP,
): DraftGateResult {
  if (contact.doNotContact)
    return { allowed: false, reason: "Contatto in 'Non contattare': nessuna nuova bozza." };
  if (!contact.hasRelationshipOrConsent)
    return {
      allowed: false,
      reason: "Nessuna relazione esistente o consenso: non si scrivono bozze a sconosciuti.",
    };
  if (approachesToday >= cap)
    return {
      allowed: false,
      reason: `Tetto giornaliero raggiunto (${cap} approcci a contatti nuovi).`,
    };
  return { allowed: true, reason: "OK" };
}

/** Versioni del documento regole per la presa visione obbligatoria. */
export const COMPLIANCE_RULES_VERSION = "1.0.0";

/** Regole mostrate al primo avvio con presa visione obbligatoria. */
export const COMPLIANCE_RULES_SUMMARY: string[] = [
  "Niente promesse di guadagno: mai guadagni garantiti, cifre tipiche o stili di vita come risultato atteso (Legge 173/2005).",
  "Niente claim di salute non autorizzati sui prodotti: solo testi dai materiali ufficiali (Reg. CE 1924/2006).",
  "Sempre chiara la natura commerciale: chi scrive e che è una proposta commerciale, mai un 'colloquio di lavoro' (Codice del Consumo).",
  "Solo contatti con relazione esistente o consenso: niente scraping né liste acquistate; ogni 'no' va in 'Non contattare' (GDPR, art. 130 Codice Privacy).",
  "Ogni messaggio verso terzi è una bozza da approvare: mai invii automatici o massivi; max 15 approcci nuovi al giorno.",
  "Niente pressione, falsa urgenza o testimonianze false; niente targeting di persone vulnerabili o minori.",
  "Diritto di recesso di 14 giorni ricordato nelle offerte a distanza o fuori dai locali.",
];
