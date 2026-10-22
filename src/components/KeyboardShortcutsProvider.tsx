"use client";

/**
 * Provider delle scorciatoie da tastiera.
 *
 * Tiene lo stato di apertura del pannello e ascolta `Ctrl+/` (`⌘/`) su tutto
 * il documento: il pannello si apre da qualunque pagina, anche senza passare
 * dal menu account.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import KeyboardShortcutsDialog from "./KeyboardShortcutsDialog";

type KeyboardShortcutsContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  /** Apre il pannello delle scorciatoie. */
  openShortcuts: () => void;
};

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextValue | null>(null);

export function useKeyboardShortcuts(): KeyboardShortcutsContextValue {
  const ctx = useContext(KeyboardShortcutsContext);
  if (!ctx) {
    throw new Error("useKeyboardShortcuts must be used within a KeyboardShortcutsProvider");
  }
  return ctx;
}

export default function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Con Ctrl/Cmd premuto "/" viene riferito come "?" su alcuni layout:
      // uso `code`.
      if (e.code !== "Slash") return;
      if (!e.ctrlKey && !e.metaKey) return;
      if (e.shiftKey || e.altKey) return;
      e.preventDefault();
      setOpen((v) => !v);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const close = useCallback(() => setOpen(false), []);
  const openShortcuts = useCallback(() => setOpen(true), []);
  const value = useMemo(() => ({ open, setOpen, openShortcuts }), [open, openShortcuts]);

  return (
    <KeyboardShortcutsContext.Provider value={value}>
      {children}
      {open && <KeyboardShortcutsDialog onClose={close} />}
    </KeyboardShortcutsContext.Provider>
  );
}
