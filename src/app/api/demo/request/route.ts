import { NextResponse } from "next/server";
import { getResend } from "@/lib/resend";
import { createClient } from "@/lib/supabase/server";

const DEMO_EMAIL_TO = process.env.DEMO_EMAIL_TO || "info@agentcloud.io";

export async function POST(request: Request) {
  try {
    const { name, surname, email } = await request.json();

    if (!name || !surname || !email) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 },
      );
    }

    // Store in Supabase
    const supabase = await createClient();
    const { error: dbError } = await supabase
      .from("demo_requests")
      .insert({ name, surname, email });

    if (dbError) {
      console.error("Failed to store demo request:", dbError);
    }

    // Send email notification
    const { error: emailError } = await getResend().emails.send({
      from: "AgentCloud <onboarding@resend.dev>",
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
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
