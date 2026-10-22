import { app, BrowserWindow, shell } from "electron";
import { join } from "node:path";
import { isAuthUrl, resolveTargetUrl } from "./target";

/**
 * Processo main: una finestra, navigazione esterna nel browser di sistema,
 * deep-link `agentcloud://` per il ritorno OAuth, single-instance.
 *
 * Niente credenziali qui: la sessione vive nel renderer (Supabase, come una
 * SPA). Il main inoltra solo l'URL di callback OAuth alla finestra.
 *
 * LA FINESTRA CARICA IL WEB APP (di default): il prodotto è il sito, quindi il
 * desktop non ne reimplementa l'interfaccia — la ottiene per costruzione, senza
 * doppia manutenzione. Il renderer nativo resta disponibile come "client
 * leggero" con AGENTCLOUD_DESKTOP_MODE=native.
 */

const PROTOCOL = "agentcloud";
let mainWindow: BrowserWindow | null = null;

/** L'URL da caricare: il web app, o null per il renderer nativo. */
function targetUrl(): string | null {
  return resolveTargetUrl({
    mode: process.env.AGENTCLOUD_DESKTOP_MODE,
    webUrl: process.env.AGENTCLOUD_WEB_URL,
    isDev: Boolean(process.env["ELECTRON_RENDERER_URL"]),
  });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 900,
    minHeight: 620,
    title: "AgentCloud",
    backgroundColor: "#09090b",
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // I link esterni (marketplace, integrazioni, documenti) si aprono nel browser
  // di sistema, mai nella finestra.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  // Anche le NAVIGAZIONI verso l'autenticazione vanno nel browser di sistema:
  // Google (e gli altri provider) rifiutano l'OAuth dentro una webview
  // incorporata ("This browser or app may not be secure"). Il ritorno arriva
  // con il deep link agentcloud://auth, che il main inoltra alla finestra.
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!isAuthUrl(url)) return;
    event.preventDefault();
    void shell.openExternal(url);
  });

  const web = targetUrl();
  if (web) {
    // Il web app: se non si carica (rete assente, sito giù) si apre nel
    // browser di sistema invece di lasciare una finestra vuota.
    mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
      console.error("Caricamento del web app fallito:", errorCode, errorDescription);
      void shell.openExternal(web);
    });
    void mainWindow.loadURL(web);
  } else if (process.env["ELECTRON_RENDERER_URL"]) {
    void mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

/** Inoltra agentcloud://auth?... al renderer (ritorno OAuth Google). */
function handleDeepLink(url: string): void {
  if (!url.startsWith(`${PROTOCOL}://`)) return;
  if (mainWindow) {
    mainWindow.webContents.send("agentcloud:deep-link", url);
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    const url = argv.find((a) => a.startsWith(`${PROTOCOL}://`));
    if (url) handleDeepLink(url);
  });
  // macOS: protocollo invocato da app già aperto.
  app.on("open-url", (event, url) => {
    event.preventDefault();
    handleDeepLink(url);
  });

  void app.whenReady().then(() => {
    // Registra agentcloud:// come protocollo dell'app (login Google).
    if (!app.isDefaultProtocolClient(PROTOCOL)) {
      app.setAsDefaultProtocolClient(PROTOCOL);
    }
    createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
