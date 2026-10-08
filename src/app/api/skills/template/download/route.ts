import { NextResponse } from "next/server";
import { downloadFileName } from "@/lib/skills/zip";
import { SKILL_TEMPLATE } from "@/lib/skills/template";

/**
 * GET /api/skills/template/download
 *
 * Template `SKILL.md` pronto da compilare: è il punto di partenza della guida
 * "Crea la tua competenza in 10 minuti". Il file è generato dal codice, quindi
 * il template che l'utente scarica è sempre identico a quello documentato.
 */

export async function GET() {
  const bytes = new TextEncoder().encode(SKILL_TEMPLATE);
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${downloadFileName("template-skill", "1.0.0")}"`,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "public, s-maxage=3600",
    },
  });
}
