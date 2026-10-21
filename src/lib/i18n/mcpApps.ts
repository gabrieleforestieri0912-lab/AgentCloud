/**
 * Testi della pagina "Connetti app" (integrazioni MCP).
 *
 * Modulo separato da `dictionaries.ts` per lo stesso motivo di `legal.ts` e
 * `appClients.ts`: contenuti di una feature, serviti quasi tutti da un
 * client component, che non devono gonfiare il dizionario principale.
 *
 * Le chiavi sono in italiano (lingua di partenza) e le traduzioni seguono.
 * L'inglese è la lingua di fallback della piattaforma.
 */

import { DEFAULT_LOCALE, type Locale } from "./constants";

export type McpAppsCopy = {
  metaTitle: string;
  metaDescription: string;
  title: string;
  subtitle: string;
  searchLabel: string;
  searchPlaceholder: string;
  allCategories: string;
  empty: string;
  /** Colonna di sinistra: cosa si può collegare. */
  availableTitle: string;
  /** Colonna di destra: cosa è collegato. */
  connectedTitle: string;
  connectedEmpty: string;
  connect: string;
  connecting: string;
  disconnect: string;
  disconnecting: string;
  reconnect: string;
  statusNotConnected: string;
  statusConnected: string;
  statusPending: string;
  statusError: string;
  statusReconnect: string;
  /** Blocco "tool disponibili" di un'app collegata. */
  toolsTitle: string;
  toolsEmpty: string;
  toolsHint: string;
  toolWriteBadge: string;
  toolReadBadge: string;
  /** Toggle di un tool. */
  toggleEnable: string;
  toggleDisable: string;
  /** Form per un server MCP personalizzato. */
  customTitle: string;
  customWarning: string;
  customName: string;
  customNamePlaceholder: string;
  customUrl: string;
  customUrlPlaceholder: string;
  customTransport: string;
  customTransportHttp: string;
  customTransportSse: string;
  customAuth: string;
  customAuthNone: string;
  customAuthApiKey: string;
  customAuthOAuth: string;
  customApiKey: string;
  customApiKeyPlaceholder: string;
  customSubmit: string;
  customSubmitting: string;
  /** Messaggi di esito/errore. */
  errorGeneric: string;
  errorUnknownApp: string;
  errorReachable: string;
  successConnected: string;
  successDisconnected: string;
  successToolsUpdated: string;
  /** Banner di sicurezza della sezione API key. */
  apiKeyNotice: string;
};

const it: McpAppsCopy = {
  metaTitle: "Connetti app · AgentCloud",
  metaDescription:
    "Collega Notion, Linear, GitHub e altre app: l'agente le usa a nome tuo, con il tuo consenso.",
  title: "Connetti app",
  subtitle:
    "Collega le app che vuoi usare. L'agente chiederà la conferma ogni volta che un'azione modifica qualcosa.",
  searchLabel: "Cerca un'app",
  searchPlaceholder: "Cerca fra le app disponibili",
  allCategories: "Tutte",
  empty: "Nessuna app corrisponde alla ricerca.",
  availableTitle: "App disponibili",
  connectedTitle: "App collegate",
  connectedEmpty: "Non hai ancora collegato nessuna app.",
  connect: "Collega",
  connecting: "Collegamento…",
  disconnect: "Disconnetti",
  disconnecting: "Disconnessione…",
  reconnect: "Ricollega",
  statusNotConnected: "Non collegata",
  statusConnected: "Collegata",
  statusPending: "In attesa",
  statusError: "Errore",
  statusReconnect: "Da ricollegare",
  toolsTitle: "Strumenti disponibili",
  toolsEmpty: "Questa app non espone strumenti.",
  toolsHint:
    "Spegni gli strumenti che non vuoi usare. Quelli che scrivono dati chiedono conferma prima di agire.",
  toolWriteBadge: "scrive",
  toolReadBadge: "legge",
  toggleEnable: "Abilita",
  toggleDisable: "Disabilita",
  customTitle: "Aggiungi un server MCP",
  customWarning:
    "Solo https, e solo verso indirizzi pubblici: gli indirizzi interni e le reti locali vengono rifiutati. La chiave che inserisci viene cifrata e non lascia mai il server.",
  customName: "Nome",
  customNamePlaceholder: "Il mio server MCP",
  customUrl: "URL del server",
  customUrlPlaceholder: "https://mcp.example.com/mcp",
  customTransport: "Trasporto",
  customTransportHttp: "Streamable HTTP",
  customTransportSse: "SSE",
  customAuth: "Autenticazione",
  customAuthNone: "Nessuna",
  customAuthApiKey: "API key",
  customAuthOAuth: "OAuth 2.1",
  customApiKey: "API key",
  customApiKeyPlaceholder: "La chiave del tuo server",
  customSubmit: "Aggiungi",
  customSubmitting: "Aggiunta…",
  errorGeneric: "Qualcosa è andato storto. Riprova.",
  errorUnknownApp: "App non riconosciuta.",
  errorReachable: "Il server non è raggiungibile.",
  successConnected: "App collegata.",
  successDisconnected: "App disconnessa.",
  successToolsUpdated: "Strumenti aggiornati.",
  apiKeyNotice:
    "La chiave viene cifrata prima di essere salvata e non viene mai mostrata di nuovo.",
};

