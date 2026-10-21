// components/reports/ReportTasksToApp.tsx
//
// Zadania z protokołu → Zadania, pojedynczo: każde zadanie ma własny
// przycisk „Dodaj”. Wspólny jest tylko wybór kategorii; zadanie bez terminu
// w protokole dostaje termin wpisany w swoim wierszu (domyślnie dziś).
// Dodane zadania są oznaczone i nie da się ich dodać ponownie.

import React, { useId, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { useTaskCategories } from "@/hooks/useTaskCategories";
import { defaultTaskCategory } from "@/lib/taskCategories";
import { getAppDate } from "@/lib/dateUtils";
import { formatReportDate } from "@/lib/reportExport";
import { reportTaskChoices, toAppTask, withAppTaskIds } from "@/lib/reportToTasks";
import type { Report, ReportTask } from "@/types/reports";
import { AddButton, CancelButton } from "../ui/CommonButtons";

interface Props {
  report: Report;
  onTasksLinked: (tasks: ReportTask[]) => Promise<unknown>;
  onClose: () => void;
}

export default function ReportTasksToApp({ report, onTasksLinked, onClose }: Readonly<Props>) {
  const id = useId();
  const { user, supabase } = useAuth();
  const { toast } = useToast();
  const categories = useTaskCategories();
  const choices = useMemo(() => reportTaskChoices(report), [report]);
  const [category, setCategory] = useState(() => defaultTaskCategory(categories));
  const [dueByIndex, setDueByIndex] = useState<Record<number, string>>({});
  const [busyIndex, setBusyIndex] = useState<number | null>(null);

  const pendingCount = choices.filter((c) => !c.added).length;

  const addOne = async (index: number) => {
    const choice = choices.find((c) => c.index === index);
    if (!user || !choice || choice.added) return;
    setBusyIndex(index);
    try {
      const row = toAppTask(report, choice.task, {
        userId: user.id,
        category,
        fallbackDue: dueByIndex[index] ?? getAppDate(),
      });
      const { data, error } = await supabase.from("tasks").insert(row).select("id").single();
      if (error || !data) throw error ?? new Error("insert");
      await onTasksLinked(
        withAppTaskIds(report.tasks ?? [], new Map([[index, String((data as { id: string | number }).id)]]))
      );
      toast.success(`Dodano do Zadań: ${choice.task.zadanie}`);
    } catch {
      toast.error("Nie udało się dodać zadania.");
    } finally {
      setBusyIndex(null);
    }
  };

  if (choices.length === 0) {
    return <p className="text-sm text-text-secondary">Ten protokół nie ma zadań.</p>;
  }

  return (
    <section aria-labelledby={`${id}-h`} className="space-y-3 rounded-lg border border-line p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 id={`${id}-h`} className="text-sm font-semibold text-text">
          Dodaj do zadań
        </h4>
        {pendingCount > 0 && (
          <div className="min-w-40">
            <label htmlFor={`${id}-cat`} className="sr-only">
              Kategoria dodawanych zadań
            </label>
            <select
              id={`${id}-cat`}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input-field"
              title="Kategoria dodawanych zadań"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <ul className="divide-y divide-line">
        {choices.map((c) => (
          <li key={c.index} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2">
            <div className="min-w-0 flex-1">
              <p className={`text-sm ${c.added ? "text-text-secondary" : "text-text"}`}>{c.task.zadanie}</p>
              <p className="text-xs text-text-secondary">
                {c.task.data ? `${formatReportDate(c.task.data)}` : "-"}
                {c.task.osoba ? `, ${c.task.osoba}` : ""}
              </p>
            </div>

            {c.added ? (
              <span className="inline-flex min-h-11 items-center gap-1.5 text-sm text-success">
                Dodane <Check className="h-4 w-4" aria-hidden="true" />
              </span>
            ) : (
              <div className="flex items-center gap-2">
                {!c.task.data && (
                  <>
                    <label htmlFor={`${id}-due-${c.index}`} className="sr-only">
                      Termin zadania „{c.task.zadanie}”
                    </label>
                    <input
                      id={`${id}-due-${c.index}`}
                      type="date"
                      value={dueByIndex[c.index] ?? getAppDate()}
                      onChange={(e) => setDueByIndex((prev) => ({ ...prev, [c.index]: e.target.value }))}
                      className="input-field w-auto"
                    />
                  </>
                )}
                <AddButton
                  small
                  onClick={() => void addOne(c.index)}
                  disabled={busyIndex !== null}
                  ariaLabel={`Dodaj do Zadań: ${c.task.zadanie}`}
                />
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="flex justify-end">
        <CancelButton onClick={onClose} />
      </div>
    </section>
  );
}
