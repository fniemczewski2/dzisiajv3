import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { stationName } = req.query;
  const apiKey = process.env.PLK_API_KEY;

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
    if(stationsRes.status === 429) {
        return res.status(429).json({
            error: "Spróbuj ponownie później"
        });
    }
    if (!stationsRes.ok) throw new Error('Błąd pobierania słownika stacji');
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

    const nowPlString = new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" });
    const nowPl = new Date(nowPlString);
    const date = `${nowPl.getFullYear()}-${String(nowPl.getMonth() + 1).padStart(2, '0')}-${String(nowPl.getDate()).padStart(2, '0')}`;

    const schedulesRes = await fetch(`https://pdp-api.plk-sa.pl/api/v1/schedules?stations=${stationId}&dateFrom=${date}&dateTo=${date}`, { headers });
    if(schedulesRes.status === 429) {
        return res.status(429).json({
            error: "Spróbuj ponownie później"
        });
    }
    if (!schedulesRes.ok) throw new Error('Błąd pobierania rozkładu planowanego');

    const schedulesData = await schedulesRes.json();

    const operationsRes = await fetch(`https://pdp-api.plk-sa.pl/api/v1/operations?stations=${stationId}&withPlanned=true&fullRoutes=true`, { headers });
    if(operationsRes.status === 429) {
        return res.status(429).json({
            error: "Spróbuj ponownie później"
        });
    }
    
    if (!operationsRes.ok) throw new Error('Błąd pobierania danych czasu rzeczywistego');
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
      
      let status = 'Planowy';
      if (liveTrain) {
        const statusMap: Record<string, string> = {
          'S': 'Oczekuje',
          'P': 'W trasie',
          'C': 'Zakończył',
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

    const currentHourMinutes = nowPl.getHours() * 60 + nowPl.getMinutes();

    const finalItems = boardItems.filter(item => {
      let itemTotalMinutes;

      if (item.actualDeparture) {
         const timePart = item.actualDeparture.split('T')[1] || item.actualDeparture;
         const [h, m] = timePart.split(':').map(Number);
         itemTotalMinutes = h * 60 + m;
      } else {
         const [h, m] = item.plannedTime.split(':').map(Number);
         itemTotalMinutes = h * 60 + m + item.delay;
      }

      const diff = currentHourMinutes - itemTotalMinutes;
      return diff <= 5;
    }).slice(0, 10);

    return res.status(200).json({
      station: actualStationName,
      items: finalItems
    });

  } catch (error: any) {
    console.error('[Station Board API Error]:', error);
    return res.status(500).json({ error: 'Nie udało się wygenerować tablicy stacji' });
  }
}