import { NextResponse } from "next/server";
import { getAgentBySlug } from "@/lib/agents";
import { getAgentRuntimeConfig } from "@/lib/agents/registry";
import { getSiteUrl } from "@/lib/site-url";
import { verifyTenantApiKey } from "@/lib/tenants";
import {
  corsOriginForEmbed,
  buildContentSecurityPolicy,
} from "@/lib/security";
import { validateWidgetConfig } from "@/lib/widget";

const BASE_URL = getSiteUrl();

type Props = {
  params: Promise<{ slug: string }>;
};

/**
 * Handler GET per lo script del Widget Embeddabile per PMI.
 *
 * Restituisce un payload JavaScript autonomo che inietta il bottone fluttuante
 * e l'iframe della chat nel sito del cliente (WordPress, Shopify, Webflow, ecc.).
 *
 * Query Parameters supportati:
 * - `lang`: "it" | "en" (default: "it")
 * - `mode`: "embed" | "popup" (default: "embed")
 * - `apiKey`: chiave API del tenant per autenticazione
 * - `tenantId`: identificativo del tenant per l'isolamento multi-tenant
 * - `primaryColor`: codice esadecimale del colore del brand (es. "#038bfe")
 * - `position`: "bottom-right" | "bottom-left" (default: "bottom-right")
 * - `title`: titolo mostrato nel widget
 * - `initialMessage`: messaggio iniziale di benvenuto
 */
