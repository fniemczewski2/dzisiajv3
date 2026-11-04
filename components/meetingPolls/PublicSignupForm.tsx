// components/meetingPolls/PublicSignupForm.tsx
//
// Publiczny formularz zapisów na terminy: lista slotów z liczbą wolnych miejsc, imię, opcjonalny e-mail i zgoda.
// Wybór ograniczony limitem terminów na osobę; zajęte sloty są wyłączone. Pole „website” to pułapka na boty.

import Link from "next/link";
import React, { useMemo, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { usePublicSignup } from "@/hooks/usePublicSignup";
import { buildSignupDays } from "@/lib/meetingPollSignup";
import { formatPollDay, pluralPl, slotKey } from "@/lib/meetingPollGrid";
import type { MeetingPollSlot, PublicMeetingPoll } from "@/types/meetingPolls";
import { SkeletonSlotGrid } from "../ui/Skeleton";

interface Props {
  token: string;
  poll: PublicMeetingPoll;
}

const parseKey = (key: string): MeetingPollSlot => {
  const [date, start_time] = key.split("|");
  return { date, start_time };
};

export default function PublicSignupForm({ token, poll }: Readonly<Props>) {
  const { slots, loading, loadError, submit, submitting, submitError, resetError } = usePublicSignup(token);
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [done, setDone] = useState<string[] | null>(null);

  const capacity = slots?.capacity ?? poll.slot_capacity;
  const maxPerPerson = slots?.max_per_person ?? poll.max_slots_per_person;
  const days = useMemo(
    () =>
      buildSignupDays(
        poll.dates,
        poll.time_start,
        poll.time_end,
        poll.slot_duration_minutes,
        slots?.slots ?? [],
        capacity
      ),
    [poll, slots, capacity]
  );

  const toggle = (key: string) => {
    resetError();
    setSelected((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      return prev.length < maxPerPerson ? [...prev, key] : prev;
    });
  };

  const canSubmit = selected.length > 0 && name.trim().length > 0 && consent && !submitting;

  const handleSubmit = async (event: React.SyntheticEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    try {
      await submit({ name, email: email.trim() || null, slots: selected.map(parseKey), consent, website });
      setDone(selected);
    } catch (error) {
      // Termin zajęty przez kogoś innego: zdejmujemy go z wyboru (zajętość pobiera hook po każdej próbie).
      if (error instanceof Error && "code" in error && error.code === "full") setSelected([]);
    }
  };

  if (loading) return <SkeletonSlotGrid />;
  if (loadError || !slots) {
    return <p className="py-16 text-center text-text-muted">Nie udało się wczytać terminów. Odśwież stronę.</p>;
  }

  if (done) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-16 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
        <p className="text-lg font-bold text-text">Zapisano!</p>
        <p className="text-sm text-text-secondary">
          Twoje {pluralPl(done.length, "miejsce", "miejsca", "miejsc")}:{" "}
          {done.map((k) => `${parseKey(k).date} ${parseKey(k).start_time}`).join(", ")}.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="mx-auto w-full max-w-3xl space-y-6 pb-20">
      <header className="space-y-1">
        <h1 className="page-title">{poll.title}</h1>
        {poll.description && <p className="text-sm text-text-secondary">{poll.description}</p>}
        <p className="text-sm text-text-secondary">
          Wybierz {maxPerPerson === 1 ? "jeden termin" : `do ${maxPerPerson} terminów`}. W jednym terminie jest{" "}
          {capacity} {pluralPl(capacity, "miejsce", "miejsca", "miejsc")}.
        </p>
      </header>

      <div className="space-y-4">
        {days.map((day) => {
          const { weekday, day: dayLabel } = formatPollDay(day.date);
          return (
            <section key={day.date} aria-label={`${weekday} ${dayLabel}`} className="space-y-2">
              <h2 className="text-sm font-semibold text-text-secondary">
                {weekday} {dayLabel}
              </h2>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {day.slots.map((slot) => {
                  const key = slotKey(day.date, slot.start_time);
                  const isSelected = selected.includes(key);
                  const limitReached = !isSelected && selected.length >= maxPerPerson;
                  const disabled = slot.full || limitReached;
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        onClick={() => toggle(key)}
                        disabled={disabled}
                        aria-pressed={isSelected}
                        aria-label={`${weekday} ${dayLabel}, ${slot.start_time}–${slot.end_time}, ${
                          slot.full ? "brak wolnych miejsc" : `wolnych miejsc: ${slot.free} z ${capacity}`
                        }`}
                        className={`flex min-h-12 w-full flex-col items-center justify-center rounded-lg border px-2 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                          isSelected
                            ? "border-primary bg-primary font-semibold text-white dark:text-background"
                            : "border-line-strong bg-card hover:bg-surface-hover"
                        }`}
                      >
                        <span className="font-semibold tabular-nums">
                          {slot.start_time}–{slot.end_time}
                        </span>
                        <span className="text-xs">{slot.full ? "zajęty" : `wolne: ${slot.free}/${capacity}`}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <p className="text-sm text-text-secondary" aria-live="polite">
        Wybrano: {selected.length} z {maxPerPerson}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="su-name" className="form-label">
            Imię i nazwisko:
          </label>
          <input
            id="su-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            autoComplete="name"
            required
            className="input-field"
          />
        </div>
        <div>
          <label htmlFor="su-email" className="form-label">
            E-mail (opcjonalnie):
          </label>
          <input
            id="su-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="input-field"
          />
        </div>
      </div>

      {/* Pułapka na boty: niewidoczne pole, które człowiek zostawia puste. */}
      <div className="sr-only" aria-hidden="true">
        <label htmlFor="su-website">Nie wypełniaj tego pola</label>
        <input
          id="su-website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <label className="flex items-start gap-3 text-sm text-text">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-primary"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span>
          Zgadzam się na przetwarzanie imienia i nazwiska oraz e-maila (jeśli podam) w celu obsługi zapisu. Dane
          otrzymuje organizator ankiety i przechowuje je do usunięcia ankiety; mogę zażądać ich wcześniejszego
          usunięcia.{" "}
          <Link href="/privacy#ankiety" className="font-semibold text-primary underline-offset-4 hover:underline">
            Informacja o przetwarzaniu danych (RODO)
          </Link>
        </span>
      </label>

      {submitError && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {submitError.message}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="dzisiaj-save-btn inline-flex min-h-11 items-center justify-center gap-2 px-6 disabled:opacity-50"
      >
        Zapisz się
        {submitting && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
      </button>
    </form>
  );
}
