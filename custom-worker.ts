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

  /* Cron trigger (wrangler.jsonc → triggers.crons): ogni evento `scheduled`
     invoca internamente le rotte API corrispondenti con lo stesso schema di
     Vercel (Authorization: Bearer $CRON_SECRET), così nessun segreto lascia
     il Worker. Il dispatch usa `event.cron` per scegliere la rotta; se il
     nome del crono non è riconosciuto (invocazione manuale/retro-compat) si
     eseguono tutti, come prima. */
  async scheduled(
    event: { cron?: string } | unknown,
    env: { CRON_SECRET?: string },
    ctx: unknown,
  ): Promise<void> {
    const secret = env?.CRON_SECRET ?? "";
    if (!secret) {
      console.error("cron: CRON_SECRET non configurato");
      return;
    }

    const cronName = String((event as { cron?: string })?.cron ?? "");
    const routes = [
      // Giornaliero ("27 8 * * *"): abbonamenti in scadenza.
      { cron: "27 8 * * *", path: "/api/billing/notify-expiring", label: "notify-expiring" },
      // Ogni minuto: worker della coda agenti (Fase 2: agent_jobs).
      { cron: "* * * * *", path: "/api/agents/worker", label: "agents-worker" },
    ];
    const targets = cronName
      ? routes.filter((r) => r.cron === cronName)
      : routes;
    if (targets.length === 0) {
      console.warn(`cron sconosciuto: ${cronName}`);
      return;
    }

    for (const target of targets) {
      const request = new Request(
        `https://cron.internal${target.path}`,
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
          `cron ${target.label}: status=${res.status} body=${body.slice(0, 200)}`,
        );
        if (!res.ok && res.status !== 401) {
          console.error(`cron ${target.label} fallita: ${res.status}`);
        }
      } catch (e) {
        console.error(`cron ${target.label} errore:`, e);
      }
    }
  },
};

// Riesportazione richiesta quando si usano la DO Queue o la DO Tag Cache
// (https://opennext.js.org/cloudflare/caching)
// @ts-ignore `.open-next/worker.js` è generato da `opennextjs-cloudflare build`
export { DOQueueHandler, DOShardedTagCache } from "./.open-next/worker.js";
