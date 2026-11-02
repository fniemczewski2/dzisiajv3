// components/widgets/DailyStepsWidget.tsx
//
// Kroki dnia ze Skrótów iOS – obok wydatków dnia, w tym samym układzie. Bez zgody lub bez danych: nic.

import React, { useId } from "react";
import { Footprints } from "lucide-react";
import { getAppDate } from "@/lib/dateUtils";
import { useHealthDays } from "@/hooks/db/useHealthData";
import { formatSteps } from "@/lib/health/format";

export default function DailyStepsWidget({ date }: Readonly<{ date?: string }>) {
  const id = useId();
  const day = date ?? getAppDate();
  const { data } = useHealthDays(day, day);
  const steps = data?.[0]?.steps;
  if (steps === undefined || steps === null) return null;

  return (
    <section aria-labelledby={`${id}-h`} className="widget px-4 py-3">
      <h2 id={`${id}-h`} className="sr-only">
        Kroki
      </h2>
      <div className="flex items-center justify-between gap-3">
        <Footprints className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
        <div className="text-right text-sm font-bold text-text-secondary tabular-nums sm:text-base">
          {formatSteps(steps)} kroków
        </div>
      </div>
    </section>
  );
}
