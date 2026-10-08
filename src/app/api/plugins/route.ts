import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/plugins
 * Returns all plugins with optional filtering by category, agent, or integration.
 * Query params:
 * - category: filter by plugin category
 * - agent_slug: filter by agent compatibility
 * - integration_slug: filter by integration requirement
 * - availability: filter by integration availability (live | coming_soon)
 */
export async function GET(req: NextRequest) {
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ plugins: [] }, { status: 200 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const agentSlug = searchParams.get("agent_slug");
  const integrationSlug = searchParams.get("integration_slug");
  const availability = searchParams.get("availability");

  let query = admin
    .from("plugins")
    .select(`
      id,
      slug,
      name,
      tagline,
      description,
      category,
      icon,
      price_tier,
      version,
      downloads,
      created_at,
      plugin_skills (
        skill_id,
        skills (
          id,
          slug,
          name,
          description,
          risk_level
        )
      ),
      plugin_agents (
        agent_slug,
        fit,
        rationale
      ),
      plugin_integrations (
        integration_slug,
        status,
        availability,
        rationale
      )
    `);

  // Filter by category
  if (category) {
    query = query.eq("category", category);
  }

  // Filter by agent compatibility
  if (agentSlug) {
    query = query.filter("plugin_agents.agent_slug", "eq", agentSlug);
  }

  // Execute query
  const { data, error } = await query;

  if (error || !data) {
    console.error("Error fetching plugins:", error);
    return NextResponse.json({ plugins: [] }, { status: 200 });
  }

  // Post-process filters that need to be applied after join
  let filteredPlugins = data;

  // Filter by integration requirement
  if (integrationSlug) {
    filteredPlugins = filteredPlugins.filter((plugin) =>
      plugin.plugin_integrations.some((pi: any) => pi.integration_slug === integrationSlug)
    );
  }

  // Filter by integration availability
  if (availability) {
    filteredPlugins = filteredPlugins.filter((plugin) =>
      plugin.plugin_integrations.some((pi: any) => pi.availability === availability)
    );
  }

  return NextResponse.json(
    { plugins: filteredPlugins },
    { status: 200, headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
  );
}
