import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { CODE_TTL_SECONDS, signCliCode } from "@/lib/cli-auth";

/**
 * POST /api/cli/authorize — crea il `code` usa-e-getta del login CLI.
 *
 * Chiamata dalla pagina /cli/login (browser, utente già autenticato) con:
 *   { port, state, code_challenge, access_token, refresh_token }
 *
 * Sicurezza:
 * - i token del browser viaggiano solo HTTPS browser→sito, e nel callback
 *   locale NON escono token: esce un `code` firmato, TTL 2 minuti, PKCE.
 * - la porta viene validata (1024–65535, solo cifre) e la callback base è
 *   costruita dal server: nessun redirect open (/127.0.0.1 e basta).
 * - la challenge deve essere base64url da 43 caratteri (RFC 7636 S256).
 * - l'access_token fornito dal client è verificato contro Supabase.
 */
export const runtime = "nodejs";

type Body = {
  port?: string | number;
  state?: string;
  code_challenge?: string;
  access_token?: string;
  refresh_token?: string;
};

const CALLBACK_HOST = "http://127.0.0.1";

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Body JSON non valido." }, { status: 400 });
  }

  // Porta: il server la valida e costruisce il callback. No open redirect:
  // il callback è SEMPRE 127.0.0.1 con porta validata, mai scelta dal client.
  const port = Number(body.port);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    return NextResponse.json({ error: "Porta non valida." }, { status: 400 });
  }
  // Assolutamente solo loopback: la CLI non delega callback ad altri host.
  const callback = `${CALLBACK_HOST}:${port}/callback`;

  const challenge = (body.code_challenge || "").trim();
  if (!/^[A-Za-z0-9_-]{43}$/.test(challenge)) {
    return NextResponse.json(
      { error: "code_challenge non valida: serve base64url da 43 caratteri (S256)." },
      { status: 400 },
    );
  }
  if (!body.access_token) {
    return NextResponse.json({ error: "access_token mancante." }, { status: 400 });
  }

  // Verifica che il token appartenga davvero a un utente attivo.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ error: "Supabase non configurato sul server." }, { status: 500 });
  }
  const supabase = createClient(url, anonKey);
  const { data, error } = await supabase.auth.getUser(body.access_token);
  if (error || !data?.user) {
    return NextResponse.json({ error: "Sessione non valida: riaccedi e riprova." }, { status: 401 });
  }

  const jti = crypto.getRandomValues(new Uint8Array(16));
  const jtiHex = [...jti].map((b) => b.toString(16).padStart(2, "0")).join("");
  const code = await signCliCode({
    at: body.access_token,
    rt: body.refresh_token ?? "",
    ch: challenge,
    em: data.user.email ?? undefined,
    p: port,
    jti: jtiHex,
  });

  return NextResponse.json(
    {
      code,
      callback,
      expires_in: CODE_TTL_SECONDS,
      redirect_uri: `${callback}?code=${encodeURIComponent(code)}&state=${encodeURIComponent(body.state ?? "")}`,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
