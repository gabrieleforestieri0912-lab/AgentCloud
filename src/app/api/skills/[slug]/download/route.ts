import { NextResponse } from "next/server";
import { getSkill } from "@/lib/skills/data";
import { buildSkillZip, downloadFileName } from "@/lib/skills/zip";

/**
 * GET /api/skills/[slug]/download
 *
 * Genera il .zip di una singola competenza (cartella `SKILL.md` + README,
 * lo stesso formato del pacchetto plugin) con checksum SHA-256 nell'header.
 */

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const skill = await getSkill(slug);
  if (!skill) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }

  const zip = await buildSkillZip(skill, skill.plugin);
  const hash = await crypto.subtle.digest("SHA-256", zip as unknown as ArrayBuffer);
  const digest = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return new NextResponse(Buffer.from(zip), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${downloadFileName(skill.slug, skill.plugin.version)}"`,
      "Content-Length": String(zip.byteLength),
      "X-Content-SHA256": digest,
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
    },
  });
}
