import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("ref") || request.nextUrl.searchParams.get("code") || request.nextUrl.searchParams.get("r");
  const clean = code ? code.trim().slice(0, 32) : null;

  // Se nessun codice, redirect semplice a /waitlist
  if (!clean) {
    return NextResponse.redirect(new URL("/waitlist", request.url));
  }

  // Valida che il codice esista (in nuova tabella o legacy) — non blocca, ma solo per logging
  // Non riveliamo se il codice è valido o meno all'utente, per non enumerare.
  // Settiamo comunque il cookie così la signup successiva può validarlo server-side.
  const redirectUrl = new URL("/waitlist", request.url);
  redirectUrl.searchParams.set("ref", clean);

  const res = NextResponse.redirect(redirectUrl);

  // Cookie per sopravvivere a OAuth e a navigazione (1h, Lax)
  res.cookies.set("ac_wl_ref", encodeURIComponent(clean), {
    path: "/",
    maxAge: 60 * 60,
    sameSite: "lax",
  });

  return res;
}
