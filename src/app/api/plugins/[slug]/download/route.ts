import { NextResponse } from "next/server";
import { getPlugin } from "@/lib/skills/data";
import { buildPluginZip, downloadFileName } from "@/lib/skills/zip";

/**
 * GET /api/plugins/[slug]/download
 *
 * Genera il .zip del plugin su richiesta (SKILL.md di ogni competenza, README
 * e plugin.json) e lo restituisce con checksum SHA-256 nell'header
 * `X-Content-SHA256`: il file è così verificabile lato client prima
 * dell'installazione manuale. Il nome porta la versione, come da specifica.
 */

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const plugin = await getPlugin(slug);
  if (!plugin) {
    return NextResponse.json({ error: "Plugin not found" }, { status: 404 });
  }

  const zip = await buildPluginZip(plugin);
  const digest = await sha256Hex(zip);

  return new NextResponse(Buffer.from(zip), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${downloadFileName(plugin.slug, plugin.version)}"`,
      "Content-Length": String(zip.byteLength),
      "X-Content-SHA256": digest,
      // Il catalogo cambia al massimo una volta al mese: la cache breve evita
      // di rigenerare lo stesso identico pacchetto a ogni visita.
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
    },
  });
}

/** SHA-256 in esadecimale del pacchetto. */
async function sha256Hex(data: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", data as unknown as ArrayBuffer);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
