/**
 * Storage of the memory items.
 *
 * The interface is the contract every backend implements (in-memory for
 * tests and for the degraded mode, Supabase for production).
 *
 * Every method takes the `MemoryScope` of the caller: the scoping rule is
 * enforced HERE, inside the storage, not by the callers. A lookup by id
 * without the scope does not exist on purpose: it would be the easiest way
 * to read the memory of another tenant.
 */

import { assertValidScope, scopeKey } from "./scope";
import type {
  MemoryItem,
  MemoryListFilter,
  MemoryScope,
} from "./types";

/** Storage of the memory items. */
export interface MemoryStore {
  /** Inserts an item and returns it. */
  insert(item: MemoryItem): Promise<MemoryItem>;
  /** Returns the items of a scope, newest first. */
  list(scope: MemoryScope, filter?: MemoryListFilter): Promise<MemoryItem[]>;
  /** Returns one item of the scope, or `null`. */
  get(scope: MemoryScope, id: string): Promise<MemoryItem | null>;
  /** Updates an item of the scope. Returns `null` when it does not exist. */
  update(scope: MemoryScope, item: MemoryItem): Promise<MemoryItem | null>;
  /** Marks an item as retrieved (updates `lastAccessedAt`). */
  touch(scope: MemoryScope, id: string, at: string): Promise<void>;
  /** Deletes one item of the scope. Returns true when a row was deleted. */
  delete(scope: MemoryScope, id: string): Promise<boolean>;
  /** Deletes the items of the scope. Returns the number of deleted rows. */
  deleteMany(scope: MemoryScope, filter?: MemoryListFilter): Promise<number>;
  /**
   * Verifies that the storage is usable (the table exists, the backend
   * risponde). When it returns false the caller degrades to another store.
   */
  probe?(): Promise<boolean>;
}

/** True when the item is expired at the given moment. */
export function isExpired(
  item: MemoryItem,
  now: number = Date.now(),
): boolean {
  if (!item.expiresAt) return false;
  const timestamp = Date.parse(item.expiresAt);
  if (Number.isNaN(timestamp)) return false;
  return timestamp <= now;
}

/** Applies the list filters to a set of items (newest first). */
export function filterMemoryItems(
  items: MemoryItem[],
  filter: MemoryListFilter | undefined,
  now: number = Date.now(),
): MemoryItem[] {
  const types = filter?.types;
  const includeExpired = filter?.includeExpired === true;
  const limit = filter?.limit;
  const filtered = items
    .filter((item) => (types && types.length > 0 ? types.includes(item.type) : true))
    .filter((item) => includeExpired || !isExpired(item, now))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return typeof limit === "number" && limit >= 0
    ? filtered.slice(0, limit)
    : filtered;
}

/**
 * In-memory storage.
 *
 * Used by the tests and as the degraded mode when the database is not
 * reachable (the agent must keep answering, without memory).
 */
export function createInMemoryMemoryStore(): MemoryStore {
  // Key: scope key + item id. The scope is part of the key, so an item of
  // another tenant is not even reachable from this map.
  const items = new Map<string, MemoryItem>();

  const keyOf = (scope: MemoryScope, id: string) =>
    `${scopeKey(scope)}${id}`;

  const scopedItems = (scope: MemoryScope): MemoryItem[] => {
    const prefix = scopeKey(scope);
    const out: MemoryItem[] = [];
    for (const [key, item] of items) {
      if (key.startsWith(prefix)) out.push(item);
    }
    return out;
  };

  return {
    async insert(item: MemoryItem): Promise<MemoryItem> {
      assertValidScope(item);
      items.set(keyOf(item, item.id), { ...item });
      return { ...item };
    },

    async list(
      scope: MemoryScope,
      filter?: MemoryListFilter,
    ): Promise<MemoryItem[]> {
      assertValidScope(scope);
      return filterMemoryItems(scopedItems(scope), filter).map((i) => ({ ...i }));
    },

    async get(scope: MemoryScope, id: string): Promise<MemoryItem | null> {
      assertValidScope(scope);
      const found = items.get(keyOf(scope, id));
      return found ? { ...found } : null;
    },

    async update(
      scope: MemoryScope,
      item: MemoryItem,
    ): Promise<MemoryItem | null> {
      assertValidScope(scope);
      const key = keyOf(scope, item.id);
      const found = items.get(key);
      if (!found) return null;
      const updated = { ...item };
      items.set(key, updated);
      return { ...updated };
    },

    async touch(scope: MemoryScope, id: string, at: string): Promise<void> {
      assertValidScope(scope);
      const key = keyOf(scope, id);
      const found = items.get(key);
      if (found) items.set(key, { ...found, lastAccessedAt: at });
    },

    async delete(scope: MemoryScope, id: string): Promise<boolean> {
      assertValidScope(scope);
      return items.delete(keyOf(scope, id));
    },

    async deleteMany(
      scope: MemoryScope,
      filter?: MemoryListFilter,
    ): Promise<number> {
      assertValidScope(scope);
      const doomed = filterMemoryItems(scopedItems(scope), filter);
      for (const item of doomed) items.delete(keyOf(scope, item.id));
      return doomed.length;
    },
  };
}