const en: McpAppsCopy = {
  metaTitle: "Connect apps · AgentCloud",
  metaDescription:
    "Connect Notion, Linear, GitHub and other apps: your agent uses them on your behalf, with your consent.",
  title: "Connect apps",
  subtitle:
    "Connect the apps you want to use. The agent asks for confirmation every time an action changes something.",
  searchLabel: "Search an app",
  searchPlaceholder: "Search the available apps",
  allCategories: "All",
  empty: "No app matches your search.",
  availableTitle: "Available apps",
  connectedTitle: "Connected apps",
  connectedEmpty: "You have not connected any app yet.",
  connect: "Connect",
  connecting: "Connecting…",
  disconnect: "Disconnect",
  disconnecting: "Disconnecting…",
  reconnect: "Reconnect",
  statusNotConnected: "Not connected",
  statusConnected: "Connected",
  statusPending: "Pending",
  statusError: "Error",
  statusReconnect: "Needs reconnecting",
  toolsTitle: "Available tools",
  toolsEmpty: "This app exposes no tools.",
  toolsHint:
    "Turn off the tools you do not want to use. The ones that write data always ask for confirmation first.",
  toolWriteBadge: "writes",
  toolReadBadge: "reads",
  toggleEnable: "Enable",
  toggleDisable: "Disable",
  customTitle: "Add an MCP server",
  customWarning:
    "HTTPS only, and only towards public addresses: internal addresses and local networks are rejected. The key you enter is encrypted and never leaves the server.",
  customName: "Name",
  customNamePlaceholder: "My MCP server",
  customUrl: "Server URL",
  customUrlPlaceholder: "https://mcp.example.com/mcp",
  customTransport: "Transport",
  customTransportHttp: "Streamable HTTP",
  customTransportSse: "SSE",
  customAuth: "Authentication",
  customAuthNone: "None",
  customAuthApiKey: "API key",
  customAuthOAuth: "OAuth 2.1",
  customApiKey: "API key",
  customApiKeyPlaceholder: "Your server key",
  customSubmit: "Add",
  customSubmitting: "Adding…",
  errorGeneric: "Something went wrong. Please try again.",
  errorUnknownApp: "Unknown app.",
  errorReachable: "The server is not reachable.",
  successConnected: "App connected.",
  successDisconnected: "App disconnected.",
  successToolsUpdated: "Tools updated.",
  apiKeyNotice:
    "The key is encrypted before it is stored and is never shown again.",
};

