// components/dashboard/PlanItem.tsx

import React from "react";
import { Calendar, Dumbbell, ShoppingCart, Clapperboard, ScrollText } from "lucide-react";
import Link from "next/link";
import TimeContextBadge from "../tasks/TimeContextBadge";
import { formatTime } from "@/lib/dateUtils";
import { PlanItemData } from "@/types/schemas";
import { ConfirmButton, DeleteButton, actionButton } from "../ui/CommonButtons";

interface PlanItemProps {
  item: PlanItemData;
  onMarkAsDone?: (id: string) => void;
  onRemoveFromSchedule?: (taskId: string) => void;
}

const getQuickLink = (title: string): { path: string; icon: React.ReactNode; label: string } | null => {
  const t = title.toLowerCase();
  if (t.includes("trening"))   return { path: "/training",       icon: <Dumbbell className="w-4 h-4" />,     label: "Trening" };
  if (t.includes("zakupy"))    return { path: "/notes/shopping",  icon: <ShoppingCart className="w-4 h-4" />, label: "Zakupy" };
  if (t.includes("spotkanie")) return { path: "/notes/reports",   icon: <ScrollText className="w-4 h-4" />,   label: "Raporty" };
  if (t.includes("film"))      return { path: "/notes/movies",    icon: <Clapperboard className="w-4 h-4" />, label: "Filmy" };
  return null;
};

const priorityColors: Record<number, { bg: string; text: string }> = {
  1: { bg: "#fca5a5", text: "#B91C1C" },
  2: { bg: "#fdba74", text: "#B91C1C" },
  3: { bg: "#fde68a", text: "#A16207" },
  4: { bg: "#a7f3d0", text: "#15803D" },
  5: { bg: "#bbf7d0", text: "#15803D" },
};

const getLabel = (item: PlanItemData): string => {
  switch (item.type) {
    case "event":  return "Wydarzenie";
    case "schema": return "Rutyna";
    case "task":   return item.data?.category ?? "Zadanie";
    case "worklog": return "Praca";
    default:       return "";
  }
};

const getTimes = (e: PlanItemData["data"]) => {
  if (e?.start_time && e?.end_time) {
      const isSameDay = e.start_time.slice(0, 10) === e.end_time.slice(0, 10);
    
      const renderedTime = isSameDay ? (
        <>{formatTime(e.start_time)} - {formatTime(e.end_time)}</>
      ) : (
        <>{formatTime(e.start_time, true)} - {formatTime(e.end_time, true)}</>
      );
    return renderedTime
  }

  return null
}

export const PlanItem = React.memo(({ item, onMarkAsDone, onRemoveFromSchedule }: Readonly<PlanItemProps>) => {
  const quickLink = getQuickLink(item.title);
  const colors = priorityColors[item.data?.priority as 1 | 2 | 3 | 4 | 5] ?? priorityColors[3];

  return (
    <div className="mb-2 p-2 rounded-lg flex justify-between items-center group bg-surface border border-gray-200 dark:border-gray-800 shadow-sm text-text transition-colors">      
      <div className="flex-1 min-w-0 pr-2 gap-y-1 flex flex-col">
        <p className="flex items-center gap-2 font-bold text-sm leading-tight truncate">
          {item.type === "task" && (
            <span
              className="w-5 h-5 text-[10px] font-bold rounded flex items-center justify-center shadow-sm shrink-0"
              style={{ backgroundColor: colors.bg, color: colors.text }}
            >
              {item.data?.priority}
            </span>
          )}
          {item.title}
        </p>
        <p className="flex items-center flex-wrap gap-2">
          {item.type === "task" && <TimeContextBadge dueDate={item.data?.due_date ?? ""} small />}
          {(item.type === 'event' || item.type === 'worklog') && <span className="text-[10px] text-textMuted">{getTimes(item.data)}</span>}
          <span className="text-[8px] font-semibold uppercase tracking-wider text-textMuted">
            {getLabel(item)}
          </span>

        </p>

      </div>
      <div className="flex items-center gap-1.5 shrink-0" onPointerDown={(e) => e.stopPropagation()}>
        {quickLink && (
          // Reuses the shared `actionButton` cva variant instead of a
          // hand-copied class string, so a future style tweak to that
          // variant doesn't have to be re-applied here separately.
          <Link href={quickLink.path} title={quickLink.label} className={actionButton({ color: "blue" })}>
            {quickLink.icon}
          </Link>
        )}

        {item.type === "event" && (
          <Link href="/calendar" title="Pokaż w kalendarzu" className={actionButton({ color: "blue" })}>
            <Calendar className="w-4 h-4" />
          </Link>
        )}

        {(item.type === "task" || item.type === "schema") && onMarkAsDone && onRemoveFromSchedule && (
          <>
            <ConfirmButton
              onClick={() => { onMarkAsDone(item.id); }}
              label="Zrobione"
              small
            />
            <DeleteButton
              onClick={() => { onRemoveFromSchedule(item.id); }}
              small
            />

          </>
        )}
      </div>
    </div>
  );
});
PlanItem.displayName = "PlanItem";
