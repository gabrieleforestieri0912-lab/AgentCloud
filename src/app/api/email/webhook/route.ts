/* eslint-disable @typescript-eslint/no-unused-vars */
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

    // Process inbound email — store or forward based on your logic
    console.log("Inbound email received:", { from, subject });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}

// Resend verifies the webhook endpoint with a GET request
export async function GET() {
  return NextResponse.json({ ok: true });
}
