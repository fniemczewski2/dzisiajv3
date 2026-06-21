import { getAppDateTime } from '@/lib/dateUtils';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { stationName } = req.query;
  const apiKey = process.env.PLK_API_KEY;

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!stationName) {
    return res.status(400).json({ error: 'Brak parametru stationName' });
  }

  if (!apiKey) {
    return res.status(500).json({ error: 'Błąd konfiguracji serwera' });
  }

  try {
    const headers = {
      'X-API-Key': apiKey,
      'Accept': 'application/json',
    };

    const searchWord = (stationName as string);
    const stationsRes = await fetch(`https://pdp-api.plk-sa.pl/api/v1/dictionaries/stations?search=${encodeURIComponent(searchWord)}&pageSize=10`, { headers });
    if(stationsRes.status === 429) { return res.status(429).json({ error: "Spróbuj ponownie później" });}
    if (!stationsRes.ok) return res.status(500).json({ error: "Wystąpił błąd PKP PLK" });
    const stationsData = await stationsRes.json();
    
    const normalizedInput = (stationName as string).toLowerCase().replaceAll('gł.', 'główny');
    const station = stationsData.stations?.find((s: any) => 
      s.name.toLowerCase().includes(normalizedInput) || normalizedInput.includes(s.name.toLowerCase())
    ) || stationsData.stations?.[0];

    if (!station) {
      return res.status(404).json({ error: 'Nie znaleziono stacji o podanej nazwie' });
    }
    const stationId = station.id;
    const actualStationName = station.name;

    const nowPl = getAppDateTime();
    const date = `${nowPl.getFullYear()}-${String(nowPl.getMonth() + 1).padStart(2, '0')}-${String(nowPl.getDate()).padStart(2, '0')}`;

    const schedulesRes = await fetch(`https://pdp-api.plk-sa.pl/api/v1/schedules?stations=${stationId}&dateFrom=${date}&dateTo=${date}`, { headers });
    if(schedulesRes.status === 429) { return res.status(429).json({ error: 'Spróbuj ponownie później'}); }
    if (!schedulesRes.ok) return res.status(500).json({ error: "Wystąpił błąd PKP PLK" });

    const schedulesData = await schedulesRes.json();

    const operationsRes = await fetch(`https://pdp-api.plk-sa.pl/api/v1/operations?stations=${stationId}&withPlanned=true&fullRoutes=true`, { headers });
    if(operationsRes.status === 429) { return res.status(429).json({ error: 'Spróbuj ponownie później'}); }
    
    if (!operationsRes.ok) return res.status(500).json({ error: "Wystąpił błąd PKP PLK" });
    const operationsData = await operationsRes.json();
    const stationsDict = operationsData.stations || {};

    const getStationName = (id: number) => stationsDict[id];

    const boardItems: any[] = [];

    (schedulesData.routes || []).forEach((route: any) => {
      const plannedStation = route.stations?.find((s: any) => s.stationId === stationId);
      if (!plannedStation) return; 

      const liveTrain = operationsData.trains?.find((t: any) => t.scheduleId === route.scheduleId && t.orderId === route.orderId);
      const opStation = liveTrain?.stations?.find((s: any) => s.stationId === stationId);
      const destinationStationId = liveTrain?.stations?.[liveTrain.stations.length - 1].stationId;
      const destinationName = destinationStationId ? getStationName(destinationStationId) : '-';
      
      let status = 'Brak danych';
      if (liveTrain) {
        const statusMap: Record<string, string> = {
          'S': 'Nie zaczął',
          'P': 'W trasie',
          'C': 'Zakończył',
          'F': 'Zakończył',
          'X': 'Odwołany',
          'Q': 'Cz. odwołany'
        };
        status = statusMap[liveTrain.trainStatus] || 'W trasie';
        if (opStation?.isCancelled) status = 'Odwołany';
      }

      const platform = opStation?.departurePlatform || plannedStation.departurePlatform || opStation?.arrivalPlatform || plannedStation.arrivalPlatform || '-';
      const delay = opStation ? (opStation.departureDelayMinutes ?? opStation.arrivalDelayMinutes ?? 0) : 0;

      const rawTime = plannedStation.departureTime || plannedStation.arrivalTime || '00:00:00';
      const plannedTime = rawTime.substring(0, 5);

      boardItems.push({
        trainOperator: route.carrierCode || '',
        trainNumber: route.nationalNumber || '',
        trainName: route.name || '',
        plannedTime,
        rawTime,
        delay,
        platform,
        status,
        to: destinationName,
        currentStation: actualStationName,
        date,
        actualDeparture: opStation?.actualDeparture || null 
      });
    });

    boardItems.sort((a, b) => a.rawTime.localeCompare(b.rawTime));

    const nowTimestamp = nowPl.getTime();
    const limitPast = nowTimestamp - (5 * 60 * 1000);
    const limitFuture = nowTimestamp + (2 * 60 * 60 * 1000);
    
    const endOfToday = new Date(nowPl);
    endOfToday.setHours(23, 59, 59, 999);
    const endOfTodayTimestamp = endOfToday.getTime();

    const finalItems = boardItems.filter(item => {
      const [h, m] = item.plannedTime.split(':').map(Number);
      const departureTime = new Date(nowPl);
      departureTime.setHours(h, m, 0, 0);
      
      const scheduledTimeWithDelay = new Date(departureTime.getTime() + (item.delay * 60 * 1000));
      const departureTimestamp = scheduledTimeWithDelay.getTime();
      
      const isPastLimit = departureTimestamp < limitPast;
      const isTooFarInFuture = departureTimestamp > limitFuture;
      const isNotToday = departureTimestamp > endOfTodayTimestamp;

      return !isPastLimit && !isTooFarInFuture && !isNotToday;
    }).slice(0, 10);

    return res.status(200).json({
      station: actualStationName,
      items: finalItems
    });

    const currentHourMinutes = nowPl.getHours() * 60 + nowPl.getMinutes();

  } catch {
    return res.status(500).json({ error: 'Nie udało się wygenerować tablicy stacji' });
  }
}