// components/ui/Skeleton.tsx

import React, { useId, useMemo } from "react";

function Bar({ className = "" }: { readonly className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-gray-200 dark:bg-gray-700 ${className}`}
    />
  );
}

export const SkeletonLine = Bar;

export function SkeletonCard({ lines = 2 }: { readonly lines?: number }) {
  const id = useId();
  const lineIds = useMemo(() => Array.from({ length: lines }, (_, i) => `${id}-line-${i}`), [lines, id]);

  return (
    <div className="bg-card border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm flex flex-col gap-3">
      <Bar className="h-4 w-2/5" />
      {lineIds.map((lineId, i) => (
        <Bar
          key={lineId}
          className={`h-3 ${i === lines - 1 ? "w-3/5" : "w-full"}`}
        />
      ))}
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="bg-card border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm flex items-center gap-4">
      <Bar className="h-10 w-10 shrink-0 rounded-full" />
      <div className="flex-1 flex flex-col gap-2">
        <Bar className="h-4 w-1/2" />
        <Bar className="h-3 w-1/3" />
      </div>
    </div>
  );
}

export function SkeletonStreakCard() {
  return (
    <div className="bg-card border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm flex gap-4 items-center">
      <Bar className="h-14 w-14 shrink-0 rounded-xl" />
      <div className="flex-1 flex flex-col gap-2.5">
        <Bar className="h-4 w-3/5" />
        <Bar className="h-3 w-2/5" />
        <Bar className="h-3 w-1/4" />
      </div>
    </div>
  );
}

export function SkeletonMovieCard() {
  return (
    <div className="bg-card border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm flex gap-4 items-start">
      <Bar className="h-24 w-16 shrink-0 rounded-lg" />
      <div className="flex-1 flex flex-col gap-2">
        <Bar className="h-4 w-3/4" />
        <Bar className="h-3 w-1/2" />
        <Bar className="h-3 w-2/3" />
        <Bar className="h-8 w-20 rounded-lg mt-2" />
      </div>
    </div>
  );
}

export function SkeletonShoppingList() {
  return (
    <div className="bg-card border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm flex flex-col gap-3">
      <Bar className="h-5 w-2/5" />
      {[85, 70, 60].map((w) => (
        <div key={w} className="flex items-center gap-3">
          <Bar className="h-4 w-4 shrink-0 rounded" />
          <Bar className="h-3 w-6 flex-1" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCalendar() {
  const id = useId();
  const dayIds = useMemo(() => Array.from({ length: 7 }, (_, i) => `${id}-day-${i}`), [id]);
  const weekIds = useMemo(() => Array.from({ length: 5 }, (_, i) => `${id}-week-${i}`), [id]);

  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayIds.map((dayId) => (
          <Bar key={`header-${dayId}`} className="h-6 w-full" />
        ))}
      </div>
      {weekIds.map((weekId) => (
        <div key={weekId} className="grid grid-cols-7 gap-1">
          {dayIds.map((dayId) => (
            <Bar key={dayId} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonTaskList({ count = 5 }: { readonly count?: number }) {
  const id = useId();
  const taskIds = useMemo(() => Array.from({ length: count }, (_, i) => `${id}-task-${i}`), [count, id]);

  return (
    <div className="flex flex-col gap-2">
      {taskIds.map((taskId, i) => (
        <div
          key={taskId}
          className="bg-card border border-gray-200 dark:border-gray-700 rounded-xl p-3 flex items-center gap-3"
        >
          <Bar className="h-5 w-5 shrink-0 rounded" />
          <Bar className={`h-4 flex-1 ${i % 3 === 0 ? "w-3/4" : "w-full"}`} />
          <Bar className="h-5 w-12 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonBudgetTable({ rows = 6 }: { readonly rows?: number }) {
  const id = useId();
  const cols = useMemo(() => ["w-24", "w-16", "w-20", "w-16"].map((w, i) => ({ id: `${id}-col-${i}`, w })), [id]);
  const rowIds = useMemo(() => Array.from({ length: rows }, (_, i) => `${id}-row-${i}`), [rows, id]);

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-4 gap-4 px-4 py-2">
        {cols.map(({ id: colId, w }) => (
          <Bar key={colId} className={`h-3 ${w}`} />
        ))}
      </div>
      {rowIds.map((rowId) => (
        <div
          key={rowId}
          className="grid grid-cols-4 gap-4 px-4 py-3 bg-card border border-gray-200 dark:border-gray-700 rounded-lg"
        >
          <Bar className="h-4 w-full" />
          <Bar className="h-4 w-3/4" />
          <Bar className="h-4 w-full" />
          <Bar className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonStopCard({ departures = 4 }: { readonly departures?: number }) {
  const id = useId();
  const depIds = useMemo(() => Array.from({ length: departures }, (_, i) => `${id}-dep-${i}`), [departures, id]);

  return (
    <div className="bg-card border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Bar className="h-8 w-8 shrink-0 rounded-lg" />
        <Bar className="h-4 w-1/3" />
      </div>
      {depIds.map((depId) => (
        <div key={depId} className="flex items-center gap-3 pl-2">
          <Bar className="h-6 w-12 shrink-0 rounded-md" />
          <Bar className="h-3 flex-1" />
          <Bar className="h-4 w-10 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonWeather() {
  const id = useId();
  const forecastIds = useMemo(() => Array.from({ length: 5 }, (_, i) => `${id}-forecast-${i}`), [id]);

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-card border border-gray-200 dark:border-gray-700 rounded-xl p-6 flex items-center gap-6">
        <Bar className="h-20 w-20 shrink-0 rounded-2xl" />
        <div className="flex flex-col gap-3">
          <Bar className="h-10 w-32" />
          <Bar className="h-4 w-24" />
          <Bar className="h-3 w-40" />
        </div>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {forecastIds.map((forecastId) => (
          <div
            key={forecastId}
            className="bg-card border border-gray-200 dark:border-gray-700 rounded-xl p-3 flex flex-col items-center gap-2"
          >
            <Bar className="h-3 w-8" />
            <Bar className="h-8 w-8 rounded-lg" />
            <Bar className="h-4 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonProfile() {
  const id = useId();
  const itemIds = useMemo(() => Array.from({ length: 3 }, (_, i) => `${id}-item-${i}`), [id]);

  return (
    <div className="bg-card border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Bar className="h-16 w-16 shrink-0 rounded-full" />
        <div className="flex-1 flex flex-col gap-2">
          <Bar className="h-5 w-2/5" />
          <Bar className="h-3 w-1/3" />
        </div>
      </div>
      <Bar className="h-px w-full" />
      {itemIds.map((itemId) => (
        <div key={itemId} className="flex items-center gap-3">
          <Bar className="h-4 w-4 shrink-0 rounded" />
          <Bar className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonReport() {
  return (
    <div className="bg-card border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <Bar className="h-5 w-2/5" />
        <Bar className="h-4 w-16" />
      </div>
      <Bar className="h-3 w-full" />
      <Bar className="h-3 w-5/6" />
      <Bar className="h-3 w-4/6" />
    </div>
  );
}

export function SkeletonDaySchema({ rows = 5 }: { readonly rows?: number }) {
  const id = useId();
  const rowIds = useMemo(() => Array.from({ length: rows }, (_, i) => `${id}-schema-${i}`), [rows, id]);

  return (
    <div className="flex flex-col gap-2">
      {rowIds.map((rowId) => (
        <div
          key={rowId}
          className="bg-card border border-gray-200 dark:border-gray-700 rounded-xl p-3 flex items-center gap-4"
        >
          <Bar className="h-10 w-14 shrink-0 rounded-lg" />
          <Bar className="h-4 flex-1" />
          <Bar className="h-6 w-6 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonSettings() {
  const id = useId();
  const gridIds = useMemo(() => Array.from({ length: 8 }, (_, i) => `${id}-grid-${i}`), [id]);
  const listIds = useMemo(() => Array.from({ length: 5 }, (_, i) => `${id}-list-${i}`), [id]);

  return (
    <div className="flex flex-col gap-4">
      <div className="card rounded-2xl shadow-sm p-3">
        <Bar className="h-3 w-16 mb-3" />
        <div className="grid grid-cols-4 gap-2">
          {gridIds.map((gridId) => (
            <Bar key={gridId} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      </div>
      <div className="card rounded-xl shadow-sm p-4 flex flex-col gap-4">
        <Bar className="h-5 w-2/5" />
        {listIds.map((listId) => (
          <div key={listId} className="flex items-center justify-between">
            <Bar className="h-3 w-2/5" />
            <Bar className="h-6 w-11 rounded-full" />
          </div>
        ))}
      </div>
      <div className="card rounded-xl shadow-sm p-4 flex items-center gap-4">
        <Bar className="h-10 w-10 shrink-0 rounded-lg" />
        <Bar className="h-4 flex-1" />
      </div>
      <div className="card rounded-xl shadow-sm p-4 flex items-center gap-4">
        <Bar className="h-10 w-10 shrink-0 rounded-lg" />
        <Bar className="h-4 flex-1" />
      </div>
    </div>
  );
}

export function SkeletonTrainCard() {
  return (
    <div className="p-4 pt-10 w-full card rounded-xl relative overflow-hidden">
      <Bar className="absolute top-0 left-0 w-full h-6 rounded-none" />
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col gap-2">
          <Bar className="h-7 w-16" />
          <Bar className="h-5 w-24 rounded-md" />
        </div>
        <div className="flex flex-col items-end gap-2">
          <Bar className="h-5 w-14" />
          <Bar className="h-3 w-10" />
        </div>
      </div>
      <div className="flex items-center gap-3 mb-4 px-1">
        <Bar className="h-4 flex-1 max-w-[40%]" />
        <Bar className="h-px flex-1" />
        <Bar className="h-4 flex-1 max-w-[40%]" />
      </div>
      <div className="flex gap-2 border-t border-gray-100 dark:border-gray-800 pt-3 mt-2">
        <Bar className="h-12 flex-1 rounded-lg" />
        <Bar className="h-12 flex-1 rounded-lg" />
      </div>
    </div>
  );
}

export function SkeletonList({
  count = 4,
  variant = "card",
}: {
  readonly count?: number;
  readonly variant?: "card" | "row" | "streak" | "movie";
}) {
  const id = useId();
  const listIds = useMemo(() => Array.from({ length: count }, (_, i) => `${id}-list-${i}`), [count, id]);

  const Item = {
    card: SkeletonCard,
    row: SkeletonRow,
    streak: SkeletonStreakCard,
    movie: SkeletonMovieCard,
  }[variant];

  return (
    <div className="flex flex-col gap-3">
      {listIds.map((listId) => (
        <Item key={listId} />
      ))}
    </div>
  );
}