// components/calendar/CalendarDayDetails.tsx
import React from "react";
import { endOfMonth, format, parseISO, startOfMonth } from "date-fns";
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
} from "lucide-react";
import { Task } from "../../types";
import { Event } from "../../types";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import WaterTracker from "../tasks/WaterTracker";
import { DailySpendingForm } from "../bills/DailySpendingForm";
import TaskIcons from "../tasks/TaskIcons";
import { useEvents } from "../../hooks/useEvents";
import ICAL from "ical.js";

interface Props {
  selectedDate: string;
  tasks: Task[];
  events?: Event[];
  onBack: () => void;
  onEdit?: (event: Event) => void;
  onEventsChange: () => void;
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

export default function CalendarDayDetails({
  selectedDate,
  tasks,
  events = [],
  onBack,
  onEdit,
  onEventsChange,
}: Props) {
  const supabase = useSupabaseClient();
  const session = useSession();
  const userEmail = session?.user?.email ?? "";
  const rangeStart = format(startOfMonth(parseISO(selectedDate)), "yyyy-MM-dd");
  const rangeEnd = format(endOfMonth(parseISO(selectedDate)), "yyyy-MM-dd");

  const { deleteEvent } = useEvents(userEmail, rangeStart, rangeEnd);

  const handleDelete = async (event: Event) => {
    const confirmed = confirm("Czy na pewno chcesz usunąć to wydarzenie?");
    if (!confirmed) return;
    await deleteEvent(event.id);
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

      const dtStart = new Date(ev.start_time);
      const dtEnd = new Date(ev.end_time);

      const icalStart = ICAL.Time.fromJSDate(dtStart, true);
      const icalEnd = ICAL.Time.fromJSDate(dtEnd, true);
      const icalStamp = ICAL.Time.fromJSDate(new Date(), true);

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

      const datePart = format(parseISO(ev.start_time), "yyyy-MM-dd");
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
          className="absolute left-4 w-9 h-9 bg-primary hover:bg-secondary flex items-center justify-center text-white rounded-md"
          title="Wróć"
        >
          <Calendar className="w-5 h-5" />
        </button>

        <h3 className="font-semibold mx-auto text-center">
          {format(parseISO(selectedDate), "d MMMM yyyy", { locale: pl })}
        </h3>
      </span>

      <div className="flex flex-auto flex-wrap flex-col justify-center">
        {/* All three components now use the same hook internally */}
        <TaskIcons date={selectedDate} />
        <WaterTracker date={selectedDate} />
        <DailySpendingForm userEmail={userEmail} date={selectedDate} />
      </div>

      {events.length > 0 && (
        <section className="flex flex-wrap gap-4">
          {events.map((event) => (
            <div
              key={event.id}
              className="p-4 w-full max-w-md bg-card rounded-xl shadow space-y-2"
            >
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg">{event.title}</h3>
              </div>
              <div className="flex flex-wrap justify-between">
                <div className="space-y-1 w-fit">
                  <div className="flex items-center text-sm text-gray-700">
                    <Clock className="w-4 h-4 mr-1" />
                    {format(parseISO(event.start_time), "yyyy-MM-dd") ===
                    format(parseISO(event.end_time), "yyyy-MM-dd") ? (
                      <>
                        {format(parseISO(event.start_time), "HH:mm")} –{" "}
                        {format(parseISO(event.end_time), "HH:mm")}
                      </>
                    ) : (
                      <>
                        {format(parseISO(event.start_time), "d.MM HH:mm")} –{" "}
                        {format(parseISO(event.end_time), "d.MM HH:mm")}
                      </>
                    )}
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
                <div className="flex justify-right mt-2 min-w-[120px] w-full justify-end items-center">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(event)}
                      className="flex flex-col items-center m-2 text-primary hover:text-secondary transition-colors"
                      title="Edytuj"
                    >
                      <Edit2 className="w-5 h-5 sm:w-6 sm:h-6" />
                      <span className="text-[10px] sm:text-[11px]">
                        Edytuj
                      </span>
                    </button>
                  )}

                  <button
                    onClick={() => generateSingleEventICS(event)}
                    className="flex flex-col items-center m-2 text-primary hover:text-secondary transition-colors"
                    title="Pobierz .ics"
                  >
                    <Download className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span className="text-[10px] sm:text-[11px]">Pobierz</span>
                  </button>

                  <button
                    onClick={() => handleDelete(event)}
                    className="flex flex-col items-center m-2 text-red-500 hover:text-red-600 transition-colors"
                    title="Usuń"
                  >
                    <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span className="text-[10px] sm:text-[11px]">Usuń</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
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
                    className={`w-6 h-6 text-sm font-bold rounded-md flex items-center justify-center shadow-sm cursor-pointer transition duration-200`}
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
          <p>Brak zadań</p>
        )}
      </section>
    </div>
  );
}
