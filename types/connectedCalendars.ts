// Wiersz tabeli `connected_calendars` w Supabase, używany po stronie serwera
// (access_token/refresh_token trzymane są w postaci zaszyfrowanej - zob. lib/server/tokenCrypto.ts).
export interface ConnectedCalendarRow {
  id: string;
  user_id: string;
  provider: "google" | "outlook";
  account_email: string;
  // "@account_connection" oznacza wiersz-konto (przechowuje tokeny), a nie
  // konkretny podkalendarz; "google_birthdays" to wirtualny kalendarz urodzin.
  google_calendar_id: string;
  calendar_name?: string | null;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
}

export interface TokenCache {
  [providerAndEmail: string]: string;
}

export interface MainAccountsCache {
  [providerAndEmail: string]: ConnectedCalendarRow;
}
