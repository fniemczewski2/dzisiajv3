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
}

export type TrainInput = Omit<TrackedTrain, "id" | "userId" | "createdAt" | "plannedArrival">;

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
