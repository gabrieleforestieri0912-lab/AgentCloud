import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { allCatalogSkills } from "@/lib/skills/catalog";
import { getPlugins } from "@/lib/skills/data";

/**
 * GET /api/skills
 *
 * Elenco delle competenze accessibili.
 * `?owner=official|community|user` — default: official + community (pubbliche).
 * `?risk_level=low|medium|high`
 * `?plugin=<slug>` — solo le skill di un plugin.
 *
 * Le skill utente sono private per account: senza sessione `?owner=user`
 * restituisce una lista vuota.
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  const { searchParams } = new URL(req.url);
  const owner = searchParams.get("owner");
  const riskLevel = searchParams.get("risk_level");
  const pluginSlug = searchParams.get("plugin");

  const admin = createAdminClient();

  // Percorso DB: le skill utente (caricate via upload) vivono solo lì.
  if (admin) {
    try {
      let query = admin
        .from("skills")
        .select("id, slug, name, description, version, locale, owner, risk_level, permissions, downloads, created_at");

      if (owner === "user") {
        if (!user) return NextResponse.json({ skills: [] }, { status: 200 });
        query = query.eq("owner", "user").eq("account_id", user.id);
      } else if (owner) {
        query = query.eq("owner", owner);
      } else {
        query = query.in("owner", ["official", "community"]);
      }
      if (riskLevel) query = query.eq("risk_level", riskLevel);

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        const rows = pluginSlug
          ? await filterByPlugin(data as { slug: string }[], pluginSlug)
          : (data as Record<string, unknown>[]);
        return NextResponse.json(
          { skills: rows },
          { status: 200, headers: { "Cache-Control": "private, max-age=60" } },
        );
      }
    } catch {
      // Il catalogo statico sotto copre il caso.
    }
  }

  // Catalogo statico: stessa forma della risposta DB, così il client non deve
  // distinguere le due fonti.
  let skills = allCatalogSkills().map((s) => ({
    id: s.pluginSlug,
    slug: s.slug,
    name: s.name,
    description: s.description,
    version: "1.0.0",
    locale: "it",
    owner: "official" as const,
    risk_level: s.risk,
    permissions: s.permissions,
    downloads: 0,
    created_at: null as string | null,
    plugin_slug: s.pluginSlug,
  }));

  if (owner && owner !== "user") skills = skills.filter((s) => s.owner === owner);
  if (riskLevel) skills = skills.filter((s) => s.risk_level === riskLevel);
  if (pluginSlug) skills = skills.filter((s) => s.plugin_slug === pluginSlug);

  return NextResponse.json(
    { skills },
    { status: 200, headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}

/**
 * Tiene solo le skill che appartengono a un plugin.
 *
 * Perché: `skills` non ha una colonna plugin (il legame è la tabella ponte
 * `plugin_skills`), quindi il filtro non può essere un `.eq()` sulla tabella
 * principale senza una query annidata che qui non serve.
 */
async function filterByPlugin<T extends { slug: string }>(rows: T[], pluginSlug: string): Promise<T[]> {
  const plugins = await getPlugins();
  const plugin = plugins.find((p) => p.slug === pluginSlug);
  if (!plugin) return [];
  const slugs = new Set(plugin.skills.map((s) => s.slug));
  return rows.filter((r) => slugs.has(r.slug));
}
