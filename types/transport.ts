// types/transport.ts

export interface Departure {
  line: string;
  direction: string;
  minutes: number;
  time: string;
  is_realtime: boolean;
  delay?: number;
}

export interface StopRow {
  stop_name: string;
  zone_id: string;
}

export interface Bollard {
  bollard_code: string;
  departures: Departure[];
}

export type { FavoriteStop, StopCluster } from "@/shared/stopGrouping";
import type { FavoriteStop, StopCluster } from "@/shared/stopGrouping";

export interface StopGroup {
  /** Ulubione: favoriteKey() wpisu; "w pobliżu": klucz grupy słupków. */
  key: string;
  stop_name: string;
  zone_id: string;
  lat: number;
  lon: number;
  stop_codes: string[];
  /** W sieci istnieje inny przystanek o tej samej nazwie (np. w innej miejscowości). */
  ambiguous: boolean;
  distance?: number;
  bollards: Bollard[];
  /** Stary ulubiony (sama nazwa) – dane do jego uzupełnienia. */
  resolved?: FavoriteStop;
}

export interface LocalSearchResult {
  cluster: StopCluster;
  locality: string | null;
  displayString: string;
}

export interface TrackedTrain {
  id: string;
  userId: string;
  createdAt: string;
  trainNumber: string;
  trainName: string;
  date: string;
  departureTime: string;
  from: string;
  to: string;
  wagon: string;
  seat: string;
  /** Planowy przyjazd do stacji docelowej „HH:MM” – zapisywany po pierwszej odpowiedzi PKP PLK. */
  plannedArrival?: string | null;
  /** Wynik przejazdu zapisany po przyjeździe: opóźnienie w minutach na stacji docelowej. */
  finalDelay?: number | null;
  /** Status z ostatniej odpowiedzi PKP PLK przed zamknięciem przejazdu. */
  finalStatus?: string | null;
  /** Faktyczny przyjazd „HH:MM”, jeśli PKP PLK go podało. */
  finalArrival?: string | null;
  /** Znacznik zapisu wyniku – odróżnia „na czas” (0 min) od braku danych. */
  finalRecordedAt?: string | null;
  /** Wpis z poczty (adres biletów) do sprawdzenia i zatwierdzenia przez użytkownika. */
  needsReview?: boolean;
  source?: "manual" | "mail";
}

export type TrainInput = Omit<
  TrackedTrain,
  | "id"
  | "userId"
  | "createdAt"
  | "plannedArrival"
  | "needsReview"
  | "source"
  | "finalDelay"
  | "finalStatus"
  | "finalArrival"
  | "finalRecordedAt"
>;

export interface TicketFormData {
  trainNumber: string;
  trainName: string;
  date: string;
  departureTime: string;
  from: string;
  to: string;
  wagon: string;
  seat: string;
}
