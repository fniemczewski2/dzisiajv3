// config/env.ts
//
// Jedyne miejsce, w którym aplikacja czyta zmienne środowiskowe.
//
// - `publicEnv` – zmienne NEXT_PUBLIC_*, wstawiane do kodu klienta podczas
//   builda. Next.js podmienia tylko dosłowne odwołania `process.env.NAZWA`,
//   dlatego każde jest wypisane osobno.
// - `serverEnv` – sekrety dostępne wyłącznie po stronie serwera. Odczyt jest
//   leniwy (getter), więc brak zmiennej przerywa tylko endpoint, który jej
//   potrzebuje, a nie cały moduł przy imporcie.

export class MissingEnvError extends Error {
  constructor(public readonly variable: string) {
    super(`Brak zmiennej środowiskowej ${variable}. Uzupełnij ją w .env.local lub w ustawieniach projektu na Vercelu.`);
    this.name = "MissingEnvError";
  }
}

function required(name: string, value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) throw new MissingEnvError(name);
  return trimmed;
}

function optional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export interface OAuthCredentials {
  clientId: string;
  clientSecret: string;
}

/**
 * Dane aplikacji OAuth. `get()` zwraca null, gdy integracja nie jest
 * skonfigurowana (funkcja jest wtedy wyłączona); `require()` rzuca błąd.
 */
function oauthCredentials(idName: string, secretName: string, read: () => [string | undefined, string | undefined]) {
  return {
    get(): OAuthCredentials | null {
      const [id, secret] = read().map(optional);
      return id && secret ? { clientId: id, clientSecret: secret } : null;
    },
    require(): OAuthCredentials {
      const [id, secret] = read();
      return { clientId: required(idName, id), clientSecret: required(secretName, secret) };
    },
  };
}

const DEFAULT_APP_URL = "http://localhost:3000";

export const publicEnv = {
  get supabaseUrl(): string {
    return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  },
  get supabasePublishableKey(): string {
    return required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  },
  /** Bazowy adres aplikacji bez końcowego ukośnika. */
  get appUrl(): string {
    return (optional(process.env.NEXT_PUBLIC_APP_URL) ?? DEFAULT_APP_URL).replace(/\/$/, "");
  },
  get vapidPublicKey(): string | undefined {
    return optional(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
  },
  /** Wersja z package.json, wstrzykiwana w next.config.mjs. */
  get appVersion(): string {
    return optional(process.env.NEXT_PUBLIC_APP_VERSION) ?? "0.0.0";
  },
  /** Data zbudowania wersji (ISO), wstrzykiwana w next.config.mjs. */
  get buildDate(): string | undefined {
    return optional(process.env.NEXT_PUBLIC_BUILD_DATE);
  },
  /** Skrót commita wdrożenia (Vercel), wstrzykiwany w next.config.mjs. */
  get commitSha(): string | undefined {
    return optional(process.env.NEXT_PUBLIC_COMMIT_SHA);
  },
};

export const serverEnv = {
  get supabaseSecretKey(): string {
    return required("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY);
  },
  get cronSecret(): string | undefined {
    return optional(process.env.CRON_SECRET);
  },
  /** Klucz AES-256 (base64) – walidację długości robi lib/server/tokenCrypto.ts. */
  get tokenEncryptionKey(): string | undefined {
    return optional(process.env.CALENDAR_TOKEN_ENCRYPTION_KEY);
  },
  get rejectPlaintextTokens(): boolean {
    return process.env.REJECT_PLAINTEXT_TOKENS === "1";
  },
  google: oauthCredentials("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", () => [
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  ]),
  outlook: oauthCredentials("OUTLOOK_CLIENT_ID", "OUTLOOK_CLIENT_SECRET", () => [
    process.env.OUTLOOK_CLIENT_ID,
    process.env.OUTLOOK_CLIENT_SECRET,
  ]),
  slack: oauthCredentials("SLACK_CLIENT_ID", "SLACK_CLIENT_SECRET", () => [
    process.env.SLACK_CLIENT_ID,
    process.env.SLACK_CLIENT_SECRET,
  ]),
  get tmdbApiKey(): string | undefined {
    return optional(process.env.TMDB_API_KEY);
  },
  get plkApiKey(): string | undefined {
    return optional(process.env.PLK_API_KEY);
  },
  /** Upstash Redis (rate limiting). Bez nich limiter działa w pamięci instancji. */
  upstash: {
    get url(): string | undefined {
      return optional(process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL);
    },
    get token(): string | undefined {
      return optional(process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN);
    },
  },
};
