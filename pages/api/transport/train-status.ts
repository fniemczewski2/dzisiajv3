import { getAppDateTime } from '@/lib/dateUtils';
import type { NextApiRequest, NextApiResponse } from 'next';
import type {
  Station,
  Route,
  RouteStation,
  StationsDictionaryResponse,
  SchedulesResponse,
  OperationsResponse,
  TrainStatusResponse,
} from '@/types/pkpplk';
import { OPERATIONS_TTL_MS, STATIONS_TTL_MS } from '@/config/limits';

type ApiError = { error: string };

let stationsCache: Station[] | null = null;
let stationsFetchedAt = 0;
let stationsInFlight: Promise<Station[] | null> | null = null;

const operationsCache = new Map<string, { data: OperationsResponse; fetchedAt: number }>();
const operationsInFlight = new Map<string, Promise<OperationsResponse | null>>();

async function getStationsDictionary(
  headers: Record<string, string>
): Promise<{ stations: Station[] | null; rateLimited: boolean; upstreamError: boolean }> {
  const isFresh = stationsCache && Date.now() - stationsFetchedAt < STATIONS_TTL_MS;
  if (isFresh) return { stations: stationsCache, rateLimited: false, upstreamError: false };
    stationsInFlight ??= (async () => {
      const res = await fetch(
        `https://pdp-api.plk-sa.pl/api/v1/dictionaries/stations?pageSize=10000`,
        { headers }
      );
      if (res.status === 429) {
        const err: Error & { rateLimited?: boolean } = new Error('rate limited');
        err.rateLimited = true;
        throw err;
      }
      if (!res.ok) return null;
      const data: StationsDictionaryResponse = await res.json();
      stationsCache = data.stations;
      stationsFetchedAt = Date.now();
      return data.stations;
    })().finally(() => {
      stationsInFlight = null;
    });
  

  try {
    const stations = await stationsInFlight;
    return { stations, rateLimited: false, upstreamError: stations === null };
  } catch (err) {
    const rateLimited = err instanceof Error && (err as Error & { rateLimited?: boolean }).rateLimited === true;
    return { stations: null, rateLimited, upstreamError: !rateLimited };
  }
}

async function getOperations(
  fromStationId: string,
  headers: Record<string, string>
): Promise<OperationsResponse | null> {
  const cached = operationsCache.get(fromStationId);
  if (cached && Date.now() - cached.fetchedAt < OPERATIONS_TTL_MS) {
    return cached.data;
  }

  const inFlight = operationsInFlight.get(fromStationId);
  if (inFlight) return inFlight;

  const promise = (async () => {
    const res = await fetch(
      `https://pdp-api.plk-sa.pl/api/v1/operations?stations=${fromStationId}&withPlanned=true&fullRoutes=true&pageSize=10000`,
      { headers }
    );
    if (!res.ok) return null;
    const data: OperationsResponse = await res.json();
    operationsCache.set(fromStationId, { data, fetchedAt: Date.now() });
    return data;
  })().finally(() => {
    operationsInFlight.delete(fromStationId);
  });

  operationsInFlight.set(fromStationId, promise);
  return promise;
}

function matchStation(stations: Station[] | undefined, search: string): string | null {
  if (!stations || stations.length === 0) return null;
  const s = search.toLowerCase().replace('gł.', 'główny');
  const exact = stations.find((st) => st.name.toLowerCase() === s)?.id;
  if (exact) return exact;
  const startsWith = stations.find((st) => st.name.toLowerCase().startsWith(s))?.id;
  if (startsWith) return startsWith;
  return stations.find((st) => st.name.toLowerCase().includes(s))?.id ?? null;
}

function findPlannedRoute(
  routes: Route[] | undefined,
  pureNumber: string,
  baseNumber: string,
  trainName: string | undefined
): Route | undefined {
  return routes?.find((train) => {
    return (
      train.nationalNumber === pureNumber ||
      (train.nationalNumber?.startsWith(baseNumber) &&
        train.name?.toLowerCase() === trainName?.toLowerCase())
    );
  });
}

