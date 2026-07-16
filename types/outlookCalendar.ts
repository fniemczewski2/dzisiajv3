export interface OutlookTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
}

// Graph zawsze zwraca dateTime jako lokalny czas bez offsetu, stąd ręczne
// doklejanie "Z" w miejscach, gdzie z tego korzystamy.
export interface OutlookEventDateTime {
  dateTime: string;
  timeZone?: string;
}

export interface OutlookEvent {
  id: string;
  isCancelled?: boolean;
  subject?: string;
  bodyPreview?: string;
  location?: { displayName?: string };
  start: OutlookEventDateTime;
  end: OutlookEventDateTime;
}

export interface OutlookEventsResponse {
  value?: OutlookEvent[];
  "@odata.nextLink"?: string;
}

export interface OutlookCalendar {
  id: string;
  name: string;
  isDefaultCalendar?: boolean;
}

export interface OutlookCalendarsResponse {
  value?: OutlookCalendar[];
}
