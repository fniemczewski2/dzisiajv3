// components/dashboard/PlanItem.tsx

import { getPriorityColors } from "@/config/priority";
import React from "react";
import { Calendar, Dumbbell, ShoppingCart, Clapperboard, ScrollText, Clock } from "lucide-react";
import Link from "next/link";
import TimeContextBadge from "../tasks/TimeContextBadge";
import { formatTime } from "@/lib/dateUtils";
import { PlanItemData } from "@/types/schemas";
import { ConfirmButton, DeleteButton, actionButton } from "../ui/CommonButtons";
import { TrainPlanItem } from "./TrainPlanItem";

interface PlanItemProps {
  item: PlanItemData;
  onMarkAsDone?: (id: string) => void;
  onRemoveFromSchedule?: (taskId: string) => void;
}

const getQuickLink = (title: string): { path: string; icon: React.ReactNode; label: string } | null => {
  const t = title.toLowerCase();
  if (t.includes("trening")) return { path: "/training", icon: <Dumbbell className="h-4 w-4" />, label: "Trening" };
  if (t.includes("zakupy"))
    return { path: "/notes/shopping", icon: <ShoppingCart className="h-4 w-4" />, label: "Zakupy" };
  if (t.includes("spotkanie"))
    return { path: "/notes/reports", icon: <ScrollText className="h-4 w-4" />, label: "Raporty" };
  if (t.includes("film")) return { path: "/notes/movies", icon: <Clapperboard className="h-4 w-4" />, label: "Filmy" };
  return null;
};

const getLabel = (item: PlanItemData): string => {
  switch (item.type) {
    case "event":
      return "Wydarzenie";
    case "schema":
      return "Rutyna";
    case "task":
      return item.data?.category ?? "Zadanie";
    case "worklog":
      return "Praca";
    case "train":
      return "Pociąg";
  }
};

const getTimes = (e: PlanItemData["data"]) => {
  if (e?.start_time && e?.end_time) {
    const isSameDay = e.start_time.slice(0, 10) === e.end_time.slice(0, 10);

    const renderedTime = isSameDay ? (
      <>
        {formatTime(e.start_time)}–{formatTime(e.end_time)}
      </>
    ) : (
      <>
        {formatTime(e.start_time, true)} – {formatTime(e.end_time, true)}
      </>
    );
    return renderedTime;
  }

  return null;
};

export const PlanItem = React.memo(({ item, onMarkAsDone, onRemoveFromSchedule }: Readonly<PlanItemProps>) => {
  if (item.type === "train" && item.train) return <TrainPlanItem train={item.train} />;
  const quickLink = getQuickLink(item.title);
  const colors = getPriorityColors(Number(item.data?.priority ?? 3));

  return (
    <div className="group mb-2 flex items-center justify-between rounded-lg border border-line bg-surface p-2 text-text shadow-sm transition-colors">
      <div className="flex min-w-0 flex-1 flex-col gap-y-1 pr-2">
        <p className="flex items-center gap-2 truncate text-sm leading-tight font-bold">
          {item.type === "task" && (
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg text-xs font-bold shadow-sm"
              style={colors}
            >
              {item.data?.priority}
            </span>
          )}
          {item.title}
        </p>
        <p className="flex flex-wrap items-center gap-2">
          {item.type === "task" && <TimeContextBadge dueDate={item.data?.due_date ?? ""} small />}
          {(item.type === "event" || item.type === "worklog") && getTimes(item.data) && (
            <span className="text-xs text-text-muted">{getTimes(item.data)}</span>
          )}
          <span className="text-xs font-semibold text-text-muted">{getLabel(item)}</span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
        {quickLink && (
          <Link href={quickLink.path} title={quickLink.label} className={actionButton({ color: "info" })}>
            {quickLink.icon}
          </Link>
        )}

        {item.type === "event" && (
          <Link href="/calendar" title="Pokaż w kalendarzu" className={actionButton({ color: "info" })}>
            <Calendar className="h-4 w-4" />
          </Link>
        )}

        {item.type === "worklog" && (
          <Link href="/worklogs" title="Pokaż czas pracy" className={actionButton({ color: "info" })}>
            <Clock className="h-4 w-4" />
          </Link>
        )}

        {(item.type === "task" || item.type === "schema") && onMarkAsDone && onRemoveFromSchedule && (
          <>
            <ConfirmButton
              onClick={() => {
                onMarkAsDone(item.id);
              }}
              label="Zrobione"
              small
            />
            <DeleteButton
              onClick={() => {
                onRemoveFromSchedule(item.id);
              }}
              small
            />
          </>
        )}
      </div>
    </div>
  );
});
PlanItem.displayName = "PlanItem";
