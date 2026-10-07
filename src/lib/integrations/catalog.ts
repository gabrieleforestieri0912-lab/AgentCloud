/**
 * Registro unico dei provider d'integrazione (Phase 2, decisione 3).
 *
 * Perché esiste: prima ogni provider era registrato a mano in 8+ liste
 * indipendenti (union TS, mappa adapter, union del proxy, nomi dei tool, mappe
 * UI, catalogo, guide, SQL). Aggiungerne uno dimenticandone una rompeva in
 * silenzio la card, il badge di stato o il redirect di connessione.
 *
 * Qui c'è la sola fonte di verità: `SupportedProvider`, la mappa degli adapter,
 * l'union del proxy e i metadati per la UI derivano da questo file.
 *
 * Aggiungere un connettore = 1 riga in PROVIDER_CATALOG + 1 adapter in
 * providers/ + 1 voce in registry.ts. `npm run typecheck` segnala se manca
 * qualcosa, perché le union sono derivate da questo array.
 *
 * ATTENZIONE: `supabase/schema-*.sql` duplica la lista dei provider (check
 * constraint). Non può derivarla da qui: va aggiornato insieme. Il vincolo
 * hard-delete le righe dei provider fuori dal set, quindi un provider nuovo
 * senza il relativo SQL verrebbe cancellato alla riesecuzione dello schema.
 */

export type AuthType =
  /** OAuth 2.0 authorization_code, senza PKCE. */
  | "oauth2"
  /** OAuth 2.0 authorization_code + PKCE (S256). Richiede code_verifier persistito. */
  | "oauth2_pkce"
  /**
   * Non è OAuth: l'utente inserisce un dato (URL store) e il provider
   * restituisce una coppia di credenziali. Serve `tenantInput`.
   */
  | "keypair";

export type TenantInputField = {
  readonly key: string;
  readonly label: string;
  readonly placeholder: string;
  /** Se true il valore viene validato come URL pubblico (obbligatorio per host). */
  readonly validateAsUrl?: boolean;
  /** Aiuto mostrato sotto il campo: quasi sempre serve spiegare come trovarlo. */
  readonly hint?: string;
};

export type ProviderCatalogEntry = {
  /** Chiave usata in tenant_integrations.provider e nelle route /api/integrations/<provider>. */
  readonly id: string;
  /** Etichetta leggibile: usata nei messaggi all'utente e in `PROVIDER_LABEL`. */
  readonly label: string;
  /** Brand slug: deve combaciare con src/lib/brands.ts e public/brand-logos/. */
  readonly brand: string;
  /** Categoria per il filtro nella pagina integrazioni (stringa libera, vedi INTEGRATION_CATEGORIES). */
  readonly category: string;
  readonly authType: AuthType;
  /** Scope OAuth dichiarati dal provider. Documentale: il codice li passa dove serve. */
  readonly scopes: readonly string[];
  /**
   * True se il provider è passato dal proxy condiviso in api-proxy.ts.
   * `google_sheets` è false perché ha un modulo dedicato (src/lib/google/sheets.ts)
   * e le sue tool stanno in tools.ts, non in integration-tools.ts.
   */
  readonly hasApiProxy: boolean;
  /**
   * Campi che il provider pretende dall'utente prima di autorizzare. WooCommerce
   * ne ha due (URL dello store + WordPress User ID). La UI li raccoglie con un
   * form GET verso /api/integrations/<provider>/authorize, che li valida server
   * side e li firma dentro lo `state`.
   */
  readonly tenantInput?: {
    readonly fields: readonly TenantInputField[];
  };
};

/**
 * Rifiutiamo l'annotazione esplicita `: readonly ProviderCatalogEntry[]` qui:
 * allargherebbe `hasApiProxy` da `true | false` a `boolean` e in api-proxy.ts
 * `Extract<..., { hasApiProxy: true }>` darebbe `never`. `as const` sotto
 * preserva i literal, che è ciò che rende derivabile GenericProvider.
 *
 * `ProviderCatalogEntry` resta esportata come forma documentale: la usano le
 * firme delle funzioni helper, dove i literal non servono.
 */
