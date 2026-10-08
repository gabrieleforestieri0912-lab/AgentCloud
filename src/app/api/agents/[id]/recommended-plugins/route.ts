import { NextResponse } from "next/server";
import { getRecommendedPlugins } from "@/lib/skills/data";

/**
 * GET /api/agents/[id]/recommended-plugins
 *
 * Plugin consigliati per un agente del marketplace, con agenti e integrazioni
 * già risolti: la scheda "Competenze" della pagina agente consuma questa rotta
 * e non ha bisogno di conoscere il formato del catalogo.
 *
 * Nota sul nome del segmento: la cartella è `[id]` (non `[slug]`) perché
 * `api/agents/[id]/skills` esiste già e Next non ammette due nomi diversi per
 * lo stesso percorso dinamico.
 */

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const plugins = await getRecommendedPlugins(id);

  return NextResponse.json(
    {
      plugins: plugins.map((p) => ({
        slug: p.slug,
        name: p.name,
        tagline: p.tagline,
        icon: p.icon,
        version: p.version,
        category: p.category,
        skillCount: p.skillCount,
        skillSlugs: p.skills.map((s) => s.slug),
        skills: p.skills.map((s) => ({
          slug: s.slug,
          name: s.name,
          description: s.description,
          risk_level: s.risk,
          permissions: s.permissions,
        })),
        fit: p.agents.find((a) => a.slug === id)?.fit ?? "secondary",
        rationale: p.agents.find((a) => a.slug === id)?.rationale ?? null,
        integrations: p.resolvedIntegrations.map((i) => ({
          brand: i.brand,
          name: i.name,
          status: i.status,
          availability: i.available ? "live" : "coming_soon",
          rationale: i.rationale,
        })),
      })),
    },
    { status: 200, headers: { "Cache-Control": "public, s-maxage=300" } },
  );
}
