/**
 * Evidenziazione sintassi dei blocchi fenced della chat (```javascript …).
 *
 * highlight.js viene caricato con una dynamic import: le pagine senza blocchi
 * di codice (landing, dashboard…) non pagano il peso del bundle, e i blocchi
 * restano incolori (testo neutro) finché il loader non risolve — cosi il primo
 * render server/client coincide e non ci sono mismatch di idratazione.
 *
 * Le classi `.hljs-*` emesse qui sono tematizzate in src/app/globals.css
 * (tema scuro tarato sullo sfondo bg-neutral-950 dei blocchi).
 */
export type Highlighter = typeof import("highlight.js/lib/common").default;

let loader: Promise<Highlighter | null> | null = null;

/**
 * Carica highlight.js una sola volta per tutta la pagina: set "common" dei
 * linguaggi piu i due fuori dal set che gli agenti usano spesso (tsx,
 * dockerfile). In caso di errore risolve `null`, cosi la chat degrada al
 * testo incoloro invece di rompere.
 */
export function loadHighlighter(): Promise<Highlighter | null> {
  if (!loader) {
    loader = (async () => {
      const [{ default: hljs }, { default: dockerfile }] = await Promise.all([
        import("highlight.js/lib/common"),
        import("highlight.js/lib/languages/dockerfile"),
      ]);
      // tsx/jsx: la grammatica TypeScript/Javascript copre anche JSX. Gli
      // alias vengono registrati solo se mancano (jsx esiste gia come alias
      // di javascript in alcuni versioni del set common).
      if (!hljs.getLanguage("tsx")) {
        hljs.registerAliases("tsx", { languageName: "typescript" });
      }
      if (!hljs.getLanguage("jsx")) {
        hljs.registerAliases("jsx", { languageName: "javascript" });
      }
      if (!hljs.getLanguage("dockerfile")) {
        hljs.registerLanguage("dockerfile", dockerfile);
      }
      return hljs;
    })().catch(() => null);
  }
  return loader;
}

/**
 * Restituisce l'HTML colorato (e già escaped) del blocco, oppure `null` quando
 * la lingua è vuota o senza grammatica: in quel caso il caller rende il testo
 * grezzo. `prompt` è escluso di proposito — è un prompt da copiare e passare a
 * un altro tool, deve restare incoloro.
 */
export function highlightCode(
  hljs: Highlighter,
  lang: string,
  code: string,
): string | null {
  const name = lang.trim().toLowerCase();
  if (!name || name === "prompt" || !hljs.getLanguage(name)) return null;
  try {
    return hljs.highlight(code, { language: name, ignoreIllegals: true }).value;
  } catch {
    // grammatica non applicabile al contenuto: meglio il testo grezzo
    return null;
  }
}
