// lib/offlineQueue.ts
//
// Zapisy wykonane bez sieci. Każdy wpis pamięta właściciela (id użytkownika):
// wysyłamy wyłącznie wpisy zalogowanej osoby, w kolejności dodania, po
// odzyskaniu połączenia (OfflineSync w _app). Przy wylogowaniu kolejka jest
// czyszczona, więc na wspólnym urządzeniu nie zostają cudze dane.

import { mapPool } from "@/shared/asyncPool";
import type { SupabaseClient } from "@supabase/supabase-js";
import { OFFLINE_QUEUE_DB, OFFLINE_QUEUE_DB_VERSION, OFFLINE_QUEUE_STORE } from "@/config/storage";

export interface QueuedInsert {
  id: string;
  /** Id użytkownika, który dodał wpis. */
  ownerId: string;
  table: string;
  payload: Record<string, unknown>;
  queued_at: string;
  /** Liczba nieudanych prób wysłania (błąd bazy, nie brak sieci). */
  attempts: number;
}

/** Po tylu odrzuceniach przez bazę wpis jest usuwany i zgłaszany jako utracony. */
const MAX_QUEUE_ATTEMPTS = 3;

function isSupported(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_QUEUE_DB, OFFLINE_QUEUE_DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(OFFLINE_QUEUE_STORE)) {
        request.result.createObjectStore(OFFLINE_QUEUE_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Nie udało się otworzyć IndexedDB."));
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(OFFLINE_QUEUE_STORE, mode);
    const request = run(tx.objectStore(OFFLINE_QUEUE_STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Operacja IndexedDB nie powiodła się."));
    tx.oncomplete = () => db.close();
    tx.onabort = () => db.close();
  });
}

export function isOffline(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

export async function enqueueInsert(ownerId: string, table: string, payload: Record<string, unknown>): Promise<void> {
  const entry: QueuedInsert = {
    id: `${Date.now().toString().padStart(15, "0")}-${crypto.randomUUID()}`,
    ownerId,
    table,
    payload: { ...payload, user_id: ownerId },
    queued_at: new Date().toISOString(),
    attempts: 0,
  };
  await withStore("readwrite", (store) => store.add(entry));
}

async function allEntries(): Promise<QueuedInsert[]> {
  if (!isSupported()) return [];
  try {
    const entries = await withStore("readonly", (store) => store.getAll() as IDBRequest<QueuedInsert[]>);
    return entries.toSorted((a, b) => a.queued_at.localeCompare(b.queued_at) || a.id.localeCompare(b.id));
  } catch {
    return [];
  }
}

export interface FlushResult {
  sent: number;
  /** Wpisy, które zostały w kolejce (np. ponowny brak sieci). */
  pending: number;
  /** Wpisy odrzucone przez bazę MAX_QUEUE_ATTEMPTS razy – usunięte. */
  dropped: number;
}

/**
 * Wysyła zapisy użytkownika `ownerId` po kolei. Brak sieci przerywa wysyłanie
 * (kolejność musi zostać zachowana); błąd bazy zwiększa licznik prób wpisu.
 */
export async function flushQueue(supabase: SupabaseClient, ownerId: string): Promise<FlushResult> {
  const entries = (await allEntries()).filter((entry) => entry.ownerId === ownerId);
  const result: FlushResult = { sent: 0, pending: 0, dropped: 0 };

  let stopped = false;
  // Zapisy jeden po drugim (limit 1) – kolejność dodania ma znaczenie.
  await mapPool(entries, 1, async (entry) => {
    // Utrata sieci w trakcie: reszta zostaje w kolejce na następną próbę.
    if (stopped || isOffline()) {
      stopped = true;
      result.pending += 1;
      return;
    }
    const { error } = await supabase.from(entry.table).insert(entry.payload);
    if (!error) {
      await withStore("readwrite", (store) => store.delete(entry.id));
      result.sent += 1;
      return;
    }
    const attempts = entry.attempts + 1;
    if (attempts >= MAX_QUEUE_ATTEMPTS) {
      await withStore("readwrite", (store) => store.delete(entry.id));
      result.dropped += 1;
    } else {
      await withStore("readwrite", (store) => store.put({ ...entry, attempts }));
      result.pending += 1;
    }
  });
  return result;
}

/** Usuwa całą kolejkę (wylogowanie, usunięcie konta). */
export async function clearQueue(): Promise<void> {
  if (!isSupported()) return;
  try {
    await withStore("readwrite", (store) => store.clear());
  } catch {
    // Brak IndexedDB (tryb prywatny) – nie ma czego czyścić.
  }
}
