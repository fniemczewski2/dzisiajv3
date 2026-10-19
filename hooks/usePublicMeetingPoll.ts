// hooks/usePublicMeetingPoll.ts

import { POLL_EDIT_TOKEN_HEADER } from "@/config/server";
import { pollEditTokenKey } from "@/config/storage";
import { useCallback, useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/providers/ToastProvider";
import type { PublicMeetingPoll, MeetingPollSlot } from "@/types/meetingPolls";

export interface ExistingResponse {
  respondent_name: string;
  respondent_email: string | null;
  slots: MeetingPollSlot[];
}

const subscribeNoop = () => () => {};

function readEditToken(token: string): string | null {
  try {
    return localStorage.getItem(pollEditTokenKey(token));
  } catch {
    return null;
  }
}

export function usePublicMeetingPoll(token: string | undefined) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [savedEditToken, setSavedEditToken] = useState<string | null>(null);

  // Token edycji z poprzedniej odpowiedzi na tym urządzeniu (localStorage), bez efektu.
  const storedEditToken = useSyncExternalStore(
    subscribeNoop,
    () => (token ? readEditToken(token) : null),
    () => null
  );
  const editToken = savedEditToken ?? storedEditToken;
  const hasExistingResponse = Boolean(editToken);

  const pollQuery = useQuery({
    queryKey: ["public-poll", token ?? null],
    enabled: Boolean(token),
    queryFn: async ({ signal }): Promise<PublicMeetingPoll | null> => {
      const res = await fetch(`/api/meeting-polls/public/${token}`, { signal });
      if (!res.ok) return null;
      return (await res.json()) as PublicMeetingPoll;
    },
  });

  // Wcześniejsza odpowiedź uczestnika – tylko gdy jest token edycji z tego urządzenia.
  const existingQuery = useQuery({
    queryKey: ["public-poll-response", token ?? null, storedEditToken],
    enabled: Boolean(token && storedEditToken),
    queryFn: async ({ signal }): Promise<ExistingResponse | null> => {
      const res = await fetch(`/api/meeting-polls/public/${token}/respond`, {
        headers: { [POLL_EDIT_TOKEN_HEADER]: storedEditToken as string },
        cache: "no-store",
        signal,
      });
      return res.ok ? ((await res.json()) as ExistingResponse) : null;
    },
  });

  const poll = pollQuery.data ?? null;
  const loading = Boolean(token) && pollQuery.isPending;
  const notFound = Boolean(token) && !pollQuery.isPending && (pollQuery.isError || pollQuery.data === null);
  const existingResponse = existingQuery.data ?? null;

  const submitResponse = useCallback(
    async (respondentName: string, respondentEmail: string, slots: MeetingPollSlot[]): Promise<boolean> => {
      if (!token) return false;
      if (!respondentName.trim()) {
        toast.error("Podaj swoje imię.");
        return false;
      }
      if (slots.length === 0) {
        toast.error("Zaznacz przynajmniej jeden dostępny termin.");
        return false;
      }

      setSubmitting(true);
      try {
        const existingEditToken = localStorage.getItem(pollEditTokenKey(token)) ?? undefined;
        const res = await fetch(`/api/meeting-polls/public/${token}/respond`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            respondent_name: respondentName.trim(),
            respondent_email: respondentEmail.trim() || null,
            slots,
            edit_token: existingEditToken,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error ?? "Błąd zapisu odpowiedzi.");
          return false;
        }
        localStorage.setItem(pollEditTokenKey(token), data.edit_token);
        setSavedEditToken(data.edit_token);
        setSubmitted(true);
        toast.success("Zapisano Twoją dostępność. Dziękujemy!");
        return true;
      } catch {
        toast.error("Błąd zapisu odpowiedzi.");
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [token, toast]
  );

  return { poll, loading, notFound, submitting, submitted, hasExistingResponse, existingResponse, submitResponse };
}
