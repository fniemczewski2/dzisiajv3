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
} from "lucide-react";
import { useReminders } from "../../hooks/useReminders";

export default function Reminders() {
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const today = new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  .format(new Date())
  .replace(/\./g, "-") 
  .replace(/\s/g, ""); 

  const {
    visibleReminders,
    allReminders,
    addReminder,
    completeReminder,
    postponeReminder,
    deleteReminder,
  } = useReminders();

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

  return (
    <div className="bg-card rounded-xl shadow mb-4 overflow-hidden">
      <div
        className="flex flex-row shadow items-center justify-between px-3 py-2 sm:p-4 cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <h3 className="font-semibold flex flex-row items-center">
          <BellDot className="w-5 h-5 mr-2" />
          Przypomnienia&nbsp;
          <span className="text-blue-600">{liczba}</span>
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
                    className="flex justify-between items-center"
                  >
                    <div>
                      <div className="font-medium">{r.tytul}</div>
                      <div className="text-[10px] h-[14px] text-gray-500">
                        co {r.powtarzanie} dni
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => completeReminder(r.id)} title="Zakończ">
                        <Check className="w-5 h-5 text-green-600 hover:text-green-800" />
                      </button>
                      <button
                        onClick={() => postponeReminder(r.id, r.powtarzanie)}
                        title="Odłóż"
                      >
                        <ChevronsRight className="w-5 h-5 text-yellow-500 hover:text-yellow-600" />
                      </button>
                      <button onClick={() => deleteReminder(r.id)} title="Usuń">
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
                className="flex items-center text-blue-600 hover:underline"
                onClick={() => setShowForm(!showForm)}
              >
                Dodaj&nbsp;<Plus className="w-4 h-4 ml-1" />
              </button>

              <button
                onClick={() => setShowAll(!showAll)}
                className="flex items-center text-blue-600 hover:underline"
              >
                {showAll ? "Pokaż aktywne\u00A0" : "Pokaż wszystkie\u00A0"}<List className="w-4 h-4 ml-1" />
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
