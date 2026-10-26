// Custom Worker: riusa l'handler fetch generato da OpenNext e aggiunge lo
// handler `scheduled` per i Cron Trigger di Cloudflare (sostituisce i croni
// di Vercel rimossi con vercel.json). Vedi
// https://opennext.js.org/cloudflare/howtos/custom-worker
/* eslint-disable @typescript-eslint/ban-ts-comment -- il modulo importato è
   generato da `opennextjs-cloudflare build` e può non esistere al typecheck */
// @ts-ignore `.open-next/worker.js` è generato da `opennextjs-cloudflare build`
import { default as openNextHandler } from "./.open-next/worker.js";

export default {
  // @ts-ignore handler generato a build time
  fetch: openNextHandler.fetch,

  /* Cron giornaliero ("27 8 * * *" su wrangler.jsonc): notifica gli
     abbonamenti in scadenza invocando internamente la rotta API cron con lo
     stesso schema di Vercel (Authorization: Bearer $CRON_SECRET), così nessun
     segreto lascia il Worker. */
  async scheduled(
    _event: unknown,
    env: { CRON_SECRET?: string },
    ctx: unknown,
  ): Promise<void> {
    const secret = env?.CRON_SECRET ?? "";
    if (!secret) {
      console.error("cron notify-expiring: CRON_SECRET non configurato");
      return;
    }
    const request = new Request(
      "https://cron.internal/api/billing/notify-expiring",
      {
        method: "GET",
        headers: { authorization: `Bearer ${secret}` },
      },
    );
    try {
      // @ts-ignore handler generato a build time
      const res = await openNextHandler.fetch(request, env as never, ctx as never);
      const body = await res.text();
      console.log(
        `cron notify-expiring: status=${res.status} body=${body.slice(0, 200)}`,
      );
      if (!res.ok && res.status !== 401) {
        console.error(`cron notify-expiring fallita: ${res.status}`);
      }
    } catch (e) {
      console.error("cron notify-expiring errore:", e);
    }
  },
};

// Riesportazione richiesta quando si usano la DO Queue o la DO Tag Cache
// (https://opennext.js.org/cloudflare/caching)
// @ts-ignore `.open-next/worker.js` è generato da `opennextjs-cloudflare build`
export { DOQueueHandler, DOShardedTagCache } from "./.open-next/worker.js";
