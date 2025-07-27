"use client";

import React, { useRef, useEffect, useState, FormEvent } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { Loader2, PlusCircleIcon, Save } from "lucide-react";
import { useSettings } from "../../hooks/useSettings";

interface Event {
  id?: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  place?: string;
  share?: string;
  repeat: "none" | "weekly" | "monthly" | "yearly";
  user_name: string;
}

interface EventsFormProps {
  userEmail: string;
  initialEvent?: Event | null;
  onEventsChange: () => void;
  onCancel?: () => void;
}

export default function EventsForm({
  userEmail,
  initialEvent = null,
  onEventsChange,
  onCancel,
}: EventsFormProps) {
  const supabase = useSupabaseClient();
  const isEdit = initialEvent !== null;
  const { settings } = useSettings(userEmail);
  const userOptions = settings?.users ?? [];

  const titleRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const startRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);
  const placeRef = useRef<HTMLInputElement>(null);
  const shareRef = useRef<HTMLSelectElement>(null);
  const repeatRef = useRef<HTMLSelectElement>(null);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialEvent) {
      titleRef.current!.value = initialEvent.title;
      descRef.current!.value = initialEvent.description || "";
      startRef.current!.value = initialEvent.start_time.slice(0, 16);
      endRef.current!.value = initialEvent.end_time.slice(0, 16);
      placeRef.current!.value = initialEvent.place || "";
      shareRef.current!.value = initialEvent.share || "";
      repeatRef.current!.value = initialEvent.repeat;
    }
  }, [initialEvent]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const title = titleRef.current?.value.trim();
    const start_time = startRef.current?.value;
    const end_time = endRef.current?.value;

    if (!title || !start_time || !end_time) {
      alert("Tytuł, początek i koniec wydarzenia są wymagane.");
      return;
    }

    setLoading(true);

    const payload: Omit<Event, "id"> = {
      title,
      description: descRef.current?.value || "",
      start_time: new Date(start_time).toISOString(),
      end_time: new Date(end_time).toISOString(),
      place: placeRef.current?.value || "",
      share: shareRef.current?.value || "",
      repeat: (repeatRef.current?.value || "none") as Event["repeat"],
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

    // reset
    if (!isEdit) {
      titleRef.current!.value = "";
      descRef.current!.value = "";
      startRef.current!.value = "";
      endRef.current!.value = "";
      placeRef.current!.value = "";
      shareRef.current!.value = "";
      repeatRef.current!.value = "none";
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 bg-card p-4 rounded-xl shadow"
    >
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700"
        >
          Tytuł:
        </label>
        <input
          id="title"
          ref={titleRef}
          type="text"
          className="mt-1 w-full p-2 border rounded"
          required
        />
      </div>

      <div>
        <label
          htmlFor="desc"
          className="block text-sm font-medium text-gray-700"
        >
          Opis:
        </label>
        <textarea
          id="desc"
          ref={descRef}
          className="mt-1 w-full p-2 border rounded"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="start"
            className="block text-sm font-medium text-gray-700"
          >
            Początek:
          </label>
          <input
            id="start"
            ref={startRef}
            type="datetime-local"
            className="mt-1 w-full p-2 border rounded"
            required
          />
        </div>
        <div>
          <label
            htmlFor="end"
            className="block text-sm font-medium text-gray-700"
          >
            Koniec:
          </label>
          <input
            id="end"
            ref={endRef}
            type="datetime-local"
            className="mt-1 w-full p-2 border rounded"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="place"
            className="block text-sm font-medium text-gray-700"
          >
            Miejsce:
          </label>
          <input
            id="place"
            ref={placeRef}
            type="text"
            className="mt-1 w-full p-2 border rounded"
          />
        </div>
        <div>
          <label
            htmlFor="share"
            className="block text-sm font-medium text-gray-700"
          >
            Udostępnij (email):
          </label>
          <select
            id="share"
            ref={shareRef}
            defaultValue={"null"}
            className="mt-1 w-full p-2 border rounded"
          >
            <option value={"null"}>Nie udostępniaj</option>
            {userOptions.map((email: string) => (
              <option key={email} value={email}>
                {email}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label
          htmlFor="repeat"
          className="block text-sm font-medium text-gray-700"
        >
          Powtarzaj:
        </label>
        <select
          id="repeat"
          ref={repeatRef}
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
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg"
          >
            Anuluj
          </button>
        )}
        {loading && <Loader2 className="animate-spin w-6 h-6 text-gray-500" />}
      </div>
    </form>
  );
}
