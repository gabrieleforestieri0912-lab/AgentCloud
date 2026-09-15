import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiErrorMessage } from "@/lib/i18n/api-errors";
import { rateLimit, RATE_LIMIT_WINDOWS } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { MAX_SPOTS, generateReferralCode, getQueueInfo, getTotalCount, getAhead, provisionAuthUser } from "@/lib/waitlist";
import { hasLaunched } from "@/lib/waitlist-constants";
import { logAudit } from "@/lib/audit";
import {
  validateAndSanitizeEmail,
  isHoneypotTriggered,
} from "@/lib/forms-security";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const BYPASS_ENABLED = process.env.ENABLE_WAITLIST_BETA_BYPASS === "true";

const WAITLIST_LIMIT = 3;
const MAX_PAYLOAD_BYTES = 2048;

const JOINED_COOKIE = "ac_wl_joined";
const JOINED_EMAIL_COOKIE = "ac_wl_email";

const COOKIE_OPTIONS = {
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
  sameSite: "lax" as const,
};

export async function GET() {
  try {
    const total = await getTotalCount().catch(() => 0);
    let joined = false;
    let verified = false;
    let queue: Awaited<ReturnType<typeof getQueueInfo>> = null;
    let joinedEmail = (await cookies()).get(JOINED_EMAIL_COOKIE)?.value;
    if (!joinedEmail) {
      try {
        const client = await createClient();
        const { data: { user } } = await client.auth.getUser();
        if (user?.email) {
          joinedEmail = user.email;
        }
      } catch {
        // non-blocking
      }
    }

    if (joinedEmail) {
      const supabase = createAdminClient() ?? (await createClient());
      const { data } = await supabase
        .from("waitlist")
        .select("id")
        .eq("email", joinedEmail.toLowerCase())
        .maybeSingle();
      verified = true;
      joined = Boolean(data);
      if (joined) {
        queue = await getQueueInfo(joinedEmail).catch(() => null);
      }
    }

    let ahead: Awaited<ReturnType<typeof getAhead>> = [];
    if (joined && joinedEmail) {
      ahead = await getAhead(joinedEmail).catch(() => []);
    }

    return NextResponse.json({
      maxSpots: MAX_SPOTS,
      remaining: Math.max(MAX_SPOTS - total, 0), // legacy compat
      total,
      joined,
      verified,
      position: queue?.position ?? null,
      referralCode: queue?.referralCode ?? null,
      referralCount: queue?.referralCount ?? 0,
      ahead,
    });
  } catch (err) {
    console.error("Failed to read waitlist state:", err);
    return NextResponse.json(
      { error: await apiErrorMessage("failedToJoinWaitlist") },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const clientIp = getClientIp(request);

  try {
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

    if (isHoneypotTriggered(body)) {
      logAudit("waitlist_bot_blocked", { ip: clientIp });
      return NextResponse.json(
        { error: "Richiesta non autorizzata." },
        { status: 400 },
      );
    }

    const rawEmail = body.email;
    const rawRef = typeof body.ref === "string" ? body.ref.trim().toLowerCase().slice(0, 32) : null;
    const rawReferredBy = typeof body.referred_by === "string" ? body.referred_by.trim().toLowerCase().slice(0, 32) : rawRef;

    const validation = validateAndSanitizeEmail(rawEmail, true);
    if (!validation.valid || !validation.email) {
      logAudit("waitlist_invalid_input", { ip: clientIp, reason: validation.error });
      return NextResponse.json(
        { error: validation.error || await apiErrorMessage("invalidEmailAddress") },
        { status: 400 },
      );
    }

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
            apikey: SUPABASE_ANON_KEY,
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
        const total = await getTotalCount().catch(() => null);
        const res = NextResponse.json({
          success: true,
          accessGranted: true,
          total,
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

    if (hasLaunched()) {
      logAudit("waitlist_closed", { ip: clientIp });
      return NextResponse.json(
        {
          error:
            "La waitlist è chiusa: la piattaforma è live, accedi o crea un account.",
          closed: true,
        },
        { status: 410 },
      );
    }

    const email = validation.email.toLowerCase();

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

    const supabase = createAdminClient() ?? (await createClient());

    // Verifica referral valido (se passato)
    let referredBy: string | null = null;
    if (rawReferredBy) {
      const { data: refRow } = await supabase
        .from("waitlist")
        .select("referral_code")
        .eq("referral_code", rawReferredBy)
        .maybeSingle();
      if (refRow) referredBy = rawReferredBy;
    }

    // Genera referral_code per nuovo iscritto
    const referralCode = generateReferralCode();

    const insertPayload: Record<string, unknown> = {
      email,
      referral_code: referralCode,
    };
    if (referredBy) insertPayload.referred_by = referredBy;

    const { error: dbError } = await supabase.from("waitlist").insert(insertPayload);

    if (dbError) {
      if (dbError.code === "23505") {
        await provisionAuthUser(email);
        const queue = await getQueueInfo(email).catch(() => null);
        const total = await getTotalCount().catch(() => null);
        const ahead = await getAhead(email).catch(() => []);
        const res = NextResponse.json(
          { error: await apiErrorMessage("alreadyOnWaitlist"), total, position: queue?.position ?? null, referralCode: queue?.referralCode ?? null, referralCount: queue?.referralCount ?? 0, ahead },
          { status: 409 },
        );
        res.cookies.set(JOINED_COOKIE, "1", COOKIE_OPTIONS);
        res.cookies.set(JOINED_EMAIL_COOKIE, email, COOKIE_OPTIONS);
        return res;
      }
      // Fallback se colonne referral non esistono ancora (pre-migrazione): ritenta senza
      if (/referral_code|referred_by/i.test(dbError.message)) {
        const { error: retryErr } = await supabase.from("waitlist").insert({ email });
        if (!retryErr) {
          await provisionAuthUser(email);
          const queue = await getQueueInfo(email).catch(() => null);
          const total = await getTotalCount().catch(() => null);
          const ahead = await getAhead(email).catch(() => []);
          const res = NextResponse.json({
            success: true,
            total,
            position: queue?.position ?? total,
            referralCode: queue?.referralCode ?? null,
            referralCount: 0,
            ahead,
          });
          res.cookies.set(JOINED_COOKIE, "1", COOKIE_OPTIONS);
          res.cookies.set(JOINED_EMAIL_COOKIE, email, COOKIE_OPTIONS);
          return res;
        }
      }
      console.error("Failed to store waitlist entry:", dbError);
      return NextResponse.json(
        { error: await apiErrorMessage("failedToJoinWaitlist") },
        { status: 500 },
      );
    }

    await provisionAuthUser(email);
    const queue = await getQueueInfo(email).catch(() => null);
    const total = await getTotalCount().catch(() => null);
    const ahead = await getAhead(email).catch(() => []);
    const res = NextResponse.json({
      success: true,
      total,
      position: queue?.position ?? total,
      referralCode: queue?.referralCode ?? referralCode,
      referralCount: queue?.referralCount ?? 0,
      ahead,
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
