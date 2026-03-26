"use client";

import React, { useState, SyntheticEvent, useEffect } from "react";
import { Upload } from "lucide-react";
import { Event } from "../../types";
import { useSettings } from "../../hooks/useSettings";
import { useToast } from "../../providers/ToastProvider";
import { useAuth } from "../../providers/AuthProvider";
import { withRetry } from "../../lib/withRetry";
import { format } from "date-fns";
import ICAL from "ical.js";
import { getAppDateTime, localDateTimeToISO } from "../../lib/dateUtils";
import {FormButtons } from "../CommonButtons";

interface EventsFormProps {
  onEventsChange: () => void;
  addEvent: (event: Event & { shared_with_email?: string }) => Promise<void>;
  onCancel?: () => void;
  currentDate: Date | null;
  selectedDate: Date | null;
  loading: boolean;
}

export default function EventForm({
  onEventsChange,
  addEvent,
  onCancel,
  currentDate = getAppDateTime(),
  selectedDate,
  loading
}: Readonly<EventsFormProps>) {
  const { user } = useAuth();
  const userId = user?.id;
  const { settings } = useSettings();
  const { toast } = useToast();
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
      <div>
        <label htmlFor="place" className="form-label">Miejsce:</label>
        <input id="place" type="text" value={place}
          onChange={(e) => setPlace(e.target.value)}
          className="input-field" disabled={loading} />
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
        <FormButtons onClickClose={onCancel} loading={loading} />
        <label className="flex items-center justify-center text-sm font-medium text-textMuted hover:underline transition-colors px-2 py-1 disabled:opacity-50">
          .ics <Upload className="w-4 h-4 ml-2" />
          <input type="file" accept=".ics" onChange={handleFileUpload} className="hidden" disabled={loading} />
        </label>
    </form>
  );
}