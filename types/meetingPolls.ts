// types/meetingPolls.ts

export type MeetingPollStatus = "open" | "closed";
/** availability – uczestnicy zaznaczają, kiedy mogą; signup – zapisują się na terminy z ograniczoną liczbą miejsc. */
export type MeetingPollMode = "availability" | "signup";
export const MEETING_POLL_SLOT_DURATIONS = [15, 30, 60] as const;
export type MeetingPollSlotDuration = (typeof MEETING_POLL_SLOT_DURATIONS)[number];

export interface MeetingPoll {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  slot_duration_minutes: MeetingPollSlotDuration;
  time_start: string;
  time_end: string;
  share_token: string;
  status: MeetingPollStatus;
  created_at: string;
  updated_at: string;
  closes_at: string | null;
  /** Czy osoby, które odpowiedziały, widzą wyniki (ustawia organizator przy tworzeniu). */
  show_results_to_respondents: boolean;
  mode: MeetingPollMode;
  /** Liczba miejsc w jednym slocie (tryb zapisów). */
  slot_capacity: number;
  /** Na ile slotów może zapisać się jedna osoba (tryb zapisów). */
  max_slots_per_person: number;
}

export interface MeetingPollDate {
  id: string;
  poll_id: string;
  date: string;
}

export type MeetingPollInsert = {
  title: string;
  description?: string | null;
  slot_duration_minutes: MeetingPollSlotDuration;
  time_start: string;
  time_end: string;
  dates: string[];
  show_results_to_respondents?: boolean;
  mode?: MeetingPollMode;
  slot_capacity?: number;
  max_slots_per_person?: number;
};

export interface PublicMeetingPoll {
  title: string;
  description: string | null;
  slot_duration_minutes: MeetingPollSlotDuration;
  time_start: string;
  time_end: string;
  dates: string[];
  status: MeetingPollStatus;
  show_results_to_respondents: boolean;
  mode: MeetingPollMode;
  slot_capacity: number;
  max_slots_per_person: number;
}

export interface MeetingPollSlot {
  date: string;
  start_time: string;
}

export interface MeetingPollResponsePayload {
  respondent_name: string;
  respondent_email?: string | null;
  slots: MeetingPollSlot[];
  edit_token?: string;
  /** Token Cloudflare Turnstile (wymagany przy pierwszej odpowiedzi, gdy weryfikacja jest włączona). */
  turnstile_token?: string;
}

export interface MeetingPollResponseSubmitResult {
  edit_token: string;
}

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

export interface FinalizeSlotInput {
  title?: string;
  date: string;
  start_time: string;
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

/** Wyniki widoczne dla osoby, która odpowiedziała: tylko liczby, bez imion i adresów innych osób. */
export interface RespondentPollSlotCount {
  date: string;
  start_time: string;
  count: number;
}

export interface RespondentPollResults {
  respondents: number;
  slots: RespondentPollSlotCount[];
}

/** Zajętość jednego slotu w ankiecie zapisów (tylko liczba – bez danych osób). */
export interface SignupSlotCount {
  date: string;
  start_time: string;
  booked: number;
}

export interface PublicSignupSlots {
  capacity: number;
  max_per_person: number;
  slots: SignupSlotCount[];
}

export interface MeetingPollBookingPayload {
  name: string;
  email?: string | null;
  slots: MeetingPollSlot[];
  /** Zgoda na przetwarzanie imienia i e-maila w celu obsługi zapisu (wymagana). */
  consent: boolean;
  /** Pułapka na boty: prawdziwy formularz zostawia puste. */
  website?: string;
  /** Token Cloudflare Turnstile (wymagany, gdy weryfikacja jest włączona). */
  turnstile_token?: string;
}

export interface MeetingPollBooking {
  id: string;
  poll_id: string;
  date: string;
  start_time: string;
  name: string;
  email: string | null;
  consent_at: string;
  created_at: string;
}
