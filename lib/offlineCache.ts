// lib/offlineCache.ts

const DB_NAME = "dzisiaj-offline-cache";
const DB_VERSION = 1;
const STORE = "kv";

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
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error ?? new Error("IndexedDB open failed"));
    };
    req.onblocked = () => {
      dbPromise = null;
      reject(new Error("IndexedDB blocked"));
    };
  });
  return dbPromise;
}

export async function readCache<T>(key: string): Promise<T | null> {
  if (!isSupported()) return null;
  try {
    const db = await openDb();
    return await new Promise<T | null>((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
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
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({ value, savedAt: Date.now() } satisfies CacheEntry<T>, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
  } catch {
    // no-op
  }
}

export async function clearOfflineCache(): Promise<void> {
  if (isSupported()) {
    try {
      const db = await openDb();
      await new Promise<void>((resolve) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
        tx.onabort = () => resolve();
      });
    } catch {
      // no-op
    }
  }

  try {
    navigator.serviceWorker?.controller?.postMessage({ type: "PURGE_DATA_CACHE" });
  } catch {
    // no-op
  }
}
