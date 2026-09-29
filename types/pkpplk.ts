// types/pkpplk.ts

export interface Station {
  id: string;
  name: string;
}

export interface RouteStation {
  stationId: string;
  departurePlatform?: string;
  arrivalPlatform?: string;
  departureTime?: string;
  arrivalTime?: string;
}

export interface Route {
  orderId: string;
  scheduleId?: string;
  nationalNumber: string;
  name?: string;
  carrierCode?: string;
  stations?: RouteStation[];
}

export interface OperationStation {
  stationId: string;
  actualArrival?: string;
  actualDeparture?: string;
  arrivalDelayMinutes?: number;
  departureDelayMinutes?: number;
  departurePlatform?: string;
  arrivalPlatform?: string;
  isCancelled?: boolean;
}

export interface TrainOperation {
  orderId: string;
  scheduleId?: string;
  trainStatus?: string;
  stations?: OperationStation[];
}

export interface StationsDictionaryResponse {
  stations: Station[];
}

export interface SchedulesResponse {
  routes: Route[];
}

export interface OperationsResponse {
  trainStatus?: string;
  trains?: TrainOperation[];
  stations?: Record<string, string>;
}

export interface TrainStatusResponse {
  delay: number;
  platform: string;
  status: string;
  estimatedArrival: string;
  hide: boolean;
  /** Szczegóły obu stacji – do przełączania widoku odjazd/przyjazd w planie dnia. */
  departurePlatform?: string;
  departureDelay?: number;
  actualDeparture?: string;
  arrivalPlatform?: string;
  arrivalDelay?: number;
  plannedArrival?: string;
  /** Przewidywany przyjazd (ISO) z danych na żywo. */
  actualArrival?: string;
  /** Serwer ustalił, że pociąg opuścił już stację wyjazdu. */
  departed?: boolean;
  /** Nazwa stacji, której dotyczą dane przyjazdu. */
  arrivalStation?: string;
  /** Tylko z ?debug=1: skąd pochodzą dane (do diagnozy dopasowania stacji). */
  debug?: Record<string, unknown>;
}

export interface StationBoardItem {
  trainOperator: string;
  trainNumber: string;
  trainName: string;
  plannedTime: string;
  rawTime: string;
  delay: number;
  platform: string;
  status: string;
  to: string;
  currentStation: string;
  date: string;
  actualDeparture: string | null;
}

export interface StationBoardResponse {
  station: string;
  items: StationBoardItem[];
}
