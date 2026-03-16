"use client";

import React, { useState, SyntheticEvent, useEffect } from "react";
import { Upload } from "lucide-react";
import { Event } from "../../types";
import { useSettings } from "../../hooks/useSettings";
import { useEvents } from "../../hooks/useEvents";
import { useToast } from "../../providers/ToastProvider";
import { useAuth } from "../../providers/AuthProvider";
import { withRetry } from "../../lib/withRetry";
import { format, startOfMonth, endOfMonth } from "date-fns";
import ICAL from "ical.js";
import LoadingState from "../LoadingState";
import { getAppDateTime, localDateTimeToISO } from "../../lib/dateUtils";
import { AddButton, CancelButton } from "../CommonButtons";

interface EventsFormProps {
  onEventsChange: () => void;
  onCancel?: () => void;
  currentDate: Date | null;
  selectedDate: Date | null;
}

export default function EventForm({
  onEventsChange,
  onCancel,
  currentDate = getAppDateTime(),
  selectedDate,
}: EventsFormProps) {
  const { user } = useAuth();
  const userId = user?.id;
  const { settings } = useSettings();
  const { toast } = useToast();

  const base = currentDate ?? getAppDateTime();
  const rangeStart = format(startOfMonth(base), "yyyy-MM-dd");
  const rangeEnd   = format(endOfMonth(base),   "yyyy-MM-dd");
  const { addEvent, loading } = useEvents(rangeStart, rangeEnd);

  const userOptions = settings?.users ?? [];

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [allDay, setAllDay] = useState(true);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [place, setPlace] = useState("");
  const [share, setShare] = useState("null");
  const [repeat, setRepeat] = useState<Event["repeat"]>("none");

  useEffect(() => {
    const ref = selectedDate ?? currentDate;
    const fmt = allDay ? "yyyy-MM-dd" : "yyyy-MM-dd'T'HH:mm";
    setStart(ref ? format(ref, fmt) : "");
    setEnd(ref ? format(ref, fmt) : "");
  }, [selectedDate, currentDate, allDay]);

  const resetForm = () => {
    setTitle(""); setDescription(""); setStart(""); setEnd("");
    setPlace(""); setShare("null"); setRepeat("none");
  };

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim() || !start || !end) {
      toast.error("Tytuł, początek i koniec wydarzenia są wymagane.");
      return;
    }

    await withRetry(
      () => addEvent({
        title: title.trim(),
        description: description.trim(),
        start_time: allDay ? localDateTimeToISO(start + "T00:00") : localDateTimeToISO(start),
        end_time:   allDay ? localDateTimeToISO(end   + "T23:59") : localDateTimeToISO(end),
        place: place.trim(),
        shared_with_email: share === "null" ? "" : share,
        repeat,
        user_id: userId,
      } as any),
      toast,
      { context: "EventForm.addEvent", userId }
    );

    // toast.success PRZED onCancel — onCancel zamyka formularz,
    // toast musi być zarejestrowany zanim komponent zniknie z drzewa
    toast.success("Dodano pomyślnie.");
    resetForm();
    onEventsChange();
    onCancel?.();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let count = 0;
    await withRetry(
      async () => {
        const text = await file.text();
        const jcalData = ICAL.parse(text);
        const comp = new ICAL.Component(jcalData);
        const vevents = comp.getAllSubcomponents("vevent");
        for (const vevent of vevents) {
          const ev = new ICAL.Event(vevent);
          await addEvent({
            id: "",
            title: ev.summary || "Bez tytułu",
            description: ev.description || "",
            start_time: localDateTimeToISO(ev.startDate.toString()),
            end_time:   localDateTimeToISO(ev.endDate.toString()),
            place: ev.location || "",
            share: "",
            repeat: "none",
            user_id: userId,
          } as Event);
        }
        count = vevents.length;
      },
      toast,
      { context: "EventForm.importICS", userId }
    );

    toast.success(`Dodano pomyślnie (${count} wydarzeń z pliku .ics).`);
    onEventsChange();
    e.target.value = "";
  };

  return (
    <form onSubmit={handleSubmit} className="form-card max-w-lg">
      <div>
        <label htmlFor="title" className="form-label">Tytuł:</label>
        <input id="title" type="text" value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input-field" required disabled={loading} />
      </div>
      <div>
        <label htmlFor="desc" className="form-label">Opis:</label>
        <textarea id="desc" value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input-field" rows={2} disabled={loading} />
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
      <div className="grid grid-cols-2 gap-4">
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
      <div>
        <label htmlFor="place" className="form-label">Miejsce:</label>
        <input id="place" type="text" value={place}
          onChange={(e) => setPlace(e.target.value)}
          className="input-field" disabled={loading} />
      </div>
      <div className="grid grid-cols-2 gap-4">
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
      <div className="flex space-x-2 items-center pt-2">
        <AddButton loading={loading} />
        <label className="px-3 py-2 bg-surface hover:bg-surfaceHover text-textSecondary rounded-lg flex items-center gap-2 cursor-pointer transition-colors border border-gray-200 dark:border-gray-700 disabled:opacity-50 text-sm font-medium">
          .ics <Upload className="w-4 h-4" />
          <input type="file" accept=".ics" onChange={handleFileUpload} className="hidden" disabled={loading} />
        </label>
        {onCancel && <CancelButton onCancel={onCancel} loading={loading} />}
        {loading && <LoadingState />}
      </div>
    </form>
  );
}