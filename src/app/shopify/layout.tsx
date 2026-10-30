/**
 * Layout della route /shopify (pannello app Shopify, vue nell'iframe dell'
 * amministratore).
 *
 * Qui vive (ed è l'unico posto dove vive) App Bridge:
 *   - deve essere il PRIMO script della pagina e senza async/defer, come
 *     richiede Shopify App Bridge;
 *   - Prima del deploy RES 30/10/2026 il tag era nel layout RADICE: ogni
 *     pagina del sito (landing compresa) scaricava e valutava lo script
 *     bloccante dal CDN Shopify prima del primo paint. I punteggi Core Web
 *     Vitals della home pagavano l'interazione.
 *   - React 19 non fa hoisting dei tag <script> con src dentro un layout:
 *     con il rendering SSR il tag viene emesso nel markup di /shopify così
 *     com'è, sincrono e senza attributi extra. È il requisito che
 *     `next/script` + `strategy="beforeInteractive"` NON rispettava
 *     (misurato su Next 16.2.9: emetteva solo un preload, tag iniettato a
 *     hydration, e il controllo di Shopify non trovava nulla).
 *
 * Il client ID è pubblico (stesso di shopify.app.toml); il client secret
 * non finisce mai nel frontend.
 *
 * NOTA: nessuna variabile d'ambiente nuova da riflettere su Vercel — il
 * client ID arriva da SHOPIFY_CLIENT_ID (import lato server, il medesimo
 * usato dal layout radice prima di questa migrazione).
 */
import { SHOPIFY_CLIENT_ID } from "@/lib/shopify/client";

export default function ShopifyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <meta name="shopify-api-key" content={SHOPIFY_CLIENT_ID} />
      {/* eslint-disable-next-line @next/next/no-sync-scripts -- Requisito di
          Shopify: App Bridge va caricato con un <script> sincrono, come
          primo script della pagina. Con async/defer il controllo non lo
          considera caricato e l'iframe non parte. */}
      <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
      {children}
    </>
  );
}
