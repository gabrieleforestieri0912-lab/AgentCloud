import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiErrorMessage } from "@/lib/i18n/api-errors";
import { rateLimit, RATE_LIMIT_WINDOWS } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { MAX_SPOTS, getRemainingSpots, provisionAuthUser } from "@/lib/waitlist";
import { logAudit } from "@/lib/audit";
import {
  validateAndSanitizeEmail,
  isHoneypotTriggered,
} from "@/lib/forms-security";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const BYPASS_ENABLED = process.env.ENABLE_WAITLIST_BETA_BYPASS === "true";

// Massimo 3 registrazioni per IP per ora (le email sono ulteriormente deduplicate a livello DB).
const WAITLIST_LIMIT = 3;

// Dimensione massima consentita per il corpo della richiesta JSON (2 KB = 2048 byte)
const MAX_PAYLOAD_BYTES = 2048;

// Cookie di stato per ricordare l'avvenuta iscrizione alla waitlist
const JOINED_COOKIE = "ac_wl_joined";
const JOINED_EMAIL_COOKIE = "ac_wl_email";

const COOKIE_OPTIONS = {
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
  sameSite: "lax" as const,
};

export async function GET() {
  try {
    const remaining = await getRemainingSpots();

    let joined = false;
    let verified = false;
    const joinedEmail = (await cookies()).get(JOINED_EMAIL_COOKIE)?.value;
    if (joinedEmail) {
      const supabase = createAdminClient() ?? (await createClient());
      const { data, error } = await supabase
        .from("waitlist")
        .select("id")
        .eq("email", joinedEmail)
        .maybeSingle();
      if (!error) {
        verified = true;
        joined = Boolean(data);
      }
    }

    return NextResponse.json({ maxSpots: MAX_SPOTS, remaining, joined, verified });
  } catch (err) {
    console.error("Failed to read waitlist state:", err);
    return NextResponse.json(
      { error: await apiErrorMessage("failedToJoinWaitlist") },
      { status: 500 },
    );
  }
}

/**
 * Handler POST per l'iscrizione alla Waitlist o riscatto del codice di accesso.
 *
 * Difese di sicurezza implementate:
 * 1. Rate Limiting distribuito per IP contro attacchi DoS o spam.
 * 2. Controllo dimensione massima del payload (< 2 KB) per evitare buffer overflow.
 * 3. Trappola Honeypot (`website_hp`): neutralizza istantaneamente i bot senza toccare il DB.
 * 4. Sanitizzazione e validazione RFC 5321 (blocco byte nulli, newline CRLF, caratteri XSS).
 * 5. Prompt Injection detector: scarta payload progettati per confondere modelli LLM o log interni.
 * 6. Audit logging degli eventi di sicurezza.
 */
