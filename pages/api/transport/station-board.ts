// pages/api/transport/station-board.ts

import { TIMEOUTS_MS } from "@/config/server";
import { serverEnv } from "@/config/env";
import { getAppDateTime } from "@/lib/dateUtils";
import { createServerSupabase } from "@/lib/supabase/server";
import { enforceRateLimit } from "@/lib/server/rateLimit";
import type { NextApiRequest, NextApiResponse } from "next";
import type {
  StationsDictionaryResponse,
  SchedulesResponse,
  OperationsResponse,
  StationBoardItem,
  StationBoardResponse,
} from "@/types/pkpplk";

type ApiError = { error: string };

const STATUS_LABELS: Record<string, string> = {
  S: "Nie zaczął",
  P: "W trasie",
  C: "Zakończył",
  F: "Zakończył",
  X: "Odwołany",
  Q: "Cz. odwołany",
};

class PkpError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "PkpError";
  }
}

/** GET do API PKP PLK z limitem czasu (bez niego zawieszone API trzymało ładowanie); błąd HTTP to PkpError. */
async function pkpGet<T>(url: string, headers: Record<string, string>): Promise<T> {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUTS_MS.pkp) });
  if (response.status === 429) throw new PkpError(429, "Spróbuj ponownie później");
  if (!response.ok) throw new PkpError(500, "Wystąpił błąd PKP PLK");
  return (await response.json()) as T;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<StationBoardResponse | ApiError>) {
  const { stationName } = req.query;
  const apiKey = serverEnv.plkApiKey;
  if (req.method !== "GET") return res.status(405).json({ error: "Metoda niedozwolona." });

  const supabase = createServerSupabase(req, res);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return res.status(401).json({ error: "Brak autoryzacji." });
  if (!(await enforceRateLimit(res, "stationBoard", user.id))) return;

  if (!stationName || Array.isArray(stationName)) return res.status(400).json({ error: "Brak nazwy stacji." });

  if (!apiKey) return res.status(500).json({ error: "Błąd konfiguracji serwera." });

  try {
    const headers = {
      "X-API-Key": apiKey,
      Accept: "application/json",
    };

    const stationsData = await pkpGet<StationsDictionaryResponse>(
      `https://pdp-api.plk-sa.pl/api/v1/dictionaries/stations?search=${encodeURIComponent(stationName)}&pageSize=10`,
      headers
    );

    const normalizedInput = stationName.toLowerCase().replaceAll("gł.", "główny");
    const station =
      stationsData.stations?.find(
        (s) => s.name.toLowerCase().includes(normalizedInput) || normalizedInput.includes(s.name.toLowerCase())
      ) || stationsData.stations?.[0];

    if (!station) {
      return res.status(404).json({ error: "Nie znaleziono stacji o podanej nazwie" });
    }
    const stationId = station.id;
    const actualStationName = station.name;

    const nowPl = getAppDateTime();
    const date = `${nowPl.getFullYear()}-${String(nowPl.getMonth() + 1).padStart(2, "0")}-${String(nowPl.getDate()).padStart(2, "0")}`;

    const schedulesData = await pkpGet<SchedulesResponse>(
      `https://pdp-api.plk-sa.pl/api/v1/schedules?stations=${stationId}&dateFrom=${date}&dateTo=${date}`,
      headers
    );

    const operationsData = await pkpGet<OperationsResponse>(
      `https://pdp-api.plk-sa.pl/api/v1/operations?stations=${stationId}&withPlanned=true&fullRoutes=true`,
      headers
    );
    const stationsDict = operationsData.stations || {};

    const getStationName = (id: string) => stationsDict[id];

    const boardItems: StationBoardItem[] = [];

    (schedulesData.routes || []).forEach((route) => {
      const plannedStation = route.stations?.find((s) => s.stationId === stationId);
      if (!plannedStation) return;

      const liveTrain = operationsData.trains?.find(
        (t) => t.scheduleId === route.scheduleId && t.orderId === route.orderId
      );
      const opStation = liveTrain?.stations?.find((s) => s.stationId === stationId);
      const lastStation = liveTrain?.stations?.[liveTrain.stations.length - 1];
      const destinationName = lastStation ? getStationName(lastStation.stationId) : "-";

      let status = "Brak danych";
      if (liveTrain) {
        status = STATUS_LABELS[liveTrain.trainStatus ?? ""] || "W trasie";
        if (opStation?.isCancelled) status = "Odwołany";
      }

      const platform =
        opStation?.departurePlatform ||
        plannedStation.departurePlatform ||
        opStation?.arrivalPlatform ||
        plannedStation.arrivalPlatform ||
        "-";
      const delay = opStation ? (opStation.departureDelayMinutes ?? opStation.arrivalDelayMinutes ?? 0) : 0;

      const rawTime = plannedStation.departureTime || plannedStation.arrivalTime || "00:00:00";
      const plannedTime = rawTime.substring(0, 5);

      boardItems.push({
        trainOperator: route.carrierCode || "",
        trainNumber: route.nationalNumber || "",
        trainName: route.name || "",
        plannedTime,
        rawTime,
        delay,
        platform,
        status,
        to: destinationName || "-",
        currentStation: actualStationName,
        date,
        actualDeparture: opStation?.actualDeparture || null,
      });
    });

    boardItems.sort((a, b) => a.rawTime.localeCompare(b.rawTime));

    const nowTimestamp = nowPl.getTime();
    const limitPast = nowTimestamp - 5 * 60 * 1000;
    const limitFuture = nowTimestamp + 2 * 60 * 60 * 1000;

    const endOfToday = new Date(nowPl);
    endOfToday.setHours(23, 59, 59, 999);
    const endOfTodayTimestamp = endOfToday.getTime();

    const finalItems = boardItems
      .filter((item) => {
        const [h, m] = item.plannedTime.split(":").map(Number);
        const departureTime = new Date(nowPl);
        departureTime.setHours(h, m, 0, 0);

        const scheduledTimeWithDelay = new Date(departureTime.getTime() + item.delay * 60 * 1000);
        const departureTimestamp = scheduledTimeWithDelay.getTime();

        const isPastLimit = departureTimestamp < limitPast;
        const isTooFarInFuture = departureTimestamp > limitFuture;
        const isNotToday = departureTimestamp > endOfTodayTimestamp;

        return !isPastLimit && !isTooFarInFuture && !isNotToday;
      })
      .slice(0, 10);

    return res.status(200).json({
      station: actualStationName,
      items: finalItems,
    });
  } catch (err) {
    if (err instanceof PkpError) return res.status(err.status).json({ error: err.message });
    if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
      return res.status(504).json({ error: "PKP PLK nie odpowiada. Spróbuj odświeżyć za chwilę." });
    }
    return res.status(500).json({ error: "Nie udało się wygenerować tablicy stacji" });
  }
}
