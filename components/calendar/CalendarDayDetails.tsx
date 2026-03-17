// components/calendar/CalendarDayDetails.tsx

import { useMemo, useState, useRef, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import { Calendar, Check, Clock, MapPin, User, X, Download } from "lucide-react";
import { Task, Event } from "../../types";
import WaterTracker from "../widgets/WaterTracker";
import DailySpendingForm from "../widgets/DailySpendingForm";
import TaskIcons from "../widgets/HabbitIcons";
import { useSettings } from "../../hooks/useSettings";
import { useToast } from "../../providers/ToastProvider";
import { useAuth } from "../../providers/AuthProvider";
import { withRetry } from "../../lib/withRetry";
import { formatTime, localDateTimeToISO } from "../../lib/dateUtils";
import {
  EditButton, DeleteButton, SaveButton, CancelButton, AddButton,
} from "../CommonButtons";
import NoResultsState from "../NoResultsState";
import { generateSingleEventICS } from "../../lib/icsGenerator";
import EventForm from "./EventForm";
import MoodWidget from "../widgets/MoodTracker";
import { getPolishHolidays } from "../../lib/holidays";

interface Props {
  selectedDate: string;
  tasks: Task[];
  events?: Event[];
  onEventsChange: () => void;   
  onBack: () => void;
  onEditEvent: (event: Event) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
}

const eventSpansDate = (event: Event, selectedDateStr: string): boolean => {
  const eventStart = event.start_time.split("T")[0];
  const eventEnd   = event.end_time.split("T")[0];
  if (selectedDateStr < eventStart || selectedDateStr > eventEnd) return false;
  return true;
};

export default function CalendarDayDetails({
  selectedDate,
  tasks,
  events = [],
  onEventsChange,
  onBack,
  onEditEvent,
  onDeleteEvent,
}: Props) {
  const { settings } = useSettings();
  const { user, supabase } = useAuth();
  const { toast } = useToast();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedEvent, setEditedEvent] = useState<Event | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [sharedEmail, setSharedEmail] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  const userOptions = settings?.users ?? [];
  const eventsForDay = events.filter((e) => eventSpansDate(e, selectedDate));

  const selectedDateObject = useMemo(
    () => new Date(selectedDate),
    [selectedDate]
  );

  const holiday = useMemo(() => {
    const map = getPolishHolidays(selectedDateObject.getFullYear());
    return map[selectedDate] ?? null;
  }, [selectedDate, selectedDateObject]);

  useEffect(() => {
    if (editingId && titleRef.current) titleRef.current.focus();
  }, [editingId]);

  const handleEdit = async (event: Event) => {
    setEditingId(event.id);
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

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditedEvent(null);
    setSharedEmail("");
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

    await withRetry(
      () => onEditEvent({ ...editedEvent, shared_with_id: targetUserId }),
      toast,
      { context: "CalendarDayDetails.editEvent", userId: user?.id }
    );

    toast.success("Zmieniono pomyślnie.");
    setEditingId(null);
    setEditedEvent(null);
    setSharedEmail("");
    onEventsChange();
  };

  const handleDelete = async (event: Event) => {
    const ok = await toast.confirm("Czy na pewno chcesz usunąć to wydarzenie?");
    if (!ok) return;

    await withRetry(
      () => onDeleteEvent(event.id),
      toast,
      { context: "CalendarDayDetails.deleteEvent", userId: user?.id }
    );

    toast.success("Usunięto pomyślnie.");
    onEventsChange();
  };

  const handleAfterAdd = () => {
    setShowAddForm(false);
    onEventsChange();
  };

  return (
    <div className="mb-5 space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between relative">
          <button
            onClick={onBack}
            className="w-10 h-10 bg-surface hover:bg-surfaceHover border border-gray-200 dark:border-gray-700 flex items-center justify-center text-textSecondary hover:text-text rounded-lg transition-colors shrink-0"
            title="Powrót do kalendarza"
          >
            <Calendar className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center">
            <h3 className="font-bold text-md sm:text-xl text-text text-center capitalize tracking-wide truncate md:px-2 flex items-center justify-center gap-2">
              {format(parseISO(selectedDate), "d.MM.yyyy", { locale: pl })}
            </h3>
            {holiday && (
              <span className="flex items-center gap-1.5 px-3 py-1 text-red-600 dark:text-red-400 text-xs font-medium shadow-sm uppercase tracking-wider">
                {holiday}
              </span>
            )}
          </div>

          {!showAddForm ? (
            <div className="h-10 flex shrink-0 justify-center items-center">
              <AddButton onClick={() => setShowAddForm(true)} type="button" />
            </div>
          ) : (
            <div className="h-10 shrink-0 w-10" />
          )}
        </div>
      </div>

      {/* ── Widgets ─────────────────────────────────────────────────────── */}
      <div className="flex flex-auto flex-wrap flex-col justify-center">
        {settings.show_habits        && <TaskIcons date={selectedDate} />}
        {settings.show_water_tracker && <WaterTracker date={selectedDate} />}
        {settings.show_mood_tracker  && <MoodWidget date={selectedDate} />}
        <DailySpendingForm date={selectedDate} />
      </div>

      {/* ── Add form ─────────────────────────────────────────────────────── */}
      {showAddForm && (
        <div className="mb-6">
          {/*
            EventForm receives onEventsChange (= calendar.tsx's fetchEvents)
            directly.  It does NOT call useEvents internally — it only calls
            addEvent (which it gets from its own useEvents instance scoped to
            the current month) and then fires onEventsChange to let the parent
            refresh its own event list.  This is the only subscription needed.
          */}
          <EventForm
            currentDate={selectedDateObject}
            selectedDate={selectedDateObject}
            onEventsChange={handleAfterAdd}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      {/* ── Events list ──────────────────────────────────────────────────── */}
      {eventsForDay.length > 0 ? (
        <section className="flex flex-wrap gap-4 justify-center">
          {eventsForDay.map((event) => {
            const isEditing = editingId === event.id;

            if (isEditing && editedEvent) {
              return (
                <div
                  key={event.id}
                  className="p-5 w-full max-w-md bg-card border border-primary dark:border-primary rounded-2xl shadow-lg space-y-4"
                >
                  <div>
                    <label className="form-label">Tytuł wydarzenia:</label>
                    <input
                      ref={titleRef}
                      type="text"
                      value={editedEvent.title}
                      onChange={(e) => setEditedEvent({ ...editedEvent, title: e.target.value })}
                      className="input-field font-medium"
                    />
                  </div>
                  <div>
                    <label className="form-label">Opis (opcjonalny):</label>
                    <textarea
                      value={editedEvent.description || ""}
                      onChange={(e) => setEditedEvent({ ...editedEvent, description: e.target.value })}
                      className="input-field"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1 md:gap-3">
                    <div className="min-w-0 max-w-[100%]">
                      <label className="form-label">Rozpoczęcie:</label>
                      <input
                        type="datetime-local"
                        value={editedEvent.start_time.slice(0, 16)}
                        onChange={(e) =>
                          setEditedEvent({
                            ...editedEvent,
                            start_time: localDateTimeToISO(e.target.value),
                          })
                        }
                        className="input-field text-xs w-full min-w-0 px-1"
                      />
                    </div>
                    <div className="min-w-0 max-w-[100%]">
                      <label className="form-label">Zakończenie:</label>
                      <input
                        type="datetime-local"
                        value={editedEvent.end_time.slice(0, 16)}
                        onChange={(e) =>
                          setEditedEvent({
                            ...editedEvent,
                            end_time: localDateTimeToISO(e.target.value),
                          })
                        }
                        className="input-field text-xs w-full min-w-0 px-1"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Miejsce:</label>
                    <input
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
                        <label className="form-label">Udostępnij dla:</label>
                        <select
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
                      <label className="form-label">Powtarzaj:</label>
                      <select
                        value={editedEvent.repeat || "none"}
                        onChange={(e) =>
                          setEditedEvent({
                            ...editedEvent,
                            repeat: e.target.value as Event["repeat"],
                          })
                        }
                        className="input-field py-1.5 text-sm"
                      >
                        <option value="none">Brak (jednorazowe)</option>
                        <option value="weekly">Co tydzień</option>
                        <option value="monthly">Co miesiąc</option>
                        <option value="yearly">Co rok</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <SaveButton onClick={handleSaveEdit} type="button" />
                    <CancelButton onCancel={handleCancelEdit} />
                  </div>
                </div>
              );
            }

            return (
              <div
                key={event.id}
                className="p-5 w-full max-w-md card rounded-2xl shadow-sm hover:shadow-md hover:border-primary/50 transition-all flex flex-col"
              >
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
                  <button
                    onClick={() => generateSingleEventICS(event)}
                    className="flex-1 flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg bg-surface hover:bg-blue-50 dark:hover:bg-blue-900/20 text-textMuted hover:text-blue-600 dark:hover:text-blue-400 border border-transparent hover:border-blue-600 dark:hover:border-blue-400 transition-colors"
                    title="Pobierz zdarzenie do kalendarza Google/Apple"
                  >
                    <Download className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />
                    <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wide">
                      Pobierz .ICS
                    </span>
                  </button>
                  <EditButton onClick={() => handleEdit(event)} />
                  <DeleteButton onClick={() => handleDelete(event)} />
                </div>
              </div>
            );
          })}
        </section>
      ) : (
        <NoResultsState text="wydarzeń" />
      )}

      {/* ── Tasks for the day ────────────────────────────────────────────── */}
      {tasks.length > 0 && (
        <section className="card p-5 shadow-sm rounded-2xl max-w-md mx-auto w-full">
          <h4 className="font-bold text-lg text-text mb-4 pb-2 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
            <Check className="text-primary w-5 h-5" /> Zadania z tego dnia
          </h4>
          <ul className="space-y-3">
            {tasks.map((t) => (
              <li key={t.id} className="flex flex-col">
                <div className="flex flex-nowrap gap-3 items-center p-2 rounded-lg hover:bg-surface transition-colors group border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
                  <span
                    className="w-7 h-7 text-xs font-bold rounded-lg flex items-center justify-center shadow-sm flex-shrink-0"
                    style={{
                      backgroundColor:
                        t.priority === 1 ? "#fca5a5"
                        : t.priority === 2 ? "#fdba74"
                        : t.priority === 3 ? "#fde68a"
                        : t.priority === 4 ? "#a7f3d0"
                        : "#bbf7d0",
                      color:
                        t.priority === 3 ? "#A16207"
                        : t.priority >= 3 ? "#15803D"
                        : "#B91C1C",
                    }}
                  >
                    {t.priority}
                  </span>
                  <h3
                    className={`text-sm sm:text-base font-semibold break-words flex-1 leading-tight ${
                      t.status === "done" ? "line-through text-textMuted" : "text-text"
                    }`}
                  >
                    {t.title}
                  </h3>
                  {t.status === "done" ? (
                    <Check className="w-5 h-5 text-green-500 shrink-0" />
                  ) : (
                    <X className="w-5 h-5 text-textMuted group-hover:text-red-500 transition-colors shrink-0" />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}