function findRouteStation(
  route: Route | undefined,
  stationId: string
): RouteStation | undefined {
  return route?.stations?.find((s) => s.stationId === stationId);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TrainStatusResponse | ApiError>
) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { trainNumber, from, to, trainName } = req.query;
  if (
    !trainNumber ||
    !from ||
    !to ||
    Array.isArray(from) ||
    Array.isArray(to) ||
    Array.isArray(trainNumber)
  ) {
    return res.status(400).json({ error: 'Wymagane parametry: trainNumber, from, to' });
  }

  const apiKey = process.env.PLK_API_KEY || '';

  try {
    const headers = {
      'X-API-Key': apiKey,
      Accept: 'application/json',
    };

    const fromSearch = from.split(',')[0].trim();
    const toSearch = to.split(',')[0].trim();

    const { stations, rateLimited, upstreamError } = await getStationsDictionary(headers);

    if (rateLimited) {
      return res.status(429).json({ error: 'Spróbuj ponownie później' });
    }
    if (upstreamError || !stations) {
      return res.status(500).json({ error: 'Wystąpił błąd PKP PLK' });
    }

    const fromStationId = matchStation(stations, fromSearch);
    const toStationId = matchStation(stations, toSearch);

    if (!fromStationId || !toStationId) {
      return res.status(200).json({
        delay: 0,
        platform: '-',
        status: 'Nie zidentyfikowano stacji',
        estimatedArrival: '',
        hide: false,
      });
    }

    const schedulesRes = await fetch(
      `https://pdp-api.plk-sa.pl/api/v1/schedules?stations=${fromStationId}`,
      { headers }
    );
    if (schedulesRes.status === 429) {
      return res.status(429).json({ error: 'Spróbuj ponownie później' });
    }
    if (!schedulesRes.ok) {
      return res.status(500).json({ error: 'Wystąpił błąd PKP PLK' });
    }
    const schedulesData: SchedulesResponse = await schedulesRes.json();

    const pureNumber = trainNumber.replace(/\D/g, '');
    const baseNumber = pureNumber.length > 1 ? pureNumber.slice(0, -1) : pureNumber;
    const trainNameStr = Array.isArray(trainName) ? trainName[0] : trainName;

    const plannedRoute = findPlannedRoute(schedulesData.routes, pureNumber, baseNumber, trainNameStr);

    if (!plannedRoute) {
      return res.status(200).json({
        delay: 0,
        platform: '-',
        status: 'Brak danych',
        estimatedArrival: '',
        hide: false,
      });
    }

    const platform = findRouteStation(plannedRoute, fromStationId)?.departurePlatform || '-';

    const operationsData = await getOperations(fromStationId, headers);
    const trainData = operationsData?.trains?.find((t) => t.orderId === plannedRoute.orderId);

    let delay = 0;

    if (operationsData && trainData) {
      const opStationFrom = trainData.stations?.find((s) => s.stationId === fromStationId);
      const opStationTo = trainData.stations?.find((s) => s.stationId === toStationId);

      const nowPl = getAppDateTime();
      const hasDepartedFrom =
        !!opStationFrom?.actualDeparture &&
        nowPl.getTime() > new Date(opStationFrom.actualDeparture).getTime();

      if (hasDepartedFrom) {
        delay = opStationTo?.arrivalDelayMinutes ?? 0;
      } else {
        delay = opStationFrom?.departureDelayMinutes ?? opStationFrom?.arrivalDelayMinutes ?? 0;
      }

      const isCancelled =
        operationsData.trainStatus === 'X' ||
        trainData.trainStatus === 'X' ||
        opStationFrom?.isCancelled ||
        opStationTo?.isCancelled;

      if (isCancelled) {
        return res.status(200).json({
          delay: 0,
          platform: '-',
          status: 'Odwołany',
          estimatedArrival: '',
          hide: false,
        });
      }

      if (opStationTo) {
        const toActualTime = opStationTo.actualArrival || opStationTo.actualDeparture;
        if (toActualTime && nowPl.getTime() > new Date(toActualTime).getTime()) {
          return res.status(200).json({
            delay: 0,
            platform: '-',
            status: '',
            estimatedArrival: '',
            hide: true,
          });
        }
      }

      if (hasDepartedFrom) {
        return res.status(200).json({
          delay,
          platform,
          status: 'W trasie',
          estimatedArrival: opStationTo?.actualArrival || '',
          hide: false,
        });
      }
    }

    return res.status(200).json({
      delay,
      platform: platform || '-',
      status: delay > 0 ? 'Opóźniony' : 'Nie zaczął',
      estimatedArrival: '',
      hide: false,
    });
  } catch (error) {
    console.error(error);
    return res.status(200).json({
      delay: 0,
      platform: '-',
      status: 'Brak danych live',
      estimatedArrival: '',
      hide: false,
    });
  }
}