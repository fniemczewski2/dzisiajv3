// components/ui/Skeleton.tsx
// Zestaw komponentów szkieletowych — zastępują toast.loading przy ładowaniu danych.
// Używaj: jeśli hook zwraca fetching=true, pokaż odpowiedni szkielet zamiast treści.

import React from "react";

// ---------------------------------------------------------------------------
// Primitive — pojedyncza animowana belka
// ---------------------------------------------------------------------------
function Bar({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-gray-200 dark:bg-gray-700 ${className}`}
    />
  );
}

// ---------------------------------------------------------------------------
// Karta z tytułem i kilkoma liniami tekstu — notatki, raporty, przepisy
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Karta pozioma z ikoną i tekstem — pociągi, rachunki, kontakty
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Karta streaka / celu — duża ikona + tytuł + licznik dni
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Karta filmu — plakat po lewej, info po prawej
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Lista zakupów — tytuł + kilka checkboxów
// ---------------------------------------------------------------------------
export function SkeletonShoppingList() {
  return (
    <div className="bg-card border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm flex flex-col gap-3">
      <Bar className="h-5 w-2/5" />
      {[85, 70, 60].map((w) => (
        <div key={w} className="flex items-center gap-3">
          <Bar className="h-4 w-4 shrink-0 rounded" />
          <Bar className="h-3 flex-1" style={{ maxWidth: `${w}%` }} />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Siatka kalendarza — komórki dni
// ---------------------------------------------------------------------------
export function SkeletonCalendar() {
  return (
    <div className="flex flex-col gap-1">
      {/* Nagłówki dni tygodnia */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Bar key={i} className="h-6 w-full" />
        ))}
      </div>
      {/* 5 tygodni */}
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

// ---------------------------------------------------------------------------
// Lista zadań — wiersze z checkboxem i priorytetem
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Tabela budżetu — wiersze z kwotami
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Transport — karta przystanku z odjazdami
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Pogoda — główna karta z temperaturą i prognozą
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Profil / wizytówka
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Raport — nagłówek + kilka paragrafów
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Schemat dnia — belka z godziną i tytułem
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Lista — generyczna, kiedy żaden inny wariant nie pasuje
// ---------------------------------------------------------------------------
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
