// supabase/functions/_shared/errors.ts

export function getErrorMessage(error: unknown, fallback = "Nieznany błąd"): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return fallback;
}
