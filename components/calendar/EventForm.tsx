// components/calendar/EventForm.tsx

import React, { useState, SyntheticEvent, useEffect } from "react";
import { Event } from "@/types/events";
import { useSettings } from "@/hooks/db/useSettings";
import { useAuth } from "@/providers/AuthProvider";
import { format } from "date-fns";
import { getAppDateTime, localDateTimeToISO } from "@/lib/dateUtils";
import { FormButtons } from "../ui/CommonButtons";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/providers/ToastProvider";
import { exportEventToCalendar, calendarTargetLabel, type CalendarTarget } from "@/lib/calendarExport";
import {
  DEFAULT_EVENT_DURATION_MIN,
  LOCAL_DATE_FORMAT,
  QUICK_EVENT_DURATIONS,
  addMinutesToLocal,
  defaultTimedStart,
  durationBetween,
} from "@/lib/eventTimes";


interface EventsFormProps {
  onEventsChange: () => void;
  addEvent: (event: Event & { shared_with_email?: string }) => Promise<Event | undefined>;
  onCancel?: () => void;
  currentDate: Date | null;
  selectedDate: Date | null;
  loading: boolean;
  addMany?: boolean;
  addAnother?: (type: "task" | "event") => void;
}

export default function EventForm({
  onEventsChange,
  addEvent,
  onCancel,
  currentDate = getAppDateTime(),
  selectedDate,
  loading,
  addMany = false,
  addAnother
}: Readonly<EventsFormProps>) {
  const { user } = useAuth();
  const userId = user?.id;
  const { settings } = useSettings();
  const { toast } = useToast();
  
  const userOptions = settings?.users ?? [];
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [allDay, setAllDay] = useState(true);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  // Wybrana szybka długość (30 min / 1 h / 2 h). null = koniec ustawiony ręcznie.
  const [durationMin, setDurationMin] = useState<number | null>(DEFAULT_EVENT_DURATION_MIN);
  const [place, setPlace] = useState("");
  const [share, setShare] = useState("null");
  const [repeat, setRepeat] = useState<Event["repeat"]>("none");

  const [calendars, setCalendars] = useState<CalendarTarget[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState("local");

  useEffect(() => {
    const fetchCalendars = async () => {
      const { data } = await supabase
        .from("connected_calendars")
        .select("id, calendar_name, google_calendar_id, provider")
        .eq("user_id", userId)
        .neq("google_calendar_id", "@account_connection");

      if (data) {
        setCalendars(data);
      }
    };
    void fetchCalendars();
  }, [userId, supabase]);

  // Zależności po znaczniku czasu, a nie po obiekcie Date: domyślna wartość
  // `currentDate = getAppDateTime()` tworzy nowy obiekt przy każdym renderze
  // i kasowałaby wpisane przez użytkownika godziny.
  const refTime = (selectedDate ?? currentDate)?.getTime() ?? null;

  useEffect(() => {
    if (refTime === null) {
      setStart(""); setEnd("");
      return;
    }
    const ref = new Date(refTime);
    if (allDay) {
      const day = format(ref, LOCAL_DATE_FORMAT);
      setStart(day); setEnd(day);
    } else {
      const first = defaultTimedStart(ref);
      setStart(first);
      setEnd(addMinutesToLocal(first, DEFAULT_EVENT_DURATION_MIN));
      setDurationMin(DEFAULT_EVENT_DURATION_MIN);
    }
  }, [refTime, allDay]);

  const handleStartChange = (value: string) => {
    setStart(value);
    if (allDay) {
      // Koniec nie może być przed początkiem.
      if (end && value > end) setEnd(value);
      return;
    }
    // Zmiana początku przesuwa koniec: o wybraną szybką długość, a gdy koniec
    // był ustawiony ręcznie – o domyślną godzinę.
    setEnd(addMinutesToLocal(value, durationMin ?? DEFAULT_EVENT_DURATION_MIN));
    if (durationMin === null) setDurationMin(DEFAULT_EVENT_DURATION_MIN);
  };

  const handleEndChange = (value: string) => {
    setEnd(value);
    if (allDay) return;
    // Ręczna zmiana końca: podświetlamy szybką opcję tylko, gdy długość się zgadza.
    const minutes = durationBetween(start, value);
    setDurationMin(QUICK_EVENT_DURATIONS.some((d) => d.minutes === minutes) ? minutes : null);
  };

  // Cykliczne wydarzenie zostaje w aplikacji: do Google/Outlooka trafiłoby jako
  // pojedyncze, a synchronizacja zdjęłaby potem powtarzanie także w aplikacji.
  const isRecurring = repeat !== "none";
  const handleRepeatChange = (value: Event["repeat"]) => {
    setRepeat(value);
    if (value !== "none") setSelectedCalendar("local");
  };

  const applyDuration = (minutes: number) => {
    setDurationMin(minutes);
    if (start) setEnd(addMinutesToLocal(start, minutes));
  };

  const resetForm = () => {
    setTitle(""); setDescription(""); setStart(""); setEnd(""); setDurationMin(DEFAULT_EVENT_DURATION_MIN);
    setPlace(""); setShare("null"); setRepeat("none"); 
    setSelectedCalendar("local"); 
  };

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    const created = await addEvent({
          id: "",
          title: title.trim(),
          description: description.trim(),
          start_time: allDay ? localDateTimeToISO(start + "T00:00") : localDateTimeToISO(start),
          end_time:   allDay ? localDateTimeToISO(end   + "T23:59") : localDateTimeToISO(end),
          place: place.trim(),
          shared_with_email: share === "null" ? "" : share,
          repeat,
          user_id: userId || "",
        });

    // „Dodaj do”: wydarzenie powstaje w aplikacji, a potem jest wysyłane do
    // wybranego kalendarza Google/Outlook i do niego przypinane.
    const target = calendars.find((c) => c.id === selectedCalendar);
    if (created?.id && target) {
      const { data: { session } } = await supabase.auth.getSession();
      const ok = session ? await exportEventToCalendar(target, created.id, session.access_token) : false;
      if (ok) {
        toast.success(`Dodano też do kalendarza ${calendarTargetLabel(target)}`);
      } else {
        toast.error(`Wydarzenie zapisano w aplikacji, ale nie udało się dodać go do kalendarza ${calendarTargetLabel(target)}.`);
      }
    }

    resetForm();
    onEventsChange();
    onCancel?.();
  };

  return (
    <form onSubmit={handleSubmit} className="form-card">
      <div>
        <label htmlFor="title" className="form-label">Tytuł wydarzenia:</label>
        <input id="title" type="text" value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input-field" required disabled={loading}
          placeholder="Wydarzenie"/>
      </div>

      <div className="flex items-center">
        <input id="allDay" type="checkbox" checked={allDay}
          onChange={(e) => setAllDay(e.target.checked)}
          className="h-4 w-4 text-primary bg-transparent border-gray-300 dark:border-gray-600 rounded focus:ring-primary"
          disabled={loading} />
        <label htmlFor="allDay" className="ml-2 text-sm font-medium text-text">
          Wydarzenie całodniowe
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2 md:gap-4">
        <div>
          <label htmlFor="start" className="form-label">Początek:</label>
          <input id="start" type={allDay ? "date" : "datetime-local"} value={start}
            onChange={(e) => handleStartChange(e.target.value)}
            className="input-field text-xs w-full min-w-0 px-1" required disabled={loading} />
        </div>
        <div>
          <label htmlFor="end" className="form-label">Koniec:</label>
          <input id="end" type={allDay ? "date" : "datetime-local"} value={end}
            onChange={(e) => handleEndChange(e.target.value)}
            min={start || undefined}
            className="input-field text-xs w-full min-w-0 px-1" required disabled={loading} />
        </div>
      </div>

      {!allDay && (
        <fieldset className="flex flex-wrap items-center gap-2" disabled={loading}>
          <legend className="sr-only">Czas trwania</legend>
          <span className="text-xs font-medium text-text-secondary" aria-hidden="true">Czas trwania:</span>
          {QUICK_EVENT_DURATIONS.map(({ minutes, label }) => (
            <button
              key={minutes}
              type="button"
              onClick={() => applyDuration(minutes)}
              aria-pressed={durationMin === minutes}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border border-line bg-surface text-text-secondary hover:bg-surface-hover transition-colors aria-pressed:bg-secondary aria-pressed:text-white aria-pressed:border-transparent disabled:opacity-60"
            >
              {label}
            </button>
          ))}
        </fieldset>
      )}
      
      <div className="grid grid-cols-2 gap-2 md:gap-4">
        <div>
          <label htmlFor="place" className="form-label">Miejsce:</label>
          <input id="place" type="text" value={place}
            onChange={(e) => setPlace(e.target.value)}
            className="input-field" disabled={loading} />
        </div>
        <div>
          <label htmlFor="calendar" className="form-label">Dodaj do:</label>
          <select id="calendar" value={selectedCalendar}
            onChange={(e) => setSelectedCalendar(e.target.value)}
            aria-describedby={isRecurring && calendars.length > 0 ? "calendar-recurring-hint" : undefined}
            className="input-field" disabled={loading}>
            <option value="local">Aplikacja – kalendarz domyślny</option>
            {calendars.map((cal) => (
              <option key={cal.id} value={cal.id} disabled={isRecurring}>
                {calendarTargetLabel(cal)}
              </option>
            ))}
          </select>
          {isRecurring && calendars.length > 0 && (
            <p id="calendar-recurring-hint" className="mt-1 text-xs text-text-muted">
              Wydarzenia cykliczne zapisujemy tylko w kalendarzu aplikacji.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:gap-4">
        <div>
          <label htmlFor="share" className="form-label">Udostępnij:</label>
          <select id="share" value={share}
            onChange={(e) => setShare(e.target.value)}
            className="input-field" disabled={loading}>
            <option value="null">Nie udostępniaj</option>
            {userOptions.map((email) => <option key={email} value={email}>{email}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="repeat" className="form-label">Powtarzaj:</label>
          <select id="repeat" value={repeat}
            onChange={(e) => handleRepeatChange(e.target.value as Event["repeat"])}
            className="input-field" disabled={loading}>
            <option value="none">Nie</option>
            <option value="weekly">Co tydzień</option>
            <option value="monthly">Co miesiąc</option>
            <option value="yearly">Co rok</option>
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="desc" className="form-label">Opis:</label>
        <textarea id="desc" value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input-field" rows={2} disabled={loading} 
          placeholder="Dodatkowe informacje..." />
      </div>
        <FormButtons onClickClose={onCancel} loading={loading} addMany={addMany} onAddAnother={() => addAnother?.('event')} />
    </form>
  );
}
