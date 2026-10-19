/**
 * Contenuti i18n di "App ed estensioni": l'hub `/install` e le pagine
 * dedicate a ogni client (`/cli`, `/extension`, `/desktop`).
 *
 * Perché un modulo separato da `dictionaries.ts`: sono pagine di marketing
 * ricche di testo, servite solo da server component. Tenerle qui evita di
 * gonfiare il dizionario client (`dictionaries.ts` finisce nel bundle) e
 * segue la convenzione già usata da `legal.ts` e `agentDetail.ts`.
 *
 * La pagina mobile ha già la sua sezione (`dict.mobile`) perché è nata prima:
 * l'hub la cita con la propria card, senza duplicarne la pagina.
 *
 * Onestà di stato: la CLI è pubblicata su npm (`agentcloud-cli`) quindi è
 * "available"; estensione, desktop e mobile sono annunciate ma non ancora
 * scaricabili, e il testo lo dice senza suggerire installazioni finte.
 */

import type { Locale } from "./constants";

export type ClientSlug = "cli" | "extension" | "desktop" | "mobile";

/** I client con una pagina dedicata propria (mobile vive in `dict.mobile`). */
export type DocumentedClientSlug = Exclude<ClientSlug, "mobile">;

/** Rotte delle pagine dedicate: qui una volta sola, così non si divergono. */
export const CLIENT_PATHS: Record<ClientSlug, string> = {
  cli: "/cli",
  extension: "/extension",
  desktop: "/desktop",
  mobile: "/mobile",
};

/**
 * Comandi di installazione della CLI: veri e verificati (vedi `cli/README.md`).
 * Stanno qui come costanti perché hub e pagina CLI mostrano gli stessi comandi.
 */
export const CLI_INSTALL_NPM = "npm i -g agentcloud-cli";
export const CLI_INSTALL_CURL =
  "curl -fsSL https://raw.githubusercontent.com/gabrieleforestieri0912-lab/AgentCloud/main/cli/install.sh | sh";

export type HubCard = {
  slug: ClientSlug;
  title: string;
  desc: string;
  cta: string;
  /** false = già disponibile: niente badge "in arrivo". */
  soon: boolean;
};

export type AppHubContent = {
  metaTitle: string;
  metaDescription: string;
  badge: string;
  titleA: string;
  titleB: string;
  subtitle: string;
  availableBadge: string;
  soonBadge: string;
  quickTitle: string;
  quickNpm: string;
  quickCurl: string;
  accountTitle: string;
  accountText: string;
  cards: HubCard[];
};

export type InstallStep = {
  /** Cosa fa il passo, in linguaggio naturale. */
  label: string;
  /** Comando o pacchetto da digitare/scaricare, se il passo ne ha uno. */
  code?: string;
};

export type ClientPageContent = {
  metaTitle: string;
  metaDescription: string;
  badge: string;
  titleA: string;
  titleB: string;
  subtitle: string;
  /** true = installabile oggi (la pagina non nasconde il pulsante). */
  available: boolean;
  statusLabel: string;
  statusNote: string;
  /** Etichetta del link di ritorno all'hub. */
  hubLink: string;
  installTitle: string;
  installNote: string;
  installSteps: InstallStep[];
  featuresTitle: string;
  features: { title: string; text: string }[];
  ctaTitle: string;
  ctaText: string;
  ctaLabel: string;
};

// ─── Italiano ────────────────────────────────────────────────────────────────

const hubIt: AppHubContent = {
  metaTitle: "App ed estensioni",
  metaDescription:
    "AgentCloud nel terminale, nel browser, sul desktop e sul telefono: installa la CLI o consulta la pagina dedicata di ogni client. Stessa sessione, stessi agenti.",
  badge: "App ed estensioni",
  titleA: "Scegli da dove",
  titleB: "far lavorare gli agenti",
  subtitle:
    "Quattro modi di usare AgentCloud: terminale, browser, desktop e mobile. La CLI è già disponibile; gli altri client arrivano dagli store ufficiali. Ogni client ha la sua pagina.",
  availableBadge: "Disponibile ora",
  soonBadge: "In arrivo",
  quickTitle: "Installa la CLI con un comando",
  quickNpm: "npm — tutti i sistemi, Node 18+",
  quickCurl: "script — macOS e Linux",
  accountTitle: "Un account, una sessione",
  accountText:
    "Accedi una volta e ritrovi gli stessi agenti su ogni client. La CLI usa la stessa sessione del sito; estensione, desktop e mobile seguiranno lo stesso schema.",
  cards: [
    {
      slug: "cli",
      title: "CLI Terminale",
      desc: "Agenti in script, cron e pipeline CI/CD: login dal browser, risposte in streaming e sessioni riprendibili.",
      cta: "Apri la pagina CLI",
      soon: false,
    },
    {
      slug: "extension",
      title: "Estensione browser",
      desc: "Un copilota nel pannello laterale: legge la scheda attiva e ci lavora su tua richiesta.",
      cta: "Apri la pagina estensione",
      soon: true,
    },
    {
      slug: "desktop",
      title: "App Desktop",
      desc: "La chat in una finestra dedicata su macOS, Windows e Linux, con notifiche di sistema.",
      cta: "Apri la pagina desktop",
      soon: true,
    },
    {
      slug: "mobile",
      title: "App Mobile",
      desc: "Gli agenti in tasca su iOS e Android, con notifiche push e approvazioni rapide.",
      cta: "Apri la pagina mobile",
      soon: true,
    },
  ],
};

