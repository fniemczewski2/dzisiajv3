// components/calendar/EventForm.tsx

import React, { useState, SyntheticEvent, useEffect, useMemo, useRef } from "react";
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
import { parseLocalInput, useEventConflicts } from "@/hooks/useEventConflicts";
import ConflictNotice from "./ConflictNotice";
import EventCategorySelect from "./EventCategorySelect";
import RecurrenceEditor from "../ui/RecurrenceEditor";
import { legacyRepeatFor, type RecurrenceRule } from "@/supabase/functions/_shared/recurrence";
import { createTicketReminderTask, isTravelCategory, TICKET_REMINDER_DAYS_BEFORE } from "@/lib/travelTickets";


interface EventsFormProps {
  onEventsChange: () => void;
  addEvent: (event: Event & { shared_with_email?: string }) => Promise<Event | undefined>;
  onCancel?: () => void;
  currentDate: Date | null;
  selectedDate: Date | null;
  loading: boolean;
  addMany?: boolean;
  addAnother?: (type: "task" | "event") => void;
  /** Tytuł wstawiony z góry (np. z szybkiej notatki). */
  initialTitle?: string;
}

export default function EventForm({
  onEventsChange,
  addEvent,
  onCancel,
  currentDate = getAppDateTime(),
  selectedDate,
  loading,
  addMany = false,
  addAnother,
  initialTitle = "",
}: Readonly<EventsFormProps>) {
  const { user } = useAuth();
  const userId = user?.id;
  const { settings } = useSettings();
  const { toast } = useToast();
  
  const userOptions = settings?.users ?? [];
  const supabase = createClient();

  const [title, setTitle] = useState(initialTitle);
  const [category, setCategory] = useState<string | null>(null);
  const [conflictAcknowledged, setConflictAcknowledged] = useState(false);
  const conflictRef = useRef<HTMLDivElement>(null);
  const [description, setDescription] = useState("");
  const [allDay, setAllDay] = useState(true);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [durationMin, setDurationMin] = useState<number | null>(DEFAULT_EVENT_DURATION_MIN);
  const [place, setPlace] = useState("");
  const [share, setShare] = useState("null");
  const [recurrence, setRecurrence] = useState<RecurrenceRule | null>(null);
  const [ticketReminder, setTicketReminder] = useState(true);

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

  const startDate = useMemo(() => parseLocalInput(start), [start]);
  const endDate = useMemo(() => parseLocalInput(end, allDay), [end, allDay]);
  const { report: conflicts, hasOverlaps } = useEventConflicts(startDate, endDate, { allDay });

  // Nowy termin = nowa decyzja: potwierdzenie „zapisz mimo to” przestaje obowiązywać.
  useEffect(() => {
    setConflictAcknowledged(false);
  }, [start, end, allDay]);

  const handleStartChange = (value: string) => {
    setStart(value);
    if (allDay) {
      if (end && value > end) setEnd(value);
      return;
    }

    setEnd(addMinutesToLocal(value, durationMin ?? DEFAULT_EVENT_DURATION_MIN));
    if (durationMin === null) setDurationMin(DEFAULT_EVENT_DURATION_MIN);
  };

  const handleEndChange = (value: string) => {
    setEnd(value);
    if (allDay) return;
    const minutes = durationBetween(start, value);
    setDurationMin(QUICK_EVENT_DURATIONS.some((d) => d.minutes === minutes) ? minutes : null);
  };
  const isRecurring = recurrence !== null;
  const showTicketOption = isTravelCategory(category) && !isRecurring;
  const handleRecurrenceChange = (value: RecurrenceRule | null) => {
    setRecurrence(value);
    if (value) setSelectedCalendar("local");
  };

  const applyDuration = (minutes: number) => {
    setDurationMin(minutes);
    if (start) setEnd(addMinutesToLocal(start, minutes));
  };

  const resetForm = () => {
    setTitle(""); setDescription(""); setStart(""); setEnd(""); setDurationMin(DEFAULT_EVENT_DURATION_MIN);
    setPlace(""); setShare("null"); setRecurrence(null); setTicketReminder(true); 
    setSelectedCalendar("local"); setCategory(null); setConflictAcknowledged(false);
  };

  /** Pierwsze „Zapisz” przy kolizji tylko pokazuje ostrzeżenie; drugie zapisuje. */
  const stopForConflict = (): boolean => {
    if (!hasOverlaps || conflictAcknowledged) return false;
    setConflictAcknowledged(true);
    conflictRef.current?.focus();
    conflictRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    return true;
  };

  const buildEvent = (): Event & { shared_with_email?: string } => ({
    id: "",
    title: title.trim(),
    description: description.trim(),
    start_time: localDateTimeToISO(allDay ? `${start}T00:00` : start),
    end_time: localDateTimeToISO(allDay ? `${end}T23:59` : end),
    place: place.trim(),
    shared_with_email: share === "null" ? "" : share,
    repeat: legacyRepeatFor(recurrence),
    // Klucze tylko, gdy ustawione – zapis zwykłych wydarzeń działa też przed migracją bazy.
    ...(recurrence ? { recurrence } : {}),
    ...(category ? { category } : {}),
    user_id: userId || "",
  });

  const exportToExternalCalendar = async (eventId: string) => {
    const target = calendars.find((c) => c.id === selectedCalendar);
    if (!target) return;
    const { data: { session } } = await supabase.auth.getSession();
    const ok = session ? await exportEventToCalendar(target, eventId, session.access_token) : false;
    if (ok) {
      toast.success(`Dodano też do kalendarza ${calendarTargetLabel(target)}`);
    } else {
      toast.error(`Wydarzenie zapisano w aplikacji, ale nie udało się dodać go do kalendarza ${calendarTargetLabel(target)}.`);
    }
  };

  const addTicketReminder = async () => {
    if (!showTicketOption || !ticketReminder || !userId || !category) return;
    const { error, dueDate } = await createTicketReminderTask(supabase, userId, {
      title: title.trim(),
      startDay: start.slice(0, 10),
      category,
    });
    if (error) toast.error(error);
    else if (dueDate) toast.success(`Dodano zadanie „Kup bilety” na ${dueDate.split("-").reverse().join(".")}`);
  };

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (stopForConflict()) return;

    const created = await addEvent(buildEvent());
    // Zapis się nie udał (komunikat pokazał już hook) – formularz zostaje otwarty z danymi.
    if (!created) return;

    if (created.id) await exportToExternalCalendar(created.id);
    await addTicketReminder();

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
          className="h-5 w-5 shrink-0"
          disabled={loading} />
        <label htmlFor="allDay" className="flex min-h-11 items-center pl-3 text-base font-medium text-text cursor-pointer">
          Wydarzenie całodniowe
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2 md:gap-4">
        <div>
          <label htmlFor="start" className="form-label">Początek:</label>
          <input id="start" type={allDay ? "date" : "datetime-local"} value={start}
            onChange={(e) => handleStartChange(e.target.value)}
            className="input-field w-full min-w-0 px-2" required disabled={loading} />
        </div>
        <div>
          <label htmlFor="end" className="form-label">Koniec:</label>
          <input id="end" type={allDay ? "date" : "datetime-local"} value={end}
            onChange={(e) => handleEndChange(e.target.value)}
            min={start || undefined}
            className="input-field w-full min-w-0 px-2" required disabled={loading} />
        </div>
      </div>

      <ConflictNotice ref={conflictRef} report={conflicts} acknowledged={conflictAcknowledged} />

      {!allDay && (
        <fieldset className="flex flex-wrap items-center gap-2" disabled={loading}>
          <legend className="sr-only">Czas trwania</legend>
          <span className="text-sm font-medium text-text-secondary" aria-hidden="true">Czas trwania:</span>
          {QUICK_EVENT_DURATIONS.map(({ minutes, label }) => (
            <button
              key={minutes}
              type="button"
              onClick={() => applyDuration(minutes)}
              aria-pressed={durationMin === minutes}
              className="min-h-11 px-4 rounded-full text-sm font-semibold border border-line bg-surface text-text-secondary hover:bg-surface-hover transition-colors aria-pressed:bg-secondary aria-pressed:text-white aria-pressed:border-transparent disabled:opacity-60"
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

      <div>
        <label htmlFor="share" className="form-label">Udostępnij:</label>
        <select id="share" value={share}
          onChange={(e) => setShare(e.target.value)}
          className="input-field" disabled={loading}>
          <option value="null">Nie udostępniaj</option>
          {userOptions.map((email) => <option key={email} value={email}>{email}</option>)}
        </select>
      </div>

      <RecurrenceEditor
        idPrefix="event-recurrence"
        value={recurrence}
        onChange={handleRecurrenceChange}
        startDay={start.slice(0, 10)}
        disabled={loading}
      />

      <EventCategorySelect id="event-category" value={category} onChange={setCategory} disabled={loading} />

      {showTicketOption && (
        <div className="flex items-start gap-3 rounded-lg border border-line p-3">
          <input
            id="ticket-reminder"
            type="checkbox"
            checked={ticketReminder}
            onChange={(e) => setTicketReminder(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0"
            aria-describedby="ticket-reminder-hint"
          />
          <div>
            <label htmlFor="ticket-reminder" className="font-medium text-text cursor-pointer">
              Przypomnij o zakupie biletów {TICKET_REMINDER_DAYS_BEFORE} dni wcześniej
            </label>
            <p id="ticket-reminder-hint" className="text-sm text-text-secondary">
              Doda zadanie „Kup bilety” z powiadomieniem o 9:00.
            </p>
          </div>
        </div>
      )}

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
