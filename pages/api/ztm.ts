// pages/api/ztm.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { stop_id } = req.query;

  try {
    // 1. Fetch binary data from ZTM Poznań
    const response = await fetch(
      `https://www.ztm.poznan.pl/pl/dla-deweloperow/getGtfsRtFile?file=trip_updates.pb`
    );

    if (!response.ok) throw new Error('Failed to fetch GTFS-RT data');

    const buffer = await response.arrayBuffer();
    
    // 2. Decode the binary Protocol Buffer data
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
      new Uint8Array(buffer)
    );

    // 3. Filter for the specific stop_id requested
    const departures = feed.entity
      .filter(entity => entity.tripUpdate?.stopTimeUpdate)
      .flatMap(entity => 
        entity.tripUpdate!.stopTimeUpdate!
          .filter(update => update.stopId === stop_id)
          .map(update => ({
            tripId: entity.tripUpdate!.trip.tripId,
            routeId: entity.tripUpdate!.trip.routeId,
            delay: update.arrival?.delay || 0,
            time: update.arrival?.time || update.departure?.time
          }))
      );

    res.status(200).json(departures);
  } catch (error) {
    res.status(500).json({ error: 'Failed to proxy transit data' });
  }
}