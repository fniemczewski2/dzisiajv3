// components/calendar/CalendarDayDetails.tsx
import { useState, useRef, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import {
  Calendar,
  Check,
  Clock,
  Edit2,
  MapPin,
  Trash2,
  User,
  X,
  Download,
  Save,
} from "lucide-react";
import { Task, Event } from "../../types";
import WaterTracker from "../tasks/WaterTracker";
import DailySpendingForm from "../bills/DailySpendingForm";
import TaskIcons from "../tasks/TaskIcons";
import { useSettings } from "../../hooks/useSettings";
import ICAL from "ical.js";
import { formatDate, formatTime, localDateTimeToISO, parseEventDate } from "../../lib/dateUtils";

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

// Check if event spans the selected date
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

  // Filter events that span the selected date
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
      if (ev.user_name)
        vevent.addPropertyWithValue("organizer", `MAILTO:${ev.user_name}`);

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
      <span className="bg-card p-4 shadow rounded-xl flex items-center justify-center w-full relative">
        <button
          onClick={onBack}
          className="absolute left-4 w-9 h-9 bg-primary hover:bg-secondary flex items-center justify-center text-white rounded-md transition"
          title="Wróć"
        >
          <Calendar className="w-5 h-5" />
        </button>

        <h3 className="font-semibold mx-auto text-center">
          {format(parseISO(selectedDate), "d MMMM yyyy", { locale: pl })}
        </h3>
      </span>

      <div className="flex flex-auto flex-wrap flex-col justify-center">
        <TaskIcons date={selectedDate} />
        <WaterTracker date={selectedDate} />
        <DailySpendingForm date={selectedDate} />
      </div>

      {eventsForDay.length > 0 && (
        <section className="flex flex-wrap gap-4 justify-center">
          {eventsForDay.map((event) => {
            const isEditing = editingId === event.id;

            if (isEditing && editedEvent) {
              return (
                <div
                  key={event.id}
                  className="p-4 w-full max-w-md bg-gray-50 border-2 border-gray-300 rounded-xl shadow-lg space-y-3"
                >
                  {/* Title */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700">
                      Tytuł:
                    </label>
                    <input
                      ref={titleRef}
                      type="text"
                      value={editedEvent.title}
                      onChange={(e) =>
                        setEditedEvent({ ...editedEvent, title: e.target.value })
                      }
                      className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700">
                      Opis:
                    </label>
                    <textarea
                      value={editedEvent.description || ""}
                      onChange={(e) =>
                        setEditedEvent({
                          ...editedEvent,
                          description: e.target.value,
                        })
                      }
                      className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-primary"
                      rows={3}
                    />
                  </div>

                  {/* Start and End Time */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-semibold text-gray-700">
                        Początek:
                      </label>
                      <input
                        type="datetime-local"
                        value={editedEvent.start_time.slice(0, 16)}
                        onChange={(e) =>
                          setEditedEvent({
                            ...editedEvent,
                            start_time: localDateTimeToISO(e.target.value),
                          })
                        }
                        className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-700">
                        Koniec:
                      </label>
                      <input
                        type="datetime-local"
                        value={editedEvent.end_time.slice(0, 16)}
                        onChange={(e) =>
                          setEditedEvent({
                            ...editedEvent,
                            end_time: localDateTimeToISO(e.target.value),
                          })
                        }
                        className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  {/* Place */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700">
                      Miejsce:
                    </label>
                    <input
                      type="text"
                      value={editedEvent.place || ""}
                      onChange={(e) =>
                        setEditedEvent({ ...editedEvent, place: e.target.value })
                      }
                      className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {/* Share and Repeat */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-semibold text-gray-700">
                        Udostępnij:
                      </label>
                      <select
                        value={editedEvent.share || ""}
                        onChange={(e) =>
                          setEditedEvent({ ...editedEvent, share: e.target.value })
                        }
                        className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Nie udostępniaj</option>
                        {userOptions.map((email) => (
                          <option key={email} value={email}>
                            {email}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-700">
                        Powtarzaj:
                      </label>
                      <select
                        value={editedEvent.repeat || "none"}
                        onChange={(e) =>
                          setEditedEvent({
                            ...editedEvent,
                            repeat: e.target.value as Event["repeat"],
                          })
                        }
                        className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-primary"
                      >
                        <option value="none">Nie</option>
                        <option value="weekly">Co tydzień</option>
                        <option value="monthly">Co miesiąc</option>
                        <option value="yearly">Co rok</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={handleSaveEdit}
                      className="flex items-center gap-1 px-3 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-colors"
                    >
                      <span className="text-sm">Zapisz</span>
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex items-center gap-1 px-3 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                    >
                      <span className="text-sm">Anuluj</span>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={event.id}
                className="p-4 w-full max-w-md bg-card rounded-xl shadow space-y-2 hover:shadow-lg transition"
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-lg flex-1">{event.title}</h3>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center text-sm text-gray-700">
                    <Clock className="w-4 h-4 mr-1" />
                    {formatTime(event.start_time) === formatTime(event.end_time) ? (
                      <>
                        {formatTime(event.start_time)}
                      </>
                      ) : (
                        (event.start_time.slice(0, 10) === event.end_time.slice(0, 10)) ? (
                          <>
                            {formatTime(event.start_time)} –{" "}
                            {formatTime(event.end_time)}
                          </>
                        ) : (
                          <>
                            {formatTime(event.start_time, true)} –{" "}
                            {formatTime(event.end_time, true)}
                          </>
                        ))}
                  </div>

                  {event.place && (
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="w-4 h-4 mr-1" />
                      {event.place}
                    </div>
                  )}
                  {event.share && (
                    <div className="flex items-center text-sm text-gray-600">
                      <User className="w-4 h-4 mr-1" />
                      {event.share}
                    </div>
                  )}
                </div>

                {event.description && (
                  <p className="text-sm text-gray-800 bg-gray-100 rounded p-2">
                    {event.description}
                  </p>
                )}

                <div className="flex justify-end items-end gap-4 pt-2 border-t">
                  <button
                    onClick={() => handleEdit(event)}
                    className="flex flex-col items-center text-primary hover:text-secondary transition-colors"
                    title="Edytuj"
                  >
                    <Edit2 className="w-5 h-5" />
                    <span className="text-xs mt-1">Edytuj</span>
                  </button>

                  <button
                    onClick={() => generateSingleEventICS(event)}
                    className="flex flex-col items-center text-primary hover:text-secondary transition-colors"
                    title="Pobierz .ics"
                  >
                    <Download className="w-5 h-5" />
                    <span className="text-xs mt-1">Pobierz</span>
                  </button>

                  <button
                    onClick={() => handleDelete(event)}
                    className="flex flex-col items-center text-red-500 hover:text-red-600 transition-colors"
                    title="Usuń"
                  >
                    <Trash2 className="w-5 h-5" />
                    <span className="text-xs mt-1">Usuń</span>
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section className="bg-card p-4 shadow rounded-xl space-y-4">
        <h4 className="font-medium mb-1">Zadania</h4>
        {tasks.length ? (
          <ul className="space-y-2">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center">
                <div className="flex flex-nowrap gap-2 items-center mb-1">
                  <span
                    className="w-6 h-6 text-sm font-bold rounded-md flex items-center justify-center shadow-sm transition duration-200"
                    style={{
                      backgroundColor:
                        t.priority === 1
                          ? "#fca5a5"
                          : t.priority === 2
                          ? "#fdba74"
                          : t.priority === 3
                          ? "#fde68a"
                          : t.priority === 4
                          ? "#a7f3d0"
                          : "#bbf7d0",
                      color:
                        t.priority === 3
                          ? "#A16207"
                          : t.priority >= 3
                          ? "#15803D"
                          : "#B91C1C",
                    }}
                    title={`Priorytet ${t.priority}`}
                  >
                    {t.priority}
                  </span>

                  <h3 className="text-lg font-semibold break-words">
                    {t.title}
                  </h3>
                  {t.status === "done" ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <X className="w-5 h-5 text-red-500" />
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-sm">Brak zadań</p>
        )}
      </section>
    </div>
  );
}