export async function GET(req: Request, { params }: Props) {
  const { slug } = await params;
  const agent = getAgentBySlug(slug) || getAgentRuntimeConfig(slug);
  if (!agent) {
    return new NextResponse("/* Agent not found */", {
      status: 404,
      headers: { "Content-Type": "application/javascript" },
    });
  }

  const urlObj = new URL(req.url);
  const rawLang = urlObj.searchParams.get("lang") || "it";
  const rawMode = urlObj.searchParams.get("mode") || "embed";
  const rawTenant = urlObj.searchParams.get("tenantId") || undefined;
  const rawColor = urlObj.searchParams.get("primaryColor") || undefined;
  const rawPosition = urlObj.searchParams.get("position") || undefined;
  const rawTitle = urlObj.searchParams.get("title") || undefined;
  const rawInitialMessage = urlObj.searchParams.get("initialMessage") || undefined;
  const apiKey = urlObj.searchParams.get("apiKey");

  // Validazione e sanitizzazione di tutti i parametri del widget
  const validation = validateWidgetConfig({
    slug,
    tenantId: rawTenant,
    primaryColor: rawColor,
    position: (rawPosition as "bottom-right" | "bottom-left") || undefined,
    title: rawTitle,
    initialMessage: rawInitialMessage,
    lang: rawLang === "en" ? "en" : "it",
    mode: rawMode === "popup" ? "popup" : "embed",
  });

  const { sanitized } = validation;
  let verifiedTenant = sanitized.tenantId !== "default" ? sanitized.tenantId : "";

  // Se è fornita una apiKey, verifica l'appartenenza al tenant
  if (apiKey) {
    const verified = verifyTenantApiKey(apiKey);
    if (verified.valid && verified.tenantId) {
      verifiedTenant = verified.tenantId;
    }
  }

  // ---------------------------------------------------------------------------
  // CORS: determina l'origin ammessa per questo widget.
  //
  // Se EMBED_ALLOWED_ORIGINS non è impostata (tipico in sviluppo o per widget
  // pubblici), si usa "*" mantenendo il comportamento precedente senza regressione.
  // Se è impostata (es. "https://cliente.it,https://partner.com"),
  // vengono ammesse solo le origins in whitelist; le altre ricevono "null".
  // ---------------------------------------------------------------------------
  const requestOrigin = req.headers.get("origin");
  const allowedOrigin = corsOriginForEmbed(requestOrigin);

  const widgetLabel = sanitized.title || (sanitized.lang === "en" ? "Chat with AI" : "Chatta con l'IA");
  const isLeft = sanitized.position === "bottom-left";
  const positionCss = isLeft ? "left:20px;" : "right:20px;";
  const framePositionCss = isLeft ? "left:0;" : "right:0;";
  const primaryColor = sanitized.primaryColor || "#038bfe";

  // Costruzione parametri per l'URL caricato nell'iframe
  const iframeParams = new URLSearchParams();
  if (verifiedTenant) iframeParams.set("tenantId", verifiedTenant);
  if (sanitized.lang) iframeParams.set("lang", sanitized.lang);
  if (sanitized.initialMessage) iframeParams.set("initialMessage", sanitized.initialMessage);

  const querySuffix = iframeParams.toString() ? `?${iframeParams.toString()}` : "";
  const agentUrl = `${BASE_URL}/a/${slug}${querySuffix}`;

  const script = `(function() {
  var id = "agentcloud-widget-" + "${slug}";
  if (document.getElementById(id)) return;

  var container = document.createElement("div");
  container.id = id;
  container.style.cssText = "position:fixed;bottom:20px;${positionCss}z-index:999999;font-family:system-ui,-apple-system,sans-serif;";

  var mode = "${sanitized.mode}";
  var isOpen = false;

  // Frame contenitore modale della Chat incorporata
  var frameWrapper = document.createElement("div");
  frameWrapper.id = id + "-frame-wrap";
  frameWrapper.style.cssText = "display:none;position:absolute;bottom:70px;${framePositionCss}width:380px;height:540px;max-width:calc(100vw - 40px);max-height:calc(100vh - 100px);border-radius:16px;box-shadow:0 12px 36px rgba(0,0,0,0.35);border:1px solid #262626;overflow:hidden;background:#0a0a0a;";

  var iframe = document.createElement("iframe");
  iframe.src = "${agentUrl}";
  iframe.style.cssText = "width:100%;height:100%;border:none;background:#0a0a0a;";
  iframe.setAttribute("allow", "clipboard-write");
  frameWrapper.appendChild(iframe);

  // Pulsante fluttuante (FAB) di apertura/chiusura
  var btn = document.createElement("button");
  btn.id = id + "-btn";
  btn.setAttribute("aria-label", "${widgetLabel.replace(/"/g, '\\"')}");
  btn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2zm0 5v5l3 3"/></svg>';
  btn.style.cssText = "width:56px;height:56px;border-radius:50%;border:none;background:linear-gradient(135deg,${primaryColor},#d4538a);color:white;cursor:pointer;box-shadow:0 8px 24px rgba(3,139,254,0.35);display:flex;align-items:center;justify-content:center;transition:transform 0.2s,box-shadow 0.2s;margin-left:auto;";
  
  btn.onmouseenter = function() { btn.style.transform = "scale(1.08)"; btn.style.boxShadow = "0 12px 32px rgba(3,139,254,0.45)"; };
  btn.onmouseleave = function() { btn.style.transform = "scale(1)"; btn.style.boxShadow = "0 8px 24px rgba(3,139,254,0.35)"; };

  btn.onclick = function() {
    if (mode === "popup") {
      window.open("${agentUrl}", "_blank", "noopener");
      return;
    }
    isOpen = !isOpen;
    if (isOpen) {
      frameWrapper.style.display = "block";
      btn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    } else {
      frameWrapper.style.display = "none";
      btn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2zm0 5v5l3 3"/></svg>';
    }
  };

  var label = document.createElement("span");
  label.id = id + "-label";
  label.textContent = "${widgetLabel.replace(/"/g, '\\"')}";
  label.style.cssText = "display:block;text-align:center;font-size:10px;color:#9ca3af;margin-top:4px;font-weight:500;";

  container.appendChild(frameWrapper);
  container.appendChild(btn);
  container.appendChild(label);
  document.body.appendChild(container);
})();`;

  return new NextResponse(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      // Cache di 1 ora: il widget JS cambia raramente
      "Cache-Control": "public, max-age=3600",
      // CORS: whitelist configurabile via env var EMBED_ALLOWED_ORIGINS
      "Access-Control-Allow-Origin": allowedOrigin,
      // Impedisce al browser di sniffare il tipo MIME del file JS
      "X-Content-Type-Options": "nosniff",
      // Content-Security-Policy per limitare le risorse caricate nell'iframe
      "Content-Security-Policy": buildContentSecurityPolicy(),
    },
  });
}
