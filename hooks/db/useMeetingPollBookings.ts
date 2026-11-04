// hooks/db/useMeetingPollBookings.ts
//
// Zapisy uczestników w ankiecie zapisów – odczyt i usuwanie przez sesję organizatora (RLS: tylko właściciel ankiety).
// Klucz zapytania zaczyna się od „meeting-poll-bookings” – lib/queryPersister nie zapisuje go w IndexedDB
// (imiona i e-maile uczestników tylko w pamięci).

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { cols } from "@/lib/db/columns";
import type { MeetingPollBooking } from "@/types/meetingPolls";

const POLL_BOOKINGS_KEY = "meeting-poll-bookings";

export function useMeetingPollBookings(pollId: string) {
  const { user, supabase } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const key = [POLL_BOOKINGS_KEY, pollId] as const;

  const query = useQuery({
    queryKey: key,
    enabled: Boolean(user),
    queryFn: async (): Promise<MeetingPollBooking[]> => {
      const { data, error } = await supabase
        .from("meeting_poll_bookings")
        .select(cols("meeting_poll_bookings"))
        .eq("poll_id", pollId)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MeetingPollBooking[];
    },
  });

  const remove = useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase.from("meeting_poll_bookings").delete().eq("id", bookingId).eq("poll_id", pollId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Usunięto zapis.");
      return queryClient.invalidateQueries({ queryKey: key });
    },
    onError: () => toast.error("Nie udało się usunąć zapisu."),
  });

  return {
    bookings: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    deleteBooking: remove.mutateAsync,
    deleting: remove.isPending,
  };
}