const cliIt: ClientPageContent = {
  metaTitle: "CLI AgentCloud: gli agenti AI nel terminale",
  metaDescription:
    "Installa la CLI di AgentCloud con npm o con lo script: agenti in script, cron e pipeline CI/CD, login dal browser e sessioni riprendibili.",
  badge: "Terminale",
  titleA: "Agenti AI",
  titleB: "nel tuo terminale",
  subtitle:
    "Un solo binario per tutti i tuoi agenti: chatti in una TUI a schermo intero, lanci task dagli script e riprendi la sessione di ieri.",
  available: true,
  statusLabel: "Disponibile ora",
  statusNote:
    "Pubblicata su npm come agentcloud-cli. Richiede Node 18 o superiore e funziona su Linux, macOS e Windows.",
  hubLink: "App ed estensioni",
  installTitle: "Installazione",
  installNote:
    "Scegli npm o lo script: installano lo stesso comando agentcloud. Lo script dice anche come installare Node se manca.",
  installSteps: [
    { label: "Installa con npm (tutti i sistemi)", code: CLI_INSTALL_NPM },
    { label: "oppure con lo script (macOS e Linux)", code: CLI_INSTALL_CURL },
    { label: "Accedi dal browser, senza digitare password", code: "agentcloud login" },
    { label: "Apri la chat e scegli l'agente", code: "agentcloud chat" },
  ],
  featuresTitle: "Cosa ci fai",
  features: [
    {
      title: "Risposte in streaming",
      text: "La conversazione arriva in diretta, con markdown e diff dei file che l'agente modifica.",
    },
    {
      title: "TUI a schermo intero",
      text: "Chat con barra laterale, storico delle sessioni e menu comandi: comoda come un editor.",
    },
    {
      title: "Sessioni riprendibili",
      text: "Il flag --resume <id> riprende una conversazione esattamente dove l'avevi lasciata.",
    },
    {
      title: "Pensata per la CI",
      text: "Senza terminale interattivo i colori si spengono da soli e i token API act_ autenticano senza browser.",
    },
  ],
  ctaTitle: "Prova la CLI con il tuo account",
  ctaText:
    "Gli stessi agenti della piattaforma web, con la prova gratuita di 5 messaggi al giorno in totale.",
  ctaLabel: "Crea un account",
};

const extensionIt: ClientPageContent = {
  metaTitle: "Estensione browser AgentCloud: in arrivo",
  metaDescription:
    "L'estensione browser di AgentCloud è in arrivo sul Chrome Web Store: un pannello laterale che lavora sulla scheda attiva con gli stessi agenti.",
  badge: "Browser",
  titleA: "Il copilota",
  titleB: "in ogni scheda",
  subtitle:
    "Un pannello laterale che vede la pagina che stai guardando e usa gli stessi agenti: riassume, estrae dati e risponde partendo dal contesto che hai davanti.",
  available: false,
  statusLabel: "In arrivo",
  statusNote:
    "Non è ancora pubblicata: sta arrivando sul Chrome Web Store. Qui trovi come funzionerà, senza scaricare nulla a mano.",
  hubLink: "App ed estensioni",
  installTitle: "Come si installerà",
  installNote:
    "Solo dallo store ufficiale, con aggiornamenti automatici: nessun pacchetto da caricare in modalità sviluppatore.",
  installSteps: [
    { label: "Installa dal Chrome Web Store" },
    { label: "Apri il pannello laterale sulla scheda che ti interessa" },
    { label: "Accedi con lo stesso account del sito" },
  ],
  featuresTitle: "Cosa saprà fare",
  features: [
    {
      title: "Legge la scheda attiva",
      text: "Parte dal testo, dalla tabella o dal modulo che hai davanti, senza copiare e incollare.",
    },
    {
      title: "Pannello laterale",
      text: "Vive accanto alla pagina, così non perdi di vista quello che stai leggendo.",
    },
    {
      title: "Stessa sessione del sito",
      text: "Usa l'account con cui hai fatto l'accesso: nessun token da incollare.",
    },
    {
      title: "Browser Chromium",
      text: "Pensata per Chrome, Edge, Brave e Opera. Stessi agenti e stesse integrazioni della piattaforma.",
    },
  ],
  ctaTitle: "Vuoi sapere quando esce?",
  ctaText:
    "Intanto puoi usare gli stessi agenti dal sito o dalla CLI: sono gli stessi account e le stesse integrazioni.",
  ctaLabel: "Scrivici",
};

const desktopIt: ClientPageContent = {
  metaTitle: "App desktop AgentCloud: in arrivo",
  metaDescription:
    "L'app desktop di AgentCloud è in arrivo su macOS, Windows e Linux: chat in una finestra dedicata, notifiche di sistema e sessione persistente.",
  badge: "Desktop",
  titleA: "Gli agenti in una",
  titleB: "finestra dedicata",
  subtitle:
    "La chat completa su macOS, Windows e Linux, con notifiche di sistema: la comodità del browser senza le sue distrazioni.",
  available: false,
  statusLabel: "In arrivo",
  statusNote:
    "In sviluppo: finché la build non è firmata non pubblichiamo nessun download. Qui trovi come arriverà.",
  hubLink: "App ed estensioni",
  installTitle: "Come si installerà",
  installNote:
    "Dai canali ufficiali e con aggiornamenti automatici: nessun archivio da estrarre a mano.",
  installSteps: [
    { label: "Scarica il pacchetto per il tuo sistema", code: "macOS — .dmg" },
    { label: "Windows", code: "Windows — .exe" },
    { label: "Linux", code: "Linux — .AppImage, .deb" },
    { label: "Accedi con lo stesso account e ritrovi i tuoi agenti" },
  ],
  featuresTitle: "Cosa saprà fare",
  features: [
    {
      title: "Notifiche di sistema",
      text: "Ti avvisa quando un agente finisce un task o aspetta la tua approvazione.",
    },
    {
      title: "Resti connesso",
      text: "Tra un avvio e l'altro la sessione resta attiva: riapri e trovi la conversazione.",
    },
    {
      title: "Finestra dedicata",
      text: "Niente tab da chiudere per sbaglio: l'agente ha il suo spazio sullo schermo.",
    },
    {
      title: "Stessa piattaforma",
      text: "Stessi agenti, stesse integrazioni e stessa cronologia che vedi dal sito.",
    },
  ],
  ctaTitle: "Vuoi essere tra i primi?",
  ctaText:
    "Puoi già lavorare con gli stessi agenti dal sito e dalla CLI, con lo stesso account.",
  ctaLabel: "Scrivici",
};

