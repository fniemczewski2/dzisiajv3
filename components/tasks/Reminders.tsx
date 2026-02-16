import { useState } from "react";
import {
  BellDot,
  ChevronDown,
  ChevronUp,
  Plus,
  Check,
  Trash2,
  ChevronsRight,
  List,
  ListPlus,
} from "lucide-react";
import { useReminders } from "../../hooks/useReminders";
import { useTasks } from "../../hooks/useTasks";
import { getAppDate, getAppDateTime } from "../../lib/dateUtils";
import { useSession } from "@supabase/auth-helpers-react";
import { Task } from "../../types";

export default function Reminders({ onTasksChange }: { onTasksChange?: () => void }) {
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const session = useSession();
  const userEmail = session?.user?.email || process.env.NEXT_PUBLIC_USER_EMAIL;
  const today = getAppDate();

  const {
    visibleReminders,
    allReminders,
    addReminder,
    completeReminder,
    postponeReminder,
    deleteReminder,
  } = useReminders();

  const { addTask } = useTasks();

  const remindersToShow = showAll ? allReminders : visibleReminders;
  const liczba = remindersToShow.length;

  const [form, setForm] = useState({
    tytul: "",
    data_poczatkowa: today,
    powtarzanie: 1,
  });

  const handleAdd = () => {
    if (!form.tytul || !form.data_poczatkowa) return;
    addReminder(form.tytul, form.data_poczatkowa, form.powtarzanie);
    setForm({ tytul: "", data_poczatkowa: "", powtarzanie: 1 });
    setShowForm(false);
  };

   const handleAddTask = async (reminder: any) => {
    if (!userEmail) return;

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    
    // Calculate the next occurrence date based on reminder's data_poczatkowa and done field
    const startDate = new Date(reminder.data_poczatkowa);
    startDate.setHours(0, 0, 0, 0);
    const doneDate = reminder.done ? new Date(reminder.done) : null;
    if (doneDate) {
      doneDate.setHours(0, 0, 0, 0);
    }
    
    let nextDate: Date;
    if (doneDate) {
      // If reminder was completed, calculate next occurrence from done date
      nextDate = new Date(doneDate);
      nextDate.setDate(nextDate.getDate() + reminder.powtarzanie);
    } else {
      // If not completed yet, use start date as due date
      nextDate = new Date(startDate);
    }

    if (nextDate <= todayDate) {
      nextDate = getAppDateTime();
    }

    const newTask = {
      title: reminder.tytul,
      for_user: userEmail,
      category: "przypomnienia",
      priority: 1,
      description: `Utworzone z przypomnienia (co ${reminder.powtarzanie} dni)`,
      due_date: nextDate.toISOString().split('T')[0],
      status: "pending",
      user_name: userEmail,
    } as Task;

    await addTask(newTask);
    if (onTasksChange) {
      onTasksChange();
    }
  };

  return (
    <div className="bg-card rounded-xl shadow mb-4 overflow-hidden">
      <div
        className="flex flex-row shadow items-center justify-between px-3 py-2 sm:p-4 cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <h3 className="font-semibold flex flex-row items-center">
          <BellDot className="w-5 h-5 mr-2" />
          Cykliczne&nbsp;
          <span className="text-primary">{liczba}</span>
        </h3>
        {open ? (
          <ChevronUp className="w-5 h-5" />
        ) : (
          <ChevronDown className="w-5 h-5" />
        )}
      </div>

      {open && (
        <>
          
          <div className="px-3 py-3 text-sm shadow space-y-2">
            {liczba === 0 ? (
              <p className="text-muted-foreground">Brak przypomnień</p>
            ) : (
              <ul className="space-y-4">
                {remindersToShow.map((r) => (
                  <li
                    key={r.id}
                    className="flex justify-between items-start gap-2"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{r.tytul}</div>
                      <div className="text-[10px] h-[14px] text-gray-500">
                        co {r.powtarzanie} dni
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button 
                        onClick={() => handleAddTask(r)} 
                        title="Dodaj zadanie"
                        className="hover:scale-110 transition-transform"
                      >
                        <ListPlus className="w-5 h-5 text-blue-600 hover:text-blue-800" />
                      </button>
                      <button 
                        onClick={() => completeReminder(r.id)} 
                        title="Zakończ"
                        className="hover:scale-110 transition-transform"
                      >
                        <Check className="w-5 h-5 text-green-600 hover:text-green-800" />
                      </button>
                      <button
                        onClick={() => postponeReminder(r.id, r.powtarzanie)}
                        title="Odłóż"
                        className="hover:scale-110 transition-transform"
                      >
                        <ChevronsRight className="w-5 h-5 text-yellow-500 hover:text-yellow-600" />
                      </button>
                      <button 
                        onClick={() => deleteReminder(r.id)} 
                        title="Usuń"
                        className="hover:scale-110 transition-transform"
                      >
                        <Trash2 className="w-5 h-5 text-red-600 hover:text-red-800" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {!showForm && (
            <div className="px-3 py-2 text-sm flex justify-between shadow">
              <button
                className="flex items-center text-primary hover:underline"
                onClick={() => setShowForm(!showForm)}
              >
                Dodaj&nbsp;<Plus className="w-4 h-4" />
              </button>

              <button
                onClick={() => setShowAll(!showAll)}
                className="flex items-center text-primary hover:underline"
              >
                {showAll ? "Pokaż aktywne\u00A0" : "Pokaż wszystkie\u00A0"}<List className="w-4 h-4" />
              </button>

            </div>
          )}

          {showForm && (
            <div className="px-4 py-4 text-sm shadow space-y-3">
              <div>
                <label className="block text-sm mb-1">Tytuł:</label>
                <input
                  type="text"
                  placeholder="Nazwa przypomnienia"
                  className="w-full border px-2 py-1 rounded"
                  value={form.tytul}
                  onChange={(e) => setForm({ ...form, tytul: e.target.value })}
                />
              </div>
              <div className="flex flex-row flex-nowrap justify-between gap-x-3">
                <div className="flex-1">
                  <label className="block text-sm mb-1">Data rozpoczęcia:</label>
                  <input
                    type="date"
                    className="w-full border px-2 py-1 rounded"
                    value={form.data_poczatkowa}
                    onChange={(e) =>
                      setForm({ ...form, data_poczatkowa: e.target.value })
                    }
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm mb-1">Powtarzanie co (dni):</label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    className="w-full border px-2 py-1 rounded"
                    value={form.powtarzanie}
                    onChange={(e) =>
                      setForm({ ...form, powtarzanie: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div className="flex justify-start gap-x-3 pt-2">
                <button
                  className="px-3 py-1 bg-primary hover:bg-secondary text-white rounded flex flex-nowrap items-center transition"
                  onClick={handleAdd}
                >
                  Zapisz
                </button>
                <button
                  className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400 transition"
                  onClick={() => {
                    setForm({ tytul: "", data_poczatkowa: "", powtarzanie: 1 });
                    setShowForm(false);
                  }}
                >
                  Anuluj
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}