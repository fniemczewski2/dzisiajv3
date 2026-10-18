// lib/localUserData.ts
//
// Usuwa z przeglądarki wszystko, co dotyczy zalogowanego konta: kopię danych
// offline, kolejkę niewysłanych zapisów, pamięć service workera i klucze
// localStorage z config/storage.ts. Wywoływane przy wylogowaniu i po
// usunięciu konta – na wspólnym urządzeniu nie zostają cudze dane.

import { USER_LOCAL_STORAGE_KEYS } from "@/config/storage";
import { clearOfflineCache } from "@/lib/offlineCache";
import { clearQueue } from "@/lib/offlineQueue";

export async function clearLocalUserData(): Promise<void> {
  try {
    for (const key of Object.values(USER_LOCAL_STORAGE_KEYS)) localStorage.removeItem(key);
  } catch {
    // localStorage niedostępny (tryb prywatny).
  }
  await Promise.all([clearOfflineCache(), clearQueue()]);
  try {
    navigator.serviceWorker?.controller?.postMessage({ type: "PURGE_USER_DATA" });
  } catch {
    // Brak service workera.
  }
}
