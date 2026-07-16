// components/ui/Skeleton.tsx

import React from "react";

function Bar({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-gray-200 dark:bg-gray-700 ${className}`}
    />
  );
}

export const SkeletonLine = Bar;

export function SkeletonCard({ lines = 2 }: { lines?: number }) {
  return (
    <div className="bg-card border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm flex flex-col gap-3">
      <Bar className="h-4 w-2/5" />
      {Array.from({ length: lines }).map((_, i) => (
        <Bar
          key={i}
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
          <Bar className="h-3 w-6 flex-1"/>
        </div>
      ))}
    </div>
  );
}

export function SkeletonCalendar() {
  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-7 gap-1 mb-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Bar key={i} className="h-6 w-full" />
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, week) => (
        <div key={week} className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, day) => (
            <Bar key={day} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonTaskList({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
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

export function SkeletonBudgetTable({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-4 gap-4 px-4 py-2">
        {["w-24", "w-16", "w-20", "w-16"].map((w, i) => (
          <Bar key={i} className={`h-3 ${w}`} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
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

export function SkeletonStopCard({ departures = 4 }: { departures?: number }) {
  return (
    <div className="bg-card border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Bar className="h-8 w-8 shrink-0 rounded-lg" />
        <Bar className="h-4 w-1/3" />
      </div>
      {Array.from({ length: departures }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 pl-2">
          <Bar className="h-6 w-12 shrink-0 rounded-md" />
          <Bar className="h-3 flex-1" />
          <Bar className="h-4 w-10 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonWeather() {
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
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
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
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
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

export function SkeletonDaySchema({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
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
  return (
    <div className="flex flex-col gap-4">
      <div className="card rounded-2xl shadow-sm p-3">
        <Bar className="h-3 w-16 mb-3" />
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Bar key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      </div>
      <div className="card rounded-xl shadow-sm p-4 flex flex-col gap-4">
        <Bar className="h-5 w-2/5" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
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
  count?: number;
  variant?: "card" | "row" | "streak" | "movie";
}) {
  const Item = {
    card: SkeletonCard,
    row: SkeletonRow,
    streak: SkeletonStreakCard,
    movie: SkeletonMovieCard,
  }[variant];

  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <Item key={i} />
      ))}
    </div>
  );
}
