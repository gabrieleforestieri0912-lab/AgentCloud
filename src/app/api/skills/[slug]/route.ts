import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/supabase/server";

/**
 * GET /api/skills/[slug]
 * Returns detailed information about a specific skill.
 * User skills require authentication and account ownership.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

  const { slug } = params;

  const { data, error } = await admin
    .from("skills")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    console.error("Error fetching skill:", error);
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }

  // If user skill, check ownership
  if (data.owner === "user") {
    const user = await getSessionUser();
    if (!user || data.account_id !== user.id) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }
  }

  return NextResponse.json(
    { skill: data },
    { status: 200, headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
  );
}
