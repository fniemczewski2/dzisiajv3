// lib/localUserData.ts
//
// Usuwa z przeglądarki wszystko, co dotyczy zalogowanego konta: kopię danych
// offline, kolejkę niewysłanych zapisów, pamięć service workera i klucze
// localStorage z config/storage.ts. Wywoływane przy wylogowaniu i po
// usunięciu konta – na wspólnym urządzeniu nie zostają cudze dane.

import { queryPersister } from "@/lib/queryPersister";
import { clearQueryCache } from "@/lib/queryClient";
import { USER_LOCAL_STORAGE_KEYS } from "@/config/storage";
import { clearQueue } from "@/lib/offlineQueue";

export async function clearLocalUserData(): Promise<void> {
  try {
    for (const key of Object.values(USER_LOCAL_STORAGE_KEYS)) localStorage.removeItem(key);
  } catch {
    // localStorage niedostępny (tryb prywatny).
  }
  clearQueryCache();
  await Promise.all([queryPersister.removeClient(), clearQueue()]);
  try {
    navigator.serviceWorker?.controller?.postMessage({ type: "PURGE_USER_DATA" });
  } catch {
    // Brak service workera.
  }
}
