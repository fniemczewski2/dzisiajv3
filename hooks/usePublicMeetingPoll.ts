// hooks/usePublicMeetingPoll.ts

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/providers/ToastProvider";
import type { PublicMeetingPoll, MeetingPollSlot } from "@/types/meetingPolls";

function editTokenStorageKey(token: string): string {
  return `meeting-poll-edit-token:${token}`;
}

export interface ExistingResponse {
  respondent_name: string;
  respondent_email: string | null;
  slots: MeetingPollSlot[];
}

export function usePublicMeetingPoll(token: string | undefined) {
  const { toast } = useToast();
  const [poll, setPoll] = useState<PublicMeetingPoll | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [hasExistingResponse, setHasExistingResponse] = useState(false);
  const [existingResponse, setExistingResponse] = useState<ExistingResponse | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    void (async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const res = await fetch(`/api/meeting-polls/public/${token}`);
        if (!res.ok) {
          if (!cancelled) setNotFound(true);
          return;
        }
        const data = (await res.json()) as PublicMeetingPoll;
        if (!cancelled) setPoll(data);
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const storedEditToken = localStorage.getItem(editTokenStorageKey(token));
    setHasExistingResponse(!!storedEditToken);

    if (storedEditToken) {
      void (async () => {
        try {
          const res = await fetch(
            `/api/meeting-polls/public/${token}/respond?edit_token=${encodeURIComponent(storedEditToken)}`
          );
          if (res.ok && !cancelled) {
            setExistingResponse((await res.json()) as ExistingResponse);
          }
        } catch {}

      })();
    }

    return () => {
      cancelled = true;
    };
  }, [token]);

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
        const existingEditToken = localStorage.getItem(editTokenStorageKey(token)) ?? undefined;
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
        localStorage.setItem(editTokenStorageKey(token), data.edit_token);
        setHasExistingResponse(true);
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