// ─── English ─────────────────────────────────────────────────────────────────

const hubEn: AppHubContent = {
  metaTitle: "Apps and extensions",
  metaDescription:
    "AgentCloud in your terminal, browser, desktop and phone: install the CLI or browse the dedicated page for each client. Same session, same agents.",
  badge: "Apps & extensions",
  titleA: "Choose where",
  titleB: "your agents run",
  subtitle:
    "Four ways to use AgentCloud: terminal, browser, desktop and mobile. The CLI is available today; the other clients will arrive from the official stores. Each client has its own page.",
  availableBadge: "Available now",
  soonBadge: "Coming soon",
  quickTitle: "Install the CLI with one command",
  quickNpm: "npm — every system, Node 18+",
  quickCurl: "script — macOS and Linux",
  accountTitle: "One account, one session",
  accountText:
    "Sign in once and your agents are there on every client. The CLI uses the same session as the website; the extension, desktop and mobile apps will follow the same design.",
  cards: [
    {
      slug: "cli",
      title: "Terminal CLI",
      desc: "Agents in scripts, cron and CI/CD pipelines: browser login, streamed answers and resumable sessions.",
      cta: "Open the CLI page",
      soon: false,
    },
    {
      slug: "extension",
      title: "Browser extension",
      desc: "A copilot in the side panel: it reads the active tab and works on it when you ask.",
      cta: "Open the extension page",
      soon: true,
    },
    {
      slug: "desktop",
      title: "Desktop app",
      desc: "Chat in a dedicated window on macOS, Windows and Linux, with system notifications.",
      cta: "Open the desktop page",
      soon: true,
    },
    {
      slug: "mobile",
      title: "Mobile app",
      desc: "Your agents in your pocket on iOS and Android, with push notifications and quick approvals.",
      cta: "Open the mobile page",
      soon: true,
    },
  ],
};

const cliEn: ClientPageContent = {
  metaTitle: "AgentCloud CLI: AI agents in your terminal",
  metaDescription:
    "Install the AgentCloud CLI with npm or a script: agents in scripts, cron and CI/CD pipelines, browser login and resumable sessions.",
  badge: "Terminal",
  titleA: "AI agents",
  titleB: "in your terminal",
  subtitle:
    "One binary for all your agents: chat in a full-screen TUI, run tasks from scripts and resume yesterday's session.",
  available: true,
  statusLabel: "Available now",
  statusNote:
    "Published on npm as agentcloud-cli. Requires Node 18 or newer and runs on Linux, macOS and Windows.",
  hubLink: "Apps & extensions",
  installTitle: "Installation",
  installNote:
    "Pick npm or the script: both install the same agentcloud command. The script also tells you how to install Node if it is missing.",
  installSteps: [
    { label: "Install with npm (every system)", code: CLI_INSTALL_NPM },
    { label: "or with the script (macOS and Linux)", code: CLI_INSTALL_CURL },
    { label: "Sign in from the browser, no password to type", code: "agentcloud login" },
    { label: "Open the chat and pick an agent", code: "agentcloud chat" },
  ],
  featuresTitle: "What you can do",
  features: [
    {
      title: "Streamed answers",
      text: "The conversation arrives live, with markdown and a diff of every file the agent changes.",
    },
    {
      title: "Full-screen TUI",
      text: "Chat with a sidebar, session history and a command menu: as comfortable as an editor.",
    },
    {
      title: "Resumable sessions",
      text: "The --resume <id> flag picks a conversation up exactly where you left it.",
    },
    {
      title: "Built for CI",
      text: "Outside an interactive terminal colours turn off by themselves and act_ API tokens authenticate without a browser.",
    },
  ],
  ctaTitle: "Try the CLI with your account",
  ctaText:
    "The same agents as the web platform, with the free trial of 5 messages a day in total.",
  ctaLabel: "Create an account",
};

const extensionEn: ClientPageContent = {
  metaTitle: "AgentCloud browser extension: coming soon",
  metaDescription:
    "The AgentCloud browser extension is coming to the Chrome Web Store: a side panel that works on the active tab with the same agents.",
  badge: "Browser",
  titleA: "A copilot",
  titleB: "in every tab",
  subtitle:
    "A side panel that sees the page you are looking at and uses the same agents: it summarises, extracts data and answers from the context you have in front of you.",
  available: false,
  statusLabel: "Coming soon",
  statusNote:
    "It is not published yet: it is heading to the Chrome Web Store. Here is how it will work, with no manual package to load.",
  hubLink: "Apps & extensions",
  installTitle: "How it will install",
  installNote:
    "From the official store only, with automatic updates: no package to load in developer mode.",
  installSteps: [
    { label: "Install from the Chrome Web Store" },
    { label: "Open the side panel on the tab you are working on" },
    { label: "Sign in with the same account you use on the website" },
  ],
  featuresTitle: "What it will do",
  features: [
    {
      title: "Reads the active tab",
      text: "It starts from the text, table or form in front of you, with no copy and paste.",
    },
    {
      title: "Side panel",
      text: "It lives next to the page, so you never lose sight of what you are reading.",
    },
    {
      title: "Same session as the website",
      text: "It uses the account you signed in with: no token to paste.",
    },
    {
      title: "Chromium browsers",
      text: "Built for Chrome, Edge, Brave and Opera. Same agents and integrations as the platform.",
    },
  ],
  ctaTitle: "Want to know when it ships?",
  ctaText:
    "In the meantime you can use the same agents from the website or the CLI: same accounts, same integrations.",
  ctaLabel: "Get in touch",
};

