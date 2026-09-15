import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { MAX_SPOTS } from "@/lib/waitlist-constants";

// Posti totali legacy (non più limitante: la waitlist è ora illimitata con posizione in coda).
export { MAX_SPOTS };

export type QueueInfo = {
  position: number; // 1-based
  total: number;
  referralCode: string | null;
  referralCount: number;
};

export type AheadEntry = {
  rank: number;
  emailMasked: string;
  createdAt: string;
};

/**
 * Genera un referral code breve (8 hex chars).
 */
export function generateReferralCode(): string {
  const uuid = crypto.randomUUID().replace(/-/g, "");
  return uuid.slice(0, 8).toLowerCase();
}

/**
 * Totale iscritti in waitlist (conteggio righe).
 */
export async function getTotalCount(): Promise<number> {
  const supabase = createAdminClient() ?? (await createClient());
  const { count, error } = await supabase
    .from("waitlist")
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

/**
 * Posizione in coda per email + info referral.
 * Se referral_code/referred_by non esistono ancora (pre-migrazione) fallback a sola posizione.
 */
export async function getQueueInfo(email: string): Promise<QueueInfo | null> {
  const admin = createAdminClient();
  const supabase = admin ?? (await createClient());
  try {
    // Prova RPC se disponibile (post-migrazione)
    const { data: rpcData } = await (supabase as unknown as {
      rpc: (name: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
    }).rpc("waitlist_position", { p_email: email });
    if (rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
      const row = rpcData[0] as {
        position: number;
        total: number;
        referral_code: string | null;
        referral_count: number;
      };
      return {
        position: row.position,
        total: row.total,
        referralCode: row.referral_code,
        referralCount: row.referral_count ?? 0,
      };
    }
  } catch {
    // fallback manuale
  }

  const { data: me, error: meErr } = await supabase
    .from("waitlist")
    .select("id, created_at, referral_code, referral_count")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  if (meErr || !me) return null;

  const createdAt = (me as { created_at: string }).created_at;
  const referralCode = (me as { referral_code?: string | null }).referral_code ?? null;
  const referralCount = (me as { referral_count?: number | null }).referral_count ?? 0;

  const { count: total } = await supabase.from("waitlist").select("id", { count: "exact", head: true });
  const { count: before } = await supabase
    .from("waitlist")
    .select("id", { count: "exact", head: true })
    .lte("created_at", createdAt);

  const position = (before ?? 1) as number;
  return {
    position: Math.max(1, position),
    total: total ?? position,
    referralCode,
    referralCount,
  };
}

/**
 * I 5 davanti a te in classifica (mascherati). Ritorna [] se sei primo o non in lista.
 */
export async function getAhead(email: string): Promise<AheadEntry[]> {
  const admin = createAdminClient();
  const supabase = admin ?? (await createClient());
  try {
    const { data } = await (supabase as unknown as {
      rpc: (name: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
    }).rpc("waitlist_ahead", { p_email: email });
    if (Array.isArray(data)) {
      return (data as Array<{ rank: number; email_masked: string; created_at: string }>).map((r) => ({
        rank: r.rank,
        emailMasked: r.email_masked,
        createdAt: r.created_at,
      }));
    }
  } catch {}
  // Fallback manuale: 5 precedenti per created_at
  try {
    const { data: me } = await supabase.from("waitlist").select("created_at").eq("email", email.toLowerCase()).maybeSingle();
    const meAt = (me as { created_at?: string } | null)?.created_at;
    if (!meAt) return [];
    const { data: ahead } = await supabase
      .from("waitlist")
      .select("email, created_at")
      .lt("created_at", meAt)
      .order("created_at", { ascending: false })
      .limit(5);
    if (!ahead) return [];
    // calcola rank per ciascuno (count <= created_at)
    const entries: AheadEntry[] = [];
    for (const row of ahead as Array<{ email: string; created_at: string }>) {
      const { count } = await supabase.from("waitlist").select("id", { count: "exact", head: true }).lte("created_at", row.created_at);
      const rank = (count ?? 1) as number;
      const parts = row.email.split("@");
      const masked = parts.length === 2 ? `${parts[0].charAt(0)}***@${parts[1]}` : "****";
      entries.push({ rank, emailMasked: masked, createdAt: row.created_at });
    }
    return entries;
  } catch {
    return [];
  }
}

/**
 * Conta gli utenti che occupano un posto (legacy, per compatibilità).
 */
async function countTakenSpots(): Promise<number> {
  return getTotalCount();
}

/**
 * Posti rimanenti legacy (non più usato per bloccare, ma mantenuto per compatibilità).
 */
export async function getRemainingSpots(): Promise<number> {
  const taken = await countTakenSpots();
  return Math.max(MAX_SPOTS - taken, 0);
}

/**
 * Crea un utente Supabase Auth per l'email della waitlist (idempotente,
 * best-effort). È il "backfill" automatico SOLO per le nuove iscrizioni:
 * viene eseguito al momento della firma in POST /api/waitlist, così l'email
 * compare subito in Auth → Users. Le righe storiche non vengono mai backfillate.
 */
export async function provisionAuthUser(email: string): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        password: crypto.randomUUID() + crypto.randomUUID(),
        user_metadata: { source: "waitlist" },
      });
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/already registered|already been registered|duplicate/i.test(msg)) {
        console.log("[waitlist] auth user already exists:", email);
        return true;
      }
      if (attempt === 1) {
        console.warn("[waitlist] provisioning fallito, nuovo tentativo:", msg);
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }
      console.error("[waitlist] impossibile creare l'utente auth:", msg);
      return false;
    }
  }
  return false;
}

