// lib/trainPunctuality.ts
//
// Jeden opis punktualności pociągu dla planu dnia i widoku „Pociągi” – te same znaki i ta sama ocena.
// Etykiety są skrótowe, bo stoją na kafelku obok godziny i peronu:
//   „?”   – brak danych (także przed uruchomieniem śledzenia i przy limicie zapytań),
//   „OK”  – jedzie zgodnie z rozkładem,
//   „+12” – opóźnienie w minutach,
//   „X”   – pociąg odwołany.
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

export interface TrainFinalResult {
  /** Opóźnienie przyjazdu w minutach (0 = na czas). */
  finalDelay?: number | null;
  finalStatus?: string | null;
  /** Bez znacznika zapisu nie wiadomo, czy 0 minut znaczy „na czas”, czy „brak danych”. */
  finalRecordedAt?: string | null;
}

/**
 * Opis odbytego przejazdu z zapisanego wyniku (user_trains.final_*). Zwraca null, gdy wyniku nie ma –
 * wtedy decyduje zwykły opis statusu.
 */
export function describeFinalPunctuality(train: TrainFinalResult): TrainPunctuality | null {
  if (!train.finalRecordedAt) return null;
  if ((train.finalStatus ?? "").toLowerCase().includes("odwołany")) return { kind: "cancelled", label: "X" };
  const delay = Math.max(0, train.finalDelay ?? 0);
  return delay > 0 ? { kind: "delayed", label: `+${delay}` } : { kind: "onTime", label: "OK" };
}

export function describeTrainPunctuality(input: {
  status: string | null | undefined;
  delay: number;
  tracked?: boolean;
  /** Przejazd już się odbył – „Wkrótce...” byłoby wtedy nieprawdą. */
  finished?: boolean;
}): TrainPunctuality {
  if (input.tracked === false) {
    return input.finished ? { kind: "noData", label: "?" } : { kind: "notTracked", label: "?" };
  }
  const status = (input.status ?? "").trim();
  const lower = status.toLowerCase();
  if (lower.includes("odwołany")) return { kind: "cancelled", label: "X" };
  if (input.delay > 0) return { kind: "delayed", label: `+${input.delay}` };
  if (NO_DATA_STATUSES.has(status)) return { kind: "noData", label: "?" };
  return { kind: "onTime", label: "OK" };
}
