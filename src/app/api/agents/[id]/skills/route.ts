import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/agents/[id]/skills
 * Returns all skills installed for a specific agent instance.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

  const { id: agentInstanceId } = await params;

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
 * Risolve l'identificatore di una skill in un UUID.
 *
 * Perché: la UI conosce gli slug (il catalogo e gli URL usano gli slug,
 * l'uuid è un dettaglio del DB), ma `installed_skills.skill_id` è una
 * foreign key. Accettiamo `skill_id` o `skill_slug` e risolviamo qui, così il
 * chiamante non deve fare due query.
 */
async function resolveSkillId(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  skillId: string | null | undefined,
  skillSlug: string | null | undefined,
): Promise<{ id: string; owner: string | null; account_id: string | null } | null> {
  const query = admin.from("skills").select("id, owner, account_id");
  const q = skillId ? query.eq("id", skillId) : skillSlug ? query.eq("slug", skillSlug) : null;
  if (!q) return null;
  const { data, error } = await q.maybeSingle();
  if (error || !data) return null;
  return data as { id: string; owner: string | null; account_id: string | null };
}

/**
 * POST /api/agents/[id]/skills
 * Installs a skill on an agent instance.
 * Body: { skill_id?: string, skill_slug?: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

  const { id: agentInstanceId } = await params;
  const body = await req.json().catch(() => ({}));
  const { skill_id, skill_slug } = body ?? {};

  if (!skill_id && !skill_slug) {
    return NextResponse.json({ error: "skill_id or skill_slug is required" }, { status: 400 });
  }

  // Verify skill exists and is accessible
  const skill = await resolveSkillId(admin, skill_id, skill_slug);

  if (!skill) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }

  // If user skill, verify ownership
  if (skill.owner === "user" && skill.account_id !== user.id) {
    return NextResponse.json({ error: "Skill not accessible" }, { status: 403 });
  }

  // Install skill (idempotente sul vincolo unico: reinstallare non duplica)
  const { data, error } = await admin
    .from("installed_skills")
    .upsert(
      {
        account_id: user.id,
        agent_instance_id: agentInstanceId,
        skill_id: skill.id,
        enabled: true,
      },
      { onConflict: "account_id,agent_instance_id,skill_id", ignoreDuplicates: false },
    )
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
 * Body: { skill_id?: string, skill_slug?: string, enabled: boolean }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

  const { id: agentInstanceId } = await params;
  const body = await req.json().catch(() => ({}));
  const { skill_id, skill_slug, enabled } = body ?? {};

  if ((!skill_id && !skill_slug) || typeof enabled !== "boolean") {
    return NextResponse.json(
      { error: "skill_id or skill_slug, and enabled are required" },
      { status: 400 },
    );
  }

  const skill = await resolveSkillId(admin, skill_id, skill_slug);
  if (!skill) return NextResponse.json({ error: "Skill not found" }, { status: 404 });

  const { data, error } = await admin
    .from("installed_skills")
    .update({ enabled })
    .eq("account_id", user.id)
    .eq("agent_instance_id", agentInstanceId)
    .eq("skill_id", skill.id)
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
 * Query: ?skill_id=uuid | ?skill_slug=kebab-case
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

  const { id: agentInstanceId } = await params;
  const { searchParams } = new URL(req.url);
  const skillId = searchParams.get("skill_id");
  const skillSlug = searchParams.get("skill_slug");

  if (!skillId && !skillSlug) {
    return NextResponse.json(
      { error: "skill_id or skill_slug query parameter is required" },
      { status: 400 },
    );
  }

  const skill = await resolveSkillId(admin, skillId, skillSlug);
  if (!skill) return NextResponse.json({ error: "Skill not found" }, { status: 404 });

  const { error } = await admin
    .from("installed_skills")
    .delete()
    .eq("account_id", user.id)
    .eq("agent_instance_id", agentInstanceId)
    .eq("skill_id", skill.id);

  if (error) {
    console.error("Error uninstalling skill:", error);
    return NextResponse.json({ error: "Failed to uninstall skill" }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
