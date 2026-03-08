import { useState, useRef, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import { Calendar, Check, Clock, MapPin, User, X, Download } from "lucide-react";
import { Task, Event } from "../../types";
import WaterTracker from "../tasks/WaterTracker";
import DailySpendingForm from "../bills/DailySpendingForm";
import TaskIcons from "../tasks/TaskIcons";
import { useSettings } from "../../hooks/useSettings";
import ICAL from "ical.js";
import { formatTime, localDateTimeToISO, parseEventDate } from "../../lib/dateUtils";
import { EditButton, DeleteButton, SaveButton, CancelButton } from "../CommonButtons";
import { useAuth } from "../../providers/AuthProvider";

interface Props {
  selectedDate: string;
  tasks: Task[];
  events?: Event[];
  onEventsChange: () => void;
  onBack: () => void;
  onEditEvent: (event: Event) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
}

function escapeICalText(s?: string) {
  if (!s) return "";
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n/g, "\\n")
    .replace(/\n/g, "\\n");
}

const eventSpansDate = (event: Event, selectedDateStr: string): boolean => {
  const eventStart = event.start_time.split("T")[0];
  const eventEnd = event.end_time.split("T")[0];

  if (selectedDateStr === eventStart && selectedDateStr === eventEnd) {
    return true;
  }

  if (selectedDateStr < eventStart || selectedDateStr > eventEnd) {
    return false;
  }
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedEvent, setEditedEvent] = useState<Event | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const userOptions = settings?.users ?? [];

  const eventsForDay = events.filter(event => eventSpansDate(event, selectedDate));

  useEffect(() => {
    if (editingId && titleRef.current) {
      titleRef.current.focus();
    }
  }, [editingId]);

  const handleEdit = (event: Event) => {
    setEditingId(event.id);
    setEditedEvent({ ...event });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditedEvent(null);
  };

  const handleSaveEdit = async () => {
    if (editedEvent) {
      await onEditEvent(editedEvent);
      setEditingId(null);
      setEditedEvent(null);
      onEventsChange();
    }
  };

  const handleDelete = async (event: Event) => {
    const confirmed = confirm("Czy na pewno chcesz usunąć to wydarzenie?");
    if (!confirmed) return;
    await onDeleteEvent(event.id);
    onEventsChange();
  };

  const generateSingleEventICS = (ev: Event) => {
    try {
      const vcalendar = new ICAL.Component(["vcalendar", [], []]);
      vcalendar.updatePropertyWithValue("prodid", "-//Dzisiajv3//PL");
      vcalendar.updatePropertyWithValue("version", "2.0");
      vcalendar.updatePropertyWithValue("calscale", "GREGORIAN");
      vcalendar.updatePropertyWithValue("method", "PUBLISH");

      const vevent = new ICAL.Component("vevent");
      const uid = ev.id ? ev.id.replace(/\s+/g, "_") : `evt-${Date.now()}`;

      const dtStart = parseEventDate(ev.start_time);
      const dtEnd = parseEventDate(ev.end_time);

      const icalStart = ICAL.Time.fromJSDate(dtStart, false);
      const icalEnd = ICAL.Time.fromJSDate(dtEnd, false);
      const icalStamp = ICAL.Time.fromJSDate(new Date(), false);

      vevent.addPropertyWithValue("uid", uid);
      vevent.addPropertyWithValue("dtstamp", icalStamp);
      vevent.addPropertyWithValue("dtstart", icalStart);
      vevent.addPropertyWithValue("dtend", icalEnd);

      const propStart = vevent.getFirstProperty("dtstart");
      const propEnd = vevent.getFirstProperty("dtend");
      if (propStart) propStart.setParameter("VALUE", "DATE-TIME");
      if (propEnd) propEnd.setParameter("VALUE", "DATE-TIME");

      if (ev.title)
        vevent.addPropertyWithValue("summary", escapeICalText(ev.title));
      if (ev.description)
        vevent.addPropertyWithValue(
          "description",
          escapeICalText(ev.description)
        );
      if (ev.place)
        vevent.addPropertyWithValue("location", escapeICalText(ev.place));
      if (ev.user_id)
        vevent.addPropertyWithValue("organizer", `MAILTO:${ev.user_id}`);

      vcalendar.addSubcomponent(vevent);

      const icsString = vcalendar.toString();
      const blob = new Blob([icsString], {
        type: "text/calendar;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const startDate = parseEventDate(ev.start_time);
      const datePart = format(startDate, "yyyy-MM-dd");
      a.download = `${datePart}_${uid}.ics`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("generateSingleEventICS error:", err);
      alert("Nie udało się wygenerować pliku .ics dla tego wydarzenia.");
    }
  };

  return (
    <div className="py-4 mb-5 space-y-6">
      {/* Pasek Nagłówkowy */}
      <div className="bg-card border border-gray-200 dark:border-gray-800 p-4 shadow-sm rounded-2xl flex items-center relative">
        <button
          onClick={onBack}
          className="w-10 h-10 bg-surface hover:bg-surfaceHover border border-gray-200 dark:border-gray-700 flex items-center justify-center text-textSecondary hover:text-text rounded-xl transition-colors absolute left-4"
          title="Powrót do kalendarza"
        >
          <Calendar className="w-5 h-5" />
        </button>

        <h3 className="font-bold text-xl text-text mx-auto text-center capitalize tracking-wide">
          {format(parseISO(selectedDate), "d MMMM yyyy", { locale: pl })}
        </h3>
      </div>

      <div className="flex flex-auto flex-wrap flex-col justify-center space-y-4">
        <TaskIcons date={selectedDate} />
        <WaterTracker date={selectedDate} />
        <DailySpendingForm date={selectedDate} />
      </div>

      {eventsForDay.length > 0 && (
        <section className="flex flex-wrap gap-4 justify-center">
          {eventsForDay.map((event) => {
            const isEditing = editingId === event.id;

            if (isEditing && editedEvent) {
              const currentShareEmail = editedEvent.shared_with_email !== undefined 
                ? editedEvent.shared_with_email 
                : (editedEvent.display_share_info ? editedEvent.display_share_info.split(": ")[1] : "");

              return (
                <div
                  key={event.id}
                  className="p-5 w-full max-w-md bg-card border border-primary dark:border-primary-dark rounded-2xl shadow-lg space-y-4"
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

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="form-label">Rozpoczęcie:</label>
                      <input
                        type="datetime-local"
                        value={editedEvent.start_time.slice(0, 16)}
                        onChange={(e) => setEditedEvent({ ...editedEvent, start_time: localDateTimeToISO(e.target.value) })}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="form-label">Zakończenie:</label>
                      <input
                        type="datetime-local"
                        value={editedEvent.end_time.slice(0, 16)}
                        onChange={(e) => setEditedEvent({ ...editedEvent, end_time: localDateTimeToISO(e.target.value) })}
                        className="input-field"
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
                    <div>
                      <label className="form-label">Udostępnij dla:</label>
                      <select
                        value={currentShareEmail}
                        onChange={(e) => setEditedEvent({ ...editedEvent, shared_with_email: e.target.value })}
                        className="input-field py-1.5"
                      >
                        <option value="">Tylko dla mnie</option>
                        {userOptions.map((email) => (
                          <option key={email} value={email}>{email}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Powtarzaj:</label>
                      <select
                        value={editedEvent.repeat || "none"}
                        onChange={(e) => setEditedEvent({ ...editedEvent, repeat: e.target.value as Event["repeat"] })}
                        className="input-field py-1.5"
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
                className="p-5 w-full max-w-md bg-card border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm hover:shadow-md hover:border-primary/50 transition-all flex flex-col"
              >
                <div className="flex justify-between items-start mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
                  <h3 className="font-bold text-lg text-text leading-tight">{event.title}</h3>
                </div>

                <div className="space-y-2.5 mb-4">
                  <div className="flex items-center text-sm font-medium text-textSecondary">
                    <Clock className="w-4 h-4 mr-2 text-primary" />
                    {formatTime(event.start_time) === formatTime(event.end_time) ? (
                      <>{formatTime(event.start_time)}</>
                      ) : (
                        (event.start_time.slice(0, 10) === event.end_time.slice(0, 10)) ? (
                          <>{formatTime(event.start_time)} – {formatTime(event.end_time)}</>
                        ) : (
                          <>{formatTime(event.start_time, true)} – {formatTime(event.end_time, true)}</>
                        ))}
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
                    className="flex-1 flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg bg-surface hover:bg-primary/10 text-textMuted hover:text-primary transition-colors"
                    title="Pobierz zdarzenie do kalendarza Google/Apple"
                  >
                    <Download className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />
                    <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wide">Pobierz .ICS</span>
                  </button>
                  <EditButton onClick={() => handleEdit(event)} />
                  <DeleteButton onClick={() => handleDelete(event)} />
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section className="bg-card border border-gray-200 dark:border-gray-800 p-5 shadow-sm rounded-2xl">
        <h4 className="font-bold text-lg text-text mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">Zadania na ten dzień</h4>
        {tasks.length ? (
          <ul className="space-y-3">
            {tasks.map((t) => (
              <li key={t.id} className="flex flex-col">
                <div className="flex flex-nowrap gap-3 items-center p-2 rounded-lg hover:bg-surface transition-colors group">
                  <span
                    className="w-7 h-7 text-xs font-bold rounded-lg flex items-center justify-center shadow-sm flex-shrink-0"
                    style={{
                      backgroundColor: t.priority === 1 ? "#fca5a5" : t.priority === 2 ? "#fdba74" : t.priority === 3 ? "#fde68a" : t.priority === 4 ? "#a7f3d0" : "#bbf7d0",
                      color: t.priority === 3 ? "#A16207" : t.priority >= 3 ? "#15803D" : "#B91C1C",
                    }}
                  >
                    {t.priority}
                  </span>

                  <h3 className={`text-base font-semibold break-words flex-1 leading-tight ${t.status === "done" ? "line-through text-textMuted" : "text-text"}`}>
                    {t.title}
                  </h3>
                  
                  {t.status === "done" ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <X className="w-5 h-5 text-textMuted group-hover:text-red-500 transition-colors" />
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-textMuted text-sm font-medium py-4 text-center">Brak zaplanowanych zadań.</p>
        )}
      </section>
    </div>
  );
}