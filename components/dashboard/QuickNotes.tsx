// components/dashboard/QuickNotes.tsx

import { MAX_QUICK_NOTE_LENGTH } from "@/config/limits";
import React, { useId, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Calendar, ListTodo, NotebookPen, X } from "lucide-react";
import { useQuickNotes } from "@/hooks/db/useQuickNotes";
import { useToast } from "@/providers/ToastProvider";
import { useAuth } from "@/providers/AuthProvider";
import { useTaskCategories } from "@/hooks/useTaskCategories";
import { defaultTaskCategory } from "@/lib/taskCategories";
import { QuickNote } from "@/lib/quickNotes";
import type { Task } from "@/types/tasks";
import type { Event } from "@/types/events";
import { SaveButton } from "../ui/CommonButtons";

const EventForm = dynamic(() => import("../calendar/EventForm"), { ssr: false });

interface Props {
  date: Date;
  dateStr: string;
  addTask: (task: Partial<Task> & { shared_with_email?: string }) => Promise<Task | undefined>;
  addEvent: (event: Event & { shared_with_email?: string }) => Promise<Event | undefined>;
  onTaskCreated: () => void;
  onEventCreated: () => void;
  loadingEvents: boolean;
}

export default function QuickNotes({
  date,
  dateStr,
  addTask,
  addEvent,
  onTaskCreated,
  onEventCreated,
  loadingEvents,
}: Readonly<Props>) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { notes, fetching, available, addNotes, removeNote } = useQuickNotes();
  const categories = useTaskCategories();
  const [draft, setDraft] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [eventFor, setEventFor] = useState<QuickNote | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const inputId = useId();
  const hintId = `${inputId}-hint`;

  if (!available) return null;

  const submit = async () => {
    const added = await addNotes(draft);
    if (added > 0) {
      setDraft("");
      setAnnouncement(added === 1 ? "Dodano punkt." : `Dodano punkty: ${added}.`);
      inputRef.current?.focus();
    }
  };

  const toTask = async (note: QuickNote) => {
    if (!user) return;
    setBusyId(note.id);
    try {
      const created = await addTask({
        title: note.content,
        category: defaultTaskCategory(categories),
        priority: 3,
        description: "",
        due_date: dateStr,
        for_user_id: user.id,
        status: "pending",
      });
      if (created) {
        await removeNote(note.id, true);
        onTaskCreated();
        setAnnouncement(`Utworzono zadanie „${note.content}”.`);
      }
    } catch {
      toast.error("Nie udało się utworzyć zadania.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section aria-labelledby={`${inputId}-title`} className="rounded-card border border-line bg-card p-4 sm:p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id={`${inputId}-title`} className="section-title flex items-center gap-2">
          <NotebookPen className="h-5 w-5 text-primary" aria-hidden="true" />
          Szybkie notatki
        </h2>
        {notes.length > 0 && (
          <span className="text-sm text-text-secondary tabular-nums">
            {notes.length} <span className="sr-only">punktów do rozdzielenia</span>
          </span>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="flex flex-col items-start gap-2"
      >
        <label htmlFor={inputId} className="sr-only">
          Nowa szybka notatka
        </label>
        <textarea
          id={inputId}
          ref={inputRef}
          rows={1}
          value={draft}
          maxLength={MAX_QUICK_NOTE_LENGTH * 20}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder="Zapisz myśl, zanim ucieknie"
          aria-describedby={hintId}
          className="input-field field-sizing-content max-h-40 min-h-11 flex-1 resize-none"
        />
        <SaveButton disabled={!draft.trim()} />
      </form>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {!fetching && notes.length > 0 && (
        <ul className="mt-4 list-none divide-y divide-line">
          {notes.map((note) => (
            <li key={note.id} className="py-2">
              <div className="flex items-start gap-3">
                <p className="min-w-0 flex-1 py-1.5 text-base leading-snug wrap-break-word text-text">{note.content}</p>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => void toTask(note)}
                    disabled={busyId === note.id || note.id.startsWith("temp-")}
                    aria-label={`Utwórz zadanie: ${note.content}`}
                    title="Utwórz zadanie"
                    className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-medium text-text-secondary hover:bg-surface hover:text-text disabled:opacity-50"
                  >
                    <ListTodo className="h-5 w-5" aria-hidden="true" />
                    <span className="hidden sm:inline" aria-hidden="true">
                      Zadanie
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEventFor((cur) => (cur?.id === note.id ? null : note))}
                    disabled={note.id.startsWith("temp-")}
                    aria-label={`Utwórz wydarzenie: ${note.content}`}
                    aria-expanded={eventFor?.id === note.id}
                    title="Utwórz wydarzenie"
                    className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-medium text-text-secondary hover:bg-surface hover:text-text disabled:opacity-50 aria-expanded:bg-surface aria-expanded:text-text"
                  >
                    <Calendar className="h-5 w-5" aria-hidden="true" />
                    <span className="hidden sm:inline" aria-hidden="true">
                      Wydarzenie
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeNote(note.id)}
                    disabled={note.id.startsWith("temp-")}
                    aria-label={`Usuń punkt: ${note.content}`}
                    title="Usuń"
                    className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-text-secondary hover:bg-surface hover:text-danger disabled:opacity-50"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {eventFor?.id === note.id && (
                <div className="mt-2 sm:pl-5">
                  <EventForm
                    key={note.id}
                    initialTitle={note.content}
                    currentDate={date}
                    selectedDate={date}
                    addEvent={addEvent}
                    loading={loadingEvents}
                    onCancel={() => setEventFor(null)}
                    onEventsChange={() => {
                      void removeNote(note.id, true);
                      setEventFor(null);
                      onEventCreated();
                      setAnnouncement(`Utworzono wydarzenie „${note.content}”.`);
                    }}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
