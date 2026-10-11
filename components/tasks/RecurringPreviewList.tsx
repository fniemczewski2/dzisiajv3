// components/tasks/RecurringPreviewList.tsx
//
// Podgląd przyszłych wystąpień zadań cyklicznych. Tylko do odczytu: wystąpienie
// staje się prawdziwym zadaniem po wykonaniu bieżącego. Wygląd odróżnia je od
// zwykłych zadań przerywaną ramką, a nie tylko kolorem.

import React, { useId } from "react";
import { Repeat } from "lucide-react";
import type { TaskOccurrencePreview } from "@/lib/taskOccurrences";
import { groupPreviewsByDate } from "@/lib/taskOccurrences";
import { useCategoryColors } from "@/hooks/useTaskCategories";
import { taskRule } from "@/lib/taskRecurrence";
import { describeRule } from "@/supabase/functions/_shared/recurrence";

interface Props {
  previews: readonly TaskOccurrencePreview[];
  title?: string;
  /** Nagłówek dnia nad każdą grupą (lista z wielu dni). */
  groupByDate?: boolean;
}

const dayFmt = new Intl.DateTimeFormat("pl-PL", { weekday: "long", day: "numeric", month: "long" });
const shortFmt = (day: string) => day.split("-").reverse().slice(0, 2).join(".");

function PreviewRow({ preview }: Readonly<{ preview: TaskOccurrencePreview }>) {
  const colors = useCategoryColors();
  const { task } = preview;
  const color = task.category ? colors[task.category] : undefined;
  const rule = taskRule(task);
  return (
    <li className="rounded-card border border-dashed border-line-strong px-3 py-2.5">
      <div className="flex items-start gap-3">
        <Repeat className="mt-0.5 h-4 w-4 shrink-0 text-text-secondary" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-medium leading-snug text-text-secondary">
            <span className="sr-only">Podgląd powtórzenia: </span>
            {task.title}
          </p>
          <p className="mt-0.5 text-sm text-text-secondary">
            {rule ? describeRule(rule, task.due_date) : "Powtarza się"}
            {" · "}
            {task.status === "done"
              ? "bieżące wystąpienie zrobione"
              : `pojawi się po wykonaniu bieżącego (termin ${shortFmt(task.due_date)})`}
          </p>
        </div>
        {task.category && (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-sm text-text-secondary">
            {color && <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />}
            {task.category}
          </span>
        )}
      </div>
    </li>
  );
}

export default function RecurringPreviewList({ previews, title = "Powtórzenia (podgląd)", groupByDate = false }: Readonly<Props>) {
  const headingId = useId();
  if (previews.length === 0) return null;

  return (
    <section aria-labelledby={headingId} className="mt-6">
      <h3 id={headingId} className="mb-2 flex items-center gap-2 text-sm font-semibold text-text-secondary">
        <Repeat className="h-4 w-4" aria-hidden="true" />
        {title} <span className="tabular-nums">({previews.length})</span>
      </h3>
      {groupByDate ? (
        <div className="space-y-4">
          {[...groupPreviewsByDate(previews)].map(([date, items]) => (
            <div key={date}>
              <h4 className="mb-1.5 text-sm font-medium text-text first-letter:uppercase">
                {dayFmt.format(new Date(`${date}T12:00:00`))}
              </h4>
              <ul className="space-y-2">
                {items.map((p) => <PreviewRow key={p.key} preview={p} />)}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <ul className="space-y-2">
          {previews.map((p) => <PreviewRow key={p.key} preview={p} />)}
        </ul>
      )}
    </section>
  );
}
