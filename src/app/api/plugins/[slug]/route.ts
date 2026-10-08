import { NextResponse } from "next/server";
import { getPlugin } from "@/lib/skills/data";

/**
 * GET /api/plugins/[slug]
 *
 * Dettaglio di un plugin: skill incluse (con rischio e permessi), agenti
 * consigliati e integrazioni con la motivazione. Stessa fonte di `/skills` e
 * dei download, così i tre non possono divergere.
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

  return NextResponse.json(
    { plugin },
    { status: 200, headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}
