/**
 * highlight.js non pubblica i .d.ts per i singoli linguaggi
 * (`highlight.js/lib/languages/*`): dichiariamo il modulo qui per poterlo
 * importare in lazy da src/lib/code-highlight.ts.
 */
declare module "highlight.js/lib/languages/dockerfile" {
  import type { LanguageFn } from "highlight.js";
  const language: LanguageFn;
  export default language;
}
