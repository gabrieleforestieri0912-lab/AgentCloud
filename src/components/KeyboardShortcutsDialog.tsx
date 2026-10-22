"use client";

/**
 * Pannello "Scorciatoie da tastiera".
 *
 * Elenca le scorciatoie davvero implementate nell'app (non un elenco
 * generico): quello che c'è qui è ciò che funziona.
 */
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useLanguage } from "./LanguageProvider";

function isMac(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export default function KeyboardShortcutsDialog({ onClose }: { onClose: () => void }) {
  const { dict } = useLanguage();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus();
    // In fase di cattura: Escape chiude questo pannello prima di qualsiasi
    // altro handler (menu, anteprime…).
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [onClose]);

  const mac = isMac();
  const rows = [
    {
      group: dict.shortcuts.global,
      items: [
        { label: dict.shortcuts.openSettings, keys: mac ? ["⌘", "⇧", ","] : ["Ctrl", "Shift", ","] },
        { label: dict.shortcuts.openShortcuts, keys: mac ? ["⌘", "/"] : ["Ctrl", "/"] },
        { label: dict.shortcuts.close, keys: ["Esc"] },
      ],
    },
    {
      group: dict.shortcuts.chat,
      items: [
        { label: dict.shortcuts.toggleSidebar, keys: mac ? ["⌘", "B"] : ["Ctrl", "B"] },
        { label: dict.shortcuts.attachFile, keys: mac ? ["⌘", "U"] : ["Ctrl", "U"] },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={dict.shortcuts.title}
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={dict.shortcuts.title}
        tabIndex={-1}
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 shadow-2xl shadow-black/70 outline-none"
      >
        <div className="flex items-start gap-3 border-b border-white/[0.08] px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-white">{dict.shortcuts.title}</h2>
            <p className="mt-1 text-xs text-neutral-400">{dict.shortcuts.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={dict.chat.close}
            className="shrink-0 rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={16} aria-hidden />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          {rows.map((section) => (
            <div key={section.group} className="mb-4 last:mb-0">
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-neutral-500">
                {section.group}
              </p>
              {section.items.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-4 rounded-lg px-2 py-1.5 hover:bg-white/[0.04]"
                >
                  <span className="min-w-0 truncate text-[13px] font-semibold text-neutral-200">
                    {item.label}
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    {item.keys.map((k) => (
                      <kbd
                        key={k}
                        className="min-w-6 rounded-md border border-white/10 bg-white/[0.06] px-1.5 py-0.5 text-center font-mono text-[11px] font-medium text-neutral-300"
                      >
                        {k}
                      </kbd>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
