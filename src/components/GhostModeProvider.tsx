"use client";

/**
 * Stato globale della Modalità Ghost (chat incognito).
 *
 * È volutamente VOLATILE: nessuna chiave in localStorage/sessionStorage,
 * nessun parametro nell'URL, nessun cookie. Al refresh della pagina il
 * provider torna allo stato iniziale (modalità normale) e la chat fantasma
 * sparisce — che è esattamente il comportamento richiesto.
 *
 * L'ID della conversazione fantasma è tenuto qui solo per sapere QUALE
 * conversazione va distrutta all'uscita: il contenuto vive nello stato
 * React della chat e non viene mai scritto su disco.
 *
 * Pattern identico a `ThemeProvider`: context + hook `useGhostMode()`.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type GhostModeContextValue = {
  /** True mentre la chat è in modalità fantasma. */
  isGhostMode: boolean;
  /** Id della conversazione fantasma attiva (null se non in modalità). */
  ghostConversationId: string | null;
  /** Entra in modalità fantasma sulla conversazione indicata. */
  enterGhostMode: (conversationId: string) => void;
  /** Esce dalla modalità fantasma (NON distrugge i messaggi: li distrugge la chat). */
  exitGhostMode: () => void;
};

const GhostModeContext = createContext<GhostModeContextValue | null>(null);

export function GhostModeProvider({ children }: { children: ReactNode }) {
  const [ghostConversationId, setGhostConversationId] = useState<string | null>(
    null,
  );

  const enterGhostMode = useCallback((conversationId: string) => {
    setGhostConversationId(conversationId);
  }, []);

  const exitGhostMode = useCallback(() => {
    setGhostConversationId(null);
  }, []);

  const value = useMemo<GhostModeContextValue>(
    () => ({
      isGhostMode: ghostConversationId !== null,
      ghostConversationId,
      enterGhostMode,
      exitGhostMode,
    }),
    [ghostConversationId, enterGhostMode, exitGhostMode],
  );

  return (
    <GhostModeContext.Provider value={value}>
      {children}
    </GhostModeContext.Provider>
  );
}

/**
 * Accesso allo stato Ghost. Deve essere usato dentro `GhostModeProvider`.
 */
export function useGhostMode(): GhostModeContextValue {
  const ctx = useContext(GhostModeContext);
  if (!ctx) {
    throw new Error("useGhostMode must be used within GhostModeProvider");
  }
  return ctx;
}
