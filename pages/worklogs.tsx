// pages/worklogs.tsx

import { useNow } from "@/hooks/useNow";
import React, { SyntheticEvent, useState } from "react";
import { format, subMonths, addMonths } from "date-fns";
import { pl } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, Calendar } from "lucide-react";
import { useWorkLogs } from "@/hooks/db/useWorkLogs";
import { AddButton, DeleteButton, FormButtons } from "@/components/ui/CommonButtons";
import NoResultsState from "@/components/ui/NoResultsState";
import { SkeletonList } from "@/components/ui/Skeleton";
import { WorkLog, WorkLogInsert } from "@/types/worklogs";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import Seo from "@/components/ui/SEO";

const toIsoWithLocalOffset = (localValue: string): string => {
  const date = new Date(localValue);
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${localValue}:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
};

const WorkLogForm = ({
  onAdd,
  onCancel,
  loading,
}: {
  onAdd: (log: Omit<WorkLogInsert, "user_id">) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}) => {
  const { user } = useAuth();
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState(() => format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [endTime, setEndTime] = useState(() => format(new Date(), "yyyy-MM-dd'T'HH:mm"));

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!user || !description.trim() || !startTime) return;

    const data: WorkLogInsert = {
      user_id: user.id,
      description: description.trim(),
      start_time: toIsoWithLocalOffset(startTime),
      end_time: endTime ? toIsoWithLocalOffset(endTime) : undefined,
    };

    await onAdd(data);
  };
  return (
    <form onSubmit={handleSubmit} className="form-card">
      <div className="space-y-4">
        <div>
          <label htmlFor="desc" className="form-label">
            Opis pracy:
          </label>
          <input
            id="desc"
            type="text"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-field w-full"
            placeholder="Np. Kodowanie nowej funkcji, Spotkanie z klientem..."
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="time-start" className="form-label">
              Czas rozpoczęcia:
            </label>
            <input
              id="time-start"
              type="datetime-local"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="input-field w-full"
            />
          </div>
          <div>
            <label htmlFor="time-end" className="form-label">
              Czas zakończenia:
            </label>
            <input
              id="time-end"
              type="datetime-local"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="input-field w-full"
            />
          </div>
        </div>

        <FormButtons onClickClose={onCancel} loading={loading} />
      </div>
    </form>
  );
};

export default function WorkLogsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const monthStr = format(currentDate, "yyyy-MM");
  const { workLogs, loading, addWorkLog, deleteWorkLog } = useWorkLogs(undefined, monthStr);
  const { toast } = useToast();
  const now = useNow();

  const onNext = () => setCurrentDate(addMonths(currentDate, 1));
  const onPrev = () => setCurrentDate(subMonths(currentDate, 1));

  const parseLocal = (dateStr: string) => {
    if (!dateStr) return now;
    const cleanDateStr = dateStr.replace(/(Z|[+-]\d{2}(:\d{2})?)$/, "");
    return new Date(cleanDateStr);
  };

  const calculateDuration = (start: string, end?: string | null) => {
    if (!end) return "W trakcie...";
    const diffMins = Math.round((parseLocal(end).getTime() - parseLocal(start).getTime()) / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const totalMonthMinutes = workLogs.reduce((acc, log) => {
    if (!log.end_time) return acc;
    const start = parseLocal(log.start_time).getTime();
    const end = parseLocal(log.end_time).getTime();
    return acc + (end - start) / 60000;
  }, 0);

  const handleAddLog = async (log: Omit<WorkLogInsert, "user_id">) => {
    if (log.end_time && new Date(log.end_time) <= new Date(log.start_time)) {
      toast.error("Czas zakończenia musi być późniejszy niż rozpoczęcia.");
      return;
    }
    const created = await addWorkLog(log);
    if (created) setIsFormOpen(false);
  };
  const handleDelete = async (log: WorkLog) => {
    await deleteWorkLog(log.id);
  };

  const totalMonthHours = Math.floor(totalMonthMinutes / 60);
  const totalMonthMinsLeft = Math.round(totalMonthMinutes % 60);
  const sumText = totalMonthHours > 0 ? `${totalMonthHours}h ${totalMonthMinsLeft}m` : `${totalMonthMinsLeft}m`;

  const renderWorklogs = () => {
    return workLogs.length === 0 ? (
      <NoResultsState text="wpisów" />
    ) : (
      <>
        <div className="mb-4 flex items-center gap-3 px-1 font-medium text-text-secondary">
          <span>Wpisy: {workLogs.length}</span>
          <span className="font-bold text-primary">Suma: {sumText}</span>
        </div>

        <ul className="flex flex-wrap gap-4 sm:gap-6">
          {workLogs.map((log) => (
            <li
              key={log.id}
              className="card group relative flex flex-col justify-between p-5 transition-all hover:shadow-md"
            >
              <div className="mb-4 space-y-2">
                <p className="mb-3 text-lg leading-tight font-bold text-text">{log.description}</p>
                <div className="flex items-center justify-center gap-2 rounded-lg bg-surface px-3 py-1.5 font-bold text-primary shadow-sm">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5" /> {calculateDuration(log.start_time, log.end_time)}
                </div>
                <div className="space-y-2 text-sm font-medium text-text-secondary">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary/70" />
                    {format(new Date(log.start_time), "dd MMMM yyyy", { locale: pl })}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary/70" />
                    {format(parseLocal(log.start_time), "HH:mm")}–
                    {log.end_time ? format(parseLocal(log.end_time), "HH:mm") : "..."}
                  </div>
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between border-t border-line pt-4">
                <DeleteButton onClick={() => handleDelete(log)} />
              </div>
            </li>
          ))}
        </ul>
      </>
    );
  };

  return (
    <>
      <Seo
        title="Czas pracy"
        description="Ewidencja czasu pracy: wpisy z godziną rozpoczęcia, zakończenia i opisem, zestawione miesiącami. Wpisy można dodawać skrótem Siri."
        canonical="https://dzisiaj.fun/worklogs"
      />
      <div className="space-y-6 pb-20">
        <div className="flex w-full items-center justify-between gap-4">
          <h1 className="page-title flex items-center gap-3">Czas pracy</h1>

          {!isFormOpen && <AddButton onClick={() => setIsFormOpen(true)} />}
        </div>
        <div className="flex items-center justify-center">
          <div className="card flex w-fit items-center justify-between p-1 shadow-sm sm:flex-none">
            <button
              onClick={onPrev}
              type="button"
              aria-label="Poprzedni miesiąc"
              className="rounded-xl p-2 text-text-secondary transition-colors hover:bg-surface hover:text-text sm:p-2.5"
            >
              <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>

            <h2 className="period-title">{format(currentDate, "LLLL yyyy", { locale: pl })}</h2>

            <button
              onClick={onNext}
              type="button"
              aria-label="Następny miesiąc"
              className="rounded-xl p-2 text-text-secondary transition-colors hover:bg-surface hover:text-text sm:p-2.5"
            >
              <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>
        </div>

        {isFormOpen && <WorkLogForm onAdd={handleAddLog} onCancel={() => setIsFormOpen(false)} loading={loading} />}

        <section>
          {loading && workLogs.length === 0 ? <SkeletonList count={4} variant="card" /> : renderWorklogs()}
        </section>
      </div>
    </>
  );
}
