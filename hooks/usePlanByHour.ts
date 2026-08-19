// hooks/usePlanByHour.ts

import { useMemo } from "react";
import type { PlanItemData, Schema, DailyOverride } from "@/types/schemas";
import type { Event } from "@/types/events";
import type { Task } from "@/types/tasks";
import type { WorkLog } from "@/types/worklogs";

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);

function getHourStr(dateStr: string | null | undefined): string | undefined {
  if (!dateStr) return;
  try {
    if (/^\d{2}:\d{2}$/.test(dateStr)) {
      return dateStr.split(":")[0];
    }
    const normalized = dateStr.replace(" ", "T");
    const parts = normalized.split("T");

    if (parts.length > 1) {
      const hour = parts[1].split(":")[0];
      if (hour && !Number.isNaN(Number(hour))) {
        return hour.padStart(2, "0");
      }
    }
  } catch {
    return;
  }
}

interface UsePlanByHourArgs {
  schemas: Schema[];
  events: Event[];
  workLogs: WorkLog[];
  scheduledTasks: Task[];
  currentDayOfWeek: number;
  isToday: boolean;
  overrides: DailyOverride[];
}

/**
 * Extracted from DayView.tsx: builds the hour -> plan-items map that
 * DailyPlan renders, and (for today only) trims hours that are fully in the
 * past with nothing still relevant to show. Kept as its own hook so the
 * layout-heavy DayView component doesn't also own this data-shaping logic.
 */
export function usePlanByHour({
  schemas,
  events,
  workLogs,
  scheduledTasks,
  currentDayOfWeek,
  isToday,
  overrides,
}: UsePlanByHourArgs): Record<string, PlanItemData[]> {
  return useMemo(() => {
    const map: Record<string, PlanItemData[]> = {};
    HOURS.forEach((h) => { map[`${String(h).padStart(2, "0")}:00`] = []; });

    const todaySchema = schemas.find((s) => s.days?.includes(currentDayOfWeek));
    if (todaySchema?.entries) {
      todaySchema.entries.forEach((entry, idx) => {
        const schemaId = `schema-${idx}`;
        const override = overrides.find(o => o.schema_id === schemaId);
        if (override?.is_hidden) return;

        const rawTime = override?.new_time || entry.time;
        const timeMatch = /\d{2}:\d{2}/.exec(rawTime);
        const timeToUse = timeMatch ? timeMatch[0] : rawTime;

        const h = timeToUse.split(":")[0].padStart(2, "0");
        const key = `${h}:00`;

        if (map[key]) {
          map[key].push({
            id: schemaId,
            title: entry.label,
            type: "schema",
          });
        }
      });
    }

    events.forEach((event) => {
      const h = getHourStr(event.start_time);
      if (h) {
        const key = `${h}:00`;
        if (map[key]) {
          map[key].push({ id: event.id, title: event.title, type: "event", data: event });
        }
      }
    });

    scheduledTasks.forEach((task) => {
      if (!task.scheduled_time) return;
      const h = getHourStr(task?.scheduled_time);
      if (h) {
        const key = `${h}:00`;
        if (map[key]) {
          map[key].push({ id: String(task.id), title: task.title, type: "task", data: task });
        }
      }
    });

    workLogs.forEach((w) => {
      const h = getHourStr(w.start_time);
      if (h) {
        const key = `${h}:00`;
        if (map[key]) {
          map[key].push({ id: String(w.id), title: w.description, type: "worklog", data: w });
        }
      }
    });

    if (isToday) {
      const currentHour = new Date().getHours();
      const filteredMap: Record<string, PlanItemData[]> = {};

      Object.keys(map).forEach((timeKey) => {
        const hourNum = Number.parseInt(timeKey.split(":")[0], 10);

        if (hourNum < currentHour) {
          const shouldKeepPastHour = map[timeKey].some(item => {
            if (item.type === "task" || item.type === "schema" || item.type === "worklog") return true;

            if (item.type === "event" && item.data?.end_time) {
              const endH = getHourStr(item.data.end_time);
              if (endH) {
                return Number.parseInt(endH, 10) >= currentHour;
              }
            }
            return false;
          });

          if (shouldKeepPastHour) {
            filteredMap[timeKey] = map[timeKey];
          }
        } else {
          filteredMap[timeKey] = map[timeKey];
        }
      });
      return filteredMap;
    }

    return map;
  }, [schemas, events, workLogs, scheduledTasks, currentDayOfWeek, isToday, overrides]);
}
