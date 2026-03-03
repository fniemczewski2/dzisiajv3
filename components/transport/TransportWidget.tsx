import React, { useState } from "react";
import { Bus, ChevronDown, ChevronUp } from "lucide-react";
import LoadingState from "../LoadingState";
import { useTransport } from "../../hooks/useTransport";
import StopItem from "./StopItem";

export default function TransportWidget() {
  const [open, setOpen] = useState(false);
  const { nearbyGroups, loadingNearby, error } = useTransport(open);

  return (
    <div className="bg-card rounded-xl shadow overflow-hidden">
      <div 
        onClick={() => setOpen(!open)} 
        className="flex justify-between items-center px-3 py-2 sm:p-4 cursor-pointer hover:bg-muted/50 transition-colors"
      >
        <h3 className="flex font-semibold items-center">
          <Bus className="w-5 h-5 mr-2" /> Transport
        </h3>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </div>

      {open && (
        <div className="animate-in slide-in-from-top-2">
          
          {/* Komunikat błędu */}
          {error && (
            <div className="p-4 text-center text-xs text-destructive">
              {error}
            </div>
          )}
          
          {loadingNearby && nearbyGroups.length === 0 && !error ? (
            <div className="p-4">
              <LoadingState />
            </div>
          ) : (
            <>
              {!loadingNearby && nearbyGroups.length === 0 && !error && (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  Brak przystanków w okolicy (2km).
                </div>
              )}
              {nearbyGroups.map((group) => (
                <StopItem 
                  key={group.stop_name} 
                  stopName={group.stop_name}
                  distance={group.distance}
                  departures={group.departures}
                  isLoading={loadingNearby}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}