const desktopEn: ClientPageContent = {
  metaTitle: "AgentCloud desktop app: coming soon",
  metaDescription:
    "The AgentCloud desktop app is coming to macOS, Windows and Linux: chat in a dedicated window, system notifications and a persistent session.",
  badge: "Desktop",
  titleA: "Your agents in a",
  titleB: "dedicated window",
  subtitle:
    "The full chat on macOS, Windows and Linux, with system notifications: the convenience of the browser without its distractions.",
  available: false,
  statusLabel: "Coming soon",
  statusNote:
    "In development: until the build is signed we will not publish a download. Here is how it will arrive.",
  hubLink: "Apps & extensions",
  installTitle: "How it will install",
  installNote:
    "From the official channels, with automatic updates: no archive to unpack by hand.",
  installSteps: [
    { label: "Download the package for your system", code: "macOS — .dmg" },
    { label: "Windows", code: "Windows — .exe" },
    { label: "Linux", code: "Linux — .AppImage, .deb" },
    { label: "Sign in with the same account and your agents are there" },
  ],
  featuresTitle: "What it will do",
  features: [
    {
      title: "System notifications",
      text: "It tells you when an agent finishes a task or is waiting for your approval.",
    },
    {
      title: "You stay signed in",
      text: "The session survives restarts: reopen the app and your conversation is there.",
    },
    {
      title: "A dedicated window",
      text: "No tab to close by mistake: your agent gets its own space on screen.",
    },
    {
      title: "Same platform",
      text: "Same agents, same integrations and the same history you see on the website.",
    },
  ],
  ctaTitle: "Want to be among the first?",
  ctaText:
    "You can already work with the same agents from the website and the CLI, with the same account.",
  ctaLabel: "Get in touch",
};

// ─── Español ─────────────────────────────────────────────────────────────────

const hubEs: AppHubContent = {
  metaTitle: "Apps y extensiones",
  metaDescription:
    "AgentCloud en la terminal, el navegador, el escritorio y el móvil: instala la CLI o consulta la página de cada cliente. Misma sesión, mismos agentes.",
  badge: "Apps y extensiones",
  titleA: "Elige desde dónde",
  titleB: "trabajan los agentes",
  subtitle:
    "Cuatro formas de usar AgentCloud: terminal, navegador, escritorio y móvil. La CLI ya está disponible; los demás clientes llegarán desde las tiendas oficiales. Cada cliente tiene su página.",
  availableBadge: "Disponible ahora",
  soonBadge: "Muy pronto",
  quickTitle: "Instala la CLI con un comando",
  quickNpm: "npm — todos los sistemas, Node 18+",
  quickCurl: "script — macOS y Linux",
  accountTitle: "Una cuenta, una sesión",
  accountText:
    "Inicia sesión una vez y tus agentes estarán en cada cliente. La CLI usa la misma sesión que la web; la extensión, el escritorio y el móvil seguirán el mismo diseño.",
  cards: [
    {
      slug: "cli",
      title: "CLI de terminal",
      desc: "Agentes en scripts, cron y canalizaciones CI/CD: acceso desde el navegador, respuestas en streaming y sesiones recuperables.",
      cta: "Abrir la página de la CLI",
      soon: false,
    },
    {
      slug: "extension",
      title: "Extensión de navegador",
      desc: "Un copiloto en el panel lateral: lee la pestaña activa y trabaja en ella cuando se lo pides.",
      cta: "Abrir la página de la extensión",
      soon: true,
    },
    {
      slug: "desktop",
      title: "App de escritorio",
      desc: "El chat en una ventana propia en macOS, Windows y Linux, con notificaciones del sistema.",
      cta: "Abrir la página de escritorio",
      soon: true,
    },
    {
      slug: "mobile",
      title: "App móvil",
      desc: "Tus agentes en el bolsillo en iOS y Android, con notificaciones push y aprobaciones rápidas.",
      cta: "Abrir la página móvil",
      soon: true,
    },
  ],
};

const cliEs: ClientPageContent = {
  metaTitle: "CLI de AgentCloud: agentes de IA en la terminal",
  metaDescription:
    "Instala la CLI de AgentCloud con npm o con el script: agentes en scripts, cron y CI/CD, acceso desde el navegador y sesiones recuperables.",
  badge: "Terminal",
  titleA: "Agentes de IA",
  titleB: "en tu terminal",
  subtitle:
    "Un solo binario para todos tus agentes: chatea en una TUI a pantalla completa, lanza tareas desde scripts y retoma la sesión de ayer.",
  available: true,
  statusLabel: "Disponible ahora",
  statusNote:
    "Publicada en npm como agentcloud-cli. Requiere Node 18 o superior y funciona en Linux, macOS y Windows.",
  hubLink: "Apps y extensiones",
  installTitle: "Instalación",
  installNote:
    "Elige npm o el script: ambos instalan el mismo comando agentcloud. El script también explica cómo instalar Node si falta.",
  installSteps: [
    { label: "Instala con npm (todos los sistemas)", code: CLI_INSTALL_NPM },
    { label: "o con el script (macOS y Linux)", code: CLI_INSTALL_CURL },
    { label: "Inicia sesión desde el navegador, sin escribir contraseña", code: "agentcloud login" },
    { label: "Abre el chat y elige el agente", code: "agentcloud chat" },
  ],
  featuresTitle: "Qué puedes hacer",
  features: [
    {
      title: "Respuestas en streaming",
      text: "La conversación llega en directo, con markdown y el diff de cada archivo que el agente modifica.",
    },
    {
      title: "TUI a pantalla completa",
      text: "Chat con barra lateral, historial de sesiones y menú de comandos: cómodo como un editor.",
    },
    {
      title: "Sesiones recuperables",
      text: "El flag --resume <id> retoma una conversación justo donde la dejaste.",
    },
    {
      title: "Pensada para CI",
      text: "Fuera de una terminal interactiva los colores se apagan solos y los tokens act_ autentican sin navegador.",
    },
  ],
  ctaTitle: "Prueba la CLI con tu cuenta",
  ctaText:
    "Los mismos agentes de la plataforma web, con la prueba gratuita de 5 mensajes al día en total.",
  ctaLabel: "Crear una cuenta",
};

