import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { MAX_SPOTS } from "@/lib/waitlist-constants";

// Posti totali disponibili in waitlist (rispecchia il tetto gestito via DB ovunque).
export { MAX_SPOTS };

/**
 * Conta gli utenti che occupano un posto.
 *
 * Perché la fonte autorevole è Supabase Auth (Authentication → Users): ogni
 * utente è una persona che occupa un posto, e cancellare un utente dalla
 * dashboard libera subito il suo posto. La tabella `waitlist` è un log di
 * iscrizione (lista email + rilevamento duplicati), NON la fonte di verità
 * per il contatore.
 *
 * Passando da qui, vengono eliminate anche le righe waitlist la cui email non
 * ha più un utente Auth (il proprietario ha cancellato l'utente dalla
 * dashboard): il log resta allineato ad Auth e quell'email potrà re-iscriversi
 * in futuro invece di restare bloccata su 409.
 */
async function countTakenSpots(): Promise<number> {
  const admin = createAdminClient();
  if (admin) {
    try {
      let taken = 0;
      let page = 1;
      let total: number | undefined;
      const emails = new Set<string>();
      do {
        const { data, error } = await admin.auth.admin.listUsers({ page });
        if (error) throw error;
        const users = data?.users ?? [];
        taken += users.length;
        for (const u of users) {
          if (u.email) emails.add(u.email.toLowerCase());
        }
        total = data?.total;
        page += 1;
      } while (total !== undefined && page <= Math.max(1, Math.ceil(total / 50)));

      // Reconcile the signup log with Auth (idempotent, only when mismatched).
      const { data: rows, error: rowsErr } = await admin
        .from("waitlist")
        .select("email");
      if (!rowsErr && rows) {
        const orphans = rows
          .map((r) => r.email)
          .filter((email) => email && !emails.has(email.toLowerCase()));
        if (orphans.length) {
          const { error: delErr } = await admin
            .from("waitlist")
            .delete()
            .in("email", orphans);
          if (delErr) {
            console.error(
              "[waitlist] pulizia righe orfane fallita:",
              delErr.message,
            );
          } else {
            console.log(
              "[waitlist] rimosse",
              orphans.length,
              "riga/e orfana/e:",
              orphans.join(", "),
            );
          }
        }
      }
      return taken;
    } catch (err) {
      console.error("[waitlist] conteggio utenti Auth fallito:", err);
    }
  }

  // Dev / fallback: conta le righe waitlist come proxy dei posti occupati.
  const supabase = createAdminClient() ?? (await createClient());
  const { count, error } = await supabase
    .from("waitlist")
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

/**
 * Posti rimanenti autorevoli: MAX_SPOTS meno il numero di utenti Auth.
 * Cancellare un utente in Authentication → Users libera subito il suo posto.
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
 *
 * L'account viene creato con una password casuale mai rivelata ed email
 * confermata: la persona accederà poi con Google (stessa email → Supabase
 * collega l'account) o tramite il flusso "password dimenticata". Il trigger
 * `handle_new_user` crea anche la riga `profiles`.
 *
 * Restituisce true quando l'account è stato creato o esiste già; false quando
 * non è stato possibile verificarlo (es. manca la chiave service-role, o c'è
 * un errore non-duplicato). Non lancia mai: un'email duplicata (già registrata)
 * è un caso atteso e innocuo.
 */
export async function provisionAuthUser(email: string): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false; // niente chiave service-role — salta in silenzio (fallback dev)
  // Un retry per i guasti transitori: il proprietario si aspetta che ogni
  // iscrizione compaia in Authentication → Users, quindi un problema di rete
  // non deve farla sparire.
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
      // Un account preesistente è il caso più comune (re-iscrizione, o utente
      // già registrato): log a livello info e si va avanti.
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