/**
 * Registro unico delle integrazioni "app esterne" (MCP + native).
 *
 * Perché esiste: il requisito è che *aggiungere una nuova integrazione non
 * richieda codice nuovo*. Quindi qui dentro c'è SOLO dato: nessuna logica,
 * nessun import, nessun adapter. Chi deveimplementare il comportamento di
 * un connettore nativo lo fa in `src/lib/mcp/native/*.ts` e lo dichiara con
 * `native.handler`; per i server MCP remoti non serve altro che questa voce.
 *
 * Il resto del sistema (UI, API, agente) deriva tutto da qui:
 *   - la UI elenca le voci e costruisce i pulsanti "Connetti";
 *   - le route OAuth costruiscono l'authorize URL a partire da `url`/`auth`;
 *   - l'agente namespaccia i tool con `id`;
 *   - il vincolo sui tipi fa fallire il typecheck se una voce dichiara un
 *     `handler` che non esiste.
 *
 * I campi `url` dei server pubblici sono quelli documentati dai rispettivi
 * vendor (vedi `docs/mcp.md`): se un vendor cambia endpoint, si cambia UNA
 * riga qui e il resto del sistema non se ne accorge.
 */

/** Come il client MCP si connette al server. */
export type McpTransport =
  /** Streamable HTTP: POST /mcp con risposta JSON o SSE. È lo standard attuale. */
  | "streamable_http"
  /** SSE legacy: GET /sse per il flusso, POST per i messaggi. */
  | "sse"
  /** Processo locale. Disabilitato di default in ambiente multiutente. */
  | "stdio";

/** Come l'utente si autentica con il server. */
export type McpAuth =
  /** Authorization Code + PKCE, con discovery e Dynamic Client Registration. */
  | "oauth2"
  /** Una chiave statica che l'utente incolla. */
  | "api_key"
  /** Nessuna autenticazione (server pubblici). */
  | "none";

/**
 * `mcp` = il vendor espone un server MCP, noi non facciamo nulla di
 * specifico per l'app.
 * `native` = il vendor NON espone un server MCP e gli tool li implementiamo
 * noi (fallback OAuth2 + API REST).
 */
export type McpIntegrationType = "mcp" | "native";

export type McpRegistryEntry = {
  /** Chiave stabile: identifica il server anche quando l'utente ne cambia il nome. */
  readonly id: string;
  readonly name: string;
  /** Slug del brand: deve esistere in src/lib/brands.ts o public/brand-logos/. */
  readonly icon: string;
  readonly description: string;
  readonly category: string;
  readonly type: McpIntegrationType;
  readonly transport: McpTransport;
  /** Endpoint del server MCP. Obbligatorio per `mcp` e per i `native` con URL proprio. */
  readonly url?: string;
  readonly auth: McpAuth;
  /** Scope OAuth richiesti. Vengono passati al provider e mostrati nel consenso. */
  readonly scopes?: readonly string[];
  /** Header con cui spedire la API key (default `Authorization: Bearer`). */
  readonly apiKeyHeader?: string;
  /**
   * Client OAuth statico, per i server che NON supportano la Dynamic Client
   * Registration (marchio 🔐 nella lista dei server remoti pubblici).
   * Il `clientIdEnv` è il NOME della variabile d'ambiente, non il valore:
   * nessun segreto finisce nel codice.
   */
  readonly staticClient?: {
    readonly clientIdEnv: string;
    readonly clientSecretEnv?: string;
  };
  /**
   * Tool che scrivono/modificano/cancellano (o inviano messaggi) e quindi
   * richiedono la conferma esplicita dell'utente.
   * `"auto"` = decide in base alle annotation del tool MCP (`readOnlyHint`,
   * `destructiveHint`) e su un nome che sembra di scrittura.
   */
  readonly writeTools?: readonly string[] | "auto";
  /**
   * Connettore nativo: riusa un adapter OAuth già esistente in
   * `src/lib/integrations/providers/` invece di implementare un flusso nuovo.
   * L'adapter sa costruire l'authorize URL e scambiare il codice.
   */
  readonly native?: {
    readonly provider: string;
    /** Prefisso del nome del tool esposto al modello. */
    readonly toolPrefix: string;
  };
  /**
   * Tool di un connettore nativo. Obbligatorio per `type: "native"`: sono i
   * tool che l'agente potrà usare, con la loro descrizione e il loro schema.
   * `write: true` significa che il tool modifica dati e richiede la conferma
   * dell'utente prima di girare.
   */
  readonly nativeTools?: readonly McpNativeTool[];
};

