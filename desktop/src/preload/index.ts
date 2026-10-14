import { contextBridge, ipcRenderer, shell } from "electron";

/**
 * Preload: ponte minimo e tipizzato tra renderer e main.
 * Niente secret: solo apertura link esterni e deep-link OAuth in ingresso.
 */
export type DesktopApi = {
  openExternal: (url: string) => Promise<void>;
  onDeepLink: (cb: (url: string) => void) => () => void;
  versions: { app: string; electron: string; platform: string };
};

const api: DesktopApi = {
  openExternal: (url: string) => shell.openExternal(url).then(() => undefined),
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
