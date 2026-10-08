import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/supabase/server";

/**
 * GET /api/skills
 * Returns all skills accessible to the current user.
 * - Official and community skills are public
 * - User skills are private to the account
 * Query params:
 * - owner: filter by owner (official | community | user)
 * - risk_level: filter by risk level (low | medium | high)
 */
export async function GET(req: NextRequest) {
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ skills: [] }, { status: 200 });

  const user = await getSessionUser();
  const { searchParams } = new URL(req.url);
  const owner = searchParams.get("owner");
  const riskLevel = searchParams.get("risk_level");

  let query = admin
    .from("skills")
    .select("id, slug, name, description, version, locale, owner, risk_level, permissions, downloads, created_at");

  // Filter by owner
  if (owner) {
    if (owner === "user") {
      // User skills: only for authenticated user
      if (!user) return NextResponse.json({ skills: [] }, { status: 200 });
      query = query.eq("owner", "user").eq("account_id", user.id);
    } else {
      // Official or community: public read
      query = query.eq("owner", owner);
    }
  } else {
    // Default: show official and community skills (public)
    query = query.in("owner", ["official", "community"]);
  }

  // Filter by risk level
  if (riskLevel) {
    query = query.eq("risk_level", riskLevel);
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error("Error fetching skills:", error);
    return NextResponse.json({ skills: [] }, { status: 200 });
  }

  return NextResponse.json(
    { skills: data },
    { status: 200, headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
  );
}
