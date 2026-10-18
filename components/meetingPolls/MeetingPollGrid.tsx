// components/meetingPolls/MeetingPollGrid.tsx

import React from "react";
import { Check } from "lucide-react";
import { formatPollDay, slotKey } from "@/lib/meetingPollGrid";

export interface GridSelection {
  date: string;
  startIndex: number;
  endIndex: number;
}

interface MeetingPollGridProps {
  dates: string[];
  times: string[];
  totalResponses: number;
  countsByKey: Record<string, number>;
  respondentsByKey: Record<string, string[]>;
  /** Klucze slotów, w których dostępna jest wybrana osoba; brak = widok zbiorczy. */
  personSlots?: Set<string> | null;
  personName?: string;
  selection: GridSelection | null;
  anchor: { date: string; index: number } | null;
  onActivate: (date: string, index: number) => void;
}

function heatClass(count: number, total: number): string {
  if (total === 0 || count === 0) return "bg-surface text-text-muted";
  const ratio = count / total;
  if (ratio >= 0.99) return "bg-secondary text-white";
  if (ratio >= 0.66) return "bg-info-line text-text";
  if (ratio >= 0.33) return "bg-info-soft text-text";
  return "bg-info-soft text-text-secondary";
}

function CellContent({ personMode, free, count }: Readonly<{ personMode: boolean; free: boolean; count: number }>) {
  if (personMode) return free ? <Check aria-hidden="true" className="h-4 w-4" strokeWidth={3} /> : null;
  return count > 0 ? <>{count}</> : null;
}

function cellTone(inSelection: boolean, personMode: boolean, free: boolean, count: number, total: number): string {
  if (inSelection) return "bg-warning-line text-text";
  if (personMode) return free ? "bg-accent text-white dark:text-background" : "bg-surface";
  return heatClass(count, total);
}

function tooltipText(personMode: boolean, label: string, names: string[]): string {
  if (personMode) return label;
  return names.length > 0 ? names.join(", ") : "Nikt nie jest dostępny";
}

function availabilityText(personMode: boolean, free: boolean, names: string[], personName?: string): string {
  if (personMode) return `${personName ?? "osoba"}: ${free ? "dostępność zaznaczona" : "brak zaznaczenia"}`;
  return names.length > 0 ? `dostępni - ${names.join(", ")}` : "nikt niedostępny";
}

export function GridLegend({ personMode }: Readonly<{ personMode: boolean }>) {
  if (personMode) {
    return (
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-secondary" aria-label="Legenda">
        <li className="flex items-center gap-1.5">
          <span className="flex h-4 w-4 items-center justify-center rounded-lg bg-accent text-white dark:text-background">
            <Check aria-hidden="true" className="h-3 w-3" strokeWidth={3} />
          </span>
          <span>Zaznaczona dostępność</span>
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-4 w-4 rounded-lg bg-surface ring-1 ring-line-strong ring-inset" />
          <span>Brak zaznaczenia</span>
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-4 w-4 rounded-lg bg-warning-line" />
          <span>Wybrany zakres</span>
        </li>
      </ul>
    );
  }
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-secondary" aria-label="Legenda">
      <li className="flex items-center gap-1.5">
        <span className="h-4 w-4 rounded-lg bg-surface ring-1 ring-line-strong ring-inset" />
        <span>Nikt</span>
      </li>
      <li className="flex items-center gap-1.5">
        <span className="flex gap-0.5" aria-hidden="true">
          <span className="h-4 w-3 rounded-l bg-info-soft" />
          <span className="h-4 w-3 bg-info-soft" />
          <span className="h-4 w-3 bg-info-line" />
          <span className="h-4 w-3 rounded-r bg-secondary" />
        </span>
        <span>Im ciemniej, tym więcej osób</span>
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-4 w-4 rounded-lg bg-warning-line" />
        <span>Wybrany zakres</span>
      </li>
    </ul>
  );
}

export default function MeetingPollGrid({
  dates,
  times,
  totalResponses,
  countsByKey,
  respondentsByKey,
  personSlots,
  personName,
  selection,
  anchor,
  onActivate,
}: Readonly<MeetingPollGridProps>) {
  const personMode = Boolean(personSlots);

  return (
    <div className="max-h-[70vh] overflow-auto rounded-xl">
      <table className="w-full border-separate border-spacing-0 select-none">
        <caption className="sr-only">
          {personMode
            ? `Dostępność: ${personName ?? "wybrana osoba"}`
            : "Liczba osób dostępnych w poszczególnych terminach"}
        </caption>
        <thead>
          <tr>
            <th scope="col" className="sticky top-0 left-0 z-30 bg-card p-1">
              <span className="sr-only">Godzina</span>
            </th>
            {dates.map((date) => {
              const { weekday, day } = formatPollDay(date);
              return (
                <th
                  scope="col"
                  key={date}
                  className="sticky top-0 z-20 min-w-14 bg-card px-1 pt-1 pb-2 text-center font-normal"
                >
                  <span className="block text-xs leading-none text-text-muted">{weekday}</span>
                  <span className="mt-1 block text-sm leading-none font-semibold text-text tabular-nums">{day}</span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {times.map((time, timeIndex) => {
            const isHour = time.endsWith(":00");
            return (
              <tr key={time}>
                <th
                  scope="row"
                  className={`sticky left-0 z-10 bg-card py-0 pr-2 text-right text-xs whitespace-nowrap tabular-nums ${
                    isHour ? "font-semibold text-text-secondary" : "font-normal text-text-muted"
                  }`}
                >
                  {time}
                </th>
                {dates.map((date) => {
                  const key = slotKey(date, time);
                  const count = countsByKey[key] ?? 0;
                  const names = respondentsByKey[key] ?? [];
                  const inSelection =
                    selection?.date === date && timeIndex >= selection.startIndex && timeIndex <= selection.endIndex;
                  const isAnchor = anchor?.date === date && anchor.index === timeIndex;
                  const free = personSlots?.has(key) ?? false;

                  const tone = cellTone(inSelection, personMode, free, count, totalResponses);
                  const availabilityLabel = availabilityText(personMode, free, names, personName);
                  const tooltip = tooltipText(personMode, availabilityLabel, names);

                  return (
                    <td
                      key={date}
                      className={`border-card p-0 ${isHour ? "border-t-2 border-t-line" : "border-t"} border-x`}
                    >
                      <button
                        type="button"
                        onClick={() => onActivate(date, timeIndex)}
                        title={tooltip}
                        aria-label={`${date} ${time}: ${availabilityLabel}${
                          isAnchor ? ". Początek zakresu – wybierz godzinę końcową" : ""
                        }`}
                        aria-pressed={inSelection}
                        className={`flex h-9 w-full min-w-14 cursor-pointer items-center justify-center text-xs font-semibold tabular-nums transition-colors hover:brightness-95 dark:hover:brightness-110 ${tone} ${
                          isAnchor ? "ring-2 ring-text ring-inset" : ""
                        }`}
                      >
                        <CellContent personMode={personMode} free={free} count={count} />
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
