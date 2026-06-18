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
        const s = search.toLowerCase().replace('gł.', 'główny').trim();
        const exact = stations.find((st: any) => st.name.toLowerCase() === s);
        if (exact) return exact;
        
        const startsWith = stations.find((st: any) => st.name.toLowerCase().startsWith(s));
        if (startsWith) return startsWith;
        
        return stations.find((st: any) => st.name.toLowerCase().includes(s)) || stations[0];
    };

    const fromSearch = (from as string).split(',')[0].trim();
    const toSearch = (to as string).split(',')[0].trim();
    const stationsDictRes = await fetch(`https://pdp-api.plk-sa.pl/api/v1/dictionaries/stations&pageSize=1000`, { headers })

    if (stationsDictRes.status === 429) { return res.status(200).json({ delay: 0, platform: '-', status: 'Spróbuj ponownie później', estimatedArrival: '', hide: false }); }
    else { if (!stationsDictRes.ok) throw new Error('Błąd słownika stacji');}

    const dictData = await stationsDictRes.json();
    const fromStation = matchStation(dictData.stations, fromSearch);
    const toStation = matchStation(dictData.stations, toSearch);

    if (!fromStation || !toStation) {
      return res.status(200).json({ delay: 0, platform: '-', status: 'Nie zidentyfikowano stacji', estimatedArrival: '', hide: false });
    }

    const fromStationId = fromStation.id;
    const toStationId = toStation.id;

    const schedulesRes = await fetch(`https://pdp-api.plk-sa.pl/api/v1/schedules?stations=${fromStationId}`, { headers });
    if (schedulesRes.status === 429) return res.status(200).json({ delay: 0, platform: '-', status: '429', estimatedArrival: '', hide: false });
    if (!schedulesRes.ok) throw new Error(`Błąd rozkładu ${schedulesRes.status}`);
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
    const platform = schedulesData?.routes.find((train: any) => train.nationalNumber === pureNumber || (train.nationalNumber?.startsWith(baseNumber) && (train.name?.toLowerCase() === (trainName as string)?.toLowerCase()))).stations?.find((s: any) => s.stationId === fromStationId).departurePlatform || '-';
    let delay = 0;

    if (operationsRes.ok && trainData) {
      const opStationFrom = trainData.stations?.find((s: any) => s.stationId === fromStationId);
      const opStationTo = trainData.stations?.find((s: any) => s.stationId === toStationId);
      
      const nowPlString = new Date().toLocaleString("en-US", { 
        timeZone: "Europe/Warsaw",
        hour12: false
      });
      const nowPl = new Date(nowPlString);
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
      status: delay > 0 ? 'Opóźniony' : 'Planowy',
      estimatedArrival: '',
      hide: false
    });    

  } catch (error: any) {
    return res.status(200).json({ delay: 0, platform: '-', status: 'Brak danych live', estimatedArrival: '', hide: false });
  }
}