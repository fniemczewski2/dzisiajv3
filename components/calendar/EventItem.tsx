import React, { useState, useRef, useEffect } from "react";
import { Clock, MapPin, User, Download } from "lucide-react";
import { Event } from "../../types";
import { useAuth } from "../../providers/AuthProvider";
import { useToast } from "../../providers/ToastProvider";
import { withRetry } from "../../lib/withRetry";
import { formatTime, localDateTimeToISO } from "../../lib/dateUtils";
import { generateSingleEventICS } from "../../lib/icsGenerator";
import { EditButton, DeleteButton, FormButtons } from "../CommonButtons";

interface EventItemProps {
  event: Event;
  loading: boolean;
  onEditEvent: (event: Event) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
  onEventsChange: () => void;
  userId: string;
  userOptions: string[];
}

export default function EventItem({
  event,
  loading,
  onEditEvent,
  onDeleteEvent,
  onEventsChange,
  userId,
  userOptions
}: EventItemProps) {
  const { supabase } = useAuth();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [editedEvent, setEditedEvent] = useState<Event | null>(null);
  const [sharedEmail, setSharedEmail] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

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
    let targetUserId: string | null = null;

    if (sharedEmail) {
      const { data, error } = await supabase.rpc("get_user_id_by_email", {
        email_address: sharedEmail,
      });
      if (error || !data) {
        toast.error("Nie znaleziono użytkownika o takim adresie e-mail.");
        return;
      }
      targetUserId = data;
    }

    try {
      await withRetry(
        () => onEditEvent({ ...editedEvent, shared_with_id: targetUserId }),
        toast,
        { context: "EventItem.editEvent", userId }
      );
      toast.success("Wydarzenie zapisane pomyślnie.");
      setIsEditing(false);
      setEditedEvent(null);
      setSharedEmail("");
      onEventsChange();
    } catch {
      toast.error("Wystąpił błąd podczas zapisywania wydarzenia.");
    }
  };

  const handleDelete = async () => {
    const ok = await toast.confirm("Czy na pewno chcesz usunąć to wydarzenie?");
    if (!ok) return;
    try {
      await withRetry(
        () => onDeleteEvent(event.id),
        toast,
        { context: "EventItem.deleteEvent", userId }
      );
      toast.success("Wydarzenie usunięte pomyślnie.");
      onEventsChange();
    } catch {
      toast.error("Wystąpił błąd podczas usuwania wydarzenia.");
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedEvent(null);
  };

  if (isEditing && editedEvent) {
    const editPrefix = `edit-event-${event.id}`;
    
    return (
      <div className="p-4 w-full max-w-md bg-card border border-primary dark:border-primary rounded-2xl shadow-lg space-y-4">
        <div>
          <label htmlFor={`${editPrefix}-title`} className="form-label">Tytuł wydarzenia:</label>
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
          <label htmlFor={`${editPrefix}-desc`} className="form-label">Opis (opcjonalny):</label>
          <textarea 
            id={`${editPrefix}-desc`}
            value={editedEvent.description || ""} 
            onChange={(e) => setEditedEvent({ ...editedEvent, description: e.target.value })} 
            className="input-field" 
            rows={3} 
          />
        </div>
        <div className="grid grid-cols-2 gap-1 md:gap-3">
          <div className="min-w-0 max-w-[100%]">
            <label htmlFor={`${editPrefix}-start`} className="form-label">Rozpoczęcie:</label>
            <input 
              id={`${editPrefix}-start`}
              type="datetime-local" 
              value={editedEvent.start_time.slice(0, 16)} 
              onChange={(e) => setEditedEvent({ ...editedEvent, start_time: localDateTimeToISO(e.target.value) })} 
              className="input-field text-xs w-full min-w-0 px-1" 
            />
          </div>
          <div className="min-w-0 max-w-[100%]">
            <label htmlFor={`${editPrefix}-end`} className="form-label">Zakończenie:</label>
            <input 
              id={`${editPrefix}-end`}
              type="datetime-local" 
              value={editedEvent.end_time.slice(0, 16)} 
              onChange={(e) => setEditedEvent({ ...editedEvent, end_time: localDateTimeToISO(e.target.value) })} 
              className="input-field text-xs w-full min-w-0 px-1" 
            />
          </div>
        </div>
        <div>
          <label htmlFor={`${editPrefix}-place`} className="form-label">Miejsce:</label>
          <input 
            id={`${editPrefix}-place`}
            type="text" 
            value={editedEvent.place || ""} 
            onChange={(e) => setEditedEvent({ ...editedEvent, place: e.target.value })} 
            className="input-field" 
            placeholder="Gdzie się odbędzie?" 
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {userOptions.length > 0 && (
            <div>
              <label htmlFor={`${editPrefix}-share`} className="form-label">Udostępnij dla:</label>
              <select 
                id={`${editPrefix}-share`}
                value={sharedEmail} 
                onChange={(e) => setSharedEmail(e.target.value)} 
                className="input-field py-1.5 text-sm"
              >
                <option value="">Tylko dla mnie</option>
                {userOptions.map((email) => (
                  <option key={email} value={email}>{email}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label htmlFor={`${editPrefix}-repeat`} className="form-label">Powtarzaj:</label>
            <select 
              id={`${editPrefix}-repeat`}
              value={editedEvent.repeat || "none"} 
              onChange={(e) => setEditedEvent({ ...editedEvent, repeat: e.target.value as Event["repeat"] })} 
              className="input-field py-1.5 text-sm"
            >
              <option value="none">Brak (jednorazowe)</option>
              <option value="weekly">Co tydzień</option>
              <option value="monthly">Co miesiąc</option>
              <option value="yearly">Co rok</option>
            </select>
          </div>
        </div>
        <FormButtons onClickClose={handleCancelEdit} onClickSave={handleSaveEdit} loading={loading} />
      </div>
    );
  }

  return (
    <div className="p-4 w-full max-w-md card rounded-2xl shadow-sm hover:shadow-md hover:border-primary transition-all flex flex-col">
      <div className="flex justify-between items-start mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
        <h3 className="font-bold text-lg text-text leading-tight">{event.title}</h3>
      </div>
      <div className="space-y-2.5 mb-4">
        <div className="flex items-center text-sm font-medium text-textSecondary">
          <Clock className="w-4 h-4 mr-2 text-primary" />
          {formatTime(event.start_time) === formatTime(event.end_time) ? (
            <>{formatTime(event.start_time)}</>
          ) : event.start_time.slice(0, 10) === event.end_time.slice(0, 10) ? (
            <>{formatTime(event.start_time)} – {formatTime(event.end_time)}</>
          ) : (
            <>{formatTime(event.start_time, true)} – {formatTime(event.end_time, true)}</>
          )}
        </div>
        {event.place && (
          <div className="flex items-center text-sm font-medium text-textSecondary">
            <MapPin className="w-4 h-4 mr-2 text-green-500" />
            {event.place}
          </div>
        )}
        {event.display_share_info && (
          <div className="flex items-center text-sm font-medium text-textSecondary">
            <User className="w-4 h-4 mr-2 text-blue-500" />
            <span className="truncate">{event.display_share_info}</span>
          </div>
        )}
      </div>
      {event.description && (
        <p className="text-sm text-textSecondary bg-surface p-3 rounded-xl border border-gray-100 dark:border-gray-800 leading-relaxed mb-4 whitespace-pre-wrap">
          {event.description}
        </p>
      )}
      <div className="flex justify-between w-full gap-1 sm:gap-1.5 mt-auto pt-4 border-t border-gray-100 dark:border-gray-800">
        <button onClick={() => { generateSingleEventICS(event); toast.success("Plik ICS został pobrany."); }} className="flex-1 flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg bg-surface hover:bg-blue-50 dark:hover:bg-blue-900/20 text-textMuted hover:text-blue-600 dark:hover:text-blue-400 border border-transparent hover:border-blue-600 dark:hover:border-blue-400 transition-colors" title="Pobierz zdarzenie do kalendarza Google/Apple">
          <Download className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />
          <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wide">Pobierz .ICS</span>
        </button>
        <EditButton onClick={handleEdit} />
        <DeleteButton onClick={handleDelete} />
      </div>
    </div>
  );
}