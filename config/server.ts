// config/server.ts
//
// Stałe wyłącznie serwerowe: limity zapytań, timeouty integracji, paginacja
// i nagłówki cache. Limity widoczne dla użytkownika są w config/limits.ts.

export type RateLimitWindow = `${number} s` | `${number} m` | `${number} h`;

export interface RateLimitRule {
  /** Liczba żądań w oknie. */
  limit: number;
  /** Długość okna w formacie Upstash, np. "60 s", "10 m". */
  window: RateLimitWindow;
}

/** Limity zapytań per IP albo per użytkownik (klucz ustala endpoint). */
export const RATE_LIMITS = {
  worklogsAuto: { limit: 30, window: "60 s" },
  quickNotes: { limit: 30, window: "60 s" },
  /** Dane zdrowotne ze Skrótów iOS (na adres IP). */
  healthShortcut: { limit: 30, window: "60 s" },
  pollRespond: { limit: 5, window: "10 m" },
  /** Zapisy na terminy w ankietach zapisów (na ankietę i adres IP). */
  pollBook: { limit: 6, window: "10 m" },
  pollPublicRead: { limit: 60, window: "60 s" },
  vcard: { limit: 30, window: "60 s" },
  news: { limit: 20, window: "60 s" },
  locality: { limit: 60, window: "60 s" },
  /** Odpowiedzi wysyłane z modułu poczty (na użytkownika). */
  mailSend: { limit: 20, window: "10 m" },
  /** Wiadomości przyjmowane z bramki przekierowań (na adres IP bramki). */
  mailInbound: { limit: 120, window: "60 s" },
  /** Obrazy z treści maili pobierane przez proxy (na użytkownika). */
  mailImage: { limit: 300, window: "60 s" },
  /** Usuwanie wiadomości (z aplikacji i do kosza w skrzynce), na użytkownika. */
  mailDelete: { limit: 60, window: "10 m" },
  /** Odczyt poczty (lista, treść, zadanie, wydarzenie, konta, przekierowania), na użytkownika. */
  mailRead: { limit: 120, window: "60 s" },
  /** Proxy TMDB (na użytkownika). */
  tmdb: { limit: 60, window: "60 s" },
  /** Tablica odjazdów PKP PLK (na użytkownika). */
  stationBoard: { limit: 30, window: "60 s" },
  /** Parsowanie biletu PDF: kosztowne, więc ciasny limit (na użytkownika). */
  parseTicket: { limit: 10, window: "10 m" },
  /** Finalizacja ankiety terminów (na użytkownika). */
  pollFinalize: { limit: 10, window: "10 m" },
  /** Import i eksport kalendarzy Google i Outlook (na użytkownika). */
  calendarApi: { limit: 120, window: "60 s" },
  /** Akcje integracji ze Slackiem (na użytkownika). */
  slackApi: { limit: 60, window: "60 s" },
  /** Rozpoczęcie łączenia konta OAuth: poczta, vault Obsidiana (na użytkownika). */
  oauthStart: { limit: 20, window: "10 m" },
  /** Synchronizacja z vaultem Obsidiana (na użytkownika). */
  vaultSync: { limit: 10, window: "10 m" },
} as const satisfies Record<string, RateLimitRule>;

export type RateLimitName = keyof typeof RATE_LIMITS;

/** Maksymalny czas oczekiwania na Redis; po nim żądanie przechodzi (fail-open). */
export const RATE_LIMIT_REDIS_TIMEOUT_MS = 1_000;
/** Limit kluczy limitera w pamięci (tryb bez Redisa). */
export const RATE_LIMIT_MEMORY_MAX_KEYS = 10_000;

/** Nagłówek z tokenem edycji odpowiedzi w ankiecie – zamiast parametru w adresie URL (logi, historia). */
export const POLL_EDIT_TOKEN_HEADER = "x-edit-token";

/** Cloudflare Turnstile: weryfikacja tokenu formularzy publicznych (ankiety terminów i zapisy). */
export const TURNSTILE = {
  verifyUrl: "https://challenges.cloudflare.com/turnstile/v0/siteverify",
  /** Maksymalny czas oczekiwania na odpowiedź Cloudflare. */
  timeoutMs: 5_000,
  /** Dłuższy token jest odrzucany bez pytania Cloudflare (limit z dokumentacji usługi). */
  maxTokenLength: 2048,
} as const;

/** Nagłówki Cache-Control dla publicznych odpowiedzi. */
export const CACHE_CONTROL = {
  /** Publiczna wizytówka .vcf – zmienia się rzadko. */
  vcard: "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
  /** Dane ankiety dla uczestnika – status może się zmienić, więc krótko. */
  publicPoll: "public, max-age=0, s-maxage=30, stale-while-revalidate=60",
  /** Odpowiedzi zależne od użytkownika lub tajnych tokenów. */
  private: "private, no-store",
  sitemap: "public, max-age=3600, s-maxage=86400",
} as const;

