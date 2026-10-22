import { contextBridge, ipcRenderer, shell } from "electron";

/**
 * Preload: ponte minimo e tipizzato tra la pagina e il main.
 * Niente secret: solo apertura link esterni e deep-link OAuth in ingresso.
 *
 * Il ponte è esposto anche quando la finestra carica il WEB APP (non solo il
 * renderer nativo): il login Google del desktop avviene nel browser di
 * sistema e il ritorno arriva con il deep link, che la pagina deve poter
 * ricevere.
 */
export type DesktopApi = {
  /** La pagina gira dentro l'app desktop. */
  isDesktop: true;
  openExternal: (url: string) => Promise<void>;
  onDeepLink: (cb: (url: string) => void) => () => void;
  versions: { app: string; electron: string; platform: string };
};

/**
 * Schemi ammessi per l'apertura nel browser di sistema. La pagina (anche
 * remota) non deve poter far aprire schemi arbitrari al sistema.
 */
const SAFE_EXTERNAL_PROTOCOLS = new Set(["http:", "https:"]);

function isSafeExternal(url: string): boolean {
  try {
    return SAFE_EXTERNAL_PROTOCOLS.has(new URL(url).protocol);
  } catch {
    return false;
  }
}

const api: DesktopApi = {
  isDesktop: true,
  openExternal: (url: string) => {
    if (!isSafeExternal(url)) return Promise.resolve();
    return shell.openExternal(url).then(() => undefined);
  },
  onDeepLink: (cb: (url: string) => void) => {
    const listener = (_event: unknown, url: string) => cb(url);
    ipcRenderer.on("agentcloud:deep-link", listener as never);
    return () => ipcRenderer.removeListener("agentcloud:deep-link", listener as never);
  },
  versions: {
    app: process.env["npm_package_version"] ?? "0.1.0",
    electron: process.versions.electron ?? "",
    platform: process.platform,
  },
};

contextBridge.exposeInMainWorld("agentcloud", api);

declare global {
  interface Window {
    agentcloud: DesktopApi;
  }
}
