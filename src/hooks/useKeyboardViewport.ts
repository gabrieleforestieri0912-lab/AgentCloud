"use client";

/**
 * Compenso della tastiera iOS nei layout "app" (es. pagina chat).
 *
 * Safari iOS NON rimpicciolisce il layout viewport quando la tastiera si
 * apre: il composer ancorato a bottom di una colonna `h-dvh` resterebbe
 * coperto e nascosto dalla tastiera. Qui leggiamo `visualViewport.height`
 * (l'unica metrica che tiene conto della tastiera) e distinguiamo:
 *   - chiusura/estensione della barra URL: delta fino a ~110px → ignorato;
 *   - tastiera reale: delta ≥ 250px → `keyboardOpen=true`.
 *
 * Quando la tastiera è aperta `visualViewportHeight` riporta l'altezza
 * visibile reale: il chiamante la applica come altezza esplicita alla radice
 * dell'app, così i figli assoluti (composer in fondo, header in alto)
 * occupano esattamente lo spazio sopra la tastiera, su tutti i browser.
 * (Su Android `interactive-widget=resizes-content` ottiene già lo stesso
 * effetto nativamente: questo hook serve solo a iOS, dove non fa danni.)
 */

import { useEffect, useState } from "react";

/** Delta sotto il quale è solo la barra URL di Safari a muoversi. */
const URL_BAR_DELTA = 120;

export type KeyboardViewportState = {
  keyboardOpen: boolean;
  /** Altezza visibile reale (px) della viewport quando la tastiera è aperta. */
  visualViewportHeight: number | null;
};

export function useKeyboardViewport(
  enabled: boolean = true,
): KeyboardViewportState {
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [visualViewportHeight, setVisualViewportHeight] = useState<
    number | null
  >(null);

  useEffect(() => {
    if (!enabled) return;
    const vv = window.visualViewport;
    if (!vv) return;

    let raf = 0;
    const measure = () => {
      const covered = Math.max(
        0,
        window.innerHeight - vv.height - vv.offsetTop,
      );
      const open = covered > URL_BAR_DELTA;
      setKeyboardOpen(open);
      setVisualViewportHeight(open ? vv.height : null);
    };
    const schedule = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };

    vv.addEventListener("resize", schedule);
    // `scroll` della visual viewport: iOS la sposta quando la tastiera
    // compare, e lo spostamento può cambiare quanto resta visibile.
    vv.addEventListener("scroll", schedule);
    window.addEventListener("resize", schedule);
    measure();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      vv.removeEventListener("resize", schedule);
      vv.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [enabled]);

  return { keyboardOpen, visualViewportHeight };
}
