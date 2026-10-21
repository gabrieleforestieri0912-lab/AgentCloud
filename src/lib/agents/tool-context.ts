/**
 * Contesto condiviso di esecuzione dei tool agente.
 *
 * Estratto in modulo dedicato per rompere l'import circolare
 * `tools.ts` <-> `integration-tools.ts` (solo tipo, ma fonte di
 * confusione e rischio di cicli runtime futuri).
 */
export type ToolContext = {
  userId: string;
  tenantId?: string;
  files?: Record<string, string>;
  /**
   * Repository GitHub collegato alla conversazione (scelto dal menu "+"
   * della chat). I tool `github_repo_*` ci lavorano: senza questo dato
   * rispondono "nessun repository collegato".
   */
  githubRepo?: { owner: string; repo: string; branch?: string };
  /**
   * Modalità Ghost (chat incognito): la run non lascia tracce. Le chiamate
   * ai tool restano permesse, ma nessun audit e nessuna notifica
   * vengono scritti (vedi `lib/ghost-mode.ts`).
   */
  ephemeral?: boolean;
};
