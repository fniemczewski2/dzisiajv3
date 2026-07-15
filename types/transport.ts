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

export interface StopGroup {
  stop_name: string;
  zone_id: string;
  distance?: number;
  bollards: Bollard[];
}

export interface LocalSearchResult {
  name: string;
  zone_id: string;
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
}

export type TrainInput = Omit<TrackedTrain, "id" | "userId" | "createdAt">

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