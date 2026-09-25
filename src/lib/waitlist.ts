import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin-access";
// Nessun limite di posti: la waitlist è illimitata (solo posizione in coda).

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
 * Genera un referral code breve (8 hex chars) — legacy (pre-Phase1).
 * Mantenuto per compatibilità con waitlist.referral_code esistenti.
 */
export function generateReferralCode(): string {
  const uuid = crypto.randomUUID().replace(/-/g, "");
  return uuid.slice(0, 8).toLowerCase();
}

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/**
 * Genera un referral code base62 8 chars (Open Decision #8) per
 * waitlist_referral_codes. Non usa user ID.
 */
export function generateReferralCodeBase62(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += BASE62[bytes[i] % 62];
  }
  return out;
}

/**
 * Recupera o crea il referral code per un utente waitlist (user_id = waitlist.id).
 * Sincronizza anche waitlist.referral_code per compatibilità.
 */
export async function getOrCreateReferralCode(waitlistId: string): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  // Prova esistente in nuova tabella
  const { data: existing } = await admin
    .from("waitlist_referral_codes")
    .select("code")
    .eq("user_id", waitlistId)
    .maybeSingle();
  if (existing) return (existing as { code: string }).code;

  // Prova da waitlist.referral_code legacy
  const { data: waitlistRow } = await admin
    .from("waitlist")
    .select("referral_code")
    .eq("id", waitlistId)
    .maybeSingle();
  const legacy = (waitlistRow as { referral_code?: string | null } | null)?.referral_code;
  if (legacy) {
    // Backfill nella nuova tabella
    await admin.from("waitlist_referral_codes").insert({ user_id: waitlistId, code: legacy }).then(() => {});
    return legacy;
  }

  // Genera nuovo base62, retry su collisione
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateReferralCodeBase62();
    const { error } = await admin.from("waitlist_referral_codes").insert({ user_id: waitlistId, code });
    if (!error) {
      await admin.from("waitlist").update({ referral_code: code }).eq("id", waitlistId).then(() => {});
      return code;
    }
    if (error.code !== "23505") break;
  }
  return null;
}

/**
 * Totale iscritti in waitlist (conteggio righe).
 * Richiede service_role per superare RLS su count; se manca, fallback a client anon ma logga warning (conteggio sarà 0 per RLS).
 */
export async function getTotalCount(): Promise<number> {
  const admin = createAdminClient();
  const supabase = admin ?? (await createClient());
  if (!admin) console.warn("[waitlist] SUPABASE_SERVICE_ROLE_KEY mancante — getTotalCount userà anon (RLS → 0)");
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
 * Le email in ADMIN_EMAILS non vengono mai iscritte: sono bypass admin, non coda.
 */
export async function ensureWaitlistEntry(
  email: string,
  referredBy?: string | null
): Promise<{ success: boolean; alreadyJoined: boolean; referralCode?: string | null }> {
  const normalizedEmail = email.toLowerCase().trim();
  if (isAdminEmail(normalizedEmail)) {
    return { success: true, alreadyJoined: false, referralCode: null };
  }

  const supabase = createAdminClient() ?? (await createClient());

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

  const { data: inserted, error } = await supabase.from("waitlist").insert(insertPayload).select("id").maybeSingle();
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

  const newId = (inserted as { id?: string } | null)?.id;
  if (newId) {
    // Registry referral code per nuova tabella
    void supabase.from("waitlist_referral_codes").insert({ user_id: newId, code: referralCode }).then(() => {}, () => {});
    if (validReferredBy) {
      // Trova referrer id per creare pending
      let referrerId: string | null = null;
      const { data: codeRow } = await supabase.from("waitlist_referral_codes").select("user_id").eq("code", validReferredBy).maybeSingle();
      if (codeRow) referrerId = (codeRow as { user_id: string }).user_id;
      if (!referrerId) {
        const { data: legacyRow } = await supabase.from("waitlist").select("id").eq("referral_code", validReferredBy).maybeSingle();
        if (legacyRow) referrerId = (legacyRow as { id: string }).id;
      }
      if (referrerId && referrerId !== newId) {
        void supabase.from("waitlist_referrals").insert({
          referrer_user_id: referrerId,
          referred_user_id: newId,
          referred_email: normalizedEmail,
          status: "pending",
        }).then(() => {}, () => {});
      }
    }
  }

  return { success: true, alreadyJoined: false, referralCode };
}

export type RankingInfo = {
  position: number;
  total: number;
  points: number;
  referralsCompleted: number;
  instagramFollow: number;
  referralCode: string | null;
  breakdown: { referrals: number; instagram: number };
};

/**
 * Ranking live per Open Decision #6: RANK() OVER (points DESC, joined ASC)
 * Ritorna position, total, points breakdown. Fallback a waitlist_position se la nuova RPC non è ancora migrata.
 */
export async function getRanking(email: string): Promise<RankingInfo | null> {
  const admin = createAdminClient();
  const supabase = admin ?? (await createClient());
  try {
    const { data } = await (supabase as unknown as {
      rpc: (name: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
    }).rpc("waitlist_ranking", { p_email: email });
    if (Array.isArray(data) && data.length > 0) {
      const row = data[0] as {
        position: number;
        total: number;
        points: number;
        referrals_completed: number;
        instagram_follow: number;
        referral_code: string | null;
      };
      if (row.position !== null) {
        return {
          position: row.position,
          total: row.total,
          points: row.points ?? 0,
          referralsCompleted: row.referrals_completed ?? 0,
          instagramFollow: row.instagram_follow ?? 0,
          referralCode: row.referral_code,
          breakdown: { referrals: (row.referrals_completed ?? 0) * 3, instagram: (row.instagram_follow ?? 0) * 1 },
        };
      }
    }
  } catch {}
  // Fallback legacy
  const q = await getQueueInfo(email).catch(() => null);
  if (!q) return null;
  return {
    position: q.position,
    total: q.total,
    points: 0,
    referralsCompleted: 0,
    instagramFollow: 0,
    referralCode: q.referralCode,
    breakdown: { referrals: 0, instagram: 0 },
  };
}

/**
 * Completa i referral pending per un email che ha appena raggiunto
 * auth_method_completed = true (Open Decision #7). Aggiorna
 * waitlist_referrals status pending -> completed e setta referred_user_id.
 * Chiamata da /auth/callback e potenzialmente da trigger profiles.
 */
export async function completePendingReferrals(email: string, authUserId?: string | null): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;
  const normalized = email.toLowerCase().trim();
  try {
    // Trova tutti i pending per questa email
    const { data: pendings } = await admin
      .from("waitlist_referrals")
      .select("id, referrer_user_id")
      .eq("status", "pending")
      .ilike("referred_email", normalized);
    if (!pendings || pendings.length === 0) return;
    for (const row of pendings as Array<{ id: string }>) {
      await admin
        .from("waitlist_referrals")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          ...(authUserId ? { referred_user_id: authUserId } : {}),
        })
        .eq("id", row.id)
        .eq("status", "pending");
    }
  } catch {}
}