/**
 * Assicura che un'email sia presente nella tabella waitlist (idempotente).
 * Utilizzato nel flusso OAuth Google per inserire l'utente e preservare l'eventuale referral.
 */
export async function ensureWaitlistEntry(
  email: string,
  referredBy?: string | null
): Promise<{ success: boolean; alreadyJoined: boolean; referralCode?: string | null }> {
  const supabase = createAdminClient() ?? (await createClient());
  const normalizedEmail = email.toLowerCase().trim();

  // Verifica se è già iscritto
  const { data: existing } = await supabase
    .from("waitlist")
    .select("id, referral_code")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (existing) {
    return {
      success: true,
      alreadyJoined: true,
      referralCode: (existing as { referral_code?: string | null }).referral_code ?? null,
    };
  }

  // Verifica se il referred_by indicato esiste
  let validReferredBy: string | null = null;
  if (referredBy) {
    const cleanRef = referredBy.trim().toLowerCase().slice(0, 32);
    const { data: refRow } = await supabase
      .from("waitlist")
      .select("referral_code")
      .eq("referral_code", cleanRef)
      .maybeSingle();
    if (refRow) validReferredBy = cleanRef;
  }

  const referralCode = generateReferralCode();
  const insertPayload: Record<string, unknown> = {
    email: normalizedEmail,
    referral_code: referralCode,
  };
  if (validReferredBy) insertPayload.referred_by = validReferredBy;

  const { error } = await supabase.from("waitlist").insert(insertPayload);
  if (error) {
    // Gestione duplicato concorrente
    if (error.code === "23505") {
      const q = await getQueueInfo(normalizedEmail).catch(() => null);
      return { success: true, alreadyJoined: true, referralCode: q?.referralCode ?? null };
    }
    // Fallback se le colonne referral non sono ancora presenti nel DB
    if (/referral_code|referred_by/i.test(error.message)) {
      const { error: retryErr } = await supabase.from("waitlist").insert({ email: normalizedEmail });
      if (!retryErr || retryErr.code === "23505") {
        return { success: true, alreadyJoined: Boolean(retryErr), referralCode: null };
      }
    }
    console.error("[waitlist] Errore inserimento waitlist da OAuth:", error);
    return { success: false, alreadyJoined: false };
  }

  return { success: true, alreadyJoined: false, referralCode };
}

