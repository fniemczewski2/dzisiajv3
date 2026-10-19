// lib/serviceWorker.ts
//
// Jedno miejsce rejestracji service workera. W trybie deweloperskim (next dev)
// service worker jest domyślnie wyłączony (w produkcji i testach – włączony): serwer dev przebudowuje pliki
// i restartuje się w trakcie pracy, więc sprawdzanie aktualizacji /sw.js
// kończyło się błędem „An unknown error occurred when fetching the script”,
// a pamięć podręczna mogła serwować nieaktualny kod. Do testowania
// powiadomień lokalnie ustaw NEXT_PUBLIC_SW_DEV=1.

/** Czy rejestrować service worker (odczyt przy wywołaniu – testy mogą ustawić NEXT_PUBLIC_SW_DEV). */
function isServiceWorkerEnabled(): boolean {
  return process.env.NODE_ENV !== "development" || process.env.NEXT_PUBLIC_SW_DEV === "1";
}

/** Komunikat, gdy funkcja wymaga service workera, a ten jest wyłączony. */
export const SERVICE_WORKER_DISABLED_MESSAGE =
  "Powiadomienia działają w wersji produkcyjnej. Lokalnie uruchom aplikację z NEXT_PUBLIC_SW_DEV=1.";

let devCleanup: Promise<null> | null = null;

async function unregisterAll(): Promise<void> {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((r) => r.unregister()));
}

/**
 * Rejestruje /sw.js i zwraca rejestrację (przeglądarka zwraca istniejącą,
 * jeśli skrypt i zakres się nie zmieniły). Gdy service worker
 * jest wyłączony albo przeglądarka go nie obsługuje – null. W trybie dev
 * wyrejestrowuje wcześniej zainstalowane service workery.
 */
export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return Promise.resolve(null);

  if (!isServiceWorkerEnabled()) {
    devCleanup ??= unregisterAll()
      .catch(() => undefined)
      .then(() => null);
    return devCleanup;
  }

  return (
    navigator.serviceWorker
      // updateViaCache: "none" – przy sprawdzaniu aktualizacji zawsze świeży /sw.js, nie z pamięci HTTP.
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((error: unknown) => {
        console.warn("[SW] Rejestracja nie powiodła się:", error);
        return null;
      })
  );
}

/**
 * Sprawdza, czy jest nowa wersja service workera. Niekrytyczne: błąd sieci
 * (brak połączenia, restart serwera) tylko w konsoli – przeglądarka i tak
 * sprawdza aktualizację przy następnej nawigacji.
 */
export async function checkForServiceWorkerUpdate(reg: ServiceWorkerRegistration): Promise<void> {
  try {
    await reg.update();
  } catch (error) {
    console.warn("[SW] Nie udało się sprawdzić aktualizacji service workera – spróbujemy później:", error);
  }
}
