// components/health/StatTile.tsx
//
// Kafelek z jedną wartością (element listy opisów <dl>): etykieta, wartość i opcjonalna podpowiedź.

import React from "react";

interface Props {
  label: string;
  value: string;
  hint?: string;
}

export default function StatTile({ label, value, hint }: Readonly<Props>) {
  return (
    <div className="card min-w-0 p-3">
      <dt className="text-xs font-semibold text-text-muted">{label}</dt>
      <dd className="mt-1 text-xl font-bold text-text tabular-nums">{value}</dd>
      {hint && <dd className="text-xs text-text-secondary">{hint}</dd>}
    </div>
  );
}
