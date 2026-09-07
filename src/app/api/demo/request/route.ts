import { NextResponse } from "next/server";
import { getResend } from "@/lib/resend";
import { createClient } from "@/lib/supabase/server";
import { apiErrorMessage } from "@/lib/i18n/api-errors";
import { rateLimit, RATE_LIMIT_WINDOWS } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { SUPPORT_EMAIL, FROM_EMAIL } from "@/lib/email-config";

const DEMO_EMAIL_TO = process.env.DEMO_EMAIL_TO || SUPPORT_EMAIL;

// Route API richiesta agente personalizzato (ex demo): salva su Supabase e notifica via email.
// Max richieste per IP all'ora — protegge DB ed email da spam/abusi.
const DEMO_LIMIT = 5;

export async function POST(request: Request) {
  try {
    const rl = await rateLimit("demo-request", getClientIp(request), {
      limit: DEMO_LIMIT,
      windowMs: RATE_LIMIT_WINDOWS.HOUR_MS,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: await apiErrorMessage("rateLimited") },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
      );
    }

    const { name, surname, email, company, idea, integrations, budget } = await request.json();

    if (!name || !surname || !email || !idea) {
      return NextResponse.json(
        { error: await apiErrorMessage("allFieldsRequired") },
        { status: 400 },
      );
    }

    // Salva la richiesta su Supabase — prova con campi estesi, fallback a base
    const supabase = await createClient();
    const payloadFull: Record<string, string> = { name, surname, email };
    if (company) payloadFull.company = String(company);
    if (idea) payloadFull.idea = String(idea);
    if (integrations) payloadFull.integrations = String(integrations);
    if (budget) payloadFull.budget = String(budget);

    let { error: dbError } = await supabase.from("demo_requests").insert(payloadFull);
    if (dbError) {
      // Colonne extra non presenti — riprova con solo base
      const { error: fallbackError } = await supabase.from("demo_requests").insert({ name, surname, email });
      dbError = fallbackError;
      if (dbError) console.error("Failed to store custom agent request:", dbError);
      else console.warn("Stored custom agent request with fallback (extra columns missing)", payloadFull);
    }

    // Invia la notifica email con tutti i dettagli
    const esc = (v: string) => String(v).replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const { error: emailError } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: [DEMO_EMAIL_TO],
      subject: `Nuova richiesta agente personalizzato da ${name} ${surname}${company ? ` — ${company}` : ""}`,
      html: `
        <h2>Nuova richiesta agente personalizzato</h2>
        <table style="border-collapse:collapse;width:100%;max-width:600px">
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Nome</td><td style="padding:8px;border:1px solid #ddd">${esc(name)} ${esc(surname)}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Email</td><td style="padding:8px;border:1px solid #ddd">${esc(email)}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Azienda</td><td style="padding:8px;border:1px solid #ddd">${esc(company || "-")}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Idea agente</td><td style="padding:8px;border:1px solid #ddd;white-space:pre-wrap">${esc(idea)}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Integrazioni</td><td style="padding:8px;border:1px solid #ddd">${esc(integrations || "-")}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Budget</td><td style="padding:8px;border:1px solid #ddd">${esc(budget || "-")}</td></tr>
        </table>
      `,
    });

    if (emailError) {
      return NextResponse.json({ error: emailError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      {
        // Gli errori dei provider (Resend/Supabase) sono mostrati così come
        // sono: il contenuto è sconosciuto, quindi localizziamo solo il
        // fallback generico.
        error:
          err instanceof Error
            ? err.message
            : await apiErrorMessage("internalServerError"),
      },
      { status: 500 },
    );
  }
}
