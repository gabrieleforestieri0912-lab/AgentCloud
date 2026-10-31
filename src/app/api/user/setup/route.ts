/**
 * Setup guidato (onboarding) — API server.
 *
 * GET    → stato corrente: { answers, step, completedAt, skipped, decided }
 * POST   → salva un aggiornamento. Body: { step?, patch?, action? }
 *          - patch: merge ( parcial ) nelle risposte `profiles.onboarding`;
 *          - action "complete": marca finito (+ consuma eventuale defaultAgente);
 *          - action "skip": marca saltato (nessun default impostato).
 * DELETE → "Rifai l'onboarding": azzera risposte e flag (decided torna false,
 *          così il guard ri-propone l'onboarding alla próxima navigazione).
 *
 * Perché service-role: la riga profilo può mancare (utente creato prima del
 * trigger handle_new_user, vedi /api/user/onboarding) e con il client a
 * sessione l'insert-upsert richiederebbe due scritture diverse; qui un solo
 * upsert admin dopo getSessionUser(). L'utente è il posessore della riga:
 * nessun accesso cross-account è possibile (userId viene dalla sessione).
 *
 * L'agente predefinito viene comunque scritto nella preferenza VIVA della
 * chat (user_preferences: `agentcloud_chat_default_agent`): è quella che le
 * nuove conversazioni leggono già.
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writePreference } from "@/lib/user-preferences";
import { normalizePatch } from "@/lib/onboarding/schema";
import { PREFERENCE_CHAT_DEFAULT_AGENT } from "@/lib/preference-keys";
import { getAgentRuntimeConfig } from "@/lib/agents/registry";

type ProfileRow = {
  onboarding: Record<string, unknown> | null;
  onboarding_step: number | null;
  onboarding_completed_at: string | null;
  onboarding_skipped: boolean | null;
  onboarding_decided: boolean | null;
};

async function loadProfile(userId: string): Promise<ProfileRow | null> {
  const db = createAdminClient();
  if (!db) return null;
  const { data } = await db
    .from("profiles")
    .select(
      "onboarding, onboarding_step, onboarding_completed_at, onboarding_skipped, onboarding_decided",
    )
    .eq("id", userId)
    .maybeSingle();
  return (data as ProfileRow | null) ?? null;
}

/** Upsert della riga profilo (crea id/email se mancano, come fa già il
 *  trigger handle_new_user per gli utenti nuovi). Ritorna false su errore. */
async function upsertProfile(userId: string, email: string | null, fields: Record<string, unknown> & { onboarding?: Record<string, unknown> }): Promise<boolean> {
  const db = createAdminClient();
  if (!db) return false;
  const { error } = await db
    .from("profiles")
    .upsert(
      { id: userId, email, updated_at: new Date().toISOString(), ...fields },
      { onConflict: "id" },
    );
  if (error) console.error("[user/setup] upsert profiles:", error.message);
  return !error;
}

export async function GET() {
  const user = await getSessionUser();
  if (!user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const profile = await loadProfile(user.id);
  return NextResponse.json({
    answers: profile?.onboarding ?? {},
    step: profile?.onboarding_step ?? 0,
    completedAt: profile?.onboarding_completed_at ?? null,
    skipped: profile?.onboarding_skipped ?? false,
    decided: profile?.onboarding_decided ?? false,
  });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: {
    step?: unknown;
    action?: unknown;
    patch?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const step =
    typeof body.step === "number" && Number.isInteger(body.step) && body.step >= 0 && body.step <= 99
      ? body.step
      : undefined;
  const action = body.action === "complete" || body.action === "skip" ? body.action : undefined;
  const patch = normalizePatch(body.patch);
  if (!action && Object.keys(patch).length === 0 && step === undefined) {
    return NextResponse.json({ error: "nothing_to_save" }, { status: 400 });
  }

  const profile = await loadProfile(user.id);
  if (!profile && action !== "skip") {
    // Riga assente e DB irraggiungibile: risposta onesta, il client riprova.
    return NextResponse.json({ error: "store_failed" }, { status: 500 });
  }

  // Merge delle risposte: chiavi presenti nel patch sovrascrivono.
  const answers: Record<string, unknown> = { ...(profile?.onboarding ?? {}) };
  for (const [key, value] of Object.entries(patch)) {
    answers[key] = value;
  }

  const fields: Record<string, unknown> & { onboarding?: Record<string, unknown> } = {
    onboarding: answers,
  };
  if (step !== undefined) fields.onboarding_step = step;
  if (action === "complete") {
    fields.onboarding_completed_at = new Date().toISOString();
    fields.onboarding_skipped = null;
    fields.onboarding_decided = true;
    fields.onboarding_step = 0;
  } else if (action === "skip") {
    fields.onboarding_completed_at = null;
    fields.onboarding_skipped = true;
    fields.onboarding_decided = true;
    fields.onboarding_step = 0;
    // Saltato = anche nessun default: si riparte puliti.
    fields.onboarding = {};
    await writePreference(user.id, PREFERENCE_CHAT_DEFAULT_AGENT, "");
  }

  // Agente predefinito: validità reale contro il runtime; non serve possederlo
  // (il piano gratuito copre comunque 5 messaggi/giorno su QUALSIASI agente).
  if (typeof answers.defaultAgentSlug === "string") {
    const slug = answers.defaultAgentSlug;
    if (slug === "") {
      await writePreference(user.id, PREFERENCE_CHAT_DEFAULT_AGENT, "");
    } else if (getAgentRuntimeConfig(slug)) {
      await writePreference(user.id, PREFERENCE_CHAT_DEFAULT_AGENT, slug);
    } else {
      // Slug sparito dal catalogo (o inventato): si archivia e si risponde
      // con l'avviso, NON con un errore: l'utente non perde le altre risposte.
      answers.defaultAgentSlug = "";
      fields.onboarding = answers;
      await writePreference(user.id, PREFERENCE_CHAT_DEFAULT_AGENT, "");
      return NextResponse.json({ ok: true, warning: "defaultAgentSlug_invalid" });
    }
  }

  const saved = await upsertProfile(user.id, user.email ?? null, fields);
  if (!saved) return NextResponse.json({ error: "store_failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const user = await getSessionUser();
  if (!user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const ok = await upsertProfile(user.id, user.email ?? null, {
    onboarding: {},
    onboarding_step: 0,
    onboarding_completed_at: null,
    onboarding_skipped: null,
    onboarding_decided: false,
  });
  if (!ok) return NextResponse.json({ error: "store_failed" }, { status: 500 });
  await writePreference(user.id, PREFERENCE_CHAT_DEFAULT_AGENT, "");
  return NextResponse.json({ ok: true });
}
