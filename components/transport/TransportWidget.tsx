import React, { useState } from "react";
import { Bus, ChevronDown, ChevronUp } from "lucide-react";
import LoadingState from "../LoadingState";
import { useTransport } from "../../hooks/useTransport";
import StopItem from "./StopItem";

export default function TransportWidget() {
  const [open, setOpen] = useState(false);
  const { stops, departures, loadingStops, loading } = useTransport(open);

  if (loading) return <LoadingState />;

  return (
    <div className="bg-card rounded-xl shadow overflow-hidden">
      <div onClick={() => setOpen(!open)} className="flex justify-between items-center px-3 py-2 sm:p-4 cursor-pointer">
        <h3 className="flex font-semibold items-center">
          <Bus className="w-5 h-5 mr-2" /> Transport
        </h3>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </div>

      {open && (
        <div className="animate-in slide-in-from-top-2">
          {stops.length === 0 && <div className="p-4 text-center text-xs">Brak przystanków w okolicy.</div>}
          {stops.slice(0, 3).map((stop) => (
            <StopItem 
              key={stop.id}
              stopName={stop.name}
              distance={stop.distance_meters}
              departures={departures[`${stop.name}_${stop.zone_id}`] || []}
              zone_id={stop.zone_id}
              isLoading={loadingStops[`${stop.name}_${stop.zone_id}`]}
            />
          ))}
        </div>
      )}
    </div>
  );
}