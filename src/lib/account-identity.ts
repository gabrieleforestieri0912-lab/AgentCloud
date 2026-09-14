/**
 * Identità dell'account per l'interfaccia (sidebar di chat e dashboard).
 *
 * Perché esiste: quelle sidebar ricavavano l'account SOLO dalla sessione letta
 * nel browser e, finché quella lettura non rispondeva, mostrava i segnaposto
 * "?" e "..." — che restavano tali se la lettura falliva, anche se il server
 * conosceva già l'utente (le pagine protette non si aprono senza sessione).
 * Il server passa quindi l'identità risolta da `getSessionUser()`, usata come
 * base immediata; la sessione lato browser la arricchisce con l'avatar appena
 * è disponibile.
 *
 * Modulo puro (nessun import di `next/headers`): usabile da server e client.
 */
import type { User } from "@supabase/supabase-js";

export type AccountIdentity = {
  email: string;
  name: string | null;
  avatarUrl: string | null;
};

type UserMetadata = {
  full_name?: string;
  name?: string;
  avatar_url?: string;
  picture?: string;
};

/**
 * Estrae l'identità da un utente Supabase (email + nome/avatar dai metadata,
 * che per Google arrivano come `full_name`/`avatar_url` o `name`/`picture`).
 * Restituisce null quando non c'è niente da mostrare.
 */
export function accountIdentityFromUser(
  user: Pick<User, "email" | "user_metadata"> | null | undefined,
): AccountIdentity | null {
  if (!user) return null;

  const meta = (user.user_metadata ?? {}) as UserMetadata;
  const identity: AccountIdentity = {
    email: user.email ?? "",
    name: meta.full_name ?? meta.name ?? null,
    avatarUrl: meta.avatar_url ?? meta.picture ?? null,
  };

  return identity.email || identity.name || identity.avatarUrl ? identity : null;
}