const extensionEs: ClientPageContent = {
  metaTitle: "Extensión de navegador de AgentCloud: muy pronto",
  metaDescription:
    "La extensión de navegador de AgentCloud llega a Chrome Web Store: un panel lateral que trabaja en la pestaña activa con los mismos agentes.",
  badge: "Navegador",
  titleA: "El copiloto",
  titleB: "en cada pestaña",
  subtitle:
    "Un panel lateral que ve la página que estás mirando y usa los mismos agentes: resume, extrae datos y responde a partir del contexto que tienes delante.",
  available: false,
  statusLabel: "Muy pronto",
  statusNote:
    "Todavía no está publicada: llegará a Chrome Web Store. Aquí tienes cómo funcionará, sin cargar paquetes a mano.",
  hubLink: "Apps y extensiones",
  installTitle: "Cómo se instalará",
  installNote:
    "Solo desde la tienda oficial y con actualizaciones automáticas: ningún paquete que cargar en modo desarrollador.",
  installSteps: [
    { label: "Instálala desde Chrome Web Store" },
    { label: "Abre el panel lateral en la pestaña que te interesa" },
    { label: "Inicia sesión con la misma cuenta de la web" },
  ],
  featuresTitle: "Qué sabrá hacer",
  features: [
    {
      title: "Lee la pestaña activa",
      text: "Parte del texto, la tabla o el formulario que tienes delante, sin copiar y pegar.",
    },
    {
      title: "Panel lateral",
      text: "Vive junto a la página, así no pierdes de vista lo que estás leyendo.",
    },
    {
      title: "Misma sesión que la web",
      text: "Usa la cuenta con la que has iniciado sesión: ningún token que pegar.",
    },
    {
      title: "Navegadores Chromium",
      text: "Pensada para Chrome, Edge, Brave y Opera. Mismos agentes e integraciones que la plataforma.",
    },
  ],
  ctaTitle: "¿Quieres saber cuándo sale?",
  ctaText:
    "Mientras tanto puedes usar los mismos agentes desde la web o la CLI: mismas cuentas, mismas integraciones.",
  ctaLabel: "Escríbenos",
};

const desktopEs: ClientPageContent = {
  metaTitle: "App de escritorio de AgentCloud: muy pronto",
  metaDescription:
    "La app de escritorio de AgentCloud llega a macOS, Windows y Linux: chat en una ventana propia, notificaciones del sistema y sesión persistente.",
  badge: "Escritorio",
  titleA: "Tus agentes en una",
  titleB: "ventana propia",
  subtitle:
    "El chat completo en macOS, Windows y Linux, con notificaciones del sistema: la comodidad del navegador sin sus distracciones.",
  available: false,
  statusLabel: "Muy pronto",
  statusNote:
    "En desarrollo: hasta que la build esté firmada no publicaremos ninguna descarga. Aquí tienes cómo llegará.",
  hubLink: "Apps y extensiones",
  installTitle: "Cómo se instalará",
  installNote:
    "Desde los canales oficiales y con actualizaciones automáticas: ningún archivo que descomprimir a mano.",
  installSteps: [
    { label: "Descarga el paquete para tu sistema", code: "macOS — .dmg" },
    { label: "Windows", code: "Windows — .exe" },
    { label: "Linux", code: "Linux — .AppImage, .deb" },
    { label: "Inicia sesión con la misma cuenta y tus agentes están ahí" },
  ],
  featuresTitle: "Qué sabrá hacer",
  features: [
    {
      title: "Notificaciones del sistema",
      text: "Te avisa cuando un agente termina una tarea o espera tu aprobación.",
    },
    {
      title: "Sigues con la sesión abierta",
      text: "La sesión sobrevive a los reinicios: vuelve a abrir y tu conversación está ahí.",
    },
    {
      title: "Ventana propia",
      text: "Ninguna pestaña que cerrar por error: el agente tiene su espacio en pantalla.",
    },
    {
      title: "La misma plataforma",
      text: "Mismos agentes, mismas integraciones y el mismo historial que ves en la web.",
    },
  ],
  ctaTitle: "¿Quieres estar entre los primeros?",
  ctaText:
    "Ya puedes trabajar con los mismos agentes desde la web y la CLI, con la misma cuenta.",
  ctaLabel: "Escríbenos",
};

// ─── Deutsch ─────────────────────────────────────────────────────────────────

const hubDe: AppHubContent = {
  metaTitle: "Apps und Erweiterungen",
  metaDescription:
    "AgentCloud im Terminal, im Browser, auf dem Desktop und auf dem Handy: installiere die CLI oder lies die eigene Seite zu jedem Client. Gleiche Sitzung, gleiche Agenten.",
  badge: "Apps & Erweiterungen",
  titleA: "Du entscheidest, wo",
  titleB: "deine Agenten arbeiten",
  subtitle:
    "Vier Wege, AgentCloud zu nutzen: Terminal, Browser, Desktop und Mobil. Die CLI ist bereits verfügbar; die übrigen Clients kommen aus den offiziellen Stores. Jeder Client hat seine eigene Seite.",
  availableBadge: "Jetzt verfügbar",
  soonBadge: "Demnächst",
  quickTitle: "CLI mit einem Befehl installieren",
  quickNpm: "npm — alle Systeme, Node 18+",
  quickCurl: "Skript — macOS und Linux",
  accountTitle: "Ein Konto, eine Sitzung",
  accountText:
    "Einmal anmelden und deine Agenten sind in jedem Client da. Die CLI nutzt dieselbe Sitzung wie die Website; Erweiterung, Desktop und Mobil folgen demselben Prinzip.",
  cards: [
    {
      slug: "cli",
      title: "Terminal-CLI",
      desc: "Agenten in Skripten, Cron und CI/CD-Pipelines: Browser-Login, gestreamte Antworten und fortsetzbare Sitzungen.",
      cta: "Zur CLI-Seite",
      soon: false,
    },
    {
      slug: "extension",
      title: "Browser-Erweiterung",
      desc: "Ein Copilot im Seitenbereich: liest den aktiven Tab und arbeitet auf Anfrage darin.",
      cta: "Zur Erweiterungs-Seite",
      soon: true,
    },
    {
      slug: "desktop",
      title: "Desktop-App",
      desc: "Der Chat in einem eigenen Fenster unter macOS, Windows und Linux, mit Systembenachrichtigungen.",
      cta: "Zur Desktop-Seite",
      soon: true,
    },
    {
      slug: "mobile",
      title: "Mobile App",
      desc: "Deine Agenten für iOS und Android in der Tasche, mit Push-Benachrichtigungen und schnellen Freigaben.",
      cta: "Zur Mobile-Seite",
      soon: true,
    },
  ],
};

