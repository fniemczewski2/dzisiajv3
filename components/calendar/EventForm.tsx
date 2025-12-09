"use client";

import React, { useState, FormEvent } from "react";
import { PlusCircleIcon, Upload } from "lucide-react";
import { Event } from "../../types";
import { useSettings } from "../../hooks/useSettings";
import { useEvents } from "../../hooks/useEvents";
import { useSession } from "@supabase/auth-helpers-react";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import ICAL from "ical.js";
import LoadingState from "../LoadingState";
import { getAppDateTime } from "../../lib/dateUtils";

interface EventsFormProps {
  onEventsChange: () => void;
  onCancel?: () => void;
  currentDate: Date | null;
}

export default function EventForm({
  onEventsChange,
  onCancel,
  currentDate = getAppDateTime(),
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
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [place, setPlace] = useState("");
  const [share, setShare] = useState("null");
  const [repeat, setRepeat] = useState<Event["repeat"]>("none");

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
        start_time: new Date(start).toISOString(),
        end_time: new Date(end).toISOString(),
        place: place.trim(),
        share: share === "null" ? "" : share,
        repeat,
        user_name: userEmail,
      } as Event;

      // Actually add the event to the database
      await addEvent(payload);

      // Clear the form fields FIRST
      setTitle("");
      setDescription("");
      setStart("");
      setEnd("");
      setPlace("");
      setShare("null");
      setRepeat("none");

      // Call onEventsChange to refresh the parent
      onEventsChange();
      
      // Close the form if onCancel is provided
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
          start_time: event.startDate.toJSDate().toISOString(),
          end_time: event.endDate.toJSDate().toISOString(),
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

    // Reset the file input
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="start" className="block text-sm font-medium">
            Początek:
          </label>
          <input
            id="start"
            type="datetime-local"
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
            type="datetime-local"
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
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-primary hover:bg-secondary text-white rounded-lg flex flex-nowrap items-center transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <>
              Dodaj&nbsp;&nbsp;
              <PlusCircleIcon className="w-5 h-5" />
            </>
        </button>

          <label className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 cursor-pointer transition disabled:opacity-50">
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
        
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anuluj
          </button>
        )}
        {loading && <LoadingState />}
      </div>
    </form>
  );
}