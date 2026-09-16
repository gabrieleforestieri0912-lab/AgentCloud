/**
 * Client Supabase per il server (Server Component / route handler).
 *
 * Perché serve un client dedicato: legge la sessione dai cookie della
 * richiesta (via `cookies()` di next/headers) e la usa per autenticare le
 * query con l'identità dell'utente loggato. Server-only: usa `next/headers`.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";

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
 * Server-only: risolve l'utente autenticato dai cookie di sessione
 * OPPURE da header Authorization Bearer (per CLI e app mobile che usano
 * lo stesso DB Supabase). Restituisce null quando non è loggato.
 * Non lancia mai eccezioni — i chiamanti possono trattare null come "anonymous".
 */
export async function getSessionUser(): Promise<User | null> {
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
  try {
    const { headers } = await import("next/headers");
    const headerStore = await headers();
    const auth = headerStore.get("authorization") ?? headerStore.get("Authorization");
    if (auth?.startsWith("Bearer ")) {
      const token = auth.slice(7).trim();
      if (token.length > 20) {
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