const cliDe: ClientPageContent = {
  metaTitle: "AgentCloud CLI: KI-Agenten im Terminal",
  metaDescription:
    "Installiere die AgentCloud CLI mit npm oder dem Skript: Agenten in Skripten, Cron und CI/CD, Browser-Login und fortsetzbare Sitzungen.",
  badge: "Terminal",
  titleA: "KI-Agenten",
  titleB: "in deinem Terminal",
  subtitle:
    "Eine Binary für alle Agenten: chatte in einer bildschirmfüllenden TUI, starte Aufgaben aus Skripten und setze die Sitzung von gestern fort.",
  available: true,
  statusLabel: "Jetzt verfügbar",
  statusNote:
    "Als agentcloud-cli auf npm veröffentlicht. Braucht Node 18 oder neuer und läuft unter Linux, macOS und Windows.",
  hubLink: "Apps & Erweiterungen",
  installTitle: "Installation",
  installNote:
    "Wähle npm oder das Skript: beide installieren denselben Befehl agentcloud. Das Skript erklärt auch, wie man Node installiert, falls es fehlt.",
  installSteps: [
    { label: "Mit npm installieren (alle Systeme)", code: CLI_INSTALL_NPM },
    { label: "oder mit dem Skript (macOS und Linux)", code: CLI_INSTALL_CURL },
    { label: "Im Browser anmelden, ohne Passwort zu tippen", code: "agentcloud login" },
    { label: "Chat öffnen und Agenten auswählen", code: "agentcloud chat" },
  ],
  featuresTitle: "Was du damit machst",
  features: [
    {
      title: "Gestreamte Antworten",
      text: "Die Unterhaltung kommt live, mit Markdown und Diff jeder Datei, die der Agent ändert.",
    },
    {
      title: "Bildschirmfüllende TUI",
      text: "Chat mit Seitenleiste, Sitzungsverlauf und Befehlsmenü: so bequem wie ein Editor.",
    },
    {
      title: "Fortsetzbare Sitzungen",
      text: "Mit --resume <id> setzt du ein Gespräch genau dort fort, wo du aufgehört hast.",
    },
    {
      title: "Für CI gebaut",
      text: "Außerhalb eines interaktiven Terminals verschwinden die Farben von selbst und act_-API-Token authentifizieren ohne Browser.",
    },
  ],
  ctaTitle: "Teste die CLI mit deinem Konto",
  ctaText:
    "Dieselben Agenten wie auf der Web-Plattform, mit der kostenlosen Testphase von insgesamt 5 Nachrichten pro Tag.",
  ctaLabel: "Konto erstellen",
};

const extensionDe: ClientPageContent = {
  metaTitle: "AgentCloud Browser-Erweiterung: demnächst",
  metaDescription:
    "Die Browser-Erweiterung von AgentCloud kommt in den Chrome Web Store: ein Seitenbereich, der im aktiven Tab mit denselben Agenten arbeitet.",
  badge: "Browser",
  titleA: "Der Copilot",
  titleB: "in jedem Tab",
  subtitle:
    "Ein Seitenbereich, der die Seite sieht, die du gerade offen hast, und dieselben Agenten nutzt: zusammenfassen, Daten extrahieren und antworten aus dem Kontext vor dir.",
  available: false,
  statusLabel: "Demnächst",
  statusNote:
    "Noch nicht veröffentlicht: sie kommt in den Chrome Web Store. Hier steht, wie sie funktionieren wird – ohne manuell geladenes Paket.",
  hubLink: "Apps & Erweiterungen",
  installTitle: "So wird sie installiert",
  installNote:
    "Nur aus dem offiziellen Store, mit automatischen Updates: kein Paket, das im Entwicklermodus geladen werden muss.",
  installSteps: [
    { label: "Aus dem Chrome Web Store installieren" },
    { label: "Den Seitenbereich im gewünschten Tab öffnen" },
    { label: "Mit demselben Konto wie auf der Website anmelden" },
  ],
  featuresTitle: "Was sie können wird",
  features: [
    {
      title: "Liest den aktiven Tab",
      text: "Sie startet bei Text, Tabelle oder Formular vor dir – ohne Kopieren und Einfügen.",
    },
    {
      title: "Seitenbereich",
      text: "Sie lebt neben der Seite, damit du nicht aus den Augen verlierst, was du liest.",
    },
    {
      title: "Gleiche Sitzung wie die Website",
      text: "Sie nutzt das Konto, mit dem du angemeldet bist: kein Token zum Einfügen.",
    },
    {
      title: "Chromium-Browser",
      text: "Gedacht für Chrome, Edge, Brave und Opera. Gleiche Agenten und Integrationen wie die Plattform.",
    },
  ],
  ctaTitle: "Willst du wissen, wann sie kommt?",
  ctaText:
    "Bis dahin kannst du dieselben Agenten über die Website oder die CLI nutzen: gleiche Konten, gleiche Integrationen.",
  ctaLabel: "Schreib uns",
};

