/* eslint-disable @typescript-eslint/no-unused-vars */
// Webhook email in ingresso (scaffold): riceve i payload di Resend e li
// logga. Punto di estensione per salvare/inoltrare le email in arrivo.
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    const { email, to, from, subject, text, html } = payload;

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

// Resend verifica l'endpoint del webhook con una richiesta GET
export async function GET() {
  return NextResponse.json({ ok: true });
}
