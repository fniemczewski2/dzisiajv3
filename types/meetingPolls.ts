// types/meetingPolls.ts

export type MeetingPollStatus = "open" | "closed";
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
