"use client";

/**
 * Larghezza di una sidebar regolabile trascinando il bordo (come su Claude).
 *
 * Il valore è una preferenza del browser e vive in `localStorage`, come
 * `CHAT_SIDEBAR_OPEN_KEY`: la larghezza scelta dall'utente deve sopravvivere
 * al reload. Si legge con `useSyncExternalStore` — e non con uno `setState`
 * dentro un `useEffect`: durante l'idratazione React usa il snapshot di server
 * e poi passa a quello del browser, senza mismatch né render a cascata.
 *
 * Su mobile la sidebar è un drawer a larghezza fissa: `isDesktop` serve al
 * componente per applicare la larghezza dinamica (e per posizionare i menu
 * laterali) solo da `lg` in su.
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";

/** Larghezze in px permesse nel trascinamento. */
export const SIDEBAR_MIN_WIDTH = 216;
export const SIDEBAR_MAX_WIDTH = 520;

/**
 * `localStorage` non emette `storage` nella stessa scheda: dopo ogni scrittura
 * lanciamo questo evento per aggiornare gli store che leggono la stessa chiave.
 */
const WIDTH_CHANGED_EVENT = "agentcloud:sidebar-width-changed";

const clampWidth = (w: number) =>
  Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Math.round(w)));

/**
 * Copia in memoria dell'ultima larghezza scritta. Se `localStorage` è pieno o
 * bloccato (modalità privata), la lettura restituirebbe il vecchio valore e il
 * trascinamento sembrerebbe non funzionare: la cache tiene il valore valido
 * per la sessione, come fanno le altre preferenze chat.
 */
const memoryCache = new Map<string, number>();

function readWidth(storageKey: string, fallbackWidth: number): number {
  const cached = memoryCache.get(storageKey);
  if (cached !== undefined) return cached;
  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw === null ? NaN : Number(raw);
    return Number.isFinite(parsed) ? clampWidth(parsed) : fallbackWidth;
  } catch {
    return fallbackWidth;
  }
}

function writeWidth(storageKey: string, value: number): number {
  const next = clampWidth(value);
  memoryCache.set(storageKey, next);
  try {
    window.localStorage.setItem(storageKey, String(next));
  } catch {
    // Storage non disponibile: la larghezza resta valida per la sessione.
  }
  window.dispatchEvent(new CustomEvent(WIDTH_CHANGED_EVENT, { detail: storageKey }));
  return next;
}

export function useResizableSidebar(storageKey: string, fallbackWidth: number) {
  // Valore corrente durante il trascinamento; `null` = si segue il persistito.
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  // Chiusura del trascinamento in corso: un unmount a metà drag non deve
  // lasciare listener appesi né `body` in `user-select: none`.
  const stopDragRef = useRef<(() => void) | null>(null);

  const subscribe = useCallback(
    (onChange: () => void) => {
      const onStorage = (event: StorageEvent) => {
        // Altra scheda (o cancellazione): si rilegge da `localStorage`.
        if (event.key === storageKey || event.key === null) {
          memoryCache.delete(storageKey);
          onChange();
        }
      };
      const onLocal = (event: Event) => {
        if ((event as CustomEvent<string>).detail === storageKey) onChange();
      };
      window.addEventListener("storage", onStorage);
      window.addEventListener(WIDTH_CHANGED_EVENT, onLocal);
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(WIDTH_CHANGED_EVENT, onLocal);
      };
    },
    [storageKey],
  );
  const getSnapshot = useCallback(() => readWidth(storageKey, fallbackWidth), [storageKey, fallbackWidth]);
  const getServerSnapshot = useCallback(() => fallbackWidth, [fallbackWidth]);

  const storedWidth = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const width = dragWidth ?? storedWidth;

  // La larghezza dinamica (e il menu account) contano solo da `lg` in su.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => () => stopDragRef.current?.(), []);

  const startResize = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      const startX = event.clientX;
      const initialWidth = width;
      let current = width;
      const prevUserSelect = document.body.style.userSelect;
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
      setDragging(true);
      setDragWidth(current);

      const move = (e: PointerEvent) => {
        current = clampWidth(initialWidth + (e.clientX - startX));
        setDragWidth(current);
      };
      const stop = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", stop);
        window.removeEventListener("pointercancel", stop);
        document.body.style.userSelect = prevUserSelect;
        document.body.style.cursor = "";
        setDragging(false);
        stopDragRef.current = null;
        // Prima di tornare al valore persistito lo si allinea a quello appena
        // trascinato (lo stesso evento notifica lo store), così non c'è scatto.
        writeWidth(storageKey, current);
        setDragWidth(null);
      };
      stopDragRef.current = stop;
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", stop);
      window.addEventListener("pointercancel", stop);
    },
    [storageKey, width],
  );

  // Accessibilità: la maniglia è un `separator` attivabile da tastiera.
  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>) => {
      const step = event.shiftKey ? 48 : 16;
      const delta = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
      if (!delta) return;
      event.preventDefault();
      writeWidth(storageKey, width + delta);
    },
    [storageKey, width],
  );

  return { width, dragging, isDesktop, startResize, onKeyDown };
}
