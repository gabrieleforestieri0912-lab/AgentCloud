import { NextResponse } from "next/server";
import { getResend } from "@/lib/resend";
import { createClient } from "@/lib/supabase/server";
import { apiErrorMessage } from "@/lib/i18n/api-errors";
import { rateLimit, RATE_LIMIT_WINDOWS } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

// Max submissions per IP per hour — prevents DB spam and email abuse.
const CONTACT_LIMIT = 5;

export async function POST(request: Request) {
  try {
    const rl = await rateLimit("contact-form", getClientIp(request), {
      limit: CONTACT_LIMIT,
      windowMs: RATE_LIMIT_WINDOWS.HOUR_MS,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: await apiErrorMessage("rateLimited") },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
      );
    }

    const { name, email, subject, message } = await request.json();

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: await apiErrorMessage("allFieldsRequired") },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { error: dbError } = await supabase
      .from("contact_messages")
      .insert({ name, email, subject, message });

    if (dbError) {
      console.error("Failed to store contact message:", dbError);
    }

    const { error: emailError } = await getResend().emails.send({
      from: "AgentCloud <onboarding@resend.dev>",
      to: ["agentcloud206@gmail.com"],
      subject: `Contact form: ${subject} — from ${name}`,
      html: `
        <h2>New contact message</h2>
        <table style="border-collapse:collapse;width:100%;max-width:600px">
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Name</td><td style="padding:8px;border:1px solid #ddd">${name}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Email</td><td style="padding:8px;border:1px solid #ddd">${email}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Subject</td><td style="padding:8px;border:1px solid #ddd">${subject}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Message</td><td style="padding:8px;border:1px solid #ddd">${message}</td></tr>
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
        // Provider errors (Resend/Supabase) are surfaced verbatim: their
        // content is unknown, so we only localize the generic fallback.
        error:
          err instanceof Error
            ? err.message
            : await apiErrorMessage("internalServerError"),
      },
      { status: 500 },
    );
  }
}