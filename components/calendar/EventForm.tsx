// components/calendar/EventForm.tsx
"use client";

import React, { useState, SyntheticEvent, useEffect } from "react";
import { Event } from "@/types/events";
import { useSettings } from "@/hooks/db/useSettings";
import { useAuth } from "@/providers/AuthProvider";
import { format } from "date-fns";
import { getAppDateTime, localDateTimeToISO } from "@/lib/dateUtils";
import { FormButtons } from "../ui/CommonButtons";
import { createClient } from "@/lib/supabase/client";

interface EventsFormProps {
  onEventsChange: () => void;
  addEvent: (event: Event & { shared_with_email?: string }) => Promise<any>;
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
  
  const userOptions = settings?.users ?? [];
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [allDay, setAllDay] = useState(true);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [place, setPlace] = useState("");
  const [share, setShare] = useState("null");
  const [repeat, setRepeat] = useState<Event["repeat"]>("none");

  const [calendars, setCalendars] = useState<any[]>([]);
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
    fetchCalendars();
  }, [userId, supabase]);

  useEffect(() => {
    const ref = selectedDate ?? currentDate;
    const fmt = allDay ? "yyyy-MM-dd" : "yyyy-MM-dd'T'HH:mm";
    setStart(ref ? format(ref, fmt) : "");
    setEnd(ref ? format(ref, fmt) : "");
  }, [selectedDate, currentDate, allDay]);

  const resetForm = () => {
    setTitle(""); setDescription(""); setStart(""); setEnd("");
    setPlace(""); setShare("null"); setRepeat("none"); 
    setSelectedCalendar("local"); // ZMIANA: reset wyboru
  };

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    await addEvent({
          title: title.trim(),
          description: description.trim(),
          start_time: allDay ? localDateTimeToISO(start + "T00:00") : localDateTimeToISO(start),
          end_time:   allDay ? localDateTimeToISO(end   + "T23:59") : localDateTimeToISO(end),
          place: place.trim(),
          shared_with_email: share === "null" ? "" : share,
          repeat,
          user_id: userId,
        } as any);

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
            onChange={(e) => setStart(e.target.value)}
            className="input-field text-xs w-full min-w-0 px-1" required disabled={loading} />
        </div>
        <div>
          <label htmlFor="end" className="form-label">Koniec:</label>
          <input id="end" type={allDay ? "date" : "datetime-local"} value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="input-field text-xs w-full min-w-0 px-1" required disabled={loading} />
        </div>
      </div>
      
      {/* ZMIANA: Miejsce i Dodaj do: w gridzie */}
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
            className="input-field" disabled={loading}>
            <option value="local">Aplikacja - kalendarz domyślny</option>
            {calendars.map((cal) => (
              <option key={cal.id} value={cal.id}>
                {cal.provider === 'google' ? 'Google: ' : ''}{cal.calendar_name || cal.google_calendar_id}
              </option>
            ))}
          </select>
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
            onChange={(e) => setRepeat(e.target.value as Event["repeat"])}
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