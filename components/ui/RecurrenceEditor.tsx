// components/ui/RecurrenceEditor.tsx
//
// Edytor powtarzania dla wydarzeń i zadań. Na górze zwykły wybór (nie /
// codziennie / co tydzień / co miesiąc / co rok); szczegóły (co ile, dni
// tygodnia, wariant miesięczny, koniec) pojawiają się dopiero po wyborze.
// Pod spodem opis reguły słowami – ogłaszany czytnikom ekranu.

import React, { useId } from "react";
import {
  describeRule,
  MAX_COUNT,
  MAX_INTERVAL,
  weekdayPosition,
  type RecurrenceFreq,
  type RecurrenceRule,
} from "@/shared/recurrence";

interface Props {
  value: RecurrenceRule | null;
  onChange: (rule: RecurrenceRule | null) => void;
  /** Dzień startu (yyyy-MM-dd) – od niego zależą warianty miesięczne i opis. */
  startDay: string;
  /** Zadania nie liczą wystąpień – ukrywa opcję „po N razach”. */
  allowCount?: boolean;
  disabled?: boolean;
  idPrefix?: string;
}

const WEEKDAYS = [
  { short: "Pn", long: "poniedziałek" },
  { short: "Wt", long: "wtorek" },
  { short: "Śr", long: "środa" },
  { short: "Cz", long: "czwartek" },
  { short: "Pt", long: "piątek" },
  { short: "Sb", long: "sobota" },
  { short: "Nd", long: "niedziela" },
];
const WEEKDAY_ACC = ["poniedziałek", "wtorek", "środę", "czwartek", "piątek", "sobotę", "niedzielę"];

const UNIT_LABEL: Record<RecurrenceFreq, string> = {
  daily: "dni",
  weekly: "tyg.",
  monthly: "mies.",
  yearly: "lat",
};

type EndMode = "never" | "until" | "count";

function endModeOf(rule: RecurrenceRule | null): EndMode {
  if (rule?.until) return "until";
  if (rule?.count) return "count";
  return "never";
}

/** Zaznaczone dni tygodnia; bez wyboru – dzień startu. */
function selectedWeekdays(rule: RecurrenceRule, startWeekday: number | null): number[] {
  if (rule.byWeekday?.length) return rule.byWeekday;
  return startWeekday === null ? [] : [startWeekday];
}

