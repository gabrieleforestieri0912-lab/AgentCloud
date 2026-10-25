/**
 * Client Supabase per il server (Server Component / route handler).
 *
 * Perché serve un client dedicato: legge la sessione dai cookie della
 * richiesta (via `cookies()` di next/headers) e la usa per autenticare le
 * query con l'identità dell'utente loggato. Server-only: usa `next/headers`.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { SUPABASE_USER_HEADER } from "./session-header";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch { }
        },
      },
    }
  );
}

/**
 * Server-only: risolve l'utente autenticato. Percorso veloce (zero rete): il
 * proxy ha già fatto `auth.getUser()` per la stessa richiesta e l'utente
 * arriva nell'header interno `x-ac-supabase-user`. Header assente → fallback
 * storico (getUser via cookie o Bearer per CLI/mobile): serve per le richieste
 * fuori dai path del proxy e per robustezza se il proxy non gira.
 * Restituisce null quando non è loggato. Non lancia mai eccezioni.
 */
export async function getSessionUser(): Promise<User | null> {
  try {
    const headerStore = await headers();
    const forwarded = headerStore.get(SUPABASE_USER_HEADER);
    if (forwarded) {
      const parsed: unknown = JSON.parse(forwarded);
      if (parsed && typeof parsed === "object" && "id" in (parsed as object)) {
        return parsed as User;
      }
      return null;
    }
  } catch {
    // header non disponibile in questo contesto → fallback sotto
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) return user;
  } catch {
    // ignora, prova Bearer fallback
  }

  // Fallback Bearer: CLI (`agentcloud login` → /cli/auth) e mobile condividono lo stesso DB.
  // Il token è il Supabase access_token (JWT) inviato come `Authorization: Bearer <token>`.
  // In alternativa: token API personale `act_…` generato nelle impostazioni
  // (`agentcloud login --token …` / AGENTCLOUD_TOKEN) — validato su api_tokens.
  // NOTA: le API key `ack_…` (scope per-agente, solo POST /api/v1/run) NON sono
  // accettate qui: usarle come sessione account-wide aggirerebbe lo scope.
  try {
    const auth = (await headers()).get("authorization") ?? null;
    if (auth?.startsWith("Bearer ")) {
      const token = auth.slice(7).trim();
      if (token.length > 20) {
        const { isPat, resolveBearerCredential } = await import("./pat");
        if (isPat(token)) {
          const cred = await resolveBearerCredential(token);
          if (cred) return cred.user;
          return null;
        }
        const { createClient: createSupabaseClient } = await import("@supabase/supabase-js");
        const supabase = createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          { global: { headers: { Authorization: `Bearer ${token}` } } },
        );
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) return user as User;
      }
    }
  } catch {
    // fallback silenzioso → anonymous
  }
  return null;
}

