// lib/offlineCache.ts
//
// Lekka warstwa cache offline (IndexedDB, bez zależności) dla danych
// aplikacyjnych. Współpracuje z warstwą Service Workera:
//
//  - SW (public/sw.js) cache'uje odpowiedzi GET z Supabase REST w trybie
//    network-first -> działanie offline dla WSZYSTKICH hooków bez zmian
//    w ich kodzie.
//  - Ta warstwa daje dodatkowo NATYCHMIASTOWY pierwszy render: hook
//    hydratuje stan z IndexedDB zanim przyjdzie odpowiedź sieci
//    (wzorzec wpięty w hooks/db/useTasks.ts — do powielenia w pozostałych).
//
// Dlaczego IndexedDB, a nie localStorage: brak limitu ~5 MB, brak
// synchronicznego blokowania głównego wątku, natywna serializacja
// obiektów (structured clone) zamiast JSON.stringify.
//
// BEZPIECZEŃSTWO: klucze są prefiksowane userId przez wywołujących,
// a CAŁY cache jest czyszczony przy SIGNED_OUT (zob. AuthProvider) —
// na współdzielonym komputerze kolejny użytkownik nie może zobaczyć
// danych poprzedniego.

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

/**
 * Odczyt z cache. Zwraca null przy braku wpisu, braku wsparcia (SSR,
 * tryb prywatny starych przeglądarek) lub dowolnym błędzie — cache jest
 * best-effort i NIGDY nie może wywalić ścieżki głównej.
 */
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

/** Zapis do cache — fire-and-forget, błędy połykane świadomie. */
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
    // no-op: brak cache nie może psuć zapisu właściwego
  }
}

/**
 * Czyści CAŁY cache offline (IndexedDB) oraz zleca Service Workerowi
 * usunięcie cache'u odpowiedzi Supabase. Wywoływane przy wylogowaniu.
 */
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
    // SW trzyma odpowiedzi REST w Cache Storage — czyszczone osobno.
    navigator.serviceWorker?.controller?.postMessage({ type: "PURGE_DATA_CACHE" });
  } catch {
    // no-op
  }
}
