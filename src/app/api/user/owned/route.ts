import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { getOwnedAgentSlugs } from "@/lib/agents/ownership";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ owned: [] as string[] }, { status: 200 });
  const owned = await getOwnedAgentSlugs(user.id);
  return NextResponse.json({ owned }, { headers: { "Cache-Control": "no-store" } });
}
