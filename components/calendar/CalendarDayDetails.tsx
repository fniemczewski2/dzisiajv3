import React from "react";
import { format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import {
  Calendar,
  Check,
  Clock,
  Coins,
  CopyCheck,
  Droplet,
  Edit2,
  ListTodo,
  MapPin,
  Trash2,
  User,
  X,
} from "lucide-react";
import { Task } from "../../types";
import { Event } from "../../types";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

interface Props {
  selectedDate: string;
  tasks: Task[];
  events?: Event[];
  onBack: () => void;
  onEdit?: (event: Event) => void;
  onEventsChange: () => void;
  tCount: number;
  hCount: number;
  wCount: number;
  mCount: number;
}

export function CalendarDayDetails({
  selectedDate,
  tasks,
  events = [],
  onBack,
  onEdit,
  onEventsChange,
  tCount,
  hCount,
  wCount,
  mCount,
}: Props) {
  const supabase = useSupabaseClient();

  const handleDelete = async (eventId: string) => {
    const confirmed = confirm("Czy na pewno chcesz usunąć to wydarzenie?");
    if (!confirmed) return;
    await supabase.from("events").delete().eq("id", eventId);
    onEventsChange();
  };

  return (
    <div className="py-4 mb-5 space-y-6">
      <span className="bg-card p-4 shadow rounded-xl flex items-center justify-center w-full relative">
        <button
          onClick={onBack}
          className="absolute left-4 w-9 h-9 bg-primary hover:bg-secondary flex items-center justify-center text-white rounded-md"
          title="Wróć"
        >
          <Calendar className="w-6 h-6" />
        </button>
        <h3 className="font-semibold mx-auto text-center">
          {format(parseISO(selectedDate), "d MMMM yyyy", { locale: pl })}
        </h3>
      </span>

      <div className="flex flex-wrap justify-center space-x-2">
        <span className="flex justify-center text-xs">
          <ListTodo size={14} />
          &nbsp;
          {tCount}
        </span>
        <span className="flex justify-center text-xs">
          <CopyCheck size={14} />
          &nbsp;
          {hCount}
        </span>
        <span className="flex justify-center text-xs">
          <Droplet size={14} />
          &nbsp;
          {wCount}
        </span>
        <span className="flex justify-center text-xs">
          <Coins size={14} />
          &nbsp;
          {mCount}
        </span>
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
              <div className="flex flex-nowrap justify-between">
                <div className="space-y-1">
                  <div className="flex items-center text-sm text-gray-700">
                    <Clock className="w-4 h-4 mr-1" />
                    {format(parseISO(event.start_time), "HH:mm")} –{" "}
                    {format(parseISO(event.end_time), "HH:mm")}
                  </div>

                  {event.place && (
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="w-4 h-4 mr-1" />
                      {event.place}
                    </div>
                  )}
                  {event.share != "null" && (
                    <div className="flex items-center text-sm text-gray-600">
                      <User className="w-4 h-4 mr-1" />
                      {event.share}
                    </div>
                  )}
                </div>
                <div className="flex pr-2 min-w-[100px]">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(event)}
                      className="flex flex-col items-center m-2 text-primary hover:text-secondary transition-colors"
                    >
                      <Edit2 className="w-5 h-5 sm:w-6 sm:h-6" />
                      <span className="text-[10px] sm:text-[11px]">Edytuj</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(event.id)}
                    className="flex flex-col items-center m-2 text-red-500 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span className="text-[10px] sm:text-[11px]">Usuń</span>
                  </button>
                </div>
              </div>
              {event.description && (
                <p className="text-sm text-gray-800 bg-gray-100 rounded p-2">
                  {event.description}
                </p>
              )}
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
                {t.status === "done" ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <X className="w-5 h-5 text-red-500" />
                )}
                <span className="ml-2 font-medium truncate max-w-[240px] sm:max-w-[720px]">
                  {t.priority} | {t.title}
                </span>
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
