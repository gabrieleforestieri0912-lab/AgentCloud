import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/plugins/[slug]
 * Returns detailed information about a specific plugin including all skills,
 * agent compatibility, and integration requirements.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

  const { slug } = params;

  const { data, error } = await admin
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
      updated_at,
      plugin_skills (
        skill_id,
        skills (
          id,
          slug,
          name,
          description,
          version,
          locale,
          owner,
          risk_level,
          permissions,
          downloads
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
    `)
    .eq("slug", slug)
    .single();

  if (error || !data) {
    console.error("Error fetching plugin:", error);
    return NextResponse.json({ error: "Plugin not found" }, { status: 404 });
  }

  return NextResponse.json(
    { plugin: data },
    { status: 200, headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
  );
}
