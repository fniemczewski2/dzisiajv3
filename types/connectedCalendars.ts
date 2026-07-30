// types/connectedCalendars.ts

export interface ConnectedCalendarRow {
  id: string;
  user_id: string;
  provider: "google" | "outlook";
  account_email: string;
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
