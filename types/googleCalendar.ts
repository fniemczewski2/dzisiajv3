export interface GoogleTokenResponse {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

// Google dopuszcza albo dateTime (wydarzenie z godziną), albo date (całodniowe).
export interface GoogleEventDateTime {
  dateTime?: string;
  date?: string;
}

export interface GoogleCalendarEvent {
  id: string;
  status?: string;
  eventType?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: GoogleEventDateTime;
  end?: GoogleEventDateTime;
}

export interface GoogleEventsListResponse {
  items?: GoogleCalendarEvent[];
  nextPageToken?: string;
}

export interface GoogleCalendarListEntry {
  id: string;
  summary?: string;
  primary?: boolean;
}

export interface GoogleCalendarListResponse {
  items?: GoogleCalendarListEntry[];
}
