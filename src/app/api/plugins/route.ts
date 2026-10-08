import { NextResponse } from "next/server";
import { getPlugins } from "@/lib/skills/data";

/**
 * GET /api/plugins
 *
 * Lista dei plugin con skill, agenti e integrazioni. I parametri di filtro
 * sono opzionali e non sovrappongono a quelli della pagina `/skills`, che
 * filtra in memoria: qui filtrano lato server.
 *
 * `?category=`     categoria del plugin
 * `?agent_slug=`   compatibilità con un agente del marketplace
 * `?integration=`  integrazione richiesta o opzionale (brand)
 * `?availability=` `live` | `coming_soon` (stato dell'integrazione)
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const agentSlug = searchParams.get("agent_slug");
  const integration = searchParams.get("integration");
  const availability = searchParams.get("availability");

  let plugins = await getPlugins();

  if (category) plugins = plugins.filter((p) => p.category === category);
  if (agentSlug) plugins = plugins.filter((p) => p.agents.some((a) => a.slug === agentSlug));
  if (integration) {
    plugins = plugins.filter((p) => p.resolvedIntegrations.some((i) => i.brand === integration));
  }
  if (availability === "live") {
    plugins = plugins.filter((p) => p.resolvedIntegrations.some((i) => i.available));
  } else if (availability === "coming_soon") {
    plugins = plugins.filter((p) => p.resolvedIntegrations.some((i) => !i.available));
  }

  return NextResponse.json(
    { plugins },
    { status: 200, headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}
