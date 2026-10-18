// components/calendar/ConflictNotice.tsx
//
// Ostrzeżenie o nakładaniu się terminów w formularzu wydarzenia.
// Region jest „żywy” (aria-live), więc czytnik ekranu ogłosi kolizję w chwili,
// gdy pojawi się po zmianie godziny – bez przenoszenia fokusu.

import { MAX_LISTED_CONFLICTS } from "@/config/limits";
import React, { forwardRef } from "react";
import { AlertTriangle, CalendarRange } from "lucide-react";
import { ConflictReport, formatConflictRange } from "@/lib/eventConflicts";

interface Props {
  report: ConflictReport;
  /** Użytkownik raz nacisnął „Zapisz” mimo kolizji – kolejne naciśnięcie zapisze. */
  acknowledged: boolean;
  id?: string;
}

const ConflictNotice = forwardRef<HTMLDivElement, Readonly<Props>>(function ConflictNotice(
  { report, acknowledged, id },
  ref
) {
  const { overlaps, allDay } = report;
  if (overlaps.length === 0 && allDay.length === 0) {
    return <div ref={ref} id={id} aria-live="polite" className="sr-only" />;
  }

  return (
    <div
      ref={ref}
      id={id}
      aria-live="polite"
      tabIndex={-1}
      className="space-y-2 rounded-lg focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card focus:outline-none focus-visible:ring-2"
    >
      {overlaps.length > 0 && (
        <div className="rounded-lg border-l-4 border-warning-line bg-warning-soft px-3 py-2.5 text-warning">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {overlaps.length === 1
              ? "Ten termin nakłada się na:"
              : `Ten termin nakłada się na ${overlaps.length} wydarzenia:`}
          </p>
          <ul className="mt-1.5 space-y-1 text-sm">
            {overlaps.slice(0, MAX_LISTED_CONFLICTS).map((c) => (
              <li key={c.event.id} className="flex gap-2">
                <span className="shrink-0 font-medium tabular-nums">{formatConflictRange(c)}</span>
                <span className="min-w-0 truncate">{c.event.title}</span>
              </li>
            ))}
            {overlaps.length > MAX_LISTED_CONFLICTS && <li>i {overlaps.length - MAX_LISTED_CONFLICTS} więcej</li>}
          </ul>
          <p className="mt-2 text-sm">
            {acknowledged
              ? "Naciśnij „Zapisz” jeszcze raz, żeby zapisać mimo to."
              : "Zmień godzinę albo zapisz mimo to."}
          </p>
        </div>
      )}

      {allDay.length > 0 && (
        <p className="flex items-start gap-2 text-sm text-text-secondary">
          <CalendarRange className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Tego dnia trwa też:{" "}
            {allDay
              .slice(0, MAX_LISTED_CONFLICTS)
              .map((c) => c.event.title)
              .join(", ")}
            {allDay.length > MAX_LISTED_CONFLICTS ? ` i ${allDay.length - MAX_LISTED_CONFLICTS} więcej` : ""}.
          </span>
        </p>
      )}
    </div>
  );
});

export default ConflictNotice;
