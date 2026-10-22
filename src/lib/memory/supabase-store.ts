/**
 * Supabase storage of the memory items (table `agent_memory_items`).
 *
 * Server-only: uses the service role client, which bypasses the RLS. The
 * scoping is NOT delegated to the RLS: every query filters explicitly on
 * `tenant_id`, `agent_id` and `user_id`, so a bug in the caller cannot turn
 * into a cross-tenant read.
 *
 * The embedding is stored as `jsonb` and the similarity is computed in the
 * application layer: it keeps the feature working on every Supabase project
 * (no `pgvector` extension needed) and the amount of rows per scope is
 * small. The schema is compatible with a later `vector` column.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { assertValidScope } from "./scope";
import {
  createInMemoryMemoryStore,
  filterMemoryItems,
  type MemoryStore,
} from "./store";
import type {
  MemoryItem,
  MemoryListFilter,
  MemoryScope,
  MemoryType,
} from "./types";
import { isStoredMemoryType } from "./types";

/** Row of the table `agent_memory_items`. */
export type MemoryItemRow = {
  id: string;
  tenant_id: string;
  agent_id: string;
  user_id: string;
  type: string;
  content: string;
  embedding: number[] | null;
  importance: number;
  created_at: string;
  last_accessed_at: string;
  expires_at: string | null;
  source_conversation_id: string | null;
};

/** Maps a database row to the domain object. */
export function rowToMemoryItem(row: MemoryItemRow): MemoryItem {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    agentId: row.agent_id,
    userId: row.user_id,
    type: (isStoredMemoryType(row.type) ? row.type : "fact") as MemoryType,
    content: row.content,
    embedding: Array.isArray(row.embedding) ? row.embedding : null,
    importance: typeof row.importance === "number" ? row.importance : 0.5,
    createdAt: row.created_at,
    lastAccessedAt: row.last_accessed_at,
    expiresAt: row.expires_at ?? null,
    sourceConversationId: row.source_conversation_id ?? null,
  };
}

/** Maps a domain object to the database row. */
export function memoryItemToRow(item: MemoryItem): MemoryItemRow {
  return {
    id: item.id,
    tenant_id: item.tenantId,
    agent_id: item.agentId,
    user_id: item.userId,
    type: item.type,
    content: item.content,
    embedding: item.embedding,
    importance: item.importance,
    created_at: item.createdAt,
    last_accessed_at: item.lastAccessedAt,
    expires_at: item.expiresAt,
    source_conversation_id: item.sourceConversationId,
  };
}

type Db = NonNullable<ReturnType<typeof createAdminClient>>;

/**
 * Builds the Supabase storage.
 *
 * Returns `null` when the service role key is missing: the caller then falls
 * back to the in-memory storage and the agent keeps answering without
 * memory.
 */
