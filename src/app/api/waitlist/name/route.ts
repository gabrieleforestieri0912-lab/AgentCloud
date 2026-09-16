import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateFullName, isHoneypotTriggered } from "@/lib/forms-security";

/**
 * POST /api/waitlist/name
 * Salva il nome dell'utente in waitlist.full_name (e best-effort in profiles + auth metadata).
 * Richiede che l'utente sia già in waitlist (via ac_wl_email cookie o sessione auth).
 * Body: { name: string, email?: string }
 */
export async function POST(request: Request) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Payload JSON non valido." }, { status: 400 });
    }

    if (isHoneypotTriggered(body)) {
      return NextResponse.json({ error: "Richiesta non autorizzata." }, { status: 400 });
    }

    const rawName = body.name;
    const validation = validateFullName(rawName);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error || "Nome non valido." }, { status: 400 });
    }

    const cleanName = (validation.name ?? "").trim();
    if (!cleanName) {
      return NextResponse.json({ error: "Il nome è obbligatorio." }, { status: 400 });
    }

    // Risolvi email del richiedente: body.email > cookie > auth session
    let email: string | null = null;
    if (typeof body.email === "string" && body.email.trim()) {
      email = body.email.trim().toLowerCase();
    }
    if (!email) {
      const c = await cookies();
      email = c.get("ac_wl_email")?.value?.toLowerCase() ?? null;
    }
    if (!email) {
      try {
        const supabase = await createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.email) email = user.email.toLowerCase();
      } catch {}
    }

    if (!email) {
      return NextResponse.json({ error: "Non sei in waitlist." }, { status: 401 });
    }

    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: "DB non configurato" }, { status: 500 });

    // Verifica che sia davvero in waitlist
    const { data: existing } = await admin
      .from("waitlist")
      .select("id, email, full_name")
      .eq("email", email)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "Email non trovata in waitlist." }, { status: 404 });
    }

    const waitlistId = (existing as { id: string }).id;

    // Aggiorna waitlist.full_name (colonna aggiunta con schema-waitlist-name.sql)
    // Fallback: se colonna non esiste ancora, ignora errore e procedi con profiles/auth
    const { error: wlError } = await admin
      .from("waitlist")
      .update({ full_name: cleanName })
      .eq("id", waitlistId);

    if (wlError && !/full_name/i.test(wlError.message)) {
      console.error("[waitlist:name] update waitlist failed", wlError);
      return NextResponse.json({ error: "Impossibile salvare il nome." }, { status: 500 });
    }
    // Se errore è per colonna mancante, logga ma non bloccare (profiles/auth verranno comunque aggiornati)
    if (wlError && /full_name/i.test(wlError.message)) {
      console.warn("[waitlist:name] waitlist.full_name column missing, run schema-waitlist-name.sql", wlError.message);
    }

    // Best-effort: aggiorna profiles e auth user_metadata se esiste un auth user con stessa email
    try {
      const { data: authUsers } = await admin.auth.admin.listUsers();
      // listUsers paginato, cerchiamo per email in modo più efficiente se possibile
      // fallback: usa admin.auth.admin.getUserByEmail non esiste, quindi cerchiamo
      const matched = (authUsers?.users ?? []).find(
        (u) => u.email?.toLowerCase() === email
      );
      if (matched) {
        // auth metadata
        await admin.auth.admin.updateUserById(matched.id, {
          user_metadata: { full_name: cleanName },
        });
        // profiles
        await admin.from("profiles").update({ full_name: cleanName }).eq("id", matched.id);
      } else {
        // prova a cercare profilo già collegato via waitlist id (nel caso waitlist.id == auth id per OAuth)
        // non critico
      }
    } catch (e) {
      console.warn("[waitlist:name] best-effort profile update failed", e);
    }

    return NextResponse.json({ success: true, full_name: cleanName });
  } catch (err) {
    console.error("[waitlist:name] unexpected", err);
    return NextResponse.json({ error: "Errore interno." }, { status: 500 });
  }
}

export async function GET() {
  // Restituisce il nome salvato per l'utente corrente in waitlist
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ full_name: null });

  let email: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.email) email = user.email.toLowerCase();
  } catch {}
  if (!email) {
    const c = await cookies();
    email = c.get("ac_wl_email")?.value?.toLowerCase() ?? null;
  }
  if (!email) return NextResponse.json({ full_name: null });

  const { data } = await admin.from("waitlist").select("full_name").eq("email", email).maybeSingle();
  return NextResponse.json({ full_name: (data as { full_name?: string | null } | null)?.full_name ?? null });
}
