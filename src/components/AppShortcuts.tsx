"use client";

/**
 * Scorciatoie di tastiera globali dell'app.
 *
 * `Ctrl+Shift+,` (su macOS `⌘⇧,`) apre le impostazioni: è la scorciatoia
 * mostrata nel menu account, quindi deve funzionare ovunque, non solo quando il
 * menu è aperto.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AppShortcuts() {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Con Shift premuto il tasto "," viene riferito come "<": uso `code`.
      if (e.code !== "Comma") return;
      if (!e.shiftKey) return;
      if (!e.ctrlKey && !e.metaKey) return;
      if (e.altKey) return;
      e.preventDefault();
      router.push("/settings");
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return null;
}