export function createSupabaseMemoryStore(): MemoryStore | null {
  const admin: Db | null = createAdminClient();
  if (!admin) return null;

  const table = () => admin.from("agent_memory_items");

  return {
    async insert(item: MemoryItem): Promise<MemoryItem> {
      assertValidScope(item);
      const { data, error } = await table()
        .insert(memoryItemToRow(item) as never)
        .select()
        .single();
      if (error) throw new Error(`agent_memory_items insert failed: ${error.message}`);
      return rowToMemoryItem(data as unknown as MemoryItemRow);
    },

    async list(
      scope: MemoryScope,
      filter?: MemoryListFilter,
    ): Promise<MemoryItem[]> {
      assertValidScope(scope);
      let query = table()
        .select("*")
        .eq("tenant_id", scope.tenantId)
        .eq("agent_id", scope.agentId)
        .eq("user_id", scope.userId);
      if (filter?.types && filter.types.length > 0) {
        query = query.in("type", filter.types as string[]);
      }
      const { data, error } = await query.order("created_at", {
        ascending: false,
      });
      if (error || !data) return [];
      const items = (data as unknown as MemoryItemRow[]).map(rowToMemoryItem);
      // The expiration filter is applied here, because Supabase cannot
      // express "expires_at is null or in the future" together with the
      // other filters in a portable way.
      return filterMemoryItems(items, filter);
    },

    async get(scope: MemoryScope, id: string): Promise<MemoryItem | null> {
      assertValidScope(scope);
      const { data, error } = await table()
        .select("*")
        .eq("tenant_id", scope.tenantId)
        .eq("agent_id", scope.agentId)
        .eq("user_id", scope.userId)
        .eq("id", id)
        .maybeSingle();
      if (error || !data) return null;
      return rowToMemoryItem(data as unknown as MemoryItemRow);
    },

    async update(
      scope: MemoryScope,
      item: MemoryItem,
    ): Promise<MemoryItem | null> {
      assertValidScope(scope);
      const { data, error } = await table()
        .update({
          type: item.type,
          content: item.content,
          embedding: item.embedding,
          importance: item.importance,
          last_accessed_at: item.lastAccessedAt,
          expires_at: item.expiresAt,
          source_conversation_id: item.sourceConversationId,
        } as never)
        .eq("tenant_id", scope.tenantId)
        .eq("agent_id", scope.agentId)
        .eq("user_id", scope.userId)
        .eq("id", item.id)
        .select()
        .maybeSingle();
      if (error || !data) return null;
      return rowToMemoryItem(data as unknown as MemoryItemRow);
    },

    async touch(scope: MemoryScope, id: string, at: string): Promise<void> {
      assertValidScope(scope);
      await table()
        .update({ last_accessed_at: at } as never)
        .eq("tenant_id", scope.tenantId)
        .eq("agent_id", scope.agentId)
        .eq("user_id", scope.userId)
        .eq("id", id);
    },

    async delete(scope: MemoryScope, id: string): Promise<boolean> {
      assertValidScope(scope);
      const { data, error } = await table()
        .delete()
        .eq("tenant_id", scope.tenantId)
        .eq("agent_id", scope.agentId)
        .eq("user_id", scope.userId)
        .eq("id", id)
        .select("id");
      if (error) return false;
      return Array.isArray(data) && data.length > 0;
    },

    async deleteMany(
      scope: MemoryScope,
      filter?: MemoryListFilter,
    ): Promise<number> {
      assertValidScope(scope);
      let query = table()
        .delete()
        .eq("tenant_id", scope.tenantId)
        .eq("agent_id", scope.agentId)
        .eq("user_id", scope.userId);
      if (filter?.types && filter.types.length > 0) {
        query = query.in("type", filter.types as string[]);
      }
      const { data, error } = await query.select("id");
      if (error || !data) return 0;
      return data.length;
    },

    /**
     * Verifica che la tabella esista.
     *
     * Serve a degradare pulitamente quando la migrazione non è stata
     * applicata: senza tabella ogni scrittura fallirebbe, e la memoria
     * deve comunque poter funzionare (in memoria, per la sessione).
     */
    async probe(): Promise<boolean> {
      const { error } = await table().select("id").limit(1);
      return !error;
    },
  };
}

/**
 * Returns the Supabase storage when available, otherwise the in-memory one.
 *
 * The fallback keeps the agent alive (no memory, but answers), which is the
 * "fail safe" rule of the feature. The fallback is used in two cases: the
 * service role key is missing, or the migration has not been applied yet
 * (the table does not exist).
 */
export async function createMemoryStore(): Promise<{
  store: MemoryStore;
  persistent: boolean;
}> {
  const supabase = createSupabaseMemoryStore();
  if (supabase) {
    const usable = await supabase.probe?.();
    if (usable !== false) return { store: supabase, persistent: true };
    console.warn(
      "memory: table agent_memory_items is not available, using the in-memory store. Apply supabase/schema-agent-memory.sql.",
    );
  }
  return { store: createInMemoryMemoryStore(), persistent: false };
}
