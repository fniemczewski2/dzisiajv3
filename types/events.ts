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
  repeat: "none" | "weekly" | "monthly" | "yearly";
}

export interface ConnectedAccount {
  id: string;
  provider: 'google' | 'outlook';
  account_email: string;
  google_calendar_id?: string;
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