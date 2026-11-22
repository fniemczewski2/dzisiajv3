// types/events.ts

import type { RecurrenceRule } from "@/shared/recurrence";

export interface Event {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  place?: string;
  user_id: string;
  shared_with_id?: string | null;
  shared_with_email?: string;
  display_share_info?: string | null;
  repeat: "none" | "daily" | "weekly" | "monthly" | "yearly";
  /** Rozszerzona reguła powtarzania; gdy pusta – liczy się `repeat`. */
  recurrence?: RecurrenceRule | null;
  /** Opcjonalna kategoria (ta sama lista co w zadaniach) – nadaje kolor w kalendarzu. */
  category?: string | null;
  /** Identyfikator wydarzenia u dostawcy (Google lub Outlook), gdy wydarzenie jest powiązane. */
  google_event_id?: string | null;
  /** connected_calendars.id kalendarza zewnętrznego, z którym wydarzenie jest powiązane. */
  calendar_id?: string | null;
}

/**
 * Wyjątek jednego terminu serii (tabela event_overrides). `occurrence_date` to dzień z siatki reguły –
 * zostaje kluczem nawet wtedy, gdy termin przeniesiono na inny dzień.
 */
export interface EventOverride {
  event_id: string;
  occurrence_date: string;
  start_time: string;
  end_time: string;
  /** Termin z reguły, sprzed pierwszej zmiany tego wystąpienia. */
  rule_start_time?: string | null;
  rule_end_time?: string | null;
  /** Ten jeden termin się nie odbywa. */
  canceled?: boolean;
  /** Wyjątek obowiązuje obie strony wydarzenia współdzielonego. */
  shared?: boolean;
}

export interface ConnectedAccount {
  id: string;
  provider: "google" | "outlook";
  account_email: string;
  google_calendar_id?: string;
  sync_error?: string | null;
}

export interface ExternalCalendar {
  id: string;
  summary: string;
  accountId?: string;
  primary?: boolean;
  primaryAccountId?: string;
}

export type PlacedEvent = {
  event: Event;
  start: Date;
  end: Date;
  col: number;
  span: number;
  row: number;
};
