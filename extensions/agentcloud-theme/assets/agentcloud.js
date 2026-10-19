/**
 * AgentCloud — loader del widget per l'app embed block del tema.
 *
 * Cosa fa: legge la configurazione lasciata dal blocco Liquid
 * (`window.AgentCloudEmbed.src`) e carica il bundle del widget servito da
 * AgentCloud su /api/embed/<slug>, che disegna la bolla della chat e l'iframe.
 *
 * Cosa NON fa (e perché): nessuna logica di business, nessun codice
 * offuscato, nessun download da origin sconosciute. Il bundle remoto è
 * sorgente pubblica del nostro stesso'app (Content-Type
 * application/javascript, cacheabile), così il revisore Shopify può
 * verificarlo — regola delle theme app extension "nessun codice non
 * verificabile".
 *
 * Idempotente: se il tag esiste già non viene aggiunto un secondo.
 */
(function () {
  "use strict";

  var config = window.AgentCloudEmbed;
  if (!config || typeof config.src !== "string" || config.src === "") return;
  if (document.getElementById("agentcloud-widget-script")) return;

  var script = document.createElement("script");
  script.id = "agentcloud-widget-script";
  script.src = config.src;
  script.async = true;
  document.head.appendChild(script);
})();
