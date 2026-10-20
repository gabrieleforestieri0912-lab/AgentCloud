import { NextResponse } from "next/server";
import { verifyCliCode, verifyPkce, type CliCodePayload } from "@/lib/cli-auth";

/**
 * POST /api/cli/token — scambio PKCE code → token per la CLI.
 *
 * Il `code` (envelope firmato a /api/cli/authorize) contiene i token legati
 * alla `code_challenge`. La CLI consegna soltanto `code` + `code_verifier`;
 * qui si verificano HMAC, scadenza (2 minuti), challenge S256 e validità
 * della sessione ancora in vita, poi si consegnano access/refresh token.
 * Un `code` vale una sola volta (memo in memoria del jti consumato).
 */
export const runtime = "nodejs";

const g = globalThis as { __cliCodeJtiUsed?: Set<string> };
const usedJti = g.__cliCodeJtiUsed ?? (g.__cliCodeJtiUsed = new Set<string>());

export async function POST(req: Request) {
  let body: { code?: string; code_verifier?: string };
  try {
    body = (await req.json()) as { code?: string; code_verifier?: string };
  } catch {
    return NextResponse.json(
      { error: "Body JSON non valido: serve { code, code_verifier }." },
      { status: 400 },
    );
  }
  const code = (body.code || "").trim();
  const verifier = (body.code_verifier || "").trim();
  if (!code || !verifier) {
    return NextResponse.json(
      { error: "Mancano code o code_verifier: rilancia `agentcloud login`." },
      { status: 400 },
    );
  }

  const verified = await verifyCliCode(code);
  if (!verified.ok) {
    const messages: Record<typeof verified.error, string> = {
      invalid: "Code non valido (firma o formato): rilancia `agentcloud login`.",
      expired:
        "Code scaduto: rilancia `agentcloud login` (il code vale 2 minuti dall'approvazione nel browser).",
      misconfigured:
        "Server non configurato: imposta AGENTCLOUD_CLI_SECRET (o INTEGRATIONS_STATE_SECRET) nell'ambiente del sito.",
    };
    return NextResponse.json(
      { error: messages[verified.error] },
      { status: verified.error === "misconfigured" ? 500 : 400 },
    );
  }
  const payload = verified.payload as CliCodePayload;

  if (!(await verifyPkce(verifier, payload.ch))) {
    return NextResponse.json(
      { error: "code_verifier non corrispondente alla challenge (PKCE rifiutato)." },
      { status: 400 },
    );
  }

  if (usedJti.has(payload.jti)) {
    return NextResponse.json(
      { error: "Code già usato: un code vale una sola volta. Rilancia `agentcloud login`." },
      { status: 400 },
    );
  }
  usedJti.add(payload.jti);

  return NextResponse.json(
    {
      access_token: payload.at,
      refresh_token: payload.rt,
      email: payload.em ?? null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
