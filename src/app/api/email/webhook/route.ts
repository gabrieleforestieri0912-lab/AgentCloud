// Webhook email in ingresso (scaffold): riceve i payload di Resend e li
// logga. Punto di estensione per salvare/inoltrare le email in arrivo.
//
// Auth: richiede `Authorization: Bearer $EMAIL_WEBHOOK_SECRET` oppure
// l'header di firma del provider quando configurato. Senza secret configurato
// l'endpoint è disabilitato (fail-closed) per evitare spoofing/log-spam.
import { NextResponse } from "next/server";

function isAuthorized(request: Request): boolean {
  const secret = process.env.EMAIL_WEBHOOK_SECRET || "";
  if (!secret) return false;
  const auth = request.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const payload = await request.json();

    const { from, subject } = payload;

    if (!from || !subject) {
      return NextResponse.json(
        { error: "Invalid webhook payload" },
        { status: 400 },
      );
    }

    // Gestisci l'email in arrivo — salva o inoltra secondo la logica scelta
    console.log("Email in arrivo ricevuta:", { from, subject });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}

// Resend verifica l'endpoint del webhook con una richiesta GET:
// endpoint disabilitato senza secret (niente sonda pubblica `ok:true`).
export async function GET() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
