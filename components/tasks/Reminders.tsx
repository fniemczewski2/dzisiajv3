// components/tasks/Reminders.tsx

import { useState } from "react";
import {
  RefreshCw, ChevronDown, ChevronUp, Check,
  Trash2, ChevronsRight, List, ListPlus,
} from "lucide-react";
import { useReminders } from "@/hooks/db/useReminders";
import { useAuth } from "@/providers/AuthProvider";
import { getAppDate, getAppDateTime } from "@/lib/dateUtils";
import { Task } from "@/types/tasks";
import { Reminder } from "@/types/reminders";
import NoResultsState from "../ui/NoResultsState";
import { AddButton, FormButtons, IconActionButton } from "../ui/CommonButtons";

interface RemindersProps {
  addTask: (task: Task) => Promise<unknown>;
  onTasksChange?: () => void;
}

export default function Reminders({ addTask, onTasksChange }: Readonly<RemindersProps>) {
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const { user } = useAuth();
  const userId = user?.id;
  const today = getAppDate();

  const {
    visibleReminders, allReminders,
    addReminder, completeReminder, postponeReminder, deleteReminder, loading
  } = useReminders();

  const remindersToShow = showAll ? allReminders : visibleReminders;
  const [form, setForm] = useState({ title: "", start_date: today, repeat_days: 1 });

  const handleAdd = async () => {
      await addReminder(form.title, form.start_date, form.repeat_days);
      setForm({ title: "", start_date: today, repeat_days: 1 });
      setShowForm(false);
  };

  const handleComplete = async (id: string) => {
    try {
      await completeReminder(id);
    } catch {
      return;
    }
  };

  const handlePostpone = async (id: string, repeat_days: number) => {
    try {
      await postponeReminder(id, repeat_days);
    } catch {
      return;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteReminder(id);
    } catch {
      return;
    }
  };

  const handleClose = () => {
    setForm({ title: "", start_date: today, repeat_days: 1 });
    setShowForm(false);
  }

  const handleAddTask = async (reminder: Reminder) => {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    const startDate = new Date(reminder.start_date);
    startDate.setHours(0, 0, 0, 0);
    const doneDate = reminder.done ? new Date(reminder.done) : null;
    if (doneDate) doneDate.setHours(0, 0, 0, 0);

    let nextDate: Date;
    if (doneDate) {
      nextDate = new Date(doneDate);
      nextDate.setDate(nextDate.getDate() + reminder.repeat_days);
    } else {
      nextDate = new Date(startDate);
    }
    if (nextDate <= todayDate) nextDate = getAppDateTime();

    const pad = (n: number) => String(n).padStart(2, '0');
    const localDateString = `${nextDate.getFullYear()}-${pad(nextDate.getMonth() + 1)}-${pad(nextDate.getDate())}`;

    const newTask = {
      title: reminder.title,
      for_user_id: userId,
      category: "cykliczne",
      priority: 1,
      description: `Cykliczne (co ${reminder.repeat_days} dni)`,
      due_date: localDateString,
      status: "pending",
      user_id: userId,
    } as Task;

    try {
      await addTask(newTask);
      
      await completeReminder(reminder.id);
      
      onTasksChange?.();
    } catch {
      return;
    }
  };

  const toggleOpen = () => {
    setOpen(!open)
  }

  return (
    <div className="card rounded-xl shadow-sm my-4 overflow-hidden transition-colors">
      <div
        className="flex items-center justify-between px-4 py-3 hover:bg-surface transition-colors"
      >
        <h3 className="font-semibold flex items-center text-text">
          <RefreshCw className="w-5 h-5 mr-2 text-primary" />
          Zadania cykliczne
          <span className="ml-2 text-primary font-bold">{remindersToShow.length}</span>
        </h3>
        <button onClick={toggleOpen} type='button' className="text-textMuted">
          {open ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-gray-100 dark:border-gray-800 bg-card">
          <div className="px-4 py-3 text-sm">
            {remindersToShow.length === 0 ? (
              <NoResultsState text="zadań cyklicznych" />
            ) : (
              <ul className="space-y-3">
                {remindersToShow.map((r) => (
                  <li key={r.id} className="flex justify-between items-center gap-3 card p-3 rounded-lg shadow-sm">
                    <div className="flex-1">
                      <div className="font-medium text-text">{r.title}</div>
                      <div className="text-xs font-medium text-primary mt-0.5">
                        Powtarza się co {r.repeat_days} {r.repeat_days === 1 ? "dzień" : "dni"}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <IconActionButton onClick={() => handleAddTask(r)} title="Dodaj jako zadanie" Icon={ListPlus} variant="primary" disabled={loading} />
                      <IconActionButton onClick={() => handleComplete(r.id)} title="Zakończ zadanie" Icon={Check} variant="success" disabled={loading} />
                      <IconActionButton onClick={() => handlePostpone(r.id, r.repeat_days)} title="Odłóż na później" Icon={ChevronsRight} variant="warning" disabled={loading} />
                      <IconActionButton onClick={() => handleDelete(r.id)} title="Usuń całkowicie" Icon={Trash2} variant="danger" disabled={loading} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {!showForm && (
            <div className="px-4 py-3 flex justify-between bg-card border-t border-gray-100 dark:border-gray-800">
              <AddButton small onClick={() => setShowForm(true)}/>

              <button 
                onClick={() => setShowAll(!showAll)}
                type='button'
                className="text-sm font-medium flex items-center text-textMuted hover:text-text transition-colors"
              >
                <List className="w-4 h-4 mr-1.5" />
                {showAll ? "Pokaż tylko aktywne" : "Pokaż wszystkie"}
              </button>
            </div>
          )}

          {showForm && (
            <div className="p-4 bg-card border-t border-gray-100 dark:border-gray-800 space-y-4">
              <div>
                <label htmlFor="title" className="form-label">Tytuł zadania:</label>
                <input id="title" type="text" placeholder="np. Wymień filtry do wody"
                  className="input-field" value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label htmlFor="start_date" className="form-label">Data rozpoczęcia:</label>
                  <input id="start_date" type="date" className="input-field h-min sm:h-[48px] w-full min-w-0 px-1 text-xs" value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div className="flex-1">
                  <label htmlFor="repeat" className="form-label">Co (dni):</label>
                  <input id="repeat" type="number" min={1} max={365} className="input-field" value={form.repeat_days}
                    onChange={(e) => setForm({ ...form, repeat_days: Number(e.target.value) })} />
                </div>
              </div>
              <FormButtons onClickSave={handleAdd} onClickClose={handleClose} loading={loading}/>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
