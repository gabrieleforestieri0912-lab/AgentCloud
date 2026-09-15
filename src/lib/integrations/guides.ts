/**
 * Guide passo-passo per ogni integrazione disponibile.
 * Testi semplici, non tecnici, per utenti non sviluppatori.
 * Ogni provider ha 3 passi: Prepara -> Collega -> Prova.
 */

export type GuideStep = {
  title: string;
  desc: string;
};

export type IntegrationGuide = {
  provider: string; // brand lower, es. "shopify" | "stripe" | "gmail" etc
  whatItDoes: string;
  steps: [GuideStep, GuideStep, GuideStep];
  needHelp?: string;
  time: string; // es. "2 min"
};

export const INTEGRATION_GUIDES: Record<string, IntegrationGuide> = {
  shopify: {
    provider: "shopify",
    whatItDoes: "Collega il tuo negozio: l'agente legge prodotti, crea carrelli e controlla ordini.",
    time: "2 min",
    steps: [
      { title: "Prepara", desc: "Tieni a portata di mano l'indirizzo del tuo store: es. tuo-store.myshopify.com. Devi essere admin dello store." },
      { title: "Collega", desc: "Clicca Connetti → inserisci il dominio → autorizza su Shopify (un click)." },
      { title: "Prova", desc: "Torna qui: vedrai Connesso. Chiedi all'agente: cerca un prodotto o crea un carrello." },
    ],
    needHelp: "Se vedi errore, verifica il dominio e che l'app AgentCloud sia approvata.",
  },
  stripe: {
    provider: "stripe",
    whatItDoes: "Collega i pagamenti: l'agente crea fatture e controlla incassi.",
    time: "2 min",
    steps: [
      { title: "Prepara", desc: "Serve un account Stripe (anche test). Accedi a Stripe prima di collegare." },
      { title: "Collega", desc: "Clicca Connetti → autorizza su Stripe Connect → torna qui." },
      { title: "Prova", desc: "Stato Connesso. Prova con Finance Manager: chiedi di creare una fattura." },
    ],
  },
  gmail: {
    provider: "gmail",
    whatItDoes: "Collega l'email: l'agente legge, ordina e prepara bozze.",
    time: "1 min",
    steps: [
      { title: "Prepara", desc: "Usa il tuo account Google. Nessuna password da copiare." },
      { title: "Collega", desc: "Clicca Connetti Google → consenti Gmail e Calendar (schermata Google)." },
      { title: "Prova", desc: "Vedrai l'email collegata. Chiedi: smista le email di oggi." },
    ],
  },
  googlecalendar: {
    provider: "googlecalendar",
    whatItDoes: "Collega il calendario: l'agente prenota e controlla disponibilità.",
    time: "1 min",
    steps: [
      { title: "Prepara", desc: "Stesso account Google di Gmail. Basta un account." },
      { title: "Collega", desc: "Clicca Connetti Google → consenti l'accesso al calendario." },
      { title: "Prova", desc: "Connesso. Prova: aggiungi un evento domani alle 15." },
    ],
  },
  hubspot: {
    provider: "hubspot",
    whatItDoes: "Collega il CRM: l'agente legge e crea contatti.",
    time: "2 min",
    steps: [
      { title: "Prepara", desc: "Serve un account HubSpot (gratis va bene). Accedi prima." },
      { title: "Collega", desc: "Clicca Connetti → scegli l'account HubSpot → autorizza." },
      { title: "Prova", desc: "Connesso. Chiedi a Lead Capture: crea un contatto di prova." },
    ],
  },
  notion: {
    provider: "notion",
    whatItDoes: "Collega le pagine Notion: l'agente legge, crea e aggiorna documenti.",
    time: "2 min",
    steps: [
      { title: "Prepara", desc: "Apri Notion e tieni pronto il workspace." },
      { title: "Collega", desc: "Clicca Connetti → seleziona le pagine da condividere → consenti." },
      { title: "Prova", desc: "Connesso. Chiedi: crea una nota in Notion con il riassunto di oggi." },
    ],
    needHelp: "Se non vedi pagine, condividile con l'integrazione AgentCloud in Notion.",
  },
  googlesheets: {
    provider: "googlesheets",
    whatItDoes: "Collega i fogli Google: l'agente legge, scrive e crea report.",
    time: "1 min",
    steps: [
      { title: "Prepara", desc: "Account Google. Niente file da caricare." },
      { title: "Collega", desc: "Clicca Connetti → consenti Fogli (spreadsheets) su Google." },
      { title: "Prova", desc: "Connesso. Prova: leggi l'ultima riga del mio foglio vendite." },
    ],
  },
  slack: {
    provider: "slack",
    whatItDoes: "Collega Slack: l'agente invia notifiche al team.",
    time: "2 min",
    steps: [
      { title: "Prepara", desc: "Devi essere admin o avere permesso di aggiungere app su Slack." },
      { title: "Collega", desc: "Clicca Connetti → scegli il workspace → autorizza il bot." },
      { title: "Prova", desc: "Connesso. Chiedi: avvisa il team su Slack del nuovo lead." },
    ],
  },
};

export function getGuideForBrand(brand: string): IntegrationGuide | null {
  return INTEGRATION_GUIDES[brand.toLowerCase()] ?? null;
}
