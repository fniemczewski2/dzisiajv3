// components/meetingPolls/MeetingPollResults.tsx

import React, { useEffect, useMemo, useState } from "react";
import { CalendarCheck2, Trash2 } from "lucide-react";
import { useMeetingPolls } from "@/hooks/db/useMeetingPolls";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { IconActionButton, CancelButton, FormButtons, SaveButton } from "../ui/CommonButtons";
import { generateTimeSlots, addMinutesToTime, slotKey } from "@/lib/meetingPollGrid";
import { useDragSelectGrid } from "@/hooks/useDragSelectGrid";
import type { MeetingPollResults as MeetingPollResultsData, FinalizeSlotInput, FinalizeResultSlot } from "@/types/meetingPolls";
import NoResultsState from "../ui/NoResultsState";
import { SkeletonSlotGrid } from "../ui/Skeleton";

interface MeetingPollResultsProps {
  pollId: string;
}

interface Selection {
  date: string;
  startIndex: number;
  endIndex: number;
}

interface ConnectedCalendarOption {
  id: string;
  calendar_name: string | null;
  google_calendar_id: string;
  provider: "google" | "outlook";
}

interface PendingSlot extends FinalizeSlotInput {
  calendarChoice: string; 
}

export default function MeetingPollResults({ pollId }: Readonly<MeetingPollResultsProps>) {
  const { getPollResults, finalizePoll } = useMeetingPolls();
  const { user, supabase } = useAuth();
  const { toast } = useToast();

  const [data, setData] = useState<MeetingPollResultsData | null>(null);
  const [loadingResults, setLoadingResults] = useState(true);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [pendingSlots, setPendingSlots] = useState<PendingSlot[]>([]);
  const [finalizing, setFinalizing] = useState(false);
  const [finalizedResults, setFinalizedResults] = useState<FinalizeResultSlot[] | null>(null);

  const [calendarOptions, setCalendarOptions] = useState<ConnectedCalendarOption[]>([]);

  const [slotTitle, setSlotTitle] = useState("");
  const [slotPlace, setSlotPlace] = useState("");
  const [slotDescription, setSlotDescription] = useState("");
  const [slotCalendar, setSlotCalendar] = useState("local");
  const { cellHandlers, handleTouchMove } = useDragSelectGrid({
    onBegin: (date, cellId) => {
      const index = Number(cellId);
      setSelection({ date, startIndex: index, endIndex: index });
      setSlotTitle(data?.poll.title ?? "");
      setSlotPlace("");
      setSlotDescription("");
      setSlotCalendar("local");
    },
    onExtend: (date, cellId) => {
      const index = Number(cellId);
      setSelection((prev) => {
        if (prev?.date !== date) return prev;
        return { date, startIndex: Math.min(prev.startIndex, index), endIndex: Math.max(prev.endIndex, index) };
      });
    },
  });

  useEffect(() => {
    let cancelled = false;
    setLoadingResults(true);
    void getPollResults(pollId).then((res) => {
      if (!cancelled) {
        setData(res);
        setLoadingResults(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [pollId, getPollResults]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    void supabase
      .from("connected_calendars")
      .select("id, calendar_name, google_calendar_id, provider")
      .eq("user_id", user.id)
      .neq("google_calendar_id", "@account_connection")
      .then(({ data: rows }) => {
        if (!cancelled && rows) setCalendarOptions(rows as ConnectedCalendarOption[]);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, supabase]);

  const times = useMemo(
    () => (data ? generateTimeSlots(data.poll.time_start, data.poll.time_end, data.poll.slot_duration_minutes) : []),
    [data]
  );

  const countsByKey = useMemo(() => {
    const map: Record<string, number> = {};
    if (!data) return map;
    for (const a of data.availabilities) {
      const key = slotKey(a.date, a.start_time);
      map[key] = (map[key] ?? 0) + 1;
    }
    return map;
  }, [data]);

  const respondentsByKey = useMemo(() => {
    const map: Record<string, string[]> = {};
    if (!data) return map;
    const nameByResponseId = new Map(data.responses.map((r) => [r.id, r.respondent_name]));
    for (const a of data.availabilities) {
      const key = slotKey(a.date, a.start_time);
      const name = nameByResponseId.get(a.response_id);
      if (!name) continue;
      (map[key] ??= []).push(name);
    }
    return map;
  }, [data]);

  const totalResponses = data?.responses.length ?? 0;

  const cellClass = (count: number): string => {
    if (totalResponses === 0 || count === 0) return "bg-surface";
    const ratio = count / totalResponses;
    if (ratio >= 0.99) return "bg-primary text-white";
    if (ratio >= 0.66) return "bg-blue-300 dark:bg-blue-800";
    if (ratio >= 0.33) return "bg-blue-200 dark:bg-blue-900";
    return "bg-blue-100 dark:bg-blue-950";
  };

  const availabilitySet = useMemo(() => {
    const set = new Set<string>();
    if (!data) return set;
    for (const a of data.availabilities) {
      set.add(`${a.response_id}|${slotKey(a.date, a.start_time)}`);
    }
    return set;
  }, [data]);

  const selectionAvailableCount = useMemo(() => {
    if (!selection || !data) return 0;
    const requiredKeys = times.slice(selection.startIndex, selection.endIndex + 1).map((t) => slotKey(selection.date, t));
    return data.responses.filter((r) => requiredKeys.every((k) => availabilitySet.has(`${r.id}|${k}`))).length;
  }, [selection, data, times, availabilitySet]);

  const addSelectionToPending = () => {
    if (!selection || !data || !slotTitle.trim()) return;
    const startTime = times[selection.startIndex];
    const endTime = addMinutesToTime(times[selection.endIndex], data.poll.slot_duration_minutes);
    setPendingSlots((prev) => [
      ...prev,
      {
        date: selection.date,
        start_time: startTime,
        end_time: endTime,
        title: slotTitle.trim(),
        place: slotPlace.trim() || undefined,
        calendarChoice: slotCalendar,
      },
    ]);
    setSelection(null);
  };

  const removePending = (index: number) => {
    setPendingSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const calendarLabel = (choice: string): string => {
    if (choice === "local") return "kalendarz aplikacji";
    const option = calendarOptions.find((c) => c.id === choice);
    if (!option) return "kalendarz aplikacji";
    return `${option.provider === "google" ? "Google: " : "Outlook: "}${option.calendar_name || option.google_calendar_id}`;
  };

  const handleFinalize = async () => {
    if (pendingSlots.length === 0) return;
    setFinalizing(true);
    try {
      const results = await finalizePoll(pollId, pendingSlots);
      if (!results) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        for (let i = 0; i < pendingSlots.length; i++) {
          const slot = pendingSlots[i];
          const result = results[i];
          if (!result || slot.calendarChoice === "local") continue;

          const option = calendarOptions.find((c) => c.id === slot.calendarChoice);
          if (!option) continue;

          const endpoint = option.provider === "google" ? "/api/google-calendar" : "/api/outlook-calendar";
          try {
            await fetch(`${endpoint}?action=export`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
              body: JSON.stringify({ calendarId: option.google_calendar_id, eventIds: [result.organizerEventId] }),
            });
          } catch {
            toast.error(`Nie udało się dodać terminu ${slot.date} do kalendarza ${calendarLabel(slot.calendarChoice)}.`);
          }
        }
      }

      setFinalizedResults(results);
      setPendingSlots([]);
    } finally {
      setFinalizing(false);
    }
  };

  if (loadingResults) {
    return <SkeletonSlotGrid />;
  }
  if (!data) {
    return <p className="text-sm text-red-600 dark:text-red-400">Nie udało się wczytać wyników ankiety.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-text">{data.poll.title}</h3>
        <p className="text-sm text-textSecondary mt-1">
          {totalResponses} {totalResponses === 1 ? "odpowiedź" : "odpowiedzi"}. Kliknij albo przeciągnij po polach w
          jednej kolumnie, żeby wybrać termin.
        </p>
      </div>

      {totalResponses === 0 ? (
        <NoResultsState text="odpowiedzi"/>
      ) : (
        <div className="card rounded-2xl shadow-sm p-4 overflow-x-auto">
          <table className="border-collapse select-none" onDragStart={(e) => e.preventDefault()} onTouchMove={handleTouchMove}>
            <thead>
              <tr>
                <th className="sticky left-0 bg-card text-xs text-textMuted font-normal p-1 text-left"/>
                {data.dates.map((d) => (
                  <th key={d} className="text-xs text-textMuted font-semibold p-1 min-w-[4.5rem]">
                    {d.split('-')[2] + "." + d.split('-')[1]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {times.map((time, timeIndex) => (
                <tr key={time}>
                  <td className="sticky left-0 bg-card text-xs text-textMuted p-1 pr-2 whitespace-nowrap">{time}</td>
                  {data.dates.map((date) => {
                    const key = slotKey(date, time);
                    const count = countsByKey[key] ?? 0;
                    const names = respondentsByKey[key] ?? [];
                    const isSelected =
                      selection?.date === date && timeIndex >= selection.startIndex && timeIndex <= selection.endIndex;
                    return (
                      <td
                        key={date}
                        {...cellHandlers(date, String(timeIndex))}
                        title={names.length > 0 ? names.join(", ") : "Nikt niedostępny"}
                        className={`w-12 h-8 text-center text-xs font-semibold cursor-pointer border border-white dark:border-neutral-950 transition-colors ${
                          isSelected ? "ring-2 ring-primary ring-inset" : ""
                        } ${cellClass(count)}`}
                      >
                        {count > 0 ? count : ""}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selection && (
        <div className="form-card space-y-3">
          <p className="text-sm text-text">
            <strong>{selection.date}</strong>, {times[selection.startIndex]}-
            {addMinutesToTime(times[selection.endIndex], data.poll.slot_duration_minutes)} - dostępnych:{" "}
            <strong>{selectionAvailableCount}</strong> / {totalResponses}
          </p>

          <div>
            <label htmlFor="slot-title" className="form-label">Tytuł wydarzenia:</label>
            <input
              id="slot-title"
              type="text"
              value={slotTitle}
              onChange={(e) => setSlotTitle(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2 md:gap-4">
            <div>
              <label htmlFor="slot-place" className="form-label">Miejsce:</label>
              <input
                id="slot-place"
                type="text"
                value={slotPlace}
                onChange={(e) => setSlotPlace(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label htmlFor="slot-calendar" className="form-label">Dodaj do:</label>
              <select
                id="slot-calendar"
                value={slotCalendar}
                onChange={(e) => setSlotCalendar(e.target.value)}
                className="input-field"
              >
                <option value="local">Aplikacja - kalendarz domyślny</option>
                {calendarOptions.map((cal) => (
                  <option key={cal.id} value={cal.id}>
                    {cal.provider === "google" ? "Google: " : "Outlook: "}
                    {cal.calendar_name || cal.google_calendar_id}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="slot-description" className="form-label">Opis:</label>
            <textarea
              id="slot-description"
              value={slotDescription}
              onChange={(e) => setSlotDescription(e.target.value)}
              className="input-field"
              rows={2}
              placeholder="Dodatkowe informacje..."
            />
          </div>

          <div className="flex items-center gap-2">
            <SaveButton
              onClick={addSelectionToPending}
              disabled={!slotTitle.trim()}
            />
            <CancelButton onClick={() => setSelection(null)} />
          </div>
        </div>
      )}

      {pendingSlots.length > 0 && (
        <div className="form-card space-y-3">
          <p className="text-sm font-bold text-text">Ustalone terminy:</p>
          <ul className="space-y-1.5">
            {pendingSlots.map((s, i) => (
              <li key={`${s.date}-${s.start_time}`} className="flex items-center justify-between text-sm gap-2">
                <span className="min-w-0">
                  <span className="font-semibold text-text">{s.title}</span> - {s.date}, {s.start_time}-{s.end_time}
                  <span className="text-textMuted"> • {calendarLabel(s.calendarChoice)}</span>
                </span>
                <IconActionButton onClick={() => removePending(i)} Icon={Trash2} title="Usuń z listy" variant="danger" />
              </li>
            ))}
          </ul>
          <FormButtons
            onClickSave={() => void handleFinalize()}
            onClickClose={() => setPendingSlots([])}
            loading={finalizing}
          />
        </div>
      )}

      {finalizedResults && finalizedResults.length > 0 && (
        <div className="form-card space-y-2">
          <p className="text-sm font-bold text-text flex items-center gap-2">
            <CalendarCheck2 className="w-4 h-4 text-primary" /> Zapisano w kalendarzu:
          </p>
          <ul className="text-sm space-y-1">
            {finalizedResults.map((r) => (
              <li key={`${r.date}-${r.start_time}`}>
                {r.date}, {r.start_time}-{r.end_time} - zaproszono {r.invitedParticipants} zalogowanych uczestników.
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
