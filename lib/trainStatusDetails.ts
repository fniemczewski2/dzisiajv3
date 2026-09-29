// lib/trainStatusDetails.ts
//
// Szczegóły stacji wyjazdu i przyjazdu dla odpowiedzi /api/transport/train-status.
// Czyste funkcje, żeby dało się je testować bez PKP PLK.

import type { OperationStation, RouteStation, TrainStatusResponse } from "@/types/pkpplk";

export type StationDetails = Pick<
  TrainStatusResponse,
  | "departurePlatform"
  | "departureDelay"
  | "actualDeparture"
  | "departed"
  | "arrivalPlatform"
  | "arrivalDelay"
  | "plannedArrival"
  | "actualArrival"
  | "arrivalStation"
>;

export function hhmm(value: string | undefined): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(value ?? "");
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : "";
}

interface DetailsInput {
  plannedFrom?: RouteStation;
  plannedTo?: RouteStation;
  opFrom?: OperationStation;
  opTo?: OperationStation;
  arrivalStation?: string;
  departed?: boolean;
}

export function buildStationDetails({
  plannedFrom,
  plannedTo,
  opFrom,
  opTo,
  arrivalStation = "",
  departed = false,
}: DetailsInput): StationDetails {
  return {
    departurePlatform: opFrom?.departurePlatform || plannedFrom?.departurePlatform || "",
    departureDelay: opFrom?.departureDelayMinutes ?? opFrom?.arrivalDelayMinutes ?? 0,
    actualDeparture: opFrom?.actualDeparture || "",
    departed,
    // Na stacji końcowej bywa tylko peron przyjazdu, na pośredniej – oba.
    arrivalPlatform:
      opTo?.arrivalPlatform ||
      plannedTo?.arrivalPlatform ||
      opTo?.departurePlatform ||
      plannedTo?.departurePlatform ||
      "",
    arrivalDelay: opTo?.arrivalDelayMinutes ?? opTo?.departureDelayMinutes ?? 0,
    plannedArrival: hhmm(plannedTo?.arrivalTime || plannedTo?.departureTime),
    actualArrival: opTo?.actualArrival || "",
    arrivalStation,
  };
}
