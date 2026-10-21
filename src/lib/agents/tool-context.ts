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
   * Modalità Ghost (chat incognito): la run non lascia tracce. Le chiamate
   * ai tool restano permesse, ma nessun audit e nessuna notifica
   * vengono scritti (vedi `lib/ghost-mode.ts`).
   */
  ephemeral?: boolean;
};
