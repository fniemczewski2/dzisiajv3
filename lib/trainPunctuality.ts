// lib/trainPunctuality.ts
//
// Jeden opis punktualności pociągu dla planu dnia i widoku „Pociągi” – te same słowa i ta sama ocena.
// Zasada: „bez opóźnienia” tylko wtedy, gdy PKP PLK zwróciło status przejazdu; brak danych nigdy nie jest punktualnością.

export type TrainPunctualityKind = "cancelled" | "delayed" | "onTime" | "noData" | "notTracked";

export interface TrainPunctuality {
  kind: TrainPunctualityKind;
  /** Pełny opis – identyczny w obu widokach. */
  label: string;
}

/** Statusy API, które nie niosą informacji o punktualności. */
const NO_DATA_STATUSES = new Set([
  "",
  "Brak danych",
  "Brak danych live",
  "Nie zidentyfikowano stacji",
  "Zbyt wiele zapytań",
  "Błąd połączenia",
]);

export function describeTrainPunctuality(input: {
  status: string | null | undefined;
  delay: number;
  tracked?: boolean;
}): TrainPunctuality {
  if (input.tracked === false) return { kind: "notTracked", label: "Wkrótce..." };
  const status = (input.status ?? "").trim();
  const lower = status.toLowerCase();
  if (lower.includes("odwołany")) return { kind: "cancelled", label: "Odwołany" };
  if (input.delay > 0) return { kind: "delayed", label: `+ ${input.delay} min` };
  if (NO_DATA_STATUSES.has(status)) {
    return {
      kind: "noData",
      label: status === "Zbyt wiele zapytań" ? "B/d (limit)" : "B/d",
    };
  }
  return { kind: "onTime", label: lower.includes("w trasie") ? "W trasie" : "Na czas" };
}
