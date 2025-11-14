"use client";

import React, { useEffect, useState, FormEvent } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { Save, PlusCircleIcon, Loader2, Upload } from "lucide-react";
import { Event } from "../../types";
import { useSettings } from "../../hooks/useSettings";
import ICAL from "ical.js"; // npm install ical
import LoadingState from "../LoadingState";

interface EventsFormProps {
  userEmail: string;
  initialEvent?: Event | null;
  onEventsChange: () => void;
  onCancel?: () => void;
}

export default function EventForm({
  userEmail = "",
  initialEvent = null,
  onEventsChange,
  onCancel,
}: EventsFormProps) {
  const supabase = useSupabaseClient();
  const isEdit = initialEvent !== null;
  const { settings } = useSettings(userEmail);
  const userOptions = settings?.users ?? [];

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [place, setPlace] = useState("");
  const [share, setShare] = useState("null");
  const [repeat, setRepeat] = useState<Event["repeat"]>("none");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialEvent) {
      setTitle(initialEvent.title);
      setDescription(initialEvent.description || "");
      setStart(initialEvent.start_time.slice(0, 16));
      setEnd(initialEvent.end_time.slice(0, 16));
      setPlace(initialEvent.place || "");
      setShare(initialEvent.share || "null");
      setRepeat(initialEvent.repeat || "none");
    } else {
      setTitle("");
      setDescription("");
      setStart("");
      setEnd("");
      setPlace("");
      setShare("null");
      setRepeat("none");
    }
  }, [initialEvent]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title || !start || !end) {
      alert("Tytuł, początek i koniec wydarzenia są wymagane.");
      return;
    }

    setLoading(true);

    const payload: Omit<Event, "id"> = {
      title: title.trim(),
      description: description.trim(),
      start_time: new Date(start).toISOString(),
      end_time: new Date(end).toISOString(),
      place: place.trim(),
      share: share === "null" ? "" : share,
      repeat,
      user_name: userEmail,
    };

    if (isEdit && initialEvent?.id) {
      await supabase.from("events").update(payload).eq("id", initialEvent.id);
    } else {
      await supabase.from("events").insert(payload);
    }

    await onEventsChange();
    setLoading(false);
    if (onCancel) onCancel();

    if (!isEdit) {
      setTitle("");
      setDescription("");
      setStart("");
      setEnd("");
      setPlace("");
      setShare("null");
      setRepeat("none");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const jcalData = ICAL.parse(text);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents("vevent");

    const events = vevents.map((vevent) => {
      const event = new ICAL.Event(vevent);
      return {
        title: event.summary || "Bez tytułu",
        description: event.description || "",
        start_time: event.startDate.toJSDate().toISOString(),
        end_time: event.endDate.toJSDate().toISOString(),
        place: event.location || "",
        share: "",
        repeat: "none",
        user_name: userEmail,
      };
    });

    if (events.length > 0) {
      await supabase.from("events").insert(events);
      await onEventsChange();
      alert(`Zaimportowano ${events.length} wydarzeń z pliku .ics`);
    }
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
          className="px-4 py-2 bg-primary hover:bg-secondary text-white rounded-lg flex flex-nowrap items-center"
        >
          {isEdit ? (
            <>
              Zapisz&nbsp;&nbsp;
              <Save className="w-5 h-5" />
            </>
          ) : (
            <>
              Dodaj&nbsp;&nbsp;
              <PlusCircleIcon className="w-5 h-5" />
            </>
          )}
        </button>

        <label className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 cursor-pointer">
          .ics
          <Upload className="w-5 h-5" />
          <input
            type="file"
            accept=".ics"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg"
          >
            Anuluj
          </button>
        )}
        {loading && <LoadingState />}
      </div>
    </form>
  );
}
