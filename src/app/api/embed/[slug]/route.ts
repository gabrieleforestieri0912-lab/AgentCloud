import { NextResponse } from "next/server";
import { getAgentBySlug } from "@/lib/agents";
import { getAgentRuntimeConfig } from "@/lib/agents/registry";
import { getSiteUrl } from "@/lib/site-url";

const BASE_URL = getSiteUrl();

type Props = {
  params: Promise<{ slug: string }>;
};

export async function GET(req: Request, { params }: Props) {
  const { slug } = await params;
  const agent = getAgentBySlug(slug) || getAgentRuntimeConfig(slug);
  if (!agent) {
    return new NextResponse("/* Agent not found */", {
      status: 404,
      headers: { "Content-Type": "application/javascript" },
    });
  }

  // Widget label follows the platform default (Italian); embedders can opt
  // into English with `?lang=en`.
  const lang = new URL(req.url).searchParams.get("lang");
  const widgetLabel =
    lang === "en" ? "Chat with AI" : "Chatta con l'IA";

  const agentUrl = `${BASE_URL}/a/${slug}`;

  const script = `(function() {
  var id = "agentcloud-widget-" + "${slug}";
  if (document.getElementById(id)) return;

  var container = document.createElement("div");
  container.id = id;
  container.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:999999;font-family:system-ui,-apple-system,sans-serif;";

  var btn = document.createElement("button");
  btn.id = id + "-btn";
  btn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2zm0 5v5l3 3"/></svg>';
  btn.style.cssText = "width:56px;height:56px;border-radius:50%;border:none;background:linear-gradient(135deg,#038bfe,#d4538a);color:white;cursor:pointer;box-shadow:0 8px 24px rgba(3,139,254,0.3);display:flex;align-items:center;justify-content:center;transition:transform 0.2s,box-shadow 0.2s;";
  btn.onmouseenter = function() { btn.style.transform = "scale(1.08)"; btn.style.boxShadow = "0 12px 32px rgba(3,139,254,0.4)"; };
  btn.onmouseleave = function() { btn.style.transform = "scale(1)"; btn.style.boxShadow = "0 8px 24px rgba(3,139,254,0.3)"; };
  btn.onclick = function() { window.open("${agentUrl}", "_blank", "noopener"); };

  var label = document.createElement("span");
  label.id = id + "-label";
  label.textContent = "${widgetLabel}";
  label.style.cssText = "display:block;text-align:center;font-size:10px;color:#9ca3af;margin-top:4px;font-weight:500;";

  container.appendChild(btn);
  container.appendChild(label);
  document.body.appendChild(container);
})();`;

  return new NextResponse(script, {
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