const es: McpAppsCopy = {
  metaTitle: "Conectar apps · AgentCloud",
  metaDescription:
    "Conecta Notion, Linear, GitHub y otras apps: tu agente las usa en tu nombre, con tu consentimiento.",
  title: "Conectar apps",
  subtitle:
    "Conecta las apps que quieras usar. El agente pedirá confirmación cada vez que una acción modifique algo.",
  searchLabel: "Buscar una app",
  searchPlaceholder: "Buscar entre las apps disponibles",
  allCategories: "Todas",
  empty: "Ninguna app coincide con la búsqueda.",
  availableTitle: "Apps disponibles",
  connectedTitle: "Apps conectadas",
  connectedEmpty: "Todavía no has conectado ninguna app.",
  connect: "Conectar",
  connecting: "Conectando…",
  disconnect: "Desconectar",
  disconnecting: "Desconectando…",
  reconnect: "Volver a conectar",
  statusNotConnected: "No conectada",
  statusConnected: "Conectada",
  statusPending: "Pendiente",
  statusError: "Error",
  statusReconnect: "Hay que volver a conectar",
  toolsTitle: "Herramientas disponibles",
  toolsEmpty: "Esta app no expone herramientas.",
  toolsHint:
    "Apaga las herramientas que no quieras usar. Las que escriben datos piden confirmación antes de actuar.",
  toolWriteBadge: "escribe",
  toolReadBadge: "lee",
  toggleEnable: "Activar",
  toggleDisable: "Desactivar",
  customTitle: "Añadir un servidor MCP",
  customWarning:
    "Solo https y solo hacia direcciones públicas: las direcciones internas y las redes locales se rechazan. La clave que introduces se cifra y nunca sale del servidor.",
  customName: "Nombre",
  customNamePlaceholder: "Mi servidor MCP",
  customUrl: "URL del servidor",
  customUrlPlaceholder: "https://mcp.example.com/mcp",
  customTransport: "Transporte",
  customTransportHttp: "Streamable HTTP",
  customTransportSse: "SSE",
  customAuth: "Autenticación",
  customAuthNone: "Ninguna",
  customAuthApiKey: "API key",
  customAuthOAuth: "OAuth 2.1",
  customApiKey: "API key",
  customApiKeyPlaceholder: "La clave de tu servidor",
  customSubmit: "Añadir",
  customSubmitting: "Añadiendo…",
  errorGeneric: "Algo ha salido mal. Inténtalo de nuevo.",
  errorUnknownApp: "App desconocida.",
  errorReachable: "El servidor no es accesible.",
  successConnected: "App conectada.",
  successDisconnected: "App desconectada.",
  successToolsUpdated: "Herramientas actualizadas.",
  apiKeyNotice:
    "La clave se cifra antes de guardarse y nunca se vuelve a mostrar.",
};

const de: McpAppsCopy = {
  metaTitle: "Apps verbinden · AgentCloud",
  metaDescription:
    "Verbinde Notion, Linear, GitHub und andere Apps: Dein Agent nutzt sie in deinem Namen, mit deiner Zustimmung.",
  title: "Apps verbinden",
  subtitle:
    "Verbinde die Apps, die du nutzen möchtest. Der Agent fragt bei jeder Änderung um Bestätigung.",
  searchLabel: "App suchen",
  searchPlaceholder: "In den verfügbaren Apps suchen",
  allCategories: "Alle",
  empty: "Keine App passt zur Suche.",
  availableTitle: "Verfügbare Apps",
  connectedTitle: "Verbundene Apps",
  connectedEmpty: "Du hast noch keine App verbunden.",
  connect: "Verbinden",
  connecting: "Verbindung…",
  disconnect: "Trennen",
  disconnecting: "Trennung…",
  reconnect: "Erneut verbinden",
  statusNotConnected: "Nicht verbunden",
  statusConnected: "Verbunden",
  statusPending: "Ausstehend",
  statusError: "Fehler",
  statusReconnect: "Erneut verbinden nötig",
  toolsTitle: "Verfügbare Werkzeuge",
  toolsEmpty: "Diese App stellt keine Werkzeuge bereit.",
  toolsHint:
    "Schalte Werkzeuge ab, die du nicht nutzen willst. Werkzeuge, die Daten schreiben, fragen immer vorher nach.",
  toolWriteBadge: "schreibt",
  toolReadBadge: "liest",
  toggleEnable: "Aktivieren",
  toggleDisable: "Deaktivieren",
  customTitle: "MCP-Server hinzufügen",
  customWarning:
    "Nur https und nur zu öffentlichen Adressen: interne Adressen und lokale Netze werden abgelehnt. Der eingegebene Schlüssel wird verschlüsselt und verlässt den Server nie.",
  customName: "Name",
  customNamePlaceholder: "Mein MCP-Server",
  customUrl: "Server-URL",
  customUrlPlaceholder: "https://mcp.example.com/mcp",
  customTransport: "Transport",
  customTransportHttp: "Streamable HTTP",
  customTransportSse: "SSE",
  customAuth: "Authentifizierung",
  customAuthNone: "Keine",
  customAuthApiKey: "API-Schlüssel",
  customAuthOAuth: "OAuth 2.1",
  customApiKey: "API-Schlüssel",
  customApiKeyPlaceholder: "Der Schlüssel deines Servers",
  customSubmit: "Hinzufügen",
  customSubmitting: "Wird hinzugefügt…",
  errorGeneric: "Etwas ist schiefgelaufen. Bitte erneut versuchen.",
  errorUnknownApp: "Unbekannte App.",
  errorReachable: "Der Server ist nicht erreichbar.",
  successConnected: "App verbunden.",
  successDisconnected: "App getrennt.",
  successToolsUpdated: "Werkzeuge aktualisiert.",
  apiKeyNotice:
    "Der Schlüssel wird vor dem Speichern verschlüsselt und nie wieder angezeigt.",
};

