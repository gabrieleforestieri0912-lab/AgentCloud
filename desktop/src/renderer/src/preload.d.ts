/** Ponte main→renderer (mirror di src/preload/index.ts: niente import node qui). */
interface DesktopApi {
  openExternal: (url: string) => Promise<void>;
  onDeepLink: (cb: (url: string) => void) => () => void;
  versions: { app: string; electron: string; platform: string };
}

interface Window {
  agentcloud: DesktopApi;
}
