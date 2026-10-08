import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/agents/[id]/skills
 * Returns all skills installed for a specific agent instance.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

  const { id: agentInstanceId } = params;

  const { data, error } = await admin
    .from("installed_skills")
    .select(`
      id,
      skill_id,
      enabled,
      installed_at,
      skills (
        id,
        slug,
        name,
        description,
        version,
        risk_level,
        permissions
      )
    `)
    .eq("account_id", user.id)
    .eq("agent_instance_id", agentInstanceId);

  if (error) {
    console.error("Error fetching installed skills:", error);
    return NextResponse.json({ error: "Failed to fetch skills" }, { status: 500 });
  }

  return NextResponse.json({ installedSkills: data || [] }, { status: 200 });
}

/**
 * POST /api/agents/[id]/skills
 * Installs a skill on an agent instance.
 * Body: { skill_id: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

  const { id: agentInstanceId } = params;
  const body = await req.json();
  const { skill_id } = body;

  if (!skill_id) {
    return NextResponse.json({ error: "skill_id is required" }, { status: 400 });
  }

  // Verify skill exists and is accessible
  const { data: skill, error: skillError } = await admin
    .from("skills")
    .select("id, owner, account_id")
    .eq("id", skill_id)
    .single();

  if (skillError || !skill) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }

  // If user skill, verify ownership
  if (skill.owner === "user" && skill.account_id !== user.id) {
    return NextResponse.json({ error: "Skill not accessible" }, { status: 403 });
  }

  // Install skill
  const { data, error } = await admin
    .from("installed_skills")
    .insert({
      account_id: user.id,
      agent_instance_id: agentInstanceId,
      skill_id,
      enabled: true,
    })
    .select()
    .single();

  if (error) {
    console.error("Error installing skill:", error);
    return NextResponse.json({ error: "Failed to install skill" }, { status: 500 });
  }

  return NextResponse.json({ installedSkill: data }, { status: 201 });
}

/**
 * PATCH /api/agents/[id]/skills
 * Updates the enabled status of an installed skill.
 * Body: { skill_id: string, enabled: boolean }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

  const { id: agentInstanceId } = params;
  const body = await req.json();
  const { skill_id, enabled } = body;

  if (!skill_id || typeof enabled !== "boolean") {
    return NextResponse.json({ error: "skill_id and enabled are required" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("installed_skills")
    .update({ enabled })
    .eq("account_id", user.id)
    .eq("agent_instance_id", agentInstanceId)
    .eq("skill_id", skill_id)
    .select()
    .single();

  if (error) {
    console.error("Error updating skill:", error);
    return NextResponse.json({ error: "Failed to update skill" }, { status: 500 });
  }

  return NextResponse.json({ installedSkill: data }, { status: 200 });
}

/**
 * DELETE /api/agents/[id]/skills
 * Uninstalls a skill from an agent instance.
 * Query: ?skill_id=uuid
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

  const { id: agentInstanceId } = params;
  const { searchParams } = new URL(req.url);
  const skill_id = searchParams.get("skill_id");

  if (!skill_id) {
    return NextResponse.json({ error: "skill_id query parameter is required" }, { status: 400 });
  }

  const { error } = await admin
    .from("installed_skills")
    .delete()
    .eq("account_id", user.id)
    .eq("agent_instance_id", agentInstanceId)
    .eq("skill_id", skill_id);

  if (error) {
    console.error("Error uninstalling skill:", error);
    return NextResponse.json({ error: "Failed to uninstall skill" }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
