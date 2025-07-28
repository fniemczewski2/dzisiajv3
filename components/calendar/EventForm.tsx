"use client";

import React, { useRef, useEffect, useState, FormEvent } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { Save, PlusCircleIcon, Loader2 } from "lucide-react";
import { Event } from "../../types";

interface EventFormProps {
  userEmail: string;
  initialEvent?: Event | null;
  onEventsChange: () => void;
  onCancel?: () => void;
}

export default function EventForm({
  userEmail,
  initialEvent = null,
  onEventsChange,
  onCancel,
}: EventFormProps) {
  const supabase = useSupabaseClient();
  const isEdit = !!initialEvent;
  const todayIso = new Date().toISOString().slice(0, 10);

  const titleRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialEvent) {
      titleRef.current!.value = initialEvent.title || "";
      dateRef.current!.value = initialEvent.start_time.slice(0, 10);
      timeRef.current!.value = initialEvent.start_time.slice(11, 16);
      descriptionRef.current!.value = initialEvent.description || "";
    } else {
      titleRef.current!.value = "";
      dateRef.current!.value = todayIso;
      timeRef.current!.value = "12:00";
      descriptionRef.current!.value = "";
    }
  }, [initialEvent, todayIso]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const title = titleRef.current?.value || "";
    const date = dateRef.current?.value || todayIso;
    const time = timeRef.current?.value || "12:00";
    const description = descriptionRef.current?.value || "";

    const datetime = `${date}T${time}`;

    const payload = {
      user_name: userEmail,
      title,
      start_time: datetime,
      description,
    };

    if (isEdit && initialEvent) {
      await supabase.from("events").update(payload).eq("id", initialEvent.id);
    } else {
      await supabase.from("events").insert(payload);
    }

    setLoading(false);
    onEventsChange();
    if (!isEdit) {
      titleRef.current!.value = "";
      dateRef.current!.value = todayIso;
      timeRef.current!.value = "12:00";
      descriptionRef.current!.value = "";
    }
    if (onCancel) onCancel();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 bg-card p-4 rounded-xl shadow max-w-md"
    >
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700">
            Data:
          </label>
          <input
            id="date"
            ref={dateRef}
            type="date"
            className="mt-1 w-full p-2 border rounded"
            required
          />
        </div>
        <div>
          <label htmlFor="time" className="block text-sm font-medium text-gray-700">
            Godzina:
          </label>
          <input
            id="time"
            ref={timeRef}
            type="time"
            className="mt-1 w-full p-2 border rounded"
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Opis:
        </label>
        <textarea
          id="description"
          ref={descriptionRef}
          className="mt-1 w-full p-2 border rounded"
        />
      </div>

      <div className="flex items-center space-x-2">
        <button
          type="submit"
          className="x-3 py-1 bg-primary hover:bg-secondary text-white rounded-lg flex flex-nowrap items-center transition"
        >
          {isEdit ? (
            <>
              Zapisz&nbsp;
              <Save className="w-5 h-5" />
            </>
          ) : (
            <>
              Dodaj&nbsp;
              <PlusCircleIcon className="w-5 h-5" />
            </>
          )}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1 bg-gray-300 rounded-lg hover:bg-gray-400 transition"
          >
            Anuluj
          </button>
        )}

        {loading && <Loader2 className="animate-spin w-6 h-6 text-gray-500" />}
      </div>
    </form>
  );
}
