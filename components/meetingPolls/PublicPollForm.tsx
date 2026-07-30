// components/meetingPolls/PublicPollForm.tsx

import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
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

  const { cellHandlers, handleTouchMove } = useDragSelectGrid({
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
    return <p className="text-textMuted text-center py-16">Ta ankieta nie istnieje albo została usunięta.</p>;
  }

  if (poll.status === "closed") {
    return <p className="text-textMuted text-center py-16">Ta ankieta nie przyjmuje już odpowiedzi.</p>;
  }

  if (submitted) {
    return (
      <div className="text-center space-y-3 py-16">
        <CheckCircle2 className="w-10 h-10 text-primary mx-auto" />
        <p className="text-lg font-bold text-text">Dziękujemy!</p>
        <p className="text-sm text-textSecondary">Twoja dostępność została zapisana.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">{poll.title}</h1>
        {poll.description && <p className="text-sm text-textSecondary mt-1">{poll.description}</p>}
        {hasExistingResponse && (
          <p className="text-xs text-primary mt-2">
            Znaleźliśmy Twoją wcześniejszą odpowiedź - możesz ją tu poprawić.
          </p>
        )}
      </div>

      <div className="form-card grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="pp-name" className="form-label">Imię:</label>
          <input
            id="pp-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Twoje imię"
            className="input-field"
          />
        </div>
        <div>
          <label htmlFor="pp-email" className="form-label">E-mail (opcjonalnie):</label>
          <input
            id="pp-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="twoj@email.pl"
            className="input-field"
          />
        </div>
      </div>

      <div>
        <div className="card rounded-2xl shadow-sm p-4 overflow-x-auto">
          <table className="border-collapse select-none" onDragStart={(e) => e.preventDefault()} onTouchMove={handleTouchMove}>
            <thead>
              <tr>
                <th className="sticky left-0 bg-card text-xs text-textMuted font-normal p-1 text-left" />
                {poll.dates.map((d) => (
                  <th key={d} className="text-xs text-textMuted font-semibold p-1 min-w-[4.5rem]">{d.split('-')[2] + "." + d.split('-')[1]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {times.map((time) => (
                <tr key={time}>
                  <td className="sticky left-0 bg-card text-xs text-textMuted p-1 pr-2 whitespace-nowrap">{time}</td>
                  {poll.dates.map((date) => {
                    const isSelected = selected.has(slotKey(date, time));
                    return (
                      <td
                        key={date}
                        {...cellHandlers("grid", slotKey(date, time))}
                        className={`w-12 h-8 text-center cursor-pointer border border-white dark:border-neutral-950 transition-colors ${
                          isSelected ? "bg-primary" : "bg-surface hover:bg-surfaceHover"
                        }`}
                      />
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
