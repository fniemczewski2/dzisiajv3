// types/meetingPolls.ts

export type MeetingPollStatus = "open" | "closed";
export const MEETING_POLL_SLOT_DURATIONS = [15, 30, 60] as const;
export type MeetingPollSlotDuration = (typeof MEETING_POLL_SLOT_DURATIONS)[number];

/** Wiersz organizatora (widoczny wyłącznie przez auth.uid() = user_id). */
export interface MeetingPoll {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  slot_duration_minutes: MeetingPollSlotDuration;
  /** Postgres `time` -> string "HH:MM:SS" z supabase-js. */
  time_start: string;
  time_end: string;
  share_token: string;
  status: MeetingPollStatus;
  created_at: string;
  updated_at: string;
}

export interface MeetingPollDate {
  id: string;
  poll_id: string;
  date: string;
}

/** Payload tworzenia ankiety — share_token generowany po stronie klienta
 * (crypto.randomUUID(), wystarczająca entropia dla linku-sekretu) tuż przed
 * insertem, dates wstawiane osobnym zapytaniem zaraz po utworzeniu wiersza
 * głównego (patrz hooks/db/useMeetingPolls.ts — brak transakcji
 * wielotabelowych z poziomu PostgREST, więc nieudany insert dates cofa
 * (usuwa) już utworzony wiersz poll). */
export type MeetingPollInsert = {
  title: string;
  description?: string | null;
  slot_duration_minutes: MeetingPollSlotDuration;
  time_start: string;
  time_end: string;
  dates: string[];
};

// ---------------------------------------------------------------------------
// Widok PUBLICZNY (uczestnik) — wyłącznie pola potrzebne do wypełnienia
// formularza. NIGDY: user_id organizatora, e-mail organizatora, cudze
// odpowiedzi. Zwracane przez pages/api/meeting-polls/public/[token].ts.
// ---------------------------------------------------------------------------
export interface PublicMeetingPoll {
  title: string;
  description: string | null;
  slot_duration_minutes: MeetingPollSlotDuration;
  time_start: string;
  time_end: string;
  dates: string[];
  status: MeetingPollStatus;
}

export interface MeetingPollSlot {
  date: string;
  /** "HH:MM" — początek slotu o długości slot_duration_minutes. */
  start_time: string;
}

/** Payload wysyłany przez uczestnika. `edit_token`, gdy podany, oznacza
 * AKTUALIZACJĘ wcześniejszej odpowiedzi (zamiast utworzenia nowej) —
 * weryfikowany server-side w API route, nie przez RLS. */
export interface MeetingPollResponsePayload {
  respondent_name: string;
  respondent_email?: string | null;
  slots: MeetingPollSlot[];
  edit_token?: string;
}

export interface MeetingPollResponseSubmitResult {
  edit_token: string;
}

// ---------------------------------------------------------------------------
// Widok ORGANIZATORA (wyniki) — pełne dane uczestników, RLS ogranicza do
// właściciela ankiety.
// ---------------------------------------------------------------------------
export interface MeetingPollResponseRow {
  id: string;
  respondent_name: string;
  respondent_email: string | null;
  user_id: string | null;
  created_at: string;
}

export interface MeetingPollAvailabilityRow {
  response_id: string;
  date: string;
  start_time: string;
}

export interface MeetingPollResults {
  poll: MeetingPoll;
  dates: string[];
  responses: MeetingPollResponseRow[];
  availabilities: MeetingPollAvailabilityRow[];
}

// ---------------------------------------------------------------------------
// Finalizacja — organizator wybiera jeden lub kilka konkretnych terminów.
// ---------------------------------------------------------------------------
export interface FinalizeSlotInput {
  /** Domyślnie tytuł ankiety, edytowalny per-termin (przydatne przy kilku
   * finalizowanych spotkaniach z jednej ankiety, np. dwie tury warsztatu). */
  title?: string;
  date: string;
  /** "HH:MM" */
  start_time: string;
  /** "HH:MM" */
  end_time: string;
  place?: string;
}

export interface FinalizeRequest {
  slots: FinalizeSlotInput[];
}

export interface FinalizeResultSlot {
  date: string;
  start_time: string;
  end_time: string;
  organizerEventId: string;
  invitedParticipants: number;
}

export interface FinalizeResponse {
  results: FinalizeResultSlot[];
}
