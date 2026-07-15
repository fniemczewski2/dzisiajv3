export interface Station {
  id: string;
  name: string;
}

export interface RouteStation {
  stationId: string;
  departurePlatform?: string;
}

export interface Route {
  orderId: string;
  nationalNumber: string;
  name?: string;
  stations?: RouteStation[];
}

export interface OperationStation {
  stationId: string;
  actualArrival?: string;
  actualDeparture?: string;
  arrivalDelayMinutes?: number;
  departureDelayMinutes?: number;
  isCancelled?: boolean;
}

export interface TrainOperation {
  orderId: string;
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
}

export interface TrainStatusResponse {
  delay: number;
  platform: string;
  status: string;
  estimatedArrival: string;
  hide: boolean;
}