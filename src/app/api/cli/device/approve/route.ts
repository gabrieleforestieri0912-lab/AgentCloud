import { NextResponse } from "next/server";
import { approveDeviceGrant, lookupByUserCode } from "@/lib/cli-auth";

/**
 * POST /api/cli/device/approve — approva un device login (utente loggato su
 * /device). Il browser passa { user_code, access_token, refresh_token };
 * il server verifica il token contro Supabase e aggancia i token del grant
 * in attesa. I token NON vengono salvati lato server a lungo termine:
 * restano in memoria finché la CLI non li ritira col poll (max TTL).
 */
export const runtime = "nodejs";

const supabaseTokenClient = async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, anonKey);
};

export async function POST(req: Request) {
  let body: { user_code?: string; access_token?: string; refresh_token?: string };
  try {
    body = (await req.json()) as { user_code?: string; access_token?: string; refresh_token?: string };
  } catch {
    return NextResponse.json({ error: "Body JSON non valido." }, { status: 400 });
  }
  const userCode = (body.user_code || "").trim().toUpperCase();
  if (!userCode) {
    return NextResponse.json({ error: "Codice mancante." }, { status: 400 });
  }
  if (!body.access_token) {
    return NextResponse.json({ error: "Sessione mancante: accedi sul sito prima di approvare." }, { status: 401 });
  }

  const grant = lookupByUserCode(userCode);
  if (!grant) {
    return NextResponse.json({ error: "Codice non valido o scaduto: riprova su /device." }, { status: 404 });
  }
  if (grant.status === "expired") {
    return NextResponse.json({ error: "Codice scaduto: riavvia il login nel terminale." }, { status: 410 });
  }
  if (grant.status === "approved") {
    return NextResponse.json({ ok: true, already: true });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ error: "Supabase non configurato sul server." }, { status: 500 });
  }
  const client = await supabaseTokenClient();
  if (!client) {
    return NextResponse.json({ error: "Supabase non configurato sul server." }, { status: 500 });
  }
  const { data, error } = await client.auth.getUser(body.access_token);
  if (error || !data?.user) {
    return NextResponse.json({ error: "Sessione non valida: riaccedi e riprova." }, { status: 401 });
  }
  approveDeviceGrant(grant, {
    access_token: body.access_token,
    refresh_token: body.refresh_token ?? "",
    email: data.user.email ?? undefined,
  });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
