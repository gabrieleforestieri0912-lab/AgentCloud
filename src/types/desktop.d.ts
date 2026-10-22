/**
 * Il ponte che l'app desktop (Electron) espone alla pagina.
 *
 * Nel desktop la finestra carica il WEB APP: la pagina è quindi remoto, ma
 * gira dentro Electron e può raggiungere il main process tramite il preload.
 * Questo tipo serve al web per accorgersi che è dentro l'app desktop e
 * adattare il login (vedi app/login/page.tsx).
 *
 * Le dichiarazioni sono VOLONTATE minime: il web non deve conoscere Electron,
 * deve solo sapere che quel ponte esiste.
 */

export type DesktopBridge = {
  /** true: la pagina gira dentro l'app desktop. */
  isDesktop: true;
  /** Apre un URL nel browser di sistema (usato per il login Google). */
  openExternal: (url: string) => Promise<void>;
  /** Riceve l'URL di deep link (es. agentcloud://auth?code=...). */
  onDeepLink: (cb: (url: string) => void) => () => void;
  versions: { app: string; electron: string; platform: string };
};

declare global {
  interface Window {
    /** Presente solo dentro l'app desktop. */
    agentcloud?: DesktopBridge;
  }
}

export {};
