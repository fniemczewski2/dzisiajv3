// components/meetingPolls/MeetingPollForm.tsx

import React, { useState } from "react";
import { useMeetingPolls } from "@/hooks/db/useMeetingPolls";
import { FormButtons } from "../ui/CommonButtons";
import { X } from "lucide-react";
import { getAppDate } from "@/lib/dateUtils";
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
    if (!dateToAdd) return;
    setDates((prev) => 
      prev.includes(dateToAdd) 
        ? prev 
        : [...prev, dateToAdd].sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
    );
  };

  const removeDate = (date: string) => {
    setDates((prev) => prev.filter((d) => d !== date));
  };

  const handleSave = async () => {
    if (!title.trim() || dates.length === 0 || timeEnd <= timeStart) return;
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

  const canSave = title.trim().length > 0 && dates.length > 0 && timeEnd > timeStart;

  return (
    <div className="form-card space-y-4">
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
        />
      </div>

      <div>
        <span className="form-label">Kandydackie dni:</span>
        <div className="flex flex-wrap gap-2 mb-2">
          {dates.map((d) => (
            <span
              key={d}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-950 text-primary border border-primary text-xs font-semibold"
            >
              {d}
              <button
                type="button"
                onClick={() => removeDate(d)}
                aria-label={`Usuń dzień ${d}`}
                className="hover:text-red-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
          {dates.length === 0 && <p className="text-sm text-textMuted italic">Nie dodano jeszcze żadnego dnia.</p>}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateToAdd}
            onChange={(e) => setDateToAdd(e.target.value)}
            className="input-field flex-1"
          />
          <button
            type="button"
            onClick={addDate}
            className="px-3 py-2 rounded-lg bg-surface hover:bg-blue-50 dark:hover:bg-blue-900/20 text-textSecondary hover:text-blue-600 dark:hover:text-blue-400 text-sm font-semibold transition-colors shrink-0"
          >
            Dodaj dzień
          </button>
        </div>
      </div>

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
            className="input-field"
          />
        </div>
      </div>
      {timeEnd <= timeStart && (
        <p className="text-xs text-red-600 dark:text-red-400">Godzina końcowa musi być późniejsza niż początkowa.</p>
      )}

      <div>
        <label htmlFor="mp-duration" className="form-label">Długość pojedynczego slotu:</label>
        <select
          id="mp-duration"
          value={slotDuration}
          onChange={(e) => setSlotDuration(Number(e.target.value) as MeetingPollSlotDuration)}
          className="input-field"
        >
          {MEETING_POLL_SLOT_DURATIONS.map((d) => (
            <option key={d} value={d}>{DURATION_LABELS[d]}</option>
          ))}
        </select>
      </div>

      <FormButtons onClickSave={handleSave} onClickClose={onCancel} loading={loading} disabled={!canSave} />
    </div>
  );
}
