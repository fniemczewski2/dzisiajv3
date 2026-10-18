// config/storage.ts
//
// Wszystko, co aplikacja zapisuje w przeglądarce. Lista jest źródłem dla
// polityki prywatności (sekcja „Pliki cookie i pamięć przeglądarki”) i dla
// czyszczenia danych przy wylogowaniu – nowy klucz dopisz tutaj.

/** IndexedDB: kopia danych do pracy offline (per użytkownik). */
export const OFFLINE_CACHE_DB = "dzisiaj-offline-cache";
export const OFFLINE_CACHE_STORE = "kv";
export const OFFLINE_CACHE_DB_VERSION = 1;

/** IndexedDB: zapisy wykonane bez sieci, czekające na wysłanie. */
export const OFFLINE_QUEUE_DB = "offline_queue_db";
export const OFFLINE_QUEUE_STORE = "offline_queue";
export const OFFLINE_QUEUE_DB_VERSION = 1;

/** localStorage – klucze związane z kontem; usuwane przy wylogowaniu. */
export const USER_LOCAL_STORAGE_KEYS = {
  lastPosition: "dzisiaj:last_position",
  pushOptIn: "dzisiaj:push_opt_in",
  trackedStationBoards: "tracked_station_boards",
  /** Id ostatnio zalogowanej osoby – zmiana konta bez wylogowania czyści dane poprzedniego. */
  lastUserId: "dzisiaj:last_user",
} as const;

/** localStorage – klucze niezwiązane z kontem; zostają po wylogowaniu. */
export const DEVICE_LOCAL_STORAGE_KEYS = {
  cookieNotice: "cookieConsent",
  /** Sygnał „zalogowano” dla innych kart (zapisywany i od razu usuwany). */
  authSuccess: "auth-success",
  /** Motyw jasny/ciemny (next-themes). */
  theme: "theme",
} as const;

/** Token edycji odpowiedzi w ankiecie – pozwala uczestnikowi bez konta poprawić odpowiedź. */
/** Zdarzenie wysyłane po wysłaniu kolejki offline (detail: lista tabel). */
export const OFFLINE_SYNCED_EVENT = "dzisiaj:offline-synced";

export const pollEditTokenKey = (shareToken: string) => `meeting-poll-edit-token:${shareToken}`;

/** Ciasteczko z odpowiedzią na pytanie o lokalizację (bez współrzędnych). */
export const GPS_PERMISSION_COOKIE = "gps_permission";
export const GPS_PERMISSION_COOKIE_DAYS = 365;
