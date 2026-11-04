// hooks/usePublicSignup.ts
//
// Publiczny formularz zapisów: zajętość slotów (odświeżana po powrocie do karty i po błędzie „termin zajęty”)
// oraz wysłanie zapisu. Komunikaty błędów pochodzą z serwera (po polsku, gotowe dla uczestnika).

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MeetingPollBookingPayload, PublicSignupSlots } from "@/types/meetingPolls";

export class SignupError extends Error {
  constructor(
    message: string,
    readonly code?: string
  ) {
    super(message);
    this.name = "SignupError";
  }
}

export function usePublicSignup(token: string) {
  const queryClient = useQueryClient();
  const slotsKey = ["public-signup-slots", token] as const;

  const slotsQuery = useQuery({
    queryKey: slotsKey,
    queryFn: async ({ signal }): Promise<PublicSignupSlots> => {
      const res = await fetch(`/api/meeting-polls/public/${token}/slots`, { signal });
      if (!res.ok) throw new SignupError("Nie udało się pobrać zajętości terminów.");
      return (await res.json()) as PublicSignupSlots;
    },
    staleTime: 5000,
    refetchOnWindowFocus: true,
  });

  const mutation = useMutation({
    mutationFn: async (payload: MeetingPollBookingPayload): Promise<{ booked: number }> => {
      const res = await fetch(`/api/meeting-polls/public/${token}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string; booked?: number };
      if (!res.ok) throw new SignupError(body.error ?? "Nie udało się zapisać. Spróbuj ponownie.", body.code);
      return { booked: body.booked ?? 0 };
    },
    // Zajętość mogła się zmienić (cudzy zapis) – po każdej próbie pobieramy ją od nowa.
    onSettled: () => queryClient.invalidateQueries({ queryKey: slotsKey }),
  });

  return {
    slots: slotsQuery.data ?? null,
    loading: slotsQuery.isLoading,
    loadError: slotsQuery.error,
    submit: mutation.mutateAsync,
    submitting: mutation.isPending,
    submitError: mutation.error instanceof SignupError ? mutation.error : null,
    resetError: mutation.reset,
  };
}
