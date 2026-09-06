import { NextResponse } from "next/server";
import { getResend } from "@/lib/resend";
import { apiErrorMessage } from "@/lib/i18n/api-errors";
import { FROM_EMAIL } from "@/lib/email-config";

/**
 * POST /api/email/send
 *
 * Invio email riservato agli admin. Questo endpoint permette di mandare email
 * arbitrarie tramite l'account Resend di AgentCloud, quindi NON deve essere
 * usabile dagli utenti normali loggati (relay aperto = spam + reputazione del
 * dominio bruciata).
 *
 * Auth: richiede `Authorization: Bearer <ADMIN_API_TOKEN>` (stesso token delle
 * API admin). Fails closed: se il token non è configurato l'endpoint è
 * irraggiungibile.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const adminToken = process.env.ADMIN_API_TOKEN;
  if (!adminToken || authHeader !== `Bearer ${adminToken}`) {
    return NextResponse.json(
      { error: await apiErrorMessage("unauthorized") },
      { status: 401 },
    );
  }

  try {
    const { to, subject, html, text, from } = await request.json();

    if (!to || !subject || (!html && !text)) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, and html or text" },
        { status: 400 },
      );
    }

    const { data, error } = await getResend().emails.send({
      from: from || FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html: html || undefined,
      text: text || undefined,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : await apiErrorMessage("internalServerError"),
      },
      { status: 500 },
    );
  }
}
