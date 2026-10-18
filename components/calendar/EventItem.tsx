// components/calendar/EventItem.tsx

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Clock, MapPin, User, Globe, Repeat } from "lucide-react";
import { Event } from "@/types/events";
import { useAuth } from "@/providers/AuthProvider";
import { formatTime, localDateTimeToISO, parseEventDate } from "@/lib/dateUtils";
import { useEventConflicts } from "@/hooks/useEventConflicts";
import { useCategoryColors } from "@/hooks/useTaskCategories";
import { isAllDayEvent } from "@/lib/eventConflicts";
import ConflictNotice from "./ConflictNotice";
import EventCategorySelect from "./EventCategorySelect";
import RecurrenceEditor from "../ui/RecurrenceEditor";
import { eventRule } from "@/lib/eventUtils";
import { describeRule, legacyRepeatFor } from "@/shared/recurrence";
import { generateSingleEventICS } from "@/lib/icsGenerator";
import { EditButton, DeleteButton, FormButtons, DownloadButton } from "../ui/CommonButtons";

interface EventItemProps {
  event: Event;
  loading: boolean;
  onEditEvent: (event: Event) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
  onEventsChange: () => void;
  userOptions: string[];
}

export default function EventItem({
  event,
  loading,
  onEditEvent,
  onDeleteEvent,
  onEventsChange,
  userOptions,
}: Readonly<EventItemProps>) {
  const { supabase } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedEvent, setEditedEvent] = useState<Event | null>(null);
  const [sharedEmail, setSharedEmail] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const conflictRef = useRef<HTMLDivElement>(null);
  const [conflictAcknowledged, setConflictAcknowledged] = useState(false);
  const categoryColors = useCategoryColors();

  const editStart = useMemo(() => (editedEvent ? parseEventDate(editedEvent.start_time) : null), [editedEvent]);
  const editEnd = useMemo(() => (editedEvent ? parseEventDate(editedEvent.end_time) : null), [editedEvent]);
  const editAllDay = editedEvent ? isAllDayEvent(editedEvent) : false;
  const { report: conflicts, hasOverlaps } = useEventConflicts(editStart, editEnd, {
    ignoreId: event.id,
    allDay: editAllDay,
    enabled: isEditing,
  });

  const startKey = editedEvent?.start_time;
  const endKey = editedEvent?.end_time;
  useEffect(() => {
    setConflictAcknowledged(false);
  }, [startKey, endKey]);

  useEffect(() => {
    if (isEditing && titleRef.current) titleRef.current.focus();
  }, [isEditing]);

  const handleEdit = async () => {
    setIsEditing(true);
    setEditedEvent({ ...event });
    if (event.shared_with_id) {
      const { data, error } = await supabase.rpc("get_email_by_user_id", {
        target_uuid: event.shared_with_id,
      });
      setSharedEmail(!error && data ? data : "");
    } else {
      setSharedEmail("");
    }
  };

  const handleSaveEdit = async () => {
    if (!editedEvent) return;
    if (hasOverlaps && !conflictAcknowledged) {
      setConflictAcknowledged(true);
      conflictRef.current?.focus();
      return;
    }
    await onEditEvent({ ...editedEvent, shared_with_email: event.shared_with_email });
    setIsEditing(false);
    setEditedEvent(null);
    setSharedEmail("");
    onEventsChange();
  };

  const handleDelete = async () => {
    await onDeleteEvent(event.id);
    onEventsChange();
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedEvent(null);
  };

  const isSameDay = event.start_time.slice(0, 10) === event.end_time.slice(0, 10);

  const renderedTime = isSameDay ? (
    <>
      {formatTime(event.start_time)}–{formatTime(event.end_time)}
    </>
  ) : (
    <>
      {formatTime(event.start_time, true)} – {formatTime(event.end_time, true)}
    </>
  );

  const fixedPlace = event?.place?.startsWith("https://") ? (
    <div className="flex items-center truncate text-sm font-medium text-text-secondary underline">
      <Globe className="mr-2 h-4 w-4 text-primary" aria-hidden="true" />
      <a href={event.place} rel="noreferrer" target="_blank">
        Link do spotkania<span className="sr-only"> (otwiera się w nowej karcie)</span>
      </a>
    </div>
  ) : (
    <div className="flex items-center truncate text-sm font-medium text-text-secondary">
      <MapPin className="mr-2 h-4 w-4 text-primary" aria-hidden="true" />
      {event.place}
    </div>
  );

  if (isEditing && editedEvent) {
    const editPrefix = `edit-event-${event.id}`;

    return (
      <div className="w-full max-w-md space-y-4 rounded-card border border-primary bg-card p-4">
        <div>
          <label htmlFor={`${editPrefix}-title`} className="form-label">
            Tytuł wydarzenia:
          </label>
          <input
            id={`${editPrefix}-title`}
            ref={titleRef}
            type="text"
            value={editedEvent.title}
            onChange={(e) => setEditedEvent({ ...editedEvent, title: e.target.value })}
            className="input-field font-medium"
          />
        </div>
        <div>
          <label htmlFor={`${editPrefix}-desc`} className="form-label">
            Opis (opcjonalny):
          </label>
          <textarea
            id={`${editPrefix}-desc`}
            value={editedEvent.description || ""}
            onChange={(e) => setEditedEvent({ ...editedEvent, description: e.target.value })}
            className="input-field"
            rows={3}
          />
        </div>
        <div className="grid grid-cols-2 gap-1 md:gap-3">
          <div className="max-w-full min-w-0">
            <label htmlFor={`${editPrefix}-start`} className="form-label">
              Rozpoczęcie:
            </label>
            <input
              id={`${editPrefix}-start`}
              type="datetime-local"
              value={editedEvent.start_time.slice(0, 16)}
              onChange={(e) => setEditedEvent({ ...editedEvent, start_time: localDateTimeToISO(e.target.value) })}
              className="input-field w-full min-w-0 px-2"
            />
          </div>
          <div className="max-w-full min-w-0">
            <label htmlFor={`${editPrefix}-end`} className="form-label">
              Zakończenie:
            </label>
            <input
              id={`${editPrefix}-end`}
              type="datetime-local"
              value={editedEvent.end_time.slice(0, 16)}
              onChange={(e) => setEditedEvent({ ...editedEvent, end_time: localDateTimeToISO(e.target.value) })}
              className="input-field w-full min-w-0 px-2"
            />
          </div>
        </div>
        <ConflictNotice ref={conflictRef} report={conflicts} acknowledged={conflictAcknowledged} />
        <div>
          <label htmlFor={`${editPrefix}-place`} className="form-label">
            Miejsce:
          </label>
          <input
            id={`${editPrefix}-place`}
            type="text"
            value={editedEvent.place || ""}
            onChange={(e) => setEditedEvent({ ...editedEvent, place: e.target.value })}
            className="input-field"
            placeholder="Gdzie się odbędzie?"
          />
        </div>
        <RecurrenceEditor
          idPrefix={`${editPrefix}-recurrence`}
          value={eventRule(editedEvent)}
          startDay={editedEvent.start_time.slice(0, 10)}
          onChange={(rule) => setEditedEvent({ ...editedEvent, recurrence: rule, repeat: legacyRepeatFor(rule) })}
        />
        <EventCategorySelect
          id={`${editPrefix}-category`}
          value={editedEvent.category}
          onChange={(category) => setEditedEvent({ ...editedEvent, category })}
        />
        <div className="grid grid-cols-2 gap-3">
          {userOptions.length > 0 && (
            <div>
              <label htmlFor={`${editPrefix}-share`} className="form-label">
                Udostępnij dla:
              </label>
              <select
                id={`${editPrefix}-share`}
                value={sharedEmail}
                onChange={(e) => setSharedEmail(e.target.value)}
                className="input-field"
              >
                <option value="">Tylko dla mnie</option>
                {userOptions.map((email) => (
                  <option key={email} value={email}>
                    {email}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <FormButtons onClickClose={handleCancelEdit} onClickSave={handleSaveEdit} loading={loading} />
      </div>
    );
  }

  return (
    <div className="card flex w-full max-w-md flex-col rounded-card p-4 transition-all">
      <div className="mb-4 flex items-start justify-between border-b border-line pb-3">
        <h3 className="text-lg leading-tight font-bold text-text">{event.title}</h3>
        {event.category && (
          <span className="ml-3 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-sm text-text-secondary">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: categoryColors[event.category] ?? "var(--event-default)" }}
            />
            {event.category}
          </span>
        )}
      </div>
      <div className="mb-4 space-y-2.5">
        <div className="flex items-center text-sm font-medium text-text-secondary">
          <Clock className="mr-2 h-4 w-4 text-primary" aria-hidden="true" />
          {renderedTime}
        </div>
        {eventRule(event) && (
          <div className="flex items-center text-sm font-medium text-text-secondary">
            <Repeat className="mr-2 h-4 w-4 text-primary" aria-hidden="true" />
            {describeRule(eventRule(event), event.start_time.slice(0, 10))}
          </div>
        )}
        {event.place && fixedPlace}
        {event.display_share_info && (
          <div className="flex items-center truncate text-sm font-medium text-text-secondary">
            <User className="mr-2 h-4 w-4 text-primary" aria-hidden="true" />
            <span className="truncate">{event.display_share_info}</span>
          </div>
        )}
      </div>
      {event.description && (
        <p className="mb-4 rounded-xl border border-line bg-surface p-3 text-sm leading-relaxed wrap-break-word whitespace-pre-wrap text-text-secondary">
          {event.description}
        </p>
      )}
      <div className="mt-auto flex w-full justify-between gap-1 border-t border-line pt-4 sm:gap-1.5">
        <DownloadButton
          onClick={() => {
            generateSingleEventICS(event);
          }}
          fileFormat=".ics"
        />
        <EditButton onClick={handleEdit} />
        <DeleteButton onClick={handleDelete} />
      </div>
    </div>
  );
}
