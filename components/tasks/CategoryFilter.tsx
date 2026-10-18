// components/tasks/CategoryFilter.tsx

import React from "react";

interface Props {
  categories: readonly string[];
  colors: Readonly<Record<string, string>>;
  /** null = wszystkie. */
  value: string | null;
  onChange: (category: string | null) => void;
}

export default function CategoryFilter({ categories, colors, value, onChange }: Readonly<Props>) {
  if (categories.length === 0) return null;

  const chip = (label: string, category: string | null) => {
    const active = value === category;
    const color = category ? colors[category] : undefined;
    return (
      <li key={category ?? "__all"} className="shrink-0">
        <button
          type="button"
          aria-pressed={active}
          onClick={() => onChange(active && category !== null ? null : category)}
          className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${
            active
              ? "border-text bg-text text-card"
              : "border-line-strong bg-card text-text-secondary hover:border-text-muted hover:text-text"
          }`}
        >
          {color && (
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-full ring-1 ring-card"
              style={{ backgroundColor: color }}
            />
          )}
          {label}
        </button>
      </li>
    );
  };

  return (
    <fieldset className="-mx-3 mb-6 min-w-0 sm:mx-0">
      <legend className="sr-only">Filtruj po kategorii</legend>

      <ul className="flex scrollbar-thin gap-2 overflow-x-auto px-3 pb-1 sm:flex-wrap sm:overflow-visible sm:px-0">
        {chip("wszystkie", null)}
        {categories.map((c) => chip(c, c))}
      </ul>
    </fieldset>
  );
}
