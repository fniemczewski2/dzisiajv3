// pages/api/transport/train-status.ts

import { createServerSupabase } from '@/lib/supabase/server';
import type { NextApiRequest, NextApiResponse } from 'next';
import type {
  Station,
  Route,
  RouteStation,
  StationsDictionaryResponse,
  SchedulesResponse,
  OperationsResponse,
  OperationStation,
  TrainOperation,
  TrainStatusResponse,
} from '@/types/pkpplk';
import { OPERATIONS_TTL_MS, STATIONS_TTL_MS } from '@/config/limits';
import { resolveRouteStations } from '@/lib/trainRoute';
import { buildStationDetails } from '@/lib/trainStatusDetails';
import { parsePlkTime } from '@/lib/trainPlan';

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

function isTrainCancelled(
  operationsData: OperationsResponse,
  trainData: TrainOperation,
  opStationFrom: OperationStation | undefined,
  opStationTo: OperationStation | undefined
): boolean {
  return (
    operationsData.trainStatus === 'X' ||
    trainData.trainStatus === 'X' ||
    !!opStationFrom?.isCancelled ||
    !!opStationTo?.isCancelled
  );
}

function isEventAlreadyOver(opStationTo: OperationStation | undefined, now: Date): boolean {
  if (!opStationTo) return false;
  const toActualTime = parsePlkTime(opStationTo.actualArrival || opStationTo.actualDeparture);
  return !!toActualTime && now.getTime() > toActualTime.getTime();
}

function computeDelayMinutes(
  hasDepartedFrom: boolean,
  opStationFrom: OperationStation | undefined,
  opStationTo: OperationStation | undefined
): number {
  if (hasDepartedFrom) return opStationTo?.arrivalDelayMinutes ?? 0;
  return opStationFrom?.departureDelayMinutes ?? opStationFrom?.arrivalDelayMinutes ?? 0;
}

// The "is there live operations data for this train" branch of the status
// computation — pulled out of handler, which was deeply nested (schedules
// lookup -> operations lookup -> cancelled/arrived/departed checks) all in
// one function body.
interface StationQuery {
  fromStationId: string;
  toStationId: string | null;
  fromSearch: string;
  toSearch: string;
  nameOf: (id: string) => string | undefined;
}

/** Stacja docelowa wybrana z trasy pociągu, za stacją wyjazdu. */
function resolveDestination(
  query: StationQuery,
  plannedRoute: Route,
  trainData: TrainOperation | undefined,
  operationsNames: Record<string, string> | undefined
): string | null {
  const routeIds = (trainData?.stations?.length ? trainData.stations : plannedRoute.stations ?? []).map((s) => s.stationId);
  const nameOf = (id: string) => operationsNames?.[id] ?? query.nameOf(id);
  const { toStationId } = resolveRouteStations(
    routeIds,
    nameOf,
    { id: query.fromStationId, query: query.fromSearch },
    { id: query.toStationId, query: query.toSearch }
  );
  return toStationId ?? query.toStationId;
}

async function computeStatus(
  plannedRoute: Route,
  query: StationQuery,
  headers: Record<string, string>,
  debug = false
): Promise<TrainStatusResponse> {
  const { fromStationId } = query;
  const plannedFrom = findRouteStation(plannedRoute, fromStationId);
  const platform = plannedFrom?.departurePlatform || '-';
  const operationsData = await getOperations(fromStationId, headers);
  const trainData = operationsData?.trains?.find((t) => t.orderId === plannedRoute.orderId);
  const toStationId = resolveDestination(query, plannedRoute, trainData, operationsData?.stations) ?? '';
  const plannedTo = findRouteStation(plannedRoute, toStationId);
  const arrivalStation = operationsData?.stations?.[toStationId] ?? query.nameOf(toStationId) ?? '';

  const opStationFrom = trainData?.stations?.find((s) => s.stationId === fromStationId);
  const opStationTo = trainData?.stations?.find((s) => s.stationId === toStationId);
  const now = new Date();
  const departureMoment = parsePlkTime(opStationFrom?.actualDeparture);
  const hasDepartedFrom = !!departureMoment && now.getTime() > departureMoment.getTime();

  const details = buildStationDetails({
    plannedFrom, plannedTo, opFrom: opStationFrom, opTo: opStationTo, arrivalStation, departed: hasDepartedFrom,
  });
  const withDebug = (response: TrainStatusResponse): TrainStatusResponse =>
    debug
      ? {
          ...response,
          debug: {
            from: { id: fromStationId, name: query.nameOf(fromStationId), searched: query.fromSearch },
            to: { id: toStationId, name: arrivalStation, searched: query.toSearch },
            scheduleStations: plannedRoute.stations?.length ?? 0,
            scheduleHasDestination: !!plannedTo,
            operationsTrainFound: !!trainData,
            operationsStations: trainData?.stations?.length ?? 0,
            operationsRoute: (trainData?.stations ?? []).map((st) => operationsData?.stations?.[st.stationId] ?? st.stationId),
            rawFrom: opStationFrom ?? null,
            rawTo: opStationTo ?? null,
            serverNow: now.toISOString(),
          },
        }
      : response;

  if (!operationsData || !trainData) {
    return withDebug({ delay: 0, platform: platform || '-', status: 'Nie zaczął', estimatedArrival: '', hide: false, ...details });
  }

  const delay = computeDelayMinutes(hasDepartedFrom, opStationFrom, opStationTo);

  if (isTrainCancelled(operationsData, trainData, opStationFrom, opStationTo)) {
    return withDebug({ delay: 0, platform: '-', status: 'Odwołany', estimatedArrival: '', hide: false, ...details });
  }

  if (isEventAlreadyOver(opStationTo, now)) {
    return withDebug({ delay: 0, platform: '-', status: '', estimatedArrival: '', hide: true, ...details });
  }

  if (hasDepartedFrom) {
    return withDebug({ delay, platform, status: 'W trasie', estimatedArrival: opStationTo?.actualArrival || '', hide: false, ...details });
  }

  return withDebug({ delay, platform: platform || '-', status: delay > 0 ? 'Opóźniony' : 'Nie zaczął', estimatedArrival: '', hide: false, ...details });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TrainStatusResponse | ApiError>
) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = createServerSupabase(req, res);
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return res.status(401).json({ error: 'Unauthorized' });

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

    if (!fromStationId) {
      return res.status(200).json({
        delay: 0,
        platform: '-',
        status: 'Nie zidentyfikowano stacji',
        estimatedArrival: '',
        hide: false,
      });
    }

    const dateStr = typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date) ? req.query.date : '';
    const dateRange = dateStr ? `&dateFrom=${dateStr}&dateTo=${dateStr}` : '';

    const schedulesRes = await fetch(
      `https://pdp-api.plk-sa.pl/api/v1/schedules?stations=${fromStationId}${dateRange}`,
      { headers }
    );
    if (schedulesRes.status === 429) {
      return res.status(429).json({ error: 'Spróbuj ponownie później' });
    }
    if (!schedulesRes.ok) {
      return res.status(500).json({ error: 'Wystąpił błąd PKP PLK' });
    }
    const schedulesData: SchedulesResponse = await schedulesRes.json();

    const pureNumber = trainNumber.replaceAll(/\D/g, '');
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

    const namesById = new Map(stations.map((st) => [st.id, st.name]));
    const status = await computeStatus(
      plannedRoute,
      { fromStationId, toStationId, fromSearch, toSearch, nameOf: (id) => namesById.get(id) },
      headers,
      req.query.debug === '1'
    );
    return res.status(200).json(status);
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
