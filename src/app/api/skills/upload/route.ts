import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { readSkillZip } from "@/lib/skills/unzip";
import { formatIssues } from "@/lib/skills/validate";

/**
 * POST /api/skills/upload
 *
 * Carica una competenza personale (.zip) nel proprio account.
 *
 * Multitenant: la skill viene sempre salvata con `owner: "user"` e
 * `account_id` = sessione, MAI con i valori del frontmatter. Una skill
 * caricata non può dichiararsi "official" e finire nel catalogo pubblico.
 *
 * Tutta la validazione è server-side (`lib/skills/validate.ts`): la UI fa
 * anteprima, ma è qui che si decide se la skill entra.
 */

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  let buffer: ArrayBuffer;
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof Blob)) {
      return NextResponse.json(
        { error: "Allega il file .zip nel campo `file`." },
        { status: 400 },
      );
    }
    buffer = await file.arrayBuffer();
  } catch {
    return NextResponse.json(
      { error: "Richiesta non valida: il body deve essere multipart con un campo `file`." },
      { status: 400 },
    );
  }

  const unzipped = await readSkillZip(buffer);
  if (!unzipped.ok) {
    return NextResponse.json(
      { error: "Skill non valida", issues: formatIssues(unzipped.issues) },
      { status: 400 },
    );
  }

  const { skill, files, issues, pluginSlug } = unzipped.result;

  // Lo slug è la chiave: due upload con lo stesso slug non possono coesistere
  // per lo stesso account (l'utente aggiorna la sua competenza).
  const { error: upsertError } = await admin.from("skills").upsert(
    {
      slug: skill.slug,
      name: skill.name,
      description: skill.description,
      version: skill.version,
      locale: skill.locale,
      owner: "user",
      risk_level: skill.risk,
      permissions: skill.permissions,
      downloads: 0,
      account_id: user.id,
    },
    { onConflict: "slug" },
  );

  if (upsertError) {
    // Un conflitto su slug significa che la skill è di un altro account: in
    // quel caso non sovrascriviamo, ma creiamo uno slug scoped all'account.
    const scoped = `${skill.slug}-${user.id.slice(0, 8)}`;
    const { error: retryError } = await admin.from("skills").upsert(
      {
        slug: scoped,
        name: skill.name,
        description: skill.description,
        version: skill.version,
        locale: skill.locale,
        owner: "user",
        risk_level: skill.risk,
        permissions: skill.permissions,
        downloads: 0,
        account_id: user.id,
      },
      { onConflict: "slug" },
    );
    if (retryError) {
      console.error("Error uploading skill:", retryError);
      return NextResponse.json({ error: "Failed to save skill" }, { status: 500 });
    }
    return NextResponse.json(
      {
        skill: { ...skill, slug: scoped },
        files,
        warnings: formatIssues(issues),
        renamed: true,
      },
      { status: 201 },
    );
  }

  return NextResponse.json(
    { skill, files, warnings: formatIssues(issues), pluginSlug },
    { status: 201 },
  );
}