/** Tool dichiarato da un connettore nativo. */
export type McpNativeTool = {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: {
    readonly type: "object";
    readonly properties?: Record<string, unknown>;
    readonly required?: readonly string[];
  };
  /** True se il tool scrive: l'utente deve confermare prima. */
  readonly write?: boolean;
};

/**
 * Il registro.
 *
 * AGGIUNGERE UN'INTEGRAZIONE = AGGIUNGERE UNA VOCE QUI.
 * Nessun'altra modifica è necessaria per un server MCP remoto.
 */
export const MCP_REGISTRY = [
  // --- Server MCP remoti con OAuth2 (Dynamic Client Registration) ---------
  {
    id: "notion",
    name: "Notion",
    icon: "notion",
    description: "Pagine e database del tuo workspace Notion.",
    category: "Productivity",
    type: "mcp",
    transport: "sse",
    url: "https://mcp.notion.com/sse",
    auth: "oauth2",
    scopes: [],
  },
  {
    id: "linear",
    name: "Linear",
    icon: "linear",
    description: "Issue, progetti e cicli di sviluppo del tuo team.",
    category: "Project Management",
    type: "mcp",
    transport: "sse",
    url: "https://mcp.linear.app/sse",
    auth: "oauth2",
    scopes: [],
  },
  {
    id: "asana",
    name: "Asana",
    icon: "asana",
    description: "Task, progetti e portfolios di Asana.",
    category: "Project Management",
    type: "mcp",
    transport: "sse",
    url: "https://mcp.asana.com/sse",
    auth: "oauth2",
    scopes: [],
  },
  {
    id: "sentry",
    name: "Sentry",
    icon: "sentry",
    description: "Errori, issue e release della tua organizzazione.",
    category: "Developer",
    type: "mcp",
    transport: "sse",
    url: "https://mcp.sentry.dev/sse",
    auth: "oauth2",
    scopes: [],
  },
  {
    id: "supabase",
    name: "Supabase",
    icon: "supabase",
    description: "Progetti, tabelle e query del tuo Supabase.",
    category: "Developer",
    type: "mcp",
    transport: "streamable_http",
    url: "https://mcp.supabase.com/mcp",
    auth: "oauth2",
    scopes: [],
  },

  // --- Server MCP remoti con OAuth2 ma SENZA registrazione dinamica -------
  // Per questi serve un client OAuth statico: si imposta la variabile
  // d'ambiente indicata in `staticClient.clientIdEnv`.
  {
    id: "figma",
    name: "Figma",
    icon: "figma",
    description: "File, frame e commenti del tuo workspace Figma.",
    category: "Design",
    type: "mcp",
    transport: "streamable_http",
    url: "https://mcp.figma.com/mcp",
    auth: "oauth2",
    scopes: [],
    staticClient: { clientIdEnv: "FIGMA_MCP_CLIENT_ID", clientSecretEnv: "FIGMA_MCP_CLIENT_SECRET" },
  },
  {
    id: "slack",
    name: "Slack",
    icon: "slack",
    description: "Canali, messaggi e utenti del tuo workspace Slack.",
    category: "Messaging",
    type: "mcp",
    transport: "streamable_http",
    url: "https://mcp.slack.com/mcp",
    auth: "oauth2",
    scopes: [],
    staticClient: { clientIdEnv: "SLACK_MCP_CLIENT_ID", clientSecretEnv: "SLACK_MCP_CLIENT_SECRET" },
  },
  {
    id: "github-mcp",
    name: "GitHub",
    icon: "github",
    description: "Repository, issue e pull request di GitHub.",
    category: "Developer",
    type: "mcp",
    transport: "streamable_http",
    url: "https://api.githubcopilot.com/mcp",
    auth: "oauth2",
    scopes: [],
    staticClient: { clientIdEnv: "GITHUB_MCP_CLIENT_ID", clientSecretEnv: "GITHUB_MCP_CLIENT_SECRET" },
  },

  // --- Server MCP pubblici senza autenticazione --------------------------
  {
    id: "exa",
    name: "Exa Search",
    icon: "exa",
    description: "Ricerca web e lettura di pagine.",
    category: "Search",
    type: "mcp",
    transport: "streamable_http",
    url: "https://mcp.exa.ai/mcp",
    auth: "none",
    scopes: [],
  },
  {
    id: "deepwiki",
    name: "DeepWiki",
    icon: "deepwiki",
    description: "Documentazione e domande sui repository pubblici.",
    category: "Search",
    type: "mcp",
    transport: "sse",
    url: "https://mcp.deepwiki.com/sse",
    auth: "none",
    scopes: [],
  },

  // --- Server MCP con API key ------------------------------------------------
  {
    id: "apify",
    name: "Apify",
    icon: "apify",
    description: " scraping e automazione con gli actor di Apify.",
    category: "Developer",
    type: "mcp",
    transport: "streamable_http",
    url: "https://mcp.apify.com",
    auth: "api_key",
    // Header con cui spedire la chiave. Il valore non finisce mai nel
    // frontend: la UI chiede la chiave, la route la cifra e la salva.
    apiKeyHeader: "Authorization",
    scopes: [],
  },

  // --- Connettore NATIVE (nessun server MCP: OAuth2 + API REST) -----------
  // Esempio funzionante del fallback: riusa l'adapter OAuth di GitHub già
  // presente in src/lib/integrations/providers/github.ts.
  {
    id: "github-native",
    name: "GitHub (diretto)",
    icon: "github",
    description: "Repository e issue tramite l'API REST di GitHub.",
    category: "Developer",
    type: "native",
    transport: "streamable_http",
    auth: "oauth2",
    scopes: ["repo", "read:user"],
    native: { provider: "github", toolPrefix: "github" },
    writeTools: ["github_create_issue"],
    nativeTools: [
      {
        name: "github_list_repositories",
        description:
          "List the repositories the connected GitHub account can access, with their default branch and star count.",
        inputSchema: {
          type: "object",
          properties: {
            per_page: { type: "number", description: "How many repositories to return (max 100)." },
            sort: {
              type: "string",
              description: "Sort order: updated, created, pushed, full_name.",
            },
          },
        },
      },
      {
        name: "github_create_issue",
        description:
          "Create an issue in a repository of the connected GitHub account. This writes to GitHub and requires the user's confirmation.",
        write: true,
        inputSchema: {
          type: "object",
          properties: {
            owner: { type: "string", description: "Repository owner (user or organisation)." },
            repo: { type: "string", description: "Repository name." },
            title: { type: "string", description: "Issue title." },
            body: { type: "string", description: "Issue body, in Markdown." },
            labels: {
              type: "array",
              items: { type: "string" },
              description: "Optional labels to apply.",
            },
          },
          required: ["owner", "repo", "title"],
        },
      },
    ],
  },
] as const satisfies readonly McpRegistryEntry[];

