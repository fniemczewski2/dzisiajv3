import React, { useState } from "react";
import { Bus, ChevronDown, ChevronUp } from "lucide-react";
import LoadingState from "../LoadingState";
import { useTransport } from "../../hooks/useTransport";
import StopItem from "./StopItem";

export default function TransportWidget() {
  const [open, setOpen] = useState(false);
  
  // Destrukturyzujemy nowe nazwy z hooka useTransport
  const { nearbyGroups, loadingNearby, error } = useTransport(open);

  return (
    <div className="bg-card rounded-xl shadow overflow-hidden">
      {/* Nagłówek jest zawsze widoczny, dzięki czemu widget nie znika w trakcie ładowania */}
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
          
          {/* Wyświetlamy loader wewnątrz rozwijanej karty, jeśli ładujemy pierwsze dane */}
          {loadingNearby && nearbyGroups.length === 0 && !error ? (
            <div className="p-4">
              <LoadingState />
            </div>
          ) : (
            <>
              {/* Informacja o braku przystanków zaktualizowana do 2km */}
              {!loadingNearby && nearbyGroups.length === 0 && !error && (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  Brak przystanków w okolicy (2km).
                </div>
              )}

              {/* Mapujemy po zaktualizowanej tablicy nearbyGroups */}
              {nearbyGroups.map((group) => (
                <StopItem 
                  key={group.stop_name} 
                  stopName={group.stop_name}
                  distance={group.distance}
                  departures={group.departures}
                  isLoading={loadingNearby}
                  // Brak propsa `many` sprawi, że w małymidgecie StopItem utnie listę do max 5 pozycji, zachowując kompaktowość
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}