// components/settings/Version.tsx
//
// Wersja wdrożonej aplikacji. Numer pochodzi z package.json, a data i skrót
// commita z builda (next.config.mjs) – bez zapytań do GitHuba z przeglądarki.

import { Info } from "lucide-react";
import { publicEnv } from "@/config/env";

const dateFormat = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric" });

export default function VersionInfo() {
  const buildDate = publicEnv.buildDate;
  const commit = publicEnv.commitSha;

  return (
    <section className="card mb-4 rounded-xl p-4 sm:p-6" aria-labelledby="version-heading">
      <div className="mb-4 flex items-center gap-3 text-text">
        <Info className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <h3 id="version-heading" className="text-lg font-bold">
          Informacje o wersji
        </h3>
      </div>
      <dl className="space-y-3 text-xs sm:text-sm">
        <div className="flex items-center justify-between">
          <dt className="font-semibold text-text-secondary">Wersja aplikacji:</dt>
          <dd className="rounded-lg border border-info-line bg-info-soft px-2.5 py-1 font-mono font-bold text-info">
            {publicEnv.appVersion}
            {commit ? <span className="font-normal"> ({commit})</span> : null}
          </dd>
        </div>
        {buildDate && (
          <div className="flex items-center justify-between border-t border-line pt-3">
            <dt className="font-semibold text-text-secondary">Data wdrożenia:</dt>
            <dd className="rounded-lg border border-line bg-card px-2.5 py-1 font-mono font-medium text-text">
              {dateFormat.format(new Date(buildDate))}
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}
