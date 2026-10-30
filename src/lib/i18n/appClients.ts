/**
 * Contenuti i18n delle pagine dedicate a ogni client (`/cli`, `/extension`,
 * `/desktop`).
 *
 * Perché un modulo separato da `dictionaries.ts`: sono pagine di marketing
 * ricche di testo, servite solo da server component. Tenerle qui evita di
 * gonfiare il dizionario client (`dictionaries.ts` finisce nel bundle) e
 * segue la convenzione già usata da `legal.ts` e `agentDetail.ts`.
 *
 * Non esiste una pagina "generale" con le informazioni di tutti i client:
 * ogni client ha la sua pagina e `/apps` è solo l'indice che porta alle
 * pagine dedicate.
 *
 * La pagina mobile ha già la sua sezione (`dict.mobile`) perché è nata prima.
 *
 * Onestà di stato: la CLI è IN ARRIVO su npm (`agentcloud-cli` non è ancora
 * pubblica) e la pagina la presenta come "prossimamente"; estensione, desktop
 * e mobile sono annunciate ma non ancora scaricabili: il testo lo dice senza
 * suggerire installazioni finte.
 */

import type { Locale } from "./constants";

/** I client con una pagina dedicata propria (mobile vive in `dict.mobile`). */
export type DocumentedClientSlug = "cli" | "extension" | "desktop";

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
  /** Etichetta del link di ritorno all'indice "App ed estensioni". */
  backLabel: string;
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


