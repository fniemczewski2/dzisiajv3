// Bezpieczne odczytywanie informacji z błędów złapanych jako `unknown` (catch bez
// typu), bez uciekania się do `any`. Przydatne zwłaszcza dla błędów Postgres/Supabase,
// które mają dodatkowe pole `code` (np. "23505" - unique_violation) nieobecne w Error.

export function getErrorMessage(error: unknown, fallback = "Wystąpił nieoczekiwany błąd"): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return fallback;
}

export function getPostgresErrorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code)
    : undefined;
}