const fr: McpAppsCopy = {
  metaTitle: "Connecter des apps · AgentCloud",
  metaDescription:
    "Connectez Notion, Linear, GitHub et d'autres apps : votre agent les utilise pour vous, avec votre accord.",
  title: "Connecter des apps",
  subtitle:
    "Connectez les apps que vous voulez utiliser. L'agent demande confirmation chaque fois qu'une action modifie quelque chose.",
  searchLabel: "Rechercher une app",
  searchPlaceholder: "Rechercher parmi les apps disponibles",
  allCategories: "Toutes",
  empty: "Aucune app ne correspond à la recherche.",
  availableTitle: "Apps disponibles",
  connectedTitle: "Apps connectées",
  connectedEmpty: "Vous n'avez encore connecté aucune app.",
  connect: "Connecter",
  connecting: "Connexion…",
  disconnect: "Déconnecter",
  disconnecting: "Déconnexion…",
  reconnect: "Reconnecter",
  statusNotConnected: "Non connectée",
  statusConnected: "Connectée",
  statusPending: "En attente",
  statusError: "Erreur",
  statusReconnect: "À reconnecter",
  toolsTitle: "Outils disponibles",
  toolsEmpty: "Cette app n'expose aucun outil.",
  toolsHint:
    "Désactivez les outils que vous ne voulez pas utiliser. Ceux qui écrivent des données demandent toujours confirmation.",
  toolWriteBadge: "écrit",
  toolReadBadge: "lit",
  toggleEnable: "Activer",
  toggleDisable: "Désactiver",
  customTitle: "Ajouter un serveur MCP",
  customWarning:
    "HTTPS uniquement, et uniquement vers des adresses publiques : les adresses internes et les réseaux locaux sont refusés. La clé saisie est chiffrée et ne quitte jamais le serveur.",
  customName: "Nom",
  customNamePlaceholder: "Mon serveur MCP",
  customUrl: "URL du serveur",
  customUrlPlaceholder: "https://mcp.example.com/mcp",
  customTransport: "Transport",
  customTransportHttp: "Streamable HTTP",
  customTransportSse: "SSE",
  customAuth: "Authentification",
  customAuthNone: "Aucune",
  customAuthApiKey: "Clé API",
  customAuthOAuth: "OAuth 2.1",
  customApiKey: "Clé API",
  customApiKeyPlaceholder: "La clé de votre serveur",
  customSubmit: "Ajouter",
  customSubmitting: "Ajout…",
  errorGeneric: "Une erreur est survenue. Réessayez.",
  errorUnknownApp: "App inconnue.",
  errorReachable: "Le serveur n'est pas joignable.",
  successConnected: "App connectée.",
  successDisconnected: "App déconnectée.",
  successToolsUpdated: "Outils mis à jour.",
  apiKeyNotice:
    "La clé est chiffrée avant d'être stockée et n'est plus jamais affichée.",
};

const BY_LOCALE: Record<Locale, McpAppsCopy> = { it, en, es, de, fr };

/** Testi della pagina "Connetti app" per la lingua richiesta. */
export function getMcpAppsCopy(locale: Locale): McpAppsCopy {
  return BY_LOCALE[locale] ?? BY_LOCALE[DEFAULT_LOCALE];
}