const cliIt: ClientPageContent = {
  metaTitle: "CLI AgentCloud: in arrivo",
  metaDescription:
    "La CLI di AgentCloud sta arrivando: agenti in script, cron e pipeline CI/CD, login dal browser e sessioni riprendibili. Scopri come funzionerà.",
  badge: "Terminale",
  titleA: "Agenti AI",
  titleB: "nel tuo terminale",
  subtitle:
    "Un solo binario per tutti i tuoi agenti: chatti in una TUI a schermo intero, lanci task dagli script e riprendi la sessione di ieri.",
  available: false,
  statusLabel: "In arrivo",
  statusNote:
    "Non è ancora pubblicata su npm: sta arrivando. Qui trovi come funzionerà, senza scaricare nulla a mano.",
  backLabel: "App ed estensioni",
  installTitle: "Come si installerà",
  installNote:
    "Con npm o con lo script: installeranno lo stesso comando agentcloud, con login dal browser e sessioni riprendibili.",
  installSteps: [
    { label: "Installa con npm o con lo script" },
    { label: "Accedi dal browser, senza digitare password" },
    { label: "Apri la chat e scegli l'agente" },
  ],
  featuresTitle: "Cosa saprà fare",
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
  ctaTitle: "Vuoi sapere quando esce?",
  ctaText:
    "Nel frattempo puoi usare gli stessi agenti dal sito: stesso account, stesse integrazioni.",
  ctaLabel: "Scrivici",
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
  backLabel: "App ed estensioni",
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
  backLabel: "App ed estensioni",
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


const cliEn: ClientPageContent = {
  metaTitle: "AgentCloud CLI: coming soon",
  metaDescription:
    "The AgentCloud CLI is coming: agents in scripts, cron and CI/CD pipelines, browser login and resumable sessions. See how it will work.",
  badge: "Terminal",
  titleA: "AI agents",
  titleB: "in your terminal",
  subtitle:
    "One binary for all your agents: chat in a full-screen TUI, run tasks from scripts and resume yesterday's session.",
  available: false,
  statusLabel: "Coming soon",
  statusNote:
    "It is not published on npm yet: it is heading there. Here is how it will work, with nothing to download today.",
  backLabel: "Apps & extensions",
  installTitle: "How it will install",
  installNote:
    "With npm or the script: both will install the same agentcloud command, with browser login and resumable sessions.",
  installSteps: [
    { label: "Install with npm or the script" },
    { label: "Sign in from the browser, no password to type" },
    { label: "Open the chat and pick an agent" },
  ],
  featuresTitle: "What it will do",
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
  ctaTitle: "Want to know when it ships?",
  ctaText:
    "In the meantime you can use the same agents from the website: same account, same integrations.",
  ctaLabel: "Get in touch",
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
  backLabel: "Apps & extensions",
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
  backLabel: "Apps & extensions",
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


const cliEs: ClientPageContent = {
  metaTitle: "CLI de AgentCloud: muy pronto",
  metaDescription:
    "La CLI de AgentCloud está en camino: agentes en scripts, cron y CI/CD, acceso desde el navegador y sesiones recuperables. Descubre cómo funcionará.",
  badge: "Terminal",
  titleA: "Agentes de IA",
  titleB: "en tu terminal",
  subtitle:
    "Un solo binario para todos tus agentes: chatea en una TUI a pantalla completa, lanza tareas desde scripts y retoma la sesión de ayer.",
  available: false,
  statusLabel: "Muy pronto",
  statusNote:
    "Todavía no está publicada en npm: está en camino. Aquí tienes cómo funcionará, sin descargar nada a mano.",
  backLabel: "Apps y extensiones",
  installTitle: "Cómo se instalará",
  installNote:
    "Con npm o con el script: ambos instalarán el mismo comando agentcloud, con acceso desde el navegador y sesiones recuperables.",
  installSteps: [
    { label: "Instala con npm o con el script" },
    { label: "Inicia sesión desde el navegador, sin escribir contraseña" },
    { label: "Abre el chat y elige el agente" },
  ],
  featuresTitle: "Qué podrá hacer",
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
  ctaTitle: "¿Quieres saber cuándo saldrá?",
  ctaText:
    "Mientras tanto puedes usar los mismos agentes desde la web: la misma cuenta, las mismas integraciones.",
  ctaLabel: "Escríbenos",
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
  backLabel: "Apps y extensiones",
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
  backLabel: "Apps y extensiones",
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


const cliDe: ClientPageContent = {
  metaTitle: "AgentCloud CLI: demnächst",
  metaDescription:
    "Die AgentCloud CLI kommt bald: Agenten in Skripten, Cron und CI/CD, Browser-Login und fortsetzbare Sitzungen. So wird sie funktionieren.",
  badge: "Terminal",
  titleA: "KI-Agenten",
  titleB: "in deinem Terminal",
  subtitle:
    "Eine Binary für alle Agenten: chatte in einer bildschirmfüllenden TUI, starte Aufgaben aus Skripten und setze die Sitzung von gestern fort.",
  available: false,
  statusLabel: "Demnächst",
  statusNote:
    "Noch nicht auf npm veröffentlicht: sie ist auf dem Weg. Hier steht, wie sie funktionieren wird – ohne heute etwas herunterzuladen.",
  backLabel: "Apps & Erweiterungen",
  installTitle: "So wird sie installiert",
  installNote:
    "Mit npm oder dem Skript: beide werden denselben Befehl agentcloud installieren, mit Browser-Login und fortsetzbaren Sitzungen.",
  installSteps: [
    { label: "Mit npm oder dem Skript installieren" },
    { label: "Im Browser anmelden, ohne Passwort zu tippen" },
    { label: "Chat öffnen und Agenten auswählen" },
  ],
  featuresTitle: "Was sie können wird",
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
  ctaTitle: "Möchtest du wissen, wann es rauskommt?",
  ctaText:
    "In der Zwischenzeit kannst du dieselben Agenten über die Website nutzen: dasselbe Konto, dieselben Integrationen.",
  ctaLabel: "Schreib uns",
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
  backLabel: "Apps & Erweiterungen",
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
  backLabel: "Apps & Erweiterungen",
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


const cliFr: ClientPageContent = {
  metaTitle: "CLI AgentCloud : bientôt disponible",
  metaDescription:
    "La CLI AgentCloud arrive : des agents dans vos scripts, cron et CI/CD, connexion par navigateur et sessions reprenables. Découvrez comment elle fonctionnera.",
  badge: "Terminal",
  titleA: "Des agents IA",
  titleB: "dans votre terminal",
  subtitle:
    "Un seul binaire pour tous vos agents : discutez dans une TUI plein écran, lancez des tâches depuis vos scripts et reprenez la session d'hier.",
  available: false,
  statusLabel: "Bientôt disponible",
  statusNote:
    "Pas encore publiée sur npm : elle arrive. Voici comment elle fonctionnera, sans rien télécharger aujourd'hui.",
  backLabel: "Apps et extensions",
  installTitle: "Comment elle s'installera",
  installNote:
    "Avec npm ou le script : les deux installeront la même commande agentcloud, avec connexion par navigateur et sessions reprenables.",
  installSteps: [
    { label: "Installez avec npm ou le script" },
    { label: "Connectez-vous par navigateur, sans taper de mot de passe" },
    { label: "Ouvrez le chat et choisissez l'agent" },
  ],
  featuresTitle: "Ce qu'elle saura faire",
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
  ctaTitle: "Vous voulez savoir quand elle sortira ?",
  ctaText:
    "En attendant, vous pouvez utiliser les mêmes agents depuis le site : même compte, mêmes intégrations.",
  ctaLabel: "Écrivez-nous",
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
  backLabel: "Apps et extensions",
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
  backLabel: "Apps et extensions",
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


export function getClientPage(
  locale: Locale,
  slug: DocumentedClientSlug,
): ClientPageContent {
  return CLIENTS[locale][slug];
}
