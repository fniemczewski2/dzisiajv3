// components/meetingPolls/MeetingPollForm.tsx

import React, { useMemo, useState } from "react";
import { CalendarPlus, CalendarRange, X } from "lucide-react";
import { useMeetingPolls } from "@/hooks/db/useMeetingPolls";
import { FormButtons } from "../ui/CommonButtons";
import { getAppDate } from "@/lib/dateUtils";
import { formatPollDay, generateTimeSlots, nextWorkingDays, pluralPl } from "@/lib/meetingPollGrid";
import { MEETING_POLL_SLOT_DURATIONS, type MeetingPollSlotDuration } from "@/types/meetingPolls";

interface MeetingPollFormProps {
  onChange: () => void;
  onCancel?: () => void;
}

const DURATION_LABELS: Record<MeetingPollSlotDuration, string> = {
  15: "15 minut",
  30: "30 minut",
  60: "1 godzina",
};

const QUICK_WORKING_DAYS = 5;

function mergeDates(current: string[], added: string[]): string[] {
  return [...new Set([...current, ...added])].sort();
}

export default function MeetingPollForm({ onChange, onCancel }: Readonly<MeetingPollFormProps>) {
  const { createPoll, loading } = useMeetingPolls();
  const today = getAppDate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [slotDuration, setSlotDuration] = useState<MeetingPollSlotDuration>(30);
  const [timeStart, setTimeStart] = useState("10:00");
  const [timeEnd, setTimeEnd] = useState("22:00");
  const [dates, setDates] = useState<string[]>([]);
  const [dateToAdd, setDateToAdd] = useState(today);

  const addDate = () => {
    if (dateToAdd) setDates((prev) => mergeDates(prev, [dateToAdd]));
  };

  const addWorkingDays = () => setDates((prev) => mergeDates(prev, nextWorkingDays(today, QUICK_WORKING_DAYS)));

  const removeDate = (date: string) => setDates((prev) => prev.filter((d) => d !== date));

  const timesValid = timeEnd > timeStart;
  const canSave = title.trim().length > 0 && dates.length > 0 && timesValid;

  const slotsPerDay = useMemo(
    () => (timesValid ? generateTimeSlots(timeStart, timeEnd, slotDuration).length : 0),
    [timesValid, timeStart, timeEnd, slotDuration]
  );

  const handleSave = async () => {
    if (!canSave) return;
    const created = await createPoll({
      title: title.trim(),
      description: description.trim() || null,
      slot_duration_minutes: slotDuration,
      time_start: timeStart,
      time_end: timeEnd,
      dates,
    });
    if (created) onChange();
  };

  return (
    <div className="form-card max-w-2xl space-y-5">
      <div>
        <h2 className="font-display text-lg font-bold text-text">Nowa ankieta terminu</h2>
        <p className="text-sm text-text-secondary">
          Wybierz dni i godziny, wyślij link uczestnikom, a odpowiedzi zobaczysz na jednej siatce.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label htmlFor="mp-title" className="form-label">Nazwa spotkania:</label>
          <input
            id="mp-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="np. Spotkanie zespołu projektowego"
            className="input-field"
          />
        </div>

        <div>
          <label htmlFor="mp-description" className="form-label">Opis (opcjonalnie):</label>
          <textarea
            id="mp-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-field"
            rows={2}
            placeholder="Kilka słów dla uczestników"
          />
        </div>
      </div>

      <fieldset className="space-y-3 rounded-xl border border-line p-4">
        <legend className="px-1 text-sm font-semibold text-text">Kandydackie dni</legend>

        {dates.length === 0 ? (
          <p className="text-sm text-text-muted">Nie dodano jeszcze żadnego dnia.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {dates.map((d) => {
              const { weekday, day } = formatPollDay(d);
              return (
                <li
                  key={d}
                  className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 py-1 pl-3 pr-1 text-sm font-semibold tabular-nums text-text"
                >
                  {weekday} {day}
                  <button
                    type="button"
                    onClick={() => removeDate(d)}
                    aria-label={`Usuń dzień ${weekday} ${day}`}
                    className="rounded-full p-1 text-text-muted transition-colors hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/40 dark:hover:text-red-300"
                  >
                    <X aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            aria-label="Dzień do dodania"
            min={today}
            value={dateToAdd}
            onChange={(e) => setDateToAdd(e.target.value)}
            className="input-field w-auto min-w-40 flex-1"
          />
          <button
            type="button"
            onClick={addDate}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line-strong bg-card px-3 py-2 text-sm font-semibold text-text transition-colors hover:bg-surface"
          >
            <CalendarPlus aria-hidden="true" className="h-4 w-4" />
            Dodaj dzień
          </button>
          <button
            type="button"
            onClick={addWorkingDays}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            <CalendarRange aria-hidden="true" className="h-4 w-4" />
            Najbliższe {QUICK_WORKING_DAYS} dni robocze
          </button>
        </div>
      </fieldset>

      <fieldset className="space-y-3 rounded-xl border border-line p-4">
        <legend className="px-1 text-sm font-semibold text-text">Godziny i długość slotu</legend>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="mp-time-start" className="form-label">Od godziny:</label>
            <input
              id="mp-time-start"
              type="time"
              value={timeStart}
              onChange={(e) => setTimeStart(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="mp-time-end" className="form-label">Do godziny:</label>
            <input
              id="mp-time-end"
              type="time"
              value={timeEnd}
              onChange={(e) => setTimeEnd(e.target.value)}
              aria-invalid={!timesValid}
              aria-describedby={timesValid ? undefined : "mp-time-error"}
              className="input-field"
            />
          </div>
        </div>
        {!timesValid && (
          <p id="mp-time-error" role="alert" className="text-xs text-red-700 dark:text-red-300">
            Godzina końcowa musi być późniejsza niż początkowa.
          </p>
        )}

        <div>
          <span id="mp-duration-label" className="form-label">Długość pojedynczego slotu:</span>
          <div role="radiogroup" aria-labelledby="mp-duration-label" className="grid grid-cols-3 gap-2">
            {MEETING_POLL_SLOT_DURATIONS.map((d) => (
              <label
                key={d}
                className="flex min-h-10 cursor-pointer items-center justify-center rounded-lg border border-line-strong bg-card px-2 py-2 text-sm font-semibold text-text transition-colors hover:bg-surface has-checked:border-transparent has-checked:bg-secondary has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary"
              >
                <input
                  type="radio"
                  name="mp-duration"
                  value={d}
                  checked={slotDuration === d}
                  onChange={() => setSlotDuration(d)}
                  className="sr-only"
                />
                {DURATION_LABELS[d]}
              </label>
            ))}
          </div>
        </div>
      </fieldset>

      {canSave && (
        <p className="rounded-lg bg-surface px-3 py-2 text-sm text-text-secondary" role="status">
          Uczestnicy zobaczą {dates.length} {pluralPl(dates.length, "dzień", "dni", "dni")} × {slotsPerDay}{" "}
          {pluralPl(slotsPerDay, "slot", "sloty", "slotów")} dziennie.
        </p>
      )}

      <FormButtons onClickSave={handleSave} onClickClose={onCancel} loading={loading} disabled={!canSave} />
    </div>
  );
}
