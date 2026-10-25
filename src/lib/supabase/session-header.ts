/**
 * Passaggio della sessione dal proxy alle pagine/route.
 *
 * Perché esiste: il proxy risolve l'utente con `auth.getUser()` (una rete e un
 * JSON per richiesta). Mettendo l'utente in un header interno su
 * `NextResponse.next({ request })`, `getSessionUser()` (lib/supabase/server)
 * lo legge direttamente: ZERO chiamate duplicate ad Auth per rendere una
 * pagina. L'header è interno al worker — scritto dal proxy a ogni richiesta —
 * quindi ciò che arriva dal browser non può soffocarlo.
 *
 * Nome senza prefisso `x-ac-` tracciabile in log; valore: JSON dell'utente
 * Supabase, oppure assente quando anonimo.
 */
export const SUPABASE_USER_HEADER = "x-ac-supabase-user";