/** Timeouty zapytań do usług zewnętrznych. */
export const TIMEOUTS_MS = {
  default: 15_000,
  pkp: 10_000,
  rss: 8_000,
} as const;

/** Czas życia pamięci podręcznej po stronie serwera. */
export const SERVER_TTL_MS = {
  pkpStations: 24 * 60 * 60 * 1000,
  pkpOperations: 30 * 1000,
  rssOk: 15 * 60_000,
  rssError: 5 * 60_000,
} as const;

/**
 * Eksport danych: odpowiedź funkcji na Vercelu ma limit 4,5 MB. Większy plik
 * trafia do prywatnego bucketu i użytkownik dostaje link ważny przez chwilę.
 */
export const EXPORT_INLINE_MAX_BYTES = 4 * 1024 * 1024;
export const EXPORT_SIGNED_URL_SECONDS = 600;

/** Paginacja i porcjowanie operacji na bazie i Storage. */
export const PAGING = {
  storageList: 1000,
  calendarSyncPage: 1000,
  calendarSyncDeleteChunk: 200,
  dataExportPage: 1000,
} as const;

/** Rozmiary pamięci podręcznych w procesie. */
export const MEMORY_CACHE_MAX = {
  locality: 5000,
} as const;

/** RSS: ograniczenia pobierania i parsowania kanałów. */
export const RSS_LIMITS = {
  maxBytes: 3 * 1024 * 1024,
  maxItemsPerFeed: 30,
  maxRedirects: 3,
  maxItemsTotal: 300,
} as const;

// --- Poczta: limity przetwarzania -------------------------------------------
/** Górny limit pobrania od dostawcy (lista + zapas na wiadomości usunięte z aplikacji). */
export const MAIL_LIST_MAX_FETCH = 50;
/** Ile identyfikatorów usuniętych wiadomości odczytujemy na konto. */
export const MAIL_HIDDEN_LOOKUP = 1000;
export const MAX_INBOUND_TEXT = 100_000;
export const MAX_INBOUND_HTML = 300_000;
/** RFC 5322: zalecana maksymalna długość linii nagłówka. */
export const MAX_INBOUND_SUBJECT = 998;
export const MAX_INBOUND_ICS = 200_000;
export const MAX_INLINE_IMAGES = 10;
/** Limit długości base64 jednego obrazu osadzonego (~1,5 MB danych). */
export const MAX_INLINE_IMAGE_BASE64 = 2_000_000;
export const IMAGE_PROXY_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_PROXY_MAX_REDIRECTS = 3;
export const IMAGE_PROXY_TIMEOUT_MS = 8_000;

// --- Poczta: OAuth ----------------------------------------------------------
/**
 * Zakresy Gmail API. gmail.modify (odczyt i kosz) i gmail.send są zakresami „restricted”:
 * przed udostępnieniem wszystkim użytkownikom aplikacja wymaga weryfikacji Google.
 */
export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
] as const;
export const GMAIL_STATE_COOKIE = "mail_gmail_state";
export const GMAIL_REDIRECT_PATH = "/api/mail/gmail/callback";
/** Mail.ReadWrite: odczyt i przeniesienie do „Elementów usuniętych”; Mail.Send: odpowiedzi. */
export const OUTLOOK_MAIL_SCOPES = ["offline_access", "User.Read", "Mail.ReadWrite", "Mail.Send"] as const;
export const OUTLOOK_STATE_COOKIE = "mail_outlook_state";
export const OUTLOOK_MAIL_REDIRECT_PATH = "/api/mail/outlook/callback";

// --- Obsidian: vault w OneDrive / Google Drive --------------------------------
/** Folder aplikacji w OneDrive – dostęp tylko do niego (także do plików utworzonych przez Obsidiana). */
export const VAULT_ONEDRIVE_SCOPES = ["offline_access", "User.Read", "Files.ReadWrite.AppFolder"] as const;
/**
 * Pełny dostęp do Dysku (zakres „restricted”) – wymagany, żeby widzieć pliki utworzone w Obsidianie.
 * Przed udostępnieniem wszystkim użytkownikom wymaga weryfikacji Google.
 */
export const VAULT_GDRIVE_SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/userinfo.email",
] as const;
export const VAULT_STATE_COOKIE = "vault_oauth_state";
export const VAULT_ONEDRIVE_REDIRECT_PATH = "/api/obsidian/onedrive/callback";
export const VAULT_GDRIVE_REDIRECT_PATH = "/api/obsidian/gdrive/callback";
/** Górny limit plików czytanych w jednej synchronizacji. */
export const MAX_VAULT_FILES = 2000;
