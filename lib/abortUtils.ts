// lib/abortUtils.ts
//
// postgrest-js RZUCA (odrzuca Promise), a nie zwraca { error }, gdy zapytanie
// zostanie przerwane przez AbortSignal (zweryfikowane w źródle postgrest-js:
// "Never retry aborted requests" -> throw fetchError). Każdy catch wokół
// zapytania z .abortSignal() musi więc odróżnić "przerwane celowo" (unmount,
// nowszy fetch nadpisał ten) od "prawdziwy błąd sieci/serwera" — inaczej
// zwykłe odmontowanie komponentu wyświetlałoby toast z błędem.

export function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

export function createAbortError(): DOMException {
  return new DOMException("Aborted", "AbortError");
}