export const PROVIDER_CATALOG = [
  // --- Già esistenti (non toccare il comportamento) -------------------------
  {
    id: "notion",
    label: "Notion",
    brand: "notion",
    category: "Productivity",
    authType: "oauth2",
    scopes: [],
    hasApiProxy: true,
  },
  {
    id: "slack",
    label: "Slack",
    brand: "slack",
    category: "Messaging",
    authType: "oauth2",
    scopes: ["channels:read", "chat:write"],
    hasApiProxy: true,
  },
  {
    id: "hubspot",
    label: "HubSpot",
    brand: "hubspot",
    category: "CRM",
    authType: "oauth2",
    scopes: [],
    hasApiProxy: true,
  },
  {
    id: "google_sheets",
    label: "Google Sheets",
    brand: "googlesheets",
    category: "Storage",
    authType: "oauth2",
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    hasApiProxy: false,
  },
  {
    id: "github",
    label: "GitHub",
    brand: "github",
    category: "Developer",
    authType: "oauth2",
    scopes: ["repo", "read:user", "user:email"],
    hasApiProxy: true,
  },
  {
    id: "clickup",
    label: "ClickUp",
    brand: "clickup",
    category: "Productivity",
    authType: "oauth2",
    scopes: [],
    hasApiProxy: true,
  },
  {
    id: "asana",
    label: "Asana",
    brand: "asana",
    category: "Productivity",
    authType: "oauth2",
    scopes: [],
    hasApiProxy: true,
  },

  // --- Batch 2 (Fase 3) ----------------------------------------------------
  {
    id: "google_drive",
    label: "Google Drive",
    brand: "googledrive",
    category: "Storage",
    authType: "oauth2",
    // drive.file = solo i file creati dall'app; drive.readonly = lettura dei
    // file dell'utente. Insieme coprono il caso d'uso senza chiedere l'accesso
    // completo al Drive, che è la versione che Google sottopone a verifica
    // manuale per le app "sensitive"/non verificate.
    scopes: [
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/drive.readonly",
    ],
    hasApiProxy: true,
  },
  {
    id: "airtable",
    label: "Airtable",
    brand: "airtable",
    category: "Database",
    authType: "oauth2_pkce",
    // Sola lettura: i tool esposti sono read-only. `data.records:write` resta
    // fuori finché non esiste il meccanismo di conferma delle scritture fra
    // handler e UI (Open Decision 14) e il tool che lo usa: uno scope di
    // scrittura richiesto e mai usato allarga l'autorizzazione senza motivo.
    scopes: ["data.records:read", "schema.bases:read"],
    hasApiProxy: true,
  },
  {
    id: "trello",
    label: "Trello",
    brand: "trello",
    category: "Project Management",
    authType: "oauth2",
    // Trello non è un authorization_code flow "classico": restituisce il token
    // nell'URL di redirect. `expiration=30days` tiene il token a 30 giorni
    // invece che a 157 (massimo consentito) per non costringere il tenant a
    // riconnettersi ogni 5 mesi.
    scopes: ["read", "write"],
    hasApiProxy: true,
  },
  {
    id: "woocommerce",
    label: "WooCommerce",
    brand: "woocommerce",
    category: "E-commerce",
    authType: "keypair",
    scopes: ["read_write"],
    hasApiProxy: true,
    tenantInput: {
      fields: [
        {
          key: "store_url",
          label: "URL del tuo store WooCommerce",
          placeholder: "https://tuo-store.com",
          validateAsUrl: true,
          hint: "Il dominio del tuo shop WordPress, senza /wp-admin.",
        },
        {
          key: "user_id",
          label: "Il tuo WordPress User ID",
          placeholder: "1",
          hint: "In WP: Utenti → passa il mouse su Modifica → l'URL finisce con user_id=1.",
        },
      ],
    },
  },
  {
    id: "mailchimp",
    label: "Mailchimp",
    brand: "mailchimp",
    category: "Marketing",
    authType: "oauth2",
    // Mailchimp non usa scope OAuth: l'accesso è per-account. I permessi
    // effettivi sono read/write sull'audience; va registrata una sola
    // integrazione "Read-Write" sulla piattaforma Mailchimp.
    scopes: [],
    hasApiProxy: true,
  },
  {
    id: "microsoft",
    label: "Microsoft 365",
    brand: "microsoft",
    category: "Productivity",
    // PKCE obbligatorio e permessi delegati: l'API OneNote non supporta più
    // l'autenticazione app-only, quindi un flusso client_credentials non basterebbe.
    authType: "oauth2_pkce",
    // Una sola connessione abilita Word, Excel, PowerPoint e OneNote. Gli scope
    // sono quelli minimi delegati; Sites.ReadWrite.All (SharePoint) è un opt-in
    // esplicito via MS_SHAREPOINT, non un default silenzioso nel consenso.
    scopes: ["offline_access", "User.Read", "Files.ReadWrite", "Notes.ReadWrite"],
    hasApiProxy: true,
  },
] as const;

/**
 * Provider IMPLEMENTATI, in ordine di arrivo. Il catalogo sopra li dichiara
 * tutti in anticipo (ci sono le scope, i brand, le guide), ma un provider non
 * entra qui finché non ha adapter, proxy e tool: le route OAuth rispondono
 * "unsupported provider" e la card resta in "Prossimamente".
 *
 * È una lista separata dal catalogo di proposito: `Record<SupportedProvider,
 * IntegrationProvider>` in registry.ts non tollererebbe provider dichiarati ma
 * non ancora scritti, e la build si romperebbe a ogni connettore mancante.
 * L'unico limite garantito è che un implementato senza adapter fallisce il
 * typecheck, che è il vincolo che conta.
 */
export const IMPLEMENTED_PROVIDERS = [
  "notion",
  "slack",
  "hubspot",
  "google_sheets",
  "github",
  "clickup",
  "asana",
  "google_drive",
  "airtable",
  "trello",
  "woocommerce",
  "mailchimp",
  "microsoft",
] as const;

export type ImplementedProvider = (typeof IMPLEMENTED_PROVIDERS)[number];

/** True se il provider è pronto all'uso (adapter + proxy + tool). */
export function isImplementedProvider(id: string): id is ImplementedProvider {
  return (IMPLEMENTED_PROVIDERS as readonly string[]).includes(id);
}

const BY_ID = new Map<string, ProviderCatalogEntry>(
  PROVIDER_CATALOG.map((p) => [p.id, p as ProviderCatalogEntry]),
);

export function getCatalogEntry(id: string): ProviderCatalogEntry | undefined {
  return BY_ID.get(id?.toLowerCase() ?? "");
}

/**
 * Provider che hanno un proxy condiviso in api-proxy.ts. Usato dai test per
 * verificare che ogni provider dichiarato `hasApiProxy` abbia il proxy scritto.
 */
export function apiProxyProviderIds(): string[] {
  return PROVIDER_CATALOG.filter((p) => p.hasApiProxy).map((p) => p.id as string);
}

/** Categorie usate dalla pagina integrazioni, nell'ordine in cui mostrarle. */
export const INTEGRATION_CATEGORIES: readonly string[] = [
  "Storage",
  "Database",
  "Project Management",
  "E-commerce",
  "Marketing",
  "Productivity",
  "CRM",
  "Messaging",
  "Developer",
];