export async function POST(request: Request) {
  const clientIp = getClientIp(request);

  try {
    // -------------------------------------------------------------------------
    // 1. Controllo Rate Limiting per IP
    // -------------------------------------------------------------------------
    const rl = await rateLimit("waitlist", clientIp, {
      limit: WAITLIST_LIMIT,
      windowMs: RATE_LIMIT_WINDOWS.HOUR_MS,
    });
    if (!rl.allowed) {
      logAudit("waitlist_rate_limited", { ip: clientIp });
      return NextResponse.json(
        { error: await apiErrorMessage("rateLimited") },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
      );
    }

    // -------------------------------------------------------------------------
    // 2. Controllo dimensione del corpo della richiesta (Anti-DoS)
    // -------------------------------------------------------------------------
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_PAYLOAD_BYTES) {
      logAudit("waitlist_payload_too_large", { ip: clientIp, size: contentLength });
      return NextResponse.json(
        { error: "Corpo della richiesta troppo grande." },
        { status: 413 },
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Payload JSON non valido." },
        { status: 400 },
      );
    }

    // -------------------------------------------------------------------------
    // 3. Trappola Honeypot (Anti-Bot)
    // Se un bot ha popolato il campo nascosto `website_hp`, blocchiamo la richiesta
    // -------------------------------------------------------------------------
    if (isHoneypotTriggered(body)) {
      logAudit("waitlist_bot_blocked", { ip: clientIp });
      // Ritorna errore generico per non dare feedback all'autore del bot
      return NextResponse.json(
        { error: "Richiesta non autorizzata." },
        { status: 400 },
      );
    }

    const rawEmail = body.email;

    // -------------------------------------------------------------------------
    // 4. Validazione e sanitizzazione rigorosa di email / codice di accesso
    // -------------------------------------------------------------------------
    const validation = validateAndSanitizeEmail(rawEmail, true);
    if (!validation.valid || !validation.email) {
      logAudit("waitlist_invalid_input", { ip: clientIp, reason: validation.error });
      return NextResponse.json(
        { error: validation.error || await apiErrorMessage("invalidEmailAddress") },
        { status: 400 },
      );
    }

    // Caso A: L'utente ha inserito un codice di accesso — valida via Edge Function,
    // crea pending session, imposta cookie e reindirizza al login/registrazione.
    if (validation.isAccessCode) {
      if (!BYPASS_ENABLED) {
        logAudit("waitlist_access_code_disabled", { ip: clientIp });
        return NextResponse.json(
          { error: "Accesso beta non disponibile al momento." },
          { status: 403 },
        );
      }

      logAudit("waitlist_access_code_validating", { ip: clientIp });

      try {
        const validateRes = await fetch(`${SUPABASE_URL}/functions/v1/validate-waitlist-code`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ code: validation.email }),
        });

        const validateData = await validateRes.json();

        if (!validateRes.ok) {
          logAudit("waitlist_access_code_invalid", { ip: clientIp, error: validateData.error });
          return NextResponse.json(
            { error: validateData.message || "Codice non valido" },
            { status: validateRes.status },
          );
        }

        logAudit("waitlist_access_code_valid", { ip: clientIp, role: validateData.role });

        // Set pending session cookie (30 min) and redirect to login
        const res = NextResponse.json({
          success: true,
          accessGranted: true,
          remaining: await getRemainingSpots().catch(() => null),
        });
        res.cookies.set("waitlist_session", validateData.session_token, {
          path: "/",
          maxAge: validateData.expires_in || 1800,
          sameSite: "lax",
          secure: true,
        });
        return res;
      } catch (e) {
        console.error("Waitlist code validation failed:", e);
        return NextResponse.json(
          { error: "Errore durante la validazione del codice." },
          { status: 500 },
        );
      }
    }

    const email = validation.email;

    // -------------------------------------------------------------------------
    // 5. Inserimento nel Database Supabase con Service Role
    // -------------------------------------------------------------------------
    const supabase = createAdminClient() ?? (await createClient());
    const { error: dbError } = await supabase
      .from("waitlist")
      .insert({ email });

    if (dbError) {
      if (dbError.code === "23505") {
        // Utente già registrato: self-healing
        await provisionAuthUser(email);
        const remaining = await getRemainingSpots();
        const res = NextResponse.json(
          { error: await apiErrorMessage("alreadyOnWaitlist"), remaining },
          { status: 409 },
        );
        res.cookies.set(JOINED_COOKIE, "1", COOKIE_OPTIONS);
        res.cookies.set(JOINED_EMAIL_COOKIE, email, COOKIE_OPTIONS);
        return res;
      }
      console.error("Failed to store waitlist entry:", dbError);
      return NextResponse.json(
        { error: await apiErrorMessage("failedToJoinWaitlist") },
        { status: 500 },
      );
    }

    // Provisioning dell'utente in Auth
    await provisionAuthUser(email);
    const res = NextResponse.json({
      success: true,
      remaining: await getRemainingSpots(),
    });
    res.cookies.set(JOINED_COOKIE, "1", COOKIE_OPTIONS);
    res.cookies.set(JOINED_EMAIL_COOKIE, email, COOKIE_OPTIONS);
    return res;
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
