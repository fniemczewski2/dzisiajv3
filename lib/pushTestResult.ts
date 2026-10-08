// lib/pushTestResult.ts
//
// Opis wyniku testowego powiadomienia dla użytkownika. Przycisk testu ma
// służyć do diagnozy, więc rozróżniamy trzy przypadki zamiast jednego
// „wysłano (0 / 0)”.

export interface PushSendResult {
  sent?: number;
  total?: number;
  /** Kody HTTP odrzuconych wysyłek (od usługi push przeglądarki). */
  failedStatusCodes?: number[];
}

export type PushTestOutcome =
  | { ok: true; message: string }
  | { ok: false; message: string };

/**
 * Komunikat dla odpowiedzi z błędem HTTP – z kodem statusu i przyczyną podaną
 * przez serwer, żeby dało się ustalić, co poszło nie tak.
 */
export function describePushHttpError(status: number, body: { error?: string; message?: string } | null): string {
  if (status === 401) return "Sesja wygasła – zaloguj się ponownie i spróbuj jeszcze raz.";
  if (status === 404) return "Funkcja send-push nie jest wdrożona w Supabase (błąd 404).";
  const reason = body?.error || body?.message;
  const detail = reason ? `${status}: ${reason}` : String(status);
  return `Nie udało się wysłać powiadomienia testowego (błąd ${detail}).`;
}

function rejectionReason(failedStatusCodes: readonly number[] | undefined): string {
  const codes = [...new Set(failedStatusCodes ?? [])];
  // 401/403 od usługi push = klucz VAPID niezgodny z tym, którym zapisano subskrypcję.
  if (codes.some((c) => c === 401 || c === 403)) {
    return "usługa push odrzuciła klucz serwera (VAPID). Wyłącz i włącz powiadomienia ponownie.";
  }
  if (codes.length === 0) return "usługa push odrzuciła wysyłkę.";
  return `usługa push odrzuciła wysyłkę (kod ${codes.join(", ")}).`;
}

function devicesLabel(count: number): string {
  return count === 1 ? "urządzenie" : "urządzenia";
}

export function describePushTestResult(result: PushSendResult): PushTestOutcome {
  const sent = result.sent ?? 0;
  const total = result.total ?? 0;

  if (total === 0) {
    return {
      ok: false,
      message: "Brak aktywnej subskrypcji powiadomień. Wyłącz i włącz powiadomienia ponownie na tym urządzeniu.",
    };
  }
  if (sent === 0) {
    return { ok: false, message: `Nie dostarczono powiadomienia: ${rejectionReason(result.failedStatusCodes)}` };
  }
  if (sent === total) return { ok: true, message: `Wysłano na ${sent} ${devicesLabel(sent)}.` };
  return { ok: true, message: `Wysłano na ${sent} z ${total} urządzeń.` };
}
