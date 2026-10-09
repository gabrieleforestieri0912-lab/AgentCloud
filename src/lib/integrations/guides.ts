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
  provider: string; // brand lower, es. "shopify" | "gmail" | "github" etc
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
  github: {
    provider: "github",
    whatItDoes: "Collega GitHub: l'agente legge repo, PR e issue.",
    time: "1 min",
    steps: [
      { title: "Prepara", desc: "Serve un account GitHub. Accedi a github.com prima di collegare." },
      { title: "Collega", desc: "Clicca Connetti → autorizza AgentCloud su GitHub → torna qui." },
      { title: "Prova", desc: "Connesso. Chiedi: lista le mie repo o crea una issue." },
    ],
  },
  clickup: {
    provider: "clickup",
    whatItDoes: "Collega ClickUp: l'agente crea task e organizza i tuoi progetti.",
    time: "2 min",
    steps: [
      { title: "Prepara", desc: "Serve un account ClickUp: anche il piano Free va bene. Accedi a clickup.com prima." },
      { title: "Collega", desc: "Clicca Connetti → scegli il Workspace da autorizzare → torna qui." },
      { title: "Prova", desc: "Connesso. Chiedi: crea un task di prova nel mio space." },
    ],
  },
  asana: {
    provider: "asana",
    whatItDoes: "Collega Asana: l'agente crea task e aggiorna progetti.",
    time: "2 min",
    steps: [
      { title: "Prepara", desc: "Serve un account Asana. Accedi a app.asana.com prima." },
      { title: "Collega", desc: "Clicca Connetti → autorizza AgentCloud su Asana → torna qui." },
      { title: "Prova", desc: "Connesso. Chiedi: crea un task di prova nel mio progetto." },
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
    needHelp: "Se Google mostra “app non verificata”: clicca Avanzate → Vai a AgentCloud per continuare in sicurezza.",
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
    needHelp: "Se Google mostra “app non verificata”: clicca Avanzate → Vai a AgentCloud per continuare in sicurezza.",
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
  googledrive: {
    provider: "googledrive",
    whatItDoes: "Collega Google Drive: l'agente cerca i tuoi file e ne legge il contenuto.",
    time: "1 min",
    steps: [
      { title: "Prepara", desc: "Account Google. Nessun file da caricare." },
      { title: "Collega", desc: "Clicca Connetti → autorizza Google Drive. Vedrai due voci: lettura dei file e creazione di file." },
      { title: "Prova", desc: "Connesso. Chiedi: trova il mio documento budget e riassumilo." },
    ],
    needHelp: "Se un file non compare, controlla che non sia nel cestino e che l'agente abbia il permesso di lettura.",
  },
  airtable: {
    provider: "airtable",
    whatItDoes: "Collega Airtable: l'agente legge le tue basi, le tabelle e i record.",
    time: "2 min",
    steps: [
      { title: "Prepara", desc: "Account Airtable. Almeno una base deve essere condivisa con l'integrazione." },
      { title: "Collega", desc: "Clicca Connetti → autorizza su Airtable → scegli le basi da condividere." },
      { title: "Prova", desc: "Connesso. Chiedi: quante tabelle ha la mia base CRM? Poi: elenca i record con Status: Open." },
    ],
    needHelp: "Se una base non appare, ricorda che va condivisa con l'integrazione: apri la base → Share → aggiungi l'integrazione.",
  },
  trello: {
    provider: "trello",
    whatItDoes: "Collega Trello: l'agente legge le tue board e le card, con scadenze.",
    time: "1 min",
    steps: [
      { title: "Prepara", desc: "Account Trello. Nessuna preparazione: autorizzi e basta." },
      { title: "Collega", desc: "Clicca Connetti → autorizza su Trello → Allow. Il collegamento dura 30 giorni." },
      { title: "Prova", desc: "Connesso. Chiedi: quali board ho? Poi: elenca le card in scadenza questa settimana." },
    ],
    needHelp: "Il token Trello scade dopo 30 giorni e non si rinnova da solo: quando l'agente ti dice che la connessione è scaduta, clicca di nuovo Connetti.",
  },
  woocommerce: {
    provider: "woocommerce",
    whatItDoes: "Collega WooCommerce: l'agente legge prodotti, ordini e clienti del tuo store.",
    time: "3 min",
    steps: [
      {
        title: "Prepara",
        desc: "Controlla che WooCommerce sia attivo (wp-admin → WooCommerce → Stato) e che il negozio abbia un utente con permessi Amministratore/Manager: senza, WooCommerce risponde “non hai i permessi” e non mostra la richiesta.",
      },
      {
        title: "Collega",
        desc: "Incolla qui sotto il dominio del tuo store e premi il pulsante. Verrai portato su WooCommerce, dove trovi «AgentCloud vuole connettersi al tuo store» con l'elenco dei permessi richiesti (sola lettura): premi Approva.",
      },
      { title: "Prova", desc: "Connesso. Chiedi: quali sono gli ordini in lavorazione? Poi: elenca i prodotti esauriti." },
    ],
    needHelp: "Se non compare la schermata di autorizzazione: il negozio deve avere i permalink attivi (Impostazioni → Permaletti, non “Semplice”), altrimenti l'endpoint va chiamato come /index.php/wc-auth/v1/authorize. Se l'approvazione parte ma la connessione resta in attesa, le credenziali non sono ancora arrivate: ricarica la pagina.",
  },
  mailchimp: {
    provider: "mailchimp",
    whatItDoes: "Collega Mailchimp: l'agente legge le tue audience, le statistiche e le campagne.",
    time: "2 min",
    steps: [
      {
        title: "Prepara",
        desc: "In Mailchimp apri Account → Extra → OAuth2 → registra un'integrazione. Copia API Key e Client Secret.",
      },
      { title: "Collega", desc: "Clicca Connetti → autorizza su Mailchimp. Nessun piano a pagamento serve." },
      { title: "Prova", desc: "Connesso. Chiedi: quante persone ho nella mia audience? Poi: com'è andata l'ultima campagna?" },
    ],
    needHelp: "Se un audience non compare, l'integrazione OAuth2 deve avere permessi Read-Write. In questa versione l'agente legge solo: non invia campagne e non aggiunge iscritti.",
  },
};

export function getGuideForBrand(brand: string): IntegrationGuide | null {
  return INTEGRATION_GUIDES[brand.toLowerCase()] ?? null;
}