export default function RecurrenceEditor({
  value,
  onChange,
  startDay,
  allowCount = true,
  disabled,
  idPrefix,
}: Readonly<Props>) {
  const autoId = useId();
  const id = idPrefix ?? autoId;
  const pos = startDay ? weekdayPosition(startDay) : null;
  const endMode = endModeOf(value);
  const startWeekday = pos ? pos.weekday : null;

  const setFreq = (freq: RecurrenceFreq | "none") => {
    if (freq === "none") return onChange(null);
    const base: RecurrenceRule = { freq, interval: value?.freq === freq ? value.interval : 1 };
    if (freq === "weekly" && pos) base.byWeekday = [pos.weekday];
    if (freq === "monthly") base.monthlyBy = "monthday";
    onChange({ ...base, until: value?.until ?? null, count: value?.count ?? null });
  };

  const patch = (p: Partial<RecurrenceRule>) => value && onChange({ ...value, ...p });

  const toggleWeekday = (d: number) => {
    if (!value) return;
    const current = selectedWeekdays(value, startWeekday);
    const next = current.includes(d) ? current.filter((x) => x !== d) : [...current, d].sort((a, b) => a - b);
    if (next.length > 0) patch({ byWeekday: next }); // co najmniej jeden dzień
  };

  const setEnd = (mode: EndMode) => {
    if (mode === "never") patch({ until: null, count: null });
    if (mode === "until") patch({ count: null, until: value?.until ?? startDay });
    if (mode === "count") patch({ until: null, count: value?.count ?? 10 });
  };

  const freqValue = value?.freq ?? "none";

  return (
    <fieldset className="space-y-3" disabled={disabled}>
      <legend className="sr-only">Powtarzanie</legend>
      <div className="grid grid-cols-[1fr_auto] items-end gap-2">
        <div>
          <label htmlFor={`${id}-freq`} className="form-label">
            Powtarzaj:
          </label>
          <select
            id={`${id}-freq`}
            value={freqValue}
            onChange={(e) => setFreq(e.target.value as RecurrenceFreq | "none")}
            className="input-field"
          >
            <option value="none">Nie powtarzaj</option>
            <option value="daily">Codziennie</option>
            <option value="weekly">Co tydzień</option>
            <option value="monthly">Co miesiąc</option>
            <option value="yearly">Co rok</option>
          </select>
        </div>
        {value && (
          <div>
            <label htmlFor={`${id}-interval`} className="form-label">
              Co ile:
            </label>
            <div className="flex items-center gap-2">
              <input
                id={`${id}-interval`}
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_INTERVAL}
                value={value.interval}
                onChange={(e) => patch({ interval: Math.min(MAX_INTERVAL, Math.max(1, Number(e.target.value) || 1)) })}
                className="input-field w-20 text-center"
              />
              <span className="text-sm text-text-secondary">{UNIT_LABEL[value.freq]}</span>
            </div>
          </div>
        )}
      </div>

      {value?.freq === "weekly" && (
        <fieldset>
          <legend className="sr-only">Dni tygodnia</legend>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map((d, i) => {
              const active = selectedWeekdays(value, startWeekday).includes(i);
              return (
                <button
                  key={d.short}
                  type="button"
                  aria-pressed={active}
                  aria-label={d.long}
                  onClick={() => toggleWeekday(i)}
                  className={`h-11 w-11 rounded-full border text-sm font-semibold transition-colors ${
                    active ? "border-text bg-text text-card" : "border-line-strong text-text-secondary hover:text-text"
                  }`}
                >
                  {d.short}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => patch({ byWeekday: [0, 1, 2, 3, 4] })}
            className="mt-2 min-h-11 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Ustaw dni robocze
          </button>
        </fieldset>
      )}

      {value?.freq === "monthly" && pos && (
        <fieldset className="space-y-1">
          <legend className="form-label">W który dzień:</legend>
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="radio"
              name={`${id}-monthly`}
              className="h-5 w-5"
              checked={value.monthlyBy !== "nth_weekday"}
              onChange={() => patch({ monthlyBy: "monthday", nth: undefined })}
            />
            <span>
              {Number(startDay.slice(8, 10))}. dnia miesiąca
              {Number(startDay.slice(8, 10)) > 28 && (
                <span className="block text-sm text-text-secondary">w krótszych miesiącach – ostatniego dnia</span>
              )}
            </span>
          </label>
          {pos.nth <= 4 && (
            <label className="flex min-h-11 items-center gap-3">
              <input
                type="radio"
                name={`${id}-monthly`}
                className="h-5 w-5"
                checked={value.monthlyBy === "nth_weekday" && value.nth !== -1}
                onChange={() => patch({ monthlyBy: "nth_weekday", nth: pos.nth })}
              />
              <span>
                w {pos.nth}. {WEEKDAY_ACC[pos.weekday]} miesiąca
              </span>
            </label>
          )}
          {pos.isLast && (
            <label className="flex min-h-11 items-center gap-3">
              <input
                type="radio"
                name={`${id}-monthly`}
                className="h-5 w-5"
                checked={value.monthlyBy === "nth_weekday" && value.nth === -1}
                onChange={() => patch({ monthlyBy: "nth_weekday", nth: -1 })}
              />
              <span>w ostatni {WEEKDAY_ACC[pos.weekday]} miesiąca</span>
            </label>
          )}
        </fieldset>
      )}

      {value && (
        <fieldset className="space-y-1">
          <legend className="form-label">Koniec:</legend>
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="radio"
              name={`${id}-end`}
              className="h-5 w-5"
              checked={endMode === "never"}
              onChange={() => setEnd("never")}
            />
            <span>Bez końca</span>
          </label>
          <div className="flex min-h-11 flex-wrap items-center gap-3">
            <label className="flex items-center gap-3">
              <input
                type="radio"
                name={`${id}-end`}
                className="h-5 w-5"
                checked={endMode === "until"}
                onChange={() => setEnd("until")}
              />
              <span>Do dnia</span>
            </label>
            {endMode === "until" && (
              <>
                <label htmlFor={`${id}-until`} className="sr-only">
                  Ostatni dzień powtarzania
                </label>
                <input
                  id={`${id}-until`}
                  type="date"
                  min={startDay}
                  value={value.until ?? ""}
                  onChange={(e) => patch({ until: e.target.value || null })}
                  className="input-field w-auto"
                />
              </>
            )}
          </div>
          {allowCount && (
            <div className="flex min-h-11 flex-wrap items-center gap-3">
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name={`${id}-end`}
                  className="h-5 w-5"
                  checked={endMode === "count"}
                  onChange={() => setEnd("count")}
                />
                <span>Po liczbie powtórzeń</span>
              </label>
              {endMode === "count" && (
                <>
                  <label htmlFor={`${id}-count`} className="sr-only">
                    Liczba powtórzeń
                  </label>
                  <input
                    id={`${id}-count`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={MAX_COUNT}
                    value={value.count ?? 10}
                    onChange={(e) => patch({ count: Math.min(MAX_COUNT, Math.max(1, Number(e.target.value) || 1)) })}
                    className="input-field w-24 text-center"
                  />
                </>
              )}
            </div>
          )}
        </fieldset>
      )}

      <p aria-live="polite" className="text-sm text-text-secondary">
        {describeRule(value, startDay)}
      </p>
    </fieldset>
  );
}
