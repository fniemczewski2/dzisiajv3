"use client";

import React, { useState, SyntheticEvent, useEffect } from "react";
import { Upload } from "lucide-react";
import { Event } from "../../types";
import { useSettings } from "../../hooks/useSettings";
import { useEvents } from "../../hooks/useEvents";
import { format, startOfMonth, endOfMonth } from "date-fns";
import ICAL from "ical.js";
import LoadingState from "../LoadingState";
import { getAppDateTime, localDateTimeToISO } from "../../lib/dateUtils";
import { AddButton, CancelButton } from "../CommonButtons";
import { useAuth } from "../../providers/AuthProvider";

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
  
  const rangeStart = currentDate ? format(startOfMonth(currentDate), "yyyy-MM-dd") :  format(startOfMonth(getAppDateTime()), "yyyy-MM-dd");
  const rangeEnd = currentDate ? format(endOfMonth(currentDate), "yyyy-MM-dd") : format(endOfMonth(getAppDateTime()), "yyyy-MM-dd");
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
    setStart(selectedDate ? format(selectedDate, allDay ? "yyyy-MM-dd" : "yyyy-MM-dd'T'HH:mm") : currentDate ? format(currentDate, allDay ? "yyyy-MM-dd" : "yyyy-MM-dd'T'HH:mm") : "");
    setEnd(selectedDate ? format(selectedDate, allDay ? "yyyy-MM-dd" : "yyyy-MM-dd'T'HH:mm") : currentDate ? format(currentDate, allDay ? "yyyy-MM-dd" : "yyyy-MM-dd'T'HH:mm") : "");
  }, [selectedDate, currentDate, allDay]);

const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title || !start || !end) {
      alert("Tytuł, początek i koniec wydarzenia są wymagane.");
      return;
    }

    try {
      const payload: any = {
        title: title.trim(),
        description: description.trim(),
        start_time: allDay ? localDateTimeToISO(start + "T00:00") : localDateTimeToISO(start),
        end_time: allDay ? localDateTimeToISO(end + "T23:59") : localDateTimeToISO(end),
        place: place.trim(),
        shared_with_email: share === "null" ? "" : share, 
        repeat,
        user_id: userId,
      };

      await addEvent(payload);
      
      // Resetowanie formularza
      setTitle("");
      setDescription("");
      setStart("");
      setEnd("");
      setPlace("");
      setShare("null");
      setRepeat("none");
      onEventsChange();
      
      if (onCancel) onCancel();
      
    } catch (error) {
      console.error("Error adding event:", error);
      alert("Błąd podczas dodawania wydarzenia");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const jcalData = ICAL.parse(text);
      const comp = new ICAL.Component(jcalData);
      const vevents = comp.getAllSubcomponents("vevent");

      for (const vevent of vevents) {
        const event = new ICAL.Event(vevent);
        const newEvent: Event = {
          id: '',
          title: event.summary || "Bez tytułu",
          description: event.description || "",
          start_time: localDateTimeToISO(event.startDate.toString()),
          end_time: localDateTimeToISO(event.endDate.toString()),
          place: event.location || "",
          share: "",
          repeat: "none",
          user_id: userId,
        } as Event;

        await addEvent(newEvent);
      }

      onEventsChange();
      alert(`Zaimportowano ${vevents.length} wydarzeń z pliku .ics`);
    } catch (error) {
      console.error("Error importing ICS:", error);
      alert("Błąd podczas importowania pliku .ics");
    }

    e.target.value = "";
  };

 return (
    <form onSubmit={handleSubmit} className="form-card max-w-lg">
      <div>
        <label htmlFor="title" className="form-label">Tytuł:</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input-field"
          required
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="desc" className="form-label">Opis:</label>
        <textarea
          id="desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input-field"
          rows={2}
          disabled={loading}
        />
      </div>

      <div className="flex items-center">
        <input
          id="allDay"
          type="checkbox"
          checked={allDay}
          onChange={(e) => setAllDay(e.target.checked)}
          className="h-4 w-4 text-primary bg-transparent border-gray-300 dark:border-gray-600 rounded focus:ring-primary"
          disabled={loading}
        />
        <label htmlFor="allDay" className="ml-2 text-sm font-medium text-text">
          Wydarzenie całodniowe
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="start" className="form-label">Początek:</label>
          <input
            id="start"
            type={allDay ? "date" : "datetime-local"}
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="input-field"
            required
            disabled={loading}
          />
        </div>
        <div>
          <label htmlFor="end" className="form-label">Koniec:</label>
          <input
            id="end"
            type={allDay ? "date" : "datetime-local"}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="input-field"
            required
            disabled={loading}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="place" className="form-label">Miejsce:</label>
          <input
            id="place"
            type="text"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            className="input-field"
            disabled={loading}
          />
        </div>
        <div>
          <label htmlFor="share" className="form-label">Udostępnij:</label>
          <select
            id="share"
            value={share}
            onChange={(e) => setShare(e.target.value)}
            className="input-field"
            disabled={loading}
          >
            <option value="null">Nie udostępniaj</option>
            {userOptions.map((email) => (
              <option key={email} value={email}>{email}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="repeat" className="form-label">Powtarzaj:</label>
        <select
          id="repeat"
          value={repeat}
          onChange={(e) => setRepeat(e.target.value as Event["repeat"])}
          className="input-field"
          disabled={loading}
        >
          <option value="none">Nie</option>
          <option value="weekly">Co tydzień</option>
          <option value="monthly">Co miesiąc</option>
          <option value="yearly">Co rok</option>
        </select>
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