const desktopDe: ClientPageContent = {
  metaTitle: "AgentCloud Desktop-App: demnächst",
  metaDescription:
    "Die Desktop-App von AgentCloud kommt für macOS, Windows und Linux: Chat in einem eigenen Fenster, Systembenachrichtigungen und dauerhafte Sitzung.",
  badge: "Desktop",
  titleA: "Deine Agenten in einem",
  titleB: "eigenen Fenster",
  subtitle:
    "Der vollständige Chat unter macOS, Windows und Linux, mit Systembenachrichtigungen: der Komfort des Browsers ohne dessen Ablenkungen.",
  available: false,
  statusLabel: "Demnächst",
  statusNote:
    "In Entwicklung: solange der Build nicht signiert ist, veröffentlichen wir keinen Download. Hier steht, wie sie kommt.",
  hubLink: "Apps & Erweiterungen",
  installTitle: "So wird sie installiert",
  installNote:
    "Über die offiziellen Kanäle und mit automatischen Updates: kein Archiv, das man von Hand entpackt.",
  installSteps: [
    { label: "Lade das Paket für dein System herunter", code: "macOS — .dmg" },
    { label: "Windows", code: "Windows — .exe" },
    { label: "Linux", code: "Linux — .AppImage, .deb" },
    { label: "Mit demselben Konto anmelden und deine Agenten sind da" },
  ],
  featuresTitle: "Was sie können wird",
  features: [
    {
      title: "Systembenachrichtigungen",
      text: "Sie meldet sich, wenn ein Agent eine Aufgabe beendet hat oder auf deine Freigabe wartet.",
    },
    {
      title: "Angemeldet bleiben",
      text: "Die Sitzung übersteht Neustarts: App öffnen und das Gespräch ist da.",
    },
    {
      title: "Eigenes Fenster",
      text: "Kein Tab, den man aus Versehen schließt: der Agent hat seinen Platz auf dem Bildschirm.",
    },
    {
      title: "Gleiche Plattform",
      text: "Gleiche Agenten, gleiche Integrationen und derselbe Verlauf wie auf der Website.",
    },
  ],
  ctaTitle: "Willst du zu den Ersten gehören?",
  ctaText:
    "Du kannst schon heute über Website und CLI mit denselben Agenten arbeiten – mit demselben Konto.",
  ctaLabel: "Schreib uns",
};

// ─── Français ────────────────────────────────────────────────────────────────

const hubFr: AppHubContent = {
  metaTitle: "Applications et extensions",
  metaDescription:
    "AgentCloud dans le terminal, le navigateur, sur ordinateur et sur mobile : installez la CLI ou consultez la page dédiée à chaque client. Même session, mêmes agents.",
  badge: "Apps et extensions",
  titleA: "Choisissez d'où",
  titleB: "vos agents travaillent",
  subtitle:
    "Quatre façons d'utiliser AgentCloud : terminal, navigateur, ordinateur et mobile. La CLI est déjà disponible ; les autres clients arriveront depuis les stores officiels. Chaque client a sa page.",
  availableBadge: "Disponible maintenant",
  soonBadge: "Bientôt",
  quickTitle: "Installez la CLI en une commande",
  quickNpm: "npm — tous les systèmes, Node 18+",
  quickCurl: "script — macOS et Linux",
  accountTitle: "Un compte, une session",
  accountText:
    "Connectez-vous une fois et vos agents sont là sur chaque client. La CLI utilise la même session que le site ; l'extension, l'ordinateur et le mobile suivront le même modèle.",
  cards: [
    {
      slug: "cli",
      title: "CLI en terminal",
      desc: "Des agents dans vos scripts, cron et pipelines CI/CD : connexion par navigateur, réponses en streaming et sessions reprenables.",
      cta: "Ouvrir la page CLI",
      soon: false,
    },
    {
      slug: "extension",
      title: "Extension navigateur",
      desc: "Un copilote dans le panneau latéral : il lit l'onglet actif et y travaille à votre demande.",
      cta: "Ouvrir la page extension",
      soon: true,
    },
    {
      slug: "desktop",
      title: "App de bureau",
      desc: "Le chat dans une fenêtre dédiée sur macOS, Windows et Linux, avec notifications système.",
      cta: "Ouvrir la page bureau",
      soon: true,
    },
    {
      slug: "mobile",
      title: "App mobile",
      desc: "Vos agents dans votre poche sur iOS et Android, avec notifications push et validations rapides.",
      cta: "Ouvrir la page mobile",
      soon: true,
    },
  ],
};

const cliFr: ClientPageContent = {
  metaTitle: "CLI AgentCloud: des agents IA dans votre terminal",
  metaDescription:
    "Installez la CLI AgentCloud avec npm ou le script : des agents dans vos scripts, cron et CI/CD, connexion par navigateur et sessions reprenables.",
  badge: "Terminal",
  titleA: "Des agents IA",
  titleB: "dans votre terminal",
  subtitle:
    "Un seul binaire pour tous vos agents : discutez dans une TUI plein écran, lancez des tâches depuis vos scripts et reprenez la session d'hier.",
  available: true,
  statusLabel: "Disponible maintenant",
  statusNote:
    "Publiée sur npm sous le nom agentcloud-cli. Nécessite Node 18 ou plus et fonctionne sous Linux, macOS et Windows.",
  hubLink: "Apps et extensions",
  installTitle: "Installation",
  installNote:
    "Choisissez npm ou le script : les deux installent la même commande agentcloud. Le script explique aussi comment installer Node s'il manque.",
  installSteps: [
    { label: "Installez avec npm (tous les systèmes)", code: CLI_INSTALL_NPM },
    { label: "ou avec le script (macOS et Linux)", code: CLI_INSTALL_CURL },
    { label: "Connectez-vous par navigateur, sans taper de mot de passe", code: "agentcloud login" },
    { label: "Ouvrez le chat et choisissez l'agent", code: "agentcloud chat" },
  ],
  featuresTitle: "Ce que vous en faites",
  features: [
    {
      title: "Réponses en streaming",
      text: "La conversation arrive en direct, avec markdown et le diff de chaque fichier modifié par l'agent.",
    },
    {
      title: "TUI plein écran",
      text: "Chat avec barre latérale, historique des sessions et menu de commandes : aussi confortable qu'un éditeur.",
    },
    {
      title: "Sessions reprenables",
      text: "Le flag --resume <id> reprend une conversation exactement là où vous l'avez laissée.",
    },
    {
      title: "Pensée pour la CI",
      text: "Hors terminal interactif, les couleurs s'éteignent seules et les jetons act_ authentifient sans navigateur.",
    },
  ],
  ctaTitle: "Essayez la CLI avec votre compte",
  ctaText:
    "Les mêmes agents que la plateforme web, avec l'essai gratuit de 5 messages par jour au total.",
  ctaLabel: "Créer un compte",
};

