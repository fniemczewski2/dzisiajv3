// components/meetingPolls/PublicPollForm.tsx

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { Check, CheckCircle2 } from "lucide-react";
import { usePublicMeetingPoll } from "@/hooks/usePublicMeetingPoll";
import { generateTimeSlots, slotKey } from "@/lib/meetingPollGrid";
import type { MeetingPollSlot } from "@/types/meetingPolls";
import { SaveButton } from "../ui/CommonButtons";
import { useDragSelectGrid } from "@/hooks/useDragSelectGrid";
import { SkeletonSlotGrid } from "../ui/Skeleton";

interface PublicPollFormProps {
  token: string;
}

export default function PublicPollForm({ token }: Readonly<PublicPollFormProps>) {
  const { poll, loading, notFound, submitting, submitted, hasExistingResponse, existingResponse, submitResponse } =
    usePublicMeetingPoll(token);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const dragModeRef = React.useRef<"select" | "deselect">("select");

  useEffect(() => {
    if (!existingResponse) return;
    setName(existingResponse.respondent_name);
    setEmail(existingResponse.respondent_email ?? "");
    setSelected(new Set(existingResponse.slots.map((s) => slotKey(s.date, s.start_time))));
  }, [existingResponse]);

  const times = useMemo(
    () => (poll ? generateTimeSlots(poll.time_start, poll.time_end, poll.slot_duration_minutes) : []),
    [poll]
  );

  const applyMode = (key: string, mode: "select" | "deselect") => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (mode === "select") next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const { cellHandlers, gridRef } = useDragSelectGrid({
    onBegin: (_group, key) => {
      const mode: "select" | "deselect" = selected.has(key) ? "deselect" : "select";
      dragModeRef.current = mode;
      applyMode(key, mode);
    },
    onExtend: (_group, key) => {
      applyMode(key, dragModeRef.current);
    },
  });

  const handleSubmit = async () => {
    if (!poll) return;
    const slots: MeetingPollSlot[] = Array.from(selected).map((key) => {
      const [date, start_time] = key.split("|");
      return { date, start_time };
    });
    await submitResponse(name, email, slots);
  };

  if (loading) {
    return <SkeletonSlotGrid />;
  }

  if (notFound || !poll) {
    return <p className="py-16 text-center text-text-muted">Ta ankieta nie istnieje albo została usunięta.</p>;
  }

  if (poll.status === "closed") {
    return <p className="py-16 text-center text-text-muted">Ta ankieta nie przyjmuje już odpowiedzi.</p>;
  }

  if (submitted) {
    return (
      <div className="space-y-3 py-16 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
        <p className="text-lg font-bold text-text">Dziękujemy!</p>
        <p className="text-sm text-text-secondary">Twoja dostępność została zapisana.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <div>
        <h1 className="page-title">{poll.title}</h1>
        {poll.description && <p className="mt-1 text-sm text-text-secondary">{poll.description}</p>}
        {hasExistingResponse && (
          <p className="mt-2 text-xs text-primary">Znaleźliśmy Twoją wcześniejszą odpowiedź – możesz ją tu poprawić.</p>
        )}
      </div>

      <div className="form-card grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="pp-name" className="form-label">
            Imię:
          </label>
          <input
            id="pp-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Twoje imię"
            autoComplete="name"
            aria-describedby="pp-privacy"
            className="input-field"
          />
        </div>
        <div>
          <label htmlFor="pp-email" className="form-label">
            E-mail (opcjonalnie):
          </label>
          <input
            id="pp-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="twoj@email.pl"
            autoComplete="email"
            aria-describedby="pp-privacy"
            className="input-field"
          />
        </div>
        <p id="pp-privacy" className="text-xs leading-relaxed text-text-secondary sm:col-span-2">
          Imię, opcjonalny e-mail i zaznaczone terminy otrzyma organizator ankiety, aby ustalić termin spotkania. Dane
          są przechowywane do usunięcia ankiety; możesz zażądać ich wcześniejszego usunięcia.{" "}
          <Link href="/privacy#ankiety" className="font-semibold text-primary underline-offset-4 hover:underline">
            Informacja o przetwarzaniu danych (RODO)
          </Link>
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm text-text-secondary">
          Zaznacz pasujące terminy, przeciągając po komórkach. Siatkę przewiniesz, przesuwając nagłówek z datami lub
          kolumnę godzin.
        </p>
        <div className="card overflow-x-auto rounded-card p-4 shadow-sm">
          <table ref={gridRef} className="border-collapse select-none">
            <thead>
              <tr>
                <th scope="col" className="sticky left-0 bg-card p-1 text-left text-xs font-normal text-text-muted">
                  <span className="sr-only">Godzina</span>
                </th>
                {poll.dates.map((d) => (
                  <th scope="col" key={d} className="min-w-18 p-1 text-xs font-semibold text-text-muted">
                    {d.split("-")[2] + "." + d.split("-")[1]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {times.map((time) => (
                <tr key={time}>
                  <th
                    scope="row"
                    className="sticky left-0 bg-card p-1 pr-2 text-left text-xs font-normal whitespace-nowrap text-text-muted"
                  >
                    {time}
                  </th>
                  {poll.dates.map((date) => {
                    const key = slotKey(date, time);
                    const isSelected = selected.has(key);
                    const [, month, day] = date.split("-");
                    return (
                      <td
                        key={date}
                        {...cellHandlers("grid", key)}
                        className={`h-8 w-12 cursor-pointer border border-card p-0 text-center transition-colors ${
                          isSelected ? "bg-primary" : "bg-surface hover:bg-surface-hover"
                        }`}
                      >
                        {/* Przycisk daje dostęp z klawiatury i czytnika ekranu. Mysz, dotyk
                            i rysik obsługuje przeciąganie (useDragSelectGrid), więc tu
                            reagujemy tylko na kliknięcie z klawiatury (detail === 0). */}
                        <button
                          type="button"
                          aria-pressed={isSelected}
                          aria-label={`${day}.${month}, ${time}`}
                          onClick={(e) => {
                            if (e.detail === 0) applyMode(key, isSelected ? "deselect" : "select");
                          }}
                          className="flex h-full w-full items-center justify-center focus-visible:-outline-offset-2"
                        >
                          {isSelected && (
                            <Check className="h-4 w-4 text-white dark:text-background" aria-hidden="true" />
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <SaveButton onClick={() => void handleSubmit()} disabled={submitting} />
    </div>
  );
}
