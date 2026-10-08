import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSkill } from "@/lib/skills/data";

/**
 * GET /api/skills/[slug]
 *
 * Dettaglio di una competenza con il plugin di appartenenza. Una skill
 * `owner: "user"` è privata: se non è dell'account che chiede, rispondiamo
 * 404 (non 403, per non confermare l'esistenza di una skill altrui).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const user = await getSessionUser();
  const admin = createAdminClient();

  if (admin) {
    try {
      const { data, error } = await admin
        .from("skills")
        .select(
          "id, slug, name, description, version, locale, owner, risk_level, permissions, downloads, created_at, account_id",
        )
        .eq("slug", slug)
        .maybeSingle();

      if (!error && data) {
        const row = data as Record<string, unknown>;
        if (row.owner === "user" && row.account_id !== user?.id) {
          return NextResponse.json({ error: "Skill not found" }, { status: 404 });
        }
        // `account_id` non esce dalla API: è un identificatore interno.
        delete row.account_id;
        return NextResponse.json(
          { skill: row },
          { status: 200, headers: { "Cache-Control": "private, max-age=60" } },
        );
      }
    } catch {
      // Prosegui con il catalogo statico.
    }
  }

  const skill = await getSkill(slug);
  if (!skill) return NextResponse.json({ error: "Skill not found" }, { status: 404 });

  return NextResponse.json(
    { skill },
    { status: 200, headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}