const extensionFr: ClientPageContent = {
  metaTitle: "Extension navigateur AgentCloud: bientôt",
  metaDescription:
    "L'extension navigateur d'AgentCloud arrive sur le Chrome Web Store : un panneau latéral qui travaille sur l'onglet actif avec les mêmes agents.",
  badge: "Navigateur",
  titleA: "Le copilote",
  titleB: "dans chaque onglet",
  subtitle:
    "Un panneau latéral qui voit la page que vous consultez et utilise les mêmes agents : il résume, extrait des données et répond à partir du contexte devant vous.",
  available: false,
  statusLabel: "Bientôt",
  statusNote:
    "Elle n'est pas encore publiée : elle arrive sur le Chrome Web Store. Voici comment elle fonctionnera, sans paquet à charger à la main.",
  hubLink: "Apps et extensions",
  installTitle: "Comment elle s'installera",
  installNote:
    "Uniquement depuis le store officiel et avec des mises à jour automatiques : aucun paquet à charger en mode développeur.",
  installSteps: [
    { label: "Installez-la depuis le Chrome Web Store" },
    { label: "Ouvrez le panneau latéral sur l'onglet qui vous intéresse" },
    { label: "Connectez-vous avec le même compte que le site" },
  ],
  featuresTitle: "Ce qu'elle saura faire",
  features: [
    {
      title: "Lit l'onglet actif",
      text: "Elle part du texte, du tableau ou du formulaire devant vous, sans copier-coller.",
    },
    {
      title: "Panneau latéral",
      text: "Elle vit à côté de la page, pour ne jamais perdre de vue ce que vous lisez.",
    },
    {
      title: "Même session que le site",
      text: "Elle utilise le compte avec lequel vous êtes connecté : aucun jeton à coller.",
    },
    {
      title: "Navigateurs Chromium",
      text: "Conçue pour Chrome, Edge, Brave et Opera. Mêmes agents et mêmes intégrations que la plateforme.",
    },
  ],
  ctaTitle: "Vous voulez savoir quand elle sort ?",
  ctaText:
    "En attendant, vous pouvez utiliser les mêmes agents depuis le site ou la CLI : mêmes comptes, mêmes intégrations.",
  ctaLabel: "Écrivez-nous",
};

const desktopFr: ClientPageContent = {
  metaTitle: "App de bureau AgentCloud: bientôt",
  metaDescription:
    "L'app de bureau d'AgentCloud arrive sur macOS, Windows et Linux : chat dans une fenêtre dédiée, notifications système et session persistante.",
  badge: "Bureau",
  titleA: "Vos agents dans une",
  titleB: "fenêtre dédiée",
  subtitle:
    "Le chat complet sur macOS, Windows et Linux, avec notifications système : le confort du navigateur sans ses distractions.",
  available: false,
  statusLabel: "Bientôt",
  statusNote:
    "En développement : tant que le build n'est pas signé, nous ne publions aucun téléchargement. Voici comment elle arrivera.",
  hubLink: "Apps et extensions",
  installTitle: "Comment elle s'installera",
  installNote:
    "Depuis les canaux officiels et avec des mises à jour automatiques : aucune archive à décompresser à la main.",
  installSteps: [
    { label: "Téléchargez le paquet pour votre système", code: "macOS — .dmg" },
    { label: "Windows", code: "Windows — .exe" },
    { label: "Linux", code: "Linux — .AppImage, .deb" },
    { label: "Connectez-vous avec le même compte et vos agents sont là" },
  ],
  featuresTitle: "Ce qu'elle saura faire",
  features: [
    {
      title: "Notifications système",
      text: "Elle vous prévient quand un agent termine une tâche ou attend votre validation.",
    },
    {
      title: "Vous restez connecté",
      text: "La session survit aux redémarrages : rouvrez l'app et votre conversation est là.",
    },
    {
      title: "Fenêtre dédiée",
      text: "Aucun onglet à fermer par erreur : l'agent a son espace à l'écran.",
    },
    {
      title: "La même plateforme",
      text: "Mêmes agents, mêmes intégrations et même historique que sur le site.",
    },
  ],
  ctaTitle: "Vous voulez être parmi les premiers ?",
  ctaText:
    "Vous pouvez déjà travailler avec les mêmes agents depuis le site et la CLI, avec le même compte.",
  ctaLabel: "Écrivez-nous",
};

const HUB: Record<Locale, AppHubContent> = {
  it: hubIt,
  en: hubEn,
  es: hubEs,
  de: hubDe,
  fr: hubFr,
};

const CLIENTS: Record<
  Locale,
  Record<DocumentedClientSlug, ClientPageContent>
> = {
  it: { cli: cliIt, extension: extensionIt, desktop: desktopIt },
  en: { cli: cliEn, extension: extensionEn, desktop: desktopEn },
  es: { cli: cliEs, extension: extensionEs, desktop: desktopEs },
  de: { cli: cliDe, extension: extensionDe, desktop: desktopDe },
  fr: { cli: cliFr, extension: extensionFr, desktop: desktopFr },
};

export function getAppHub(locale: Locale): AppHubContent {
  return HUB[locale];
}

export function getClientPage(
  locale: Locale,
  slug: DocumentedClientSlug,
): ClientPageContent {
  return CLIENTS[locale][slug];
}
