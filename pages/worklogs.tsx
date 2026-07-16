import React, { SyntheticEvent, useRef, useState } from 'react';
import { format, subMonths, addMonths } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Clock, Calendar} from 'lucide-react';
import { useWorkLogs } from '@/hooks/db/useWorkLogs';
import { AddButton, DeleteButton, FormButtons } from '@/components/ui/CommonButtons';
import NoResultsState from '@/components/ui/NoResultsState';
import { SkeletonList } from "@/components/ui/Skeleton";
import { WorkLog, WorkLogInsert } from '@/types/worklogs';
import { useAuth } from '@/providers/AuthProvider';

const WorkLogForm = ({ onAdd, onCancel, loading }: { onAdd: (log: Omit<WorkLogInsert, 'user_id'>) => Promise<void>, onCancel: () => void, loading: boolean }) => {
  const { user } = useAuth();
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [endTime, setEndTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));;

  const descriptionRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef<HTMLInputElement>(null);
  const endTimeRef = useRef<HTMLInputElement>(null);

    const handleSubmit = async (e: SyntheticEvent) => {
      e.preventDefault();

      if (!user) return;
  
      const data: WorkLogInsert = {
        user_id: user?.id,
        description: descriptionRef.current?.value || "",
        start_time: startTimeRef?.current?.value || "",
        end_time: endTimeRef?.current?.value || undefined,
      };

      await onAdd(data);
    };
  return (
    <form
      onSubmit={handleSubmit}
      className="form-card"
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="desc" className="form-label">Opis pracy:</label>
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="time-start" className="form-label">Czas rozpoczęcia:</label>
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
            <label htmlFor="time-end" className="form-label">Czas zakończenia:</label>
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
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const monthStr = format(currentDate, 'yyyy-MM');
  const { workLogs, loading, addWorkLog, deleteWorkLog } = useWorkLogs(undefined, monthStr);

  const onNext = () => setCurrentDate(addMonths(currentDate, 1));
  const onPrev = () => setCurrentDate(subMonths(currentDate, 1));

  const parseLocal = (dateStr: string) => {
    if (!dateStr) return new Date();
    const cleanDateStr = dateStr.replace(/(Z|[+-]\d{2}(:\d{2})?)$/, '');
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

  const handleAddLog = async (log: Omit<WorkLogInsert, 'user_id'>) => {
    await addWorkLog(log);
  };
  const handleDelete = async (log: WorkLog) => {
    await deleteWorkLog(log.id);
  }

const totalMonthHours = Math.floor(totalMonthMinutes / 60);
const totalMonthMinsLeft = Math.round(totalMonthMinutes % 60);
const sumText = totalMonthHours > 0 
  ? `${totalMonthHours}h ${totalMonthMinsLeft}m` 
  : `${totalMonthMinsLeft}m`;

  return (
      <div className="space-y-6 pb-20">         
          <div className="flex items-center justify-between gap-4 w-full">
            <h1 className="text-2xl font-bold text-text flex items-center gap-3">
             Godziny pracy
            </h1>
            
            {!isFormOpen && <AddButton onClick={() => setIsFormOpen(true)} />}
        </div>
        <div className='flex items-center justify-center'>
          <div className="flex items-center card rounded-2xl p-1 shadow-sm w-fit sm:flex-none justify-between">
            <button
              onClick={onPrev}
              className="p-2 sm:p-2.5 hover:bg-surface rounded-xl text-textSecondary hover:text-text transition-colors"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
                
            <h2 className="text-base sm:text-lg font-bold text-text px-4 min-w-[140px] text-center capitalize tracking-wide">
              {format(currentDate, "LLLL yyyy", { locale: pl })}
            </h2>
                
            <button
              onClick={onNext}
              className="p-2 sm:p-2.5 hover:bg-surface rounded-xl text-textSecondary hover:text-text transition-colors"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>
        
        {isFormOpen && <WorkLogForm onAdd={handleAddLog} onCancel={() => setIsFormOpen(false)} loading={loading} />}

        <section>
          {loading && workLogs.length === 0 ? (
            <SkeletonList count={4} variant="card" />
          ) : workLogs.length === 0 ? (
            <NoResultsState text='wpisów' />
          ) : (
            <>
              <div className="mb-4 text-textSecondary font-medium flex gap-3 items-center px-1">
                <span>Wpisy: {workLogs.length}</span>
                <span className="text-primary font-bold">
                  Suma: {sumText}
                </span>
              </div>
              
              <ul className="flex flex-wrap gap-4 sm:gap-6">
                {workLogs.map((log) => (
                  <li key={log.id} className="card rounded-2xl p-5 flex flex-col justify-between group relative transition-all hover:shadow-md">
                    <div className="mb-4 space-y-2">
                      <p className="font-bold text-text text-lg leading-tight mb-3">
                        {log.description}
                      </p>
                      <div className="flex items-center justify-center gap-2 bg-surface text-primary px-3 py-1.5 rounded-lg font-bold shadow-sm">
                        <Clock className='w-4 h-4 sm:w-5 sm:h-5'/> {calculateDuration(log.start_time, log.end_time)}
                      </div>
                      <div className="space-y-2 text-sm text-textSecondary font-medium">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-primary/70" />
                          {format(new Date(log.start_time), 'dd MMMM yyyy', { locale: pl })}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-primary/70" />
                          {format(parseLocal(log.start_time), 'HH:mm')} - {log.end_time ? format(parseLocal(log.end_time), 'HH:mm') : "..."}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-2 pt-4 border-t border-gray-100 dark:border-gray-800">    
                      <DeleteButton
                        onClick={() => handleDelete(log)}
                        />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

      </div>
  );
}