export type McpRegistryId = (typeof MCP_REGISTRY)[number]["id"];

const BY_ID = new Map<string, McpRegistryEntry>(
  MCP_REGISTRY.map((e) => [e.id, e as McpRegistryEntry]),
);

/** Voce del registro per id, o `undefined`. */
export function getMcpEntry(id: string | null | undefined): McpRegistryEntry | undefined {
  if (!id) return undefined;
  return BY_ID.get(id.toLowerCase());
}

/** True se l'id è di una voce del registro. */
export function isMcpRegistryId(id: string): boolean {
  return BY_ID.has(id.toLowerCase());
}

/** Tutte le voci, per la UI. */
export function listMcpEntries(): McpRegistryEntry[] {
  return MCP_REGISTRY.map((e) => e as McpRegistryEntry);
}

/** Voci native (fallback OAuth2 senza server MCP). */
export function listNativeEntries(): McpRegistryEntry[] {
  return listMcpEntries().filter((e) => e.type === "native");
}

/**
 * Categorie usate dalla UI, nell'ordine in cui mostrarle.
 * Derivata dal registro: una categoria nuova non richiede di toccare nulla.
 */
export function mcpCategories(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of listMcpEntries()) {
    if (!seen.has(e.category)) {
      seen.add(e.category);
      out.push(e.category);
    }
  }
  return out;
}
