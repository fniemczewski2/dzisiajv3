// lib/mail/notices.ts
//
// Komunikaty po powrocie z trasy połączenia konta (parametr ?connected= albo ?error=).

const NOTICES: Record<string, string> = {
  gmail: "Konto Gmail zostało podłączone.",
  outlook: "Konto Outlook zostało podłączone.",
  denied: "Anulowano łączenie konta.",
  invalid_state: "Sesja łączenia wygasła. Spróbuj ponownie.",
  auth_failed: "Zaloguj się ponownie.",
  token_failed: "Dostawca odrzucił połączenie.",
  profile_failed: "Nie udało się odczytać adresu konta.",
  limit: "Osiągnięto limit kont pocztowych.",
  no_refresh: "Dostawca nie przekazał uprawnień. Spróbuj ponownie i zaakceptuj zgody.",
  save_failed: "Nie udało się zapisać konta.",
};

export function callbackNoticeFor(key: string): string {
  return NOTICES[key] ?? "Wystąpił błąd połączenia.";
}
