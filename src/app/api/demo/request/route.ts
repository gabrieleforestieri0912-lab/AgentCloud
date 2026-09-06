import { NextResponse } from "next/server";
import { getResend } from "@/lib/resend";
import { createClient } from "@/lib/supabase/server";
import { apiErrorMessage } from "@/lib/i18n/api-errors";
import { rateLimit, RATE_LIMIT_WINDOWS } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { SUPPORT_EMAIL, FROM_EMAIL } from "@/lib/email-config";

const DEMO_EMAIL_TO = process.env.DEMO_EMAIL_TO || SUPPORT_EMAIL;

// Route API della richiesta demo: salva su Supabase e notifica via email.
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

    const { name, surname, email } = await request.json();

    if (!name || !surname || !email) {
      return NextResponse.json(
        { error: await apiErrorMessage("allFieldsRequired") },
        { status: 400 },
      );
    }

    // Salva la richiesta su Supabase
    const supabase = await createClient();
    const { error: dbError } = await supabase
      .from("demo_requests")
      .insert({ name, surname, email });

    if (dbError) {
      console.error("Failed to store demo request:", dbError);
    }

    // Invia la notifica email
    const { error: emailError } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: [DEMO_EMAIL_TO],
      subject: `New demo request from ${name} ${surname}`,
      html: `
        <h2>New demo request</h2>
        <table style="border-collapse:collapse;width:100%;max-width:500px">
          <tr>
            <td style="padding:8px;border:1px solid #ddd;font-weight:bold">First name</td>
            <td style="padding:8px;border:1px solid #ddd">${name}</td>
          </tr>
          <tr>
            <td style="padding:8px;border:1px solid #ddd;font-weight:bold">Last name</td>
            <td style="padding:8px;border:1px solid #ddd">${surname}</td>
          </tr>
          <tr>
            <td style="padding:8px;border:1px solid #ddd;font-weight:bold">Email</td>
            <td style="padding:8px;border:1px solid #ddd">${email}</td>
          </tr>
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
