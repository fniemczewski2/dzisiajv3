// lib/offlineQueue.ts

import type { SupabaseClient } from "@supabase/supabase-js";
import { OFFLINE_QUEUE_DB, OFFLINE_QUEUE_STORE } from "@/config/limits";

export interface QueuedInsert {
  id: string;
  table: string;
  payload: Record<string, unknown>;
  queued_at: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_QUEUE_DB, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(OFFLINE_QUEUE_STORE)) {
        request.result.createObjectStore(OFFLINE_QUEUE_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(OFFLINE_QUEUE_STORE, mode);
        const request = run(tx.objectStore(OFFLINE_QUEUE_STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
        tx.oncomplete = () => db.close();
      })
  );
}

export function isOffline(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

export async function enqueueInsert(table: string, payload: Record<string, unknown>): Promise<void> {
  const entry: QueuedInsert = {
    id: `${table}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    table,
    payload,
    queued_at: new Date().toISOString(),
  };
  await withStore("readwrite", (store) => store.add(entry));
}

export async function pendingCount(): Promise<number> {
  try {
    return await withStore("readonly", (store) => store.count());
  } catch {
    return 0;
  }
}

export async function flushQueue(supabase: SupabaseClient): Promise<{ sent: number; failed: number }> {
  let entries: QueuedInsert[] = [];
  try {
    entries = await withStore("readonly", (store) => store.getAll() as IDBRequest<QueuedInsert[]>);
  } catch {
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const entry of entries) {
    const { error } = await supabase.from(entry.table).insert(entry.payload);
    if (error) {
      failed += 1;
      continue;
    }
    await withStore("readwrite", (store) => store.delete(entry.id));
    sent += 1;
  }
  return { sent, failed };
}