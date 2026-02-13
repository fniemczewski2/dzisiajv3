import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";

type ScheduleRow = {
  trip_id: string;
  line: string;
  direction: string;
  minutes: number;
  route_type: number;
};

type RealtimeEntry = {
  delay: number;
  status?: number | null;
};

type MergedDeparture = {
  trip_id: string;
  line: string;
  direction: string;
  minutes: number;
  delay: number;
  is_realtime: boolean;
  route_type: number;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

let rtCache: any = null;
let rtLastFetch = 0;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const stopId = String(req.query.stop_id);
  const debug = req.query.debug === 'true';

  try {
    const { data: scheduleData, error: dbError } = await supabase.rpc("get_upcoming_departures", {
      p_stop_id: stopId,
    });
    if (dbError) throw dbError;
    const schedule = (scheduleData ?? []) as ScheduleRow[];

    if (debug) {
      console.log(`\n=== DEBUG STOP ${stopId} ===`);
      console.log(`Schedule has ${schedule.length} departures`);
      console.log(`First 3 trip_ids:`, schedule.slice(0, 3).map(s => s.trip_id));
    }

    if (!rtCache || Date.now() - rtLastFetch > 10000) {
      const response = await fetch(process.env.ZTM_GTFS_RT_URL!, {
        headers: { "Accept": "application/x-protobuf" }, 
      });

      if (rtCache && !response.ok) {
        if (debug) console.log(`RT fetch failed, using cache (age: ${Date.now() - rtLastFetch}ms)`);
      } else {
        const buffer = await response.arrayBuffer();
        const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));
        rtCache = feed;
        rtLastFetch = Date.now();
        if (debug) console.log(`RT cache refreshed: ${feed.entity.length} entities`);
      }
    } else {
      if (debug) console.log(`Using RT cache (age: ${Date.now() - rtLastFetch}ms, ${rtCache.entity.length} entities)`);
    }

    const realtimeMap = new Map<string, RealtimeEntry>();
    let rtWithData = 0;
    let rtWithoutData = 0;
    
    if (rtCache?.entity) {
      for (const entity of rtCache.entity) {
        if (!entity.tripUpdate?.trip?.tripId) continue;
        
        const tripId = entity.tripUpdate.trip.tripId;
        const stopTimeUpdates = entity.tripUpdate.stopTimeUpdate;
        
        let delaySeconds = 0;
        
        if (stopTimeUpdates && stopTimeUpdates.length > 0) {
          const firstStop = stopTimeUpdates[0];
          delaySeconds = firstStop.departure?.delay ?? firstStop.arrival?.delay ?? 0;
          
          if (delaySeconds !== 0) {
            rtWithData++;
          } else {
            rtWithoutData++;
          }
        }
        
        realtimeMap.set(tripId, {
          delay: delaySeconds,
          status: entity.tripUpdate.trip.scheduleRelationship,
        });
      }
    }

    if (debug) {
      console.log(`\nRT Map built:`);
      console.log(`  - Total trips in RT: ${realtimeMap.size}`);
      console.log(`  - With delay data: ${rtWithData}`);
      console.log(`  - Without delay data: ${rtWithoutData}`);
    }

    // Check matching
    const scheduleTripIds = new Set(schedule.map(s => s.trip_id));
    const matchedTrips = Array.from(realtimeMap.keys()).filter(tid => scheduleTripIds.has(tid));
    
    if (debug) {
      console.log(`\nMatching:`);
      console.log(`  - Schedule trip_ids: ${scheduleTripIds.size}`);
      console.log(`  - Matched with RT: ${matchedTrips.length}`);
      console.log(`  - Match rate: ${Math.round(matchedTrips.length / scheduleTripIds.size * 100)}%`);
      
      if (matchedTrips.length > 0) {
        console.log(`\nMatched trips (first 5):`);
        matchedTrips.slice(0, 5).forEach(tid => {
          const rt = realtimeMap.get(tid);
          const sch = schedule.find(s => s.trip_id === tid);
          console.log(`  - ${tid} (Line ${sch?.line}): delay=${rt?.delay}s`);
        });
      }
      
      // Show unmatched from schedule
      const unmatchedSchedule = schedule.filter(s => !realtimeMap.has(s.trip_id));
      if (unmatchedSchedule.length > 0) {
        console.log(`\nUnmatched from schedule (first 3):`);
        unmatchedSchedule.slice(0, 3).forEach(s => {
          console.log(`  - ${s.trip_id} (Line ${s.line} → ${s.direction})`);
        });
      }
    }
    
    const merged: MergedDeparture[] = schedule
      .map((dep) => {
        const rt = realtimeMap.get(dep.trip_id);
        if (rt?.status === 3) return null; 
        
        const delayMinutes = Math.floor((rt?.delay ?? 0) / 60);
        return {
          ...dep,
          minutes: Math.max(0, dep.minutes + delayMinutes),
          delay: rt?.delay ?? 0,
          is_realtime: !!rt,
        };
      })
      .filter((d): d is MergedDeparture => d !== null)
      .sort((a, b) => a.minutes - b.minutes)
      .slice(0, 10);

    if (debug) {
      console.log(`\nFinal result:`);
      console.log(`  - Total departures: ${merged.length}`);
      console.log(`  - With RT: ${merged.filter(d => d.is_realtime).length}`);
      console.log(`  - With delay: ${merged.filter(d => d.delay !== 0).length}`);
    }

    return res.status(200).json(merged);
  } catch (err) {
    console.error("ZTM API Error:", err);
    return res.status(500).json({ error: "Failed to fetch transport data" });
  }
}