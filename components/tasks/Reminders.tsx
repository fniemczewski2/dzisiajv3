import { useState } from "react";
import {
  RefreshCw, ChevronDown, ChevronUp, Plus, Check,
  Trash2, ChevronsRight, List, ListPlus,
} from "lucide-react";
import { useReminders } from "../../hooks/useReminders";
import { useTasks } from "../../hooks/useTasks";
import { useToast } from "../../providers/ToastProvider";
import { useAuth } from "../../providers/AuthProvider";
import { withRetry } from "../../lib/withRetry";
import { getAppDate, getAppDateTime } from "../../lib/dateUtils";
import { Task } from "../../types";
import NoResultsState from "../NoResultsState";
import { CancelButton, SaveButton } from "../CommonButtons";

export default function Reminders({ onTasksChange }: { onTasksChange?: () => void }) {
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();
  const userId = user?.id;
  const today = getAppDate();

  const {
    visibleReminders, allReminders,
    addReminder, completeReminder, postponeReminder, deleteReminder,
  } = useReminders();
  const { addTask } = useTasks();

  const remindersToShow = showAll ? allReminders : visibleReminders;
  const [form, setForm] = useState({ tytul: "", data_poczatkowa: today, powtarzanie: 1 });

  const handleAdd = () => {
    if (!form.tytul || !form.data_poczatkowa) return;
    addReminder(form.tytul, form.data_poczatkowa, form.powtarzanie).catch(console.error);
    setForm({ tytul: "", data_poczatkowa: today, powtarzanie: 1 });
    setShowForm(false);
  };

  const handleAddTask = async (reminder: any) => {
    if (!userId) return;
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    const startDate = new Date(reminder.data_poczatkowa);
    startDate.setHours(0, 0, 0, 0);
    const doneDate = reminder.done ? new Date(reminder.done) : null;
    if (doneDate) doneDate.setHours(0, 0, 0, 0);

    let nextDate: Date;
    if (doneDate) {
      nextDate = new Date(doneDate);
      nextDate.setDate(nextDate.getDate() + reminder.powtarzanie);
    } else {
      nextDate = new Date(startDate);
    }
    if (nextDate <= todayDate) nextDate = getAppDateTime();

    const newTask = {
      id: "",
      title: reminder.tytul,
      for_user_id: userId,
      category: "cykliczne",
      priority: 1,
      description: `Cykliczne (co ${reminder.powtarzanie} dni)`,
      due_date: nextDate.toISOString().split("T")[0],
      status: "pending",
      user_id: userId,
    } as Task;

    await withRetry(
      () => addTask(newTask),
      toast,
      { context: "Reminders.addTask", userId }
    );
    toast.success("Dodano pomyślnie.");
    onTasksChange?.();
  };

  return (
    <div className="card rounded-xl shadow-sm my-4 overflow-hidden transition-colors">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-surface transition-colors"
        onClick={() => setOpen(!open)}
      >
        <h3 className="font-semibold flex items-center text-text">
          <RefreshCw className="w-5 h-5 mr-2 text-primary" />
          Zadania cykliczne
          <span className="ml-2 text-primary font-bold">{remindersToShow.length}</span>
        </h3>
        <div className="text-textMuted">
          {open ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </div>

      {open && (
        <div className="border-t border-gray-100 dark:border-gray-800 bg-surface">
          <div className="px-4 py-3 text-sm">
            {remindersToShow.length === 0 ? (
              <NoResultsState text="zadań cyklicznych" />
            ) : (
              <ul className="space-y-3">
                {remindersToShow.map((r) => (
                  <li key={r.id} className="flex justify-between items-center gap-3 card p-3 rounded-lg shadow-sm">
                    <div className="flex-1">
                      <div className="font-medium text-text">{r.tytul}</div>
                      <div className="text-xs font-medium text-primary mt-0.5">
                        Powtarza się co {r.powtarzanie} {r.powtarzanie === 1 ? "dzień" : "dni"}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleAddTask(r)} title="Dodaj jako zadanie"
                        className="p-2 text-primary hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg transition-colors">
                        <ListPlus className="w-4 h-4" />
                      </button>
                      <button onClick={() => completeReminder(r.id).catch(console.error)} title="Zakończ zadanie"
                        className="p-2 text-green-600 hover:bg-green-600/10 rounded-lg transition-colors">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => postponeReminder(r.id, r.powtarzanie).catch(console.error)} title="Odłóż na później"
                        className="p-2 text-yellow-600 hover:bg-yellow-600/10 rounded-lg transition-colors">
                        <ChevronsRight className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteReminder(r.id).catch(console.error)} title="Usuń całkowicie"
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {!showForm && (
            <div className="px-4 py-3 flex justify-between bg-card border-t border-gray-100 dark:border-gray-800">
              <button className="text-sm font-medium flex items-center text-primary hover:text-secondary transition-colors"
                onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-1" /> Dodaj
              </button>
              <button onClick={() => setShowAll(!showAll)}
                className="text-sm font-medium flex items-center text-textMuted hover:text-text transition-colors">
                <List className="w-4 h-4 mr-1.5" />
                {showAll ? "Pokaż tylko aktywne" : "Pokaż wszystkie"}
              </button>
            </div>
          )}

          {showForm && (
            <div className="p-4 bg-card border-t border-gray-100 dark:border-gray-800 space-y-4">
              <div>
                <label className="form-label">Tytuł zadania:</label>
                <input type="text" placeholder="np. Wymień filtry do wody"
                  className="input-field" value={form.tytul}
                  onChange={(e) => setForm({ ...form, tytul: e.target.value })} />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="form-label">Data rozpoczęcia:</label>
                  <input type="date" className="input-field" value={form.data_poczatkowa}
                    onChange={(e) => setForm({ ...form, data_poczatkowa: e.target.value })} />
                </div>
                <div className="flex-1">
                  <label className="form-label">Powtarzanie co (dni):</label>
                  <input type="number" min={1} max={365} className="input-field" value={form.powtarzanie}
                    onChange={(e) => setForm({ ...form, powtarzanie: Number(e.target.value) })} />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <SaveButton onClick={handleAdd} />
                <CancelButton onCancel={() => {
                  setForm({ tytul: "", data_poczatkowa: today, powtarzanie: 1 });
                  setShowForm(false);
                }} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}