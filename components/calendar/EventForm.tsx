"use client";

import React, { useState, FormEvent, useEffect } from "react";
import { Upload } from "lucide-react";
import { Event } from "../../types";
import { useSettings } from "../../hooks/useSettings";
import { useEvents } from "../../hooks/useEvents";
import { useSession } from "@supabase/auth-helpers-react";
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
  const session = useSession();
  const userEmail = session?.user?.email || "";
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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title || !start || !end) {
      alert("Tytuł, początek i koniec wydarzenia są wymagane.");
      return;
    }

    try {
      const payload: Event = {
        title: title.trim(),
        description: description.trim(),
        start_time: allDay ? localDateTimeToISO(start + "T00:00") : localDateTimeToISO(start),
        end_time: allDay ? localDateTimeToISO(end + "T23:59") : localDateTimeToISO(end),
        place: place.trim(),
        share: share === "null" ? "" : share,
        repeat,
        user_name: userEmail,
      } as Event;

      await addEvent(payload);
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
          title: event.summary || "Bez tytułu",
          description: event.description || "",
          start_time: localDateTimeToISO(event.startDate.toString()),
          end_time: localDateTimeToISO(event.endDate.toString()),
          place: event.location || "",
          share: "",
          repeat: "none",
          user_name: userEmail,
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
    <form
      onSubmit={handleSubmit}
      className="space-y-4 bg-card p-4 rounded-xl shadow"
    >
      <div>
        <label htmlFor="title" className="block text-sm font-medium">
          Tytuł:
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full p-2 border rounded"
          required
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="desc" className="block text-sm font-medium">
          Opis:
        </label>
        <textarea
          id="desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 w-full p-2 border rounded"
          disabled={loading}
        />
      </div>
      <div className="flex items-center mt-1">
          <label htmlFor="allDay" className="text-sm font-medium">
            Wydarzenie całodniowe:
          </label>
          <input
            id="allDay"
            type="checkbox"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
            className="ml-2 p-2 h-4 w-4 border rounded-lg"
            disabled={loading}
          />
        </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="start" className="block text-sm font-medium">
            Początek:
          </label>
          <input
            id="start"
            type={allDay ? "date" : "datetime-local"}
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="mt-1 w-full p-2 border rounded"
            required
            disabled={loading}
          />
        </div>
        <div>
          <label htmlFor="end" className="block text-sm font-medium">
            Koniec:
          </label>
          <input
            id="end"
            type={allDay ? "date" : "datetime-local"}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="mt-1 w-full p-2 border rounded"
            required
            disabled={loading}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="place" className="block text-sm font-medium">
            Miejsce:
          </label>
          <input
            id="place"
            type="text"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            className="mt-1 w-full p-2 border rounded"
            disabled={loading}
          />
        </div>
        <div>
          <label htmlFor="share" className="block text-sm font-medium">
            Udostępnij (email):
          </label>
          <select
            id="share"
            value={share}
            onChange={(e) => setShare(e.target.value)}
            className="mt-1 w-full p-2 border rounded"
            disabled={loading}
          >
            <option value="null">Nie udostępniaj</option>
            {userOptions.map((email) => (
              <option key={email} value={email}>
                {email}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="repeat" className="block text-sm font-medium">
          Powtarzaj:
        </label>
        <select
          id="repeat"
          value={repeat}
          onChange={(e) => setRepeat(e.target.value as Event["repeat"])}
          className="mt-1 w-full p-2 border rounded"
          disabled={loading}
        >
          <option value="none">Nie</option>
          <option value="weekly">Co tydzień</option>
          <option value="monthly">Co miesiąc</option>
          <option value="yearly">Co rok</option>
        </select>
      </div>

      <div className="flex space-x-2 items-center">
        <AddButton loading={loading} />

        <label className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 cursor-pointer transition disabled:opacity-50">
          .ics
          <Upload className="w-5 h-5" />
          <input
            type="file"
            accept=".ics"
            onChange={handleFileUpload}
            className="hidden"
            disabled={loading}
          />
        </label>
        
        {onCancel && <CancelButton onCancel={onCancel} loading={loading} />}
        {loading && <LoadingState />}
      </div>
    </form>
  );
}