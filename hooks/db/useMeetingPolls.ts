// hooks/db/useMeetingPolls.ts

import { useCallback } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { useCrudResource } from "./useCrudResource";
import type {
  MeetingPoll,
  MeetingPollInsert,
  MeetingPollResponseRow,
  MeetingPollResults,
  FinalizeSlotInput,
  FinalizeResultSlot,
} from "@/types/meetingPolls";

const MESSAGES = {
  fetchError: "Błąd pobierania ankiet.",
  added: "Utworzono ankietę",
  addError: "Błąd tworzenia ankiety.",
  edited: "Zaktualizowano ankietę",
  editError: "Błąd aktualizacji ankiety.",
  deleted: "Usunięto ankietę",
  deleteError: "Błąd usuwania ankiety.",
  confirmDelete: "Czy na pewno chcesz usunąć tę ankietę? Wszystkie odpowiedzi uczestników zostaną utracone.",
};

export function useMeetingPolls() {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const { toast } = useToast();

  const crud = useCrudResource<MeetingPoll>({
    table: "meeting_polls",
    order: { column: "created_at", ascending: false },
    messages: MESSAGES,
  });

  const createPoll = useCallback(
    async (payload: MeetingPollInsert): Promise<MeetingPoll | undefined> => {
      if (!userId) throw new Error("Unauthorized");
      if (payload.dates.length === 0) {
        toast.error("Wybierz przynajmniej jeden dzień.");
        return undefined;
      }

      const shareToken = crypto.randomUUID();

      const { data: poll, error: pollError } = await supabase
        .from("meeting_polls")
        .insert({
          user_id: userId,
          title: payload.title,
          description: payload.description ?? null,
          slot_duration_minutes: payload.slot_duration_minutes,
          time_start: payload.time_start,
          time_end: payload.time_end,
          share_token: shareToken,
        })
        .select()
        .single();

      if (pollError || !poll) {
        toast.error(MESSAGES.addError);
        return undefined;
      }

      const dateRows = payload.dates.map((date) => ({ poll_id: poll.id, date }));
      const { error: datesError } = await supabase.from("meeting_poll_dates").insert(dateRows);

      if (datesError) {
        await supabase.from("meeting_polls").delete().eq("id", poll.id);
        toast.error("Błąd zapisu dni ankiety.");
        return undefined;
      }

      crud.setItems((prev) => [poll as MeetingPoll, ...prev]);
      toast.success(MESSAGES.added);
      return poll as MeetingPoll;
    },
    [userId, supabase, toast, crud]
  );

  const deletePoll = useCallback(
    async (id: string): Promise<void> => {
      await crud.remove(id);
    },
    [crud]
  );

  const getPollResults = useCallback(
    async (pollId: string): Promise<MeetingPollResults | null> => {
      const { data: poll, error: pollError } = await supabase
        .from("meeting_polls")
        .select("*")
        .eq("id", pollId)
        .single();
      if (pollError || !poll) {
        toast.error("Błąd pobierania ankiety.");
        return null;
      }

      const { data: dateRows, error: datesError } = await supabase
        .from("meeting_poll_dates")
        .select("date")
        .eq("poll_id", pollId)
        .order("date", { ascending: true });
      if (datesError) {
        toast.error("Błąd pobierania dni ankiety.");
        return null;
      }

      const { data: responses, error: responsesError } = await supabase
        .from("meeting_poll_responses")
        .select("id, respondent_name, respondent_email, user_id, created_at")
        .eq("poll_id", pollId)
        .order("created_at", { ascending: true });
      if (responsesError) {
        toast.error("Błąd pobierania odpowiedzi.");
        return null;
      }

      const responseIds = (responses ?? []).map((r) => r.id);
      const { data: availabilities, error: availError } =
        responseIds.length > 0
          ? await supabase
              .from("meeting_poll_availabilities")
              .select("response_id, date, start_time")
              .in("response_id", responseIds)
          : { data: [], error: null };
      if (availError) {
        toast.error("Błąd pobierania dostępności.");
        return null;
      }

      return {
        poll: poll as MeetingPoll,
        dates: (dateRows ?? []).map((d) => d.date as string),
        responses: (responses ?? []) as MeetingPollResponseRow[],
        availabilities: (availabilities ?? []).map((a) => ({
          response_id: a.response_id,
          date: a.date,
          start_time: (a.start_time as string).slice(0, 5),
        })),
      };
    },
    [supabase, toast]
  );

  const finalizePoll = useCallback(
    async (pollId: string, slots: FinalizeSlotInput[]): Promise<FinalizeResultSlot[] | null> => {
      try {
        const response = await fetch(`/api/meeting-polls/${pollId}/finalize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slots }),
        });
        const data = await response.json();
        if (!response.ok) {
          toast.error(data.error ?? "Błąd finalizacji terminu.");
          return null;
        }
        toast.success("Termin zapisany w kalendarzu - i u dostępnych, zalogowanych uczestników.");
        return data.results as FinalizeResultSlot[];
      } catch {
        toast.error("Błąd finalizacji terminu.");
        return null;
      }
    },
    [toast]
  );

  return {
    polls: crud.items,
    loading: crud.loading,
    fetching: crud.fetching,
    fetchPolls: crud.refetch,
    createPoll,
    deletePoll,
    getPollResults,
    finalizePoll,
  };
}
