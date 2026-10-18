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
  pollRespond: { limit: 5, window: "10 m" },
  pollPublicRead: { limit: 60, window: "60 s" },
  vcard: { limit: 30, window: "60 s" },
  news: { limit: 20, window: "60 s" },
  locality: { limit: 60, window: "60 s" },
} as const satisfies Record<string, RateLimitRule>;

export type RateLimitName = keyof typeof RATE_LIMITS;

/** Maksymalny czas oczekiwania na Redis; po nim żądanie przechodzi (fail-open). */
export const RATE_LIMIT_REDIS_TIMEOUT_MS = 1_000;
/** Limit kluczy limitera w pamięci (tryb bez Redisa). */
export const RATE_LIMIT_MEMORY_MAX_KEYS = 10_000;

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
