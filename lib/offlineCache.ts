// lib/offlineCache.ts
//
// Ostatnio pobrane listy (zadania, notatki…) w IndexedDB, żeby aplikacja
// pokazywała dane bez sieci. Klucze zawierają id użytkownika; całość jest
// usuwana przy wylogowaniu (clearLocalUserData).

import { OFFLINE_CACHE_DB, OFFLINE_CACHE_DB_VERSION, OFFLINE_CACHE_STORE } from "@/config/storage";

interface CacheEntry<T> {
  value: T;
  savedAt: number;
}

function isSupported(): boolean {
  return typeof indexedDB !== "undefined";
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(OFFLINE_CACHE_DB, OFFLINE_CACHE_DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(OFFLINE_CACHE_STORE)) {
        req.result.createObjectStore(OFFLINE_CACHE_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error ?? new Error("Nie udało się otworzyć IndexedDB."));
    };
    req.onblocked = () => {
      dbPromise = null;
      reject(new Error("IndexedDB jest zablokowane przez inną kartę."));
    };
  });
  return dbPromise;
}

export async function readCache<T>(key: string): Promise<T | null> {
  if (!isSupported()) return null;
  try {
    const db = await openDb();
    return await new Promise<T | null>((resolve) => {
      const tx = db.transaction(OFFLINE_CACHE_STORE, "readonly");
      const req = tx.objectStore(OFFLINE_CACHE_STORE).get(key);
      req.onsuccess = () => {
        const entry = req.result as CacheEntry<T> | undefined;
        resolve(entry ? entry.value : null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function writeCache<T>(key: string, value: T): Promise<void> {
  if (!isSupported()) return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(OFFLINE_CACHE_STORE, "readwrite");
      tx.objectStore(OFFLINE_CACHE_STORE).put({ value, savedAt: Date.now() } satisfies CacheEntry<T>, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
  } catch {
    // Brak miejsca lub IndexedDB – pamięć podręczna jest tylko udogodnieniem.
  }
}

export async function clearOfflineCache(): Promise<void> {
  if (!isSupported()) return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(OFFLINE_CACHE_STORE, "readwrite");
      tx.objectStore(OFFLINE_CACHE_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
  } catch {
    // Nie ma czego czyścić.
  }
}
