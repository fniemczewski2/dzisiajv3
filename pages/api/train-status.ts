import { getAppDateTime } from '@/lib/dateUtils';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { trainNumber, from, to, trainName } = req.query;
  const apiKey = process.env.PLK_API_KEY || '';
  try {
    const headers = {
      'X-API-Key': apiKey,
      'Accept': 'application/json',
    };

    const matchStation = (stations: any[], search: string) => {
        if (!stations || stations.length === 0) return null;
        const s = search.toLowerCase().replace('gł.', 'główny');
        const exact = stations.find(st => st.name.toLowerCase() === s)?.id;
        if (exact) return exact;
        const startsWith = stations.find((st: any) => st.name.toLowerCase().startsWith(s))?.id;
        if (startsWith) return startsWith;
        
        return stations.find((st: any) => st.name.toLowerCase().includes(s))?.id;
    };

    const fromSearch = (from as string).split(',')[0].trim();
    const toSearch = (to as string).split(',')[0].trim();
    const stationsDictRes = await fetch(`https://pdp-api.plk-sa.pl/api/v1/dictionaries/stations?pageSize=10000`, { headers })

    if (stationsDictRes.status === 429) { return res.status(429).json({ error: 'Spróbuj ponownie później'}); }
    if (!stationsDictRes.ok) { return res.status(500).json({ error: "Wystąpił błąd PKP PLK" });}

    const dictData = await stationsDictRes.json();
    const fromStationId = matchStation(dictData.stations, fromSearch);
    const toStationId = matchStation(dictData.stations, toSearch);

    if (!fromStationId || !toStationId) {
      return res.status(200).json({ delay: 0, platform: '-', status: 'Nie zidentyfikowano stacji', estimatedArrival: '', hide: false });
    }

    const schedulesRes = await fetch(`https://pdp-api.plk-sa.pl/api/v1/schedules?stations=${fromStationId}`, { headers });
    if (schedulesRes.status === 429) { return res.status(429).json({ error: 'Spróbuj ponownie później'}); }
    if (!schedulesRes.ok) { return res.status(500).json({ error: "Wystąpił błąd PKP PLK" });}
    const schedulesData = await schedulesRes.json();

    const pureNumber = (trainNumber as string).replace(/\D/g, '');
    const baseNumber = pureNumber.length > 1 ? pureNumber.slice(0, -1) : pureNumber;
    
    const plannedRoute = schedulesData.routes?.find((train: any) => {
      return train.nationalNumber === pureNumber || 
             (train.nationalNumber?.startsWith(baseNumber) && (train.name?.toLowerCase() === (trainName as string)?.toLowerCase()));
    });

    if (!plannedRoute) {
      return res.status(200).json({ delay: 0, platform: '-', status: 'Brak danych', estimatedArrival: '', hide: false });
    }

    const operationsRes = await fetch(`https://pdp-api.plk-sa.pl/api/v1/operations?stations=${fromStationId}&withPlanned=true&fullRoutes=true&pageSize=10000`, {headers});
    const operationsData = await operationsRes.json();
    const trainData =  operationsData.trains?.find((t: any) => t.orderId === plannedRoute.orderId );
    const platform = schedulesData?.routes.find((train: any) => train.nationalNumber === pureNumber || (train.nationalNumber?.startsWith(baseNumber) && (train.name?.toLowerCase() === (trainName as string)?.toLowerCase())))?.stations?.find((s: any) => s.stationId === fromStationId)?.departurePlatform || '-';
    let delay = 0;

    if (operationsRes.ok && trainData) {
      const opStationFrom = trainData.stations?.find((s: any) => s.stationId === fromStationId);
      const opStationTo = trainData.stations?.find((s: any) => s.stationId === toStationId);
      
      const nowPl = getAppDateTime();
      const hasDepartedFrom = opStationFrom?.actualDeparture && (nowPl.getTime() > new Date(opStationFrom.actualDeparture).getTime());

      if (hasDepartedFrom) {
        delay = opStationTo?.arrivalDelayMinutes ?? 0;
      } else {
        delay = opStationFrom?.departureDelayMinutes ?? opStationFrom?.arrivalDelayMinutes ?? 0;
      }

      const isCancelled = operationsData.trainStatus === 'X' || trainData.trainStatus === 'X' || opStationFrom?.isCancelled || opStationTo?.isCancelled;
      if (isCancelled) {
        return res.status(200).json({ delay: 0, platform: '-', status: 'Odwołany', estimatedArrival: '', hide: false });
      }

      if (opStationTo) {
        const toActualTime = opStationTo.actualArrival || opStationTo.actualDeparture;
        if (toActualTime && nowPl.getTime() > new Date(toActualTime).getTime()) {
          return res.status(200).json({ delay: 0, platform: '-', status: '', estimatedArrival: '', hide: true });
        }
      }

      if (hasDepartedFrom) {
        return res.status(200).json({ 
            delay, 
            platform, 
            status: 'W trasie', 
            estimatedArrival: opStationTo?.actualArrival || '', 
            hide: false 
        });
      }
    } 
      
    return res.status(200).json({
      delay: delay,
      platform: platform || '-',
      status: delay > 0 ? 'Opóźniony' : 'Nie zaczął',
      estimatedArrival: '',
      hide: false
    });    

  } catch (error: any) {
    console.error(error)
    return res.status(200).json({ delay: 0, platform: '-', status: 'Brak danych live', estimatedArrival: '', hide: false });
  }
}