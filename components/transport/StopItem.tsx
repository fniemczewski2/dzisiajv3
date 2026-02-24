import React from "react";
import { MapPin, Star, X } from "lucide-react";
import { Departure } from "../../hooks/useTransport";

interface StopItemProps {
  stopName: string;
  distance?: number;
  departures: Departure[];
  isLoading: boolean;
  onRemove?: () => void;
  onAddFavorite?: () => void;
  many?: boolean;
  zone_id?: string; 
}

const getStatusColor = (dep: Departure) => {
  return dep.is_realtime ? "text-blue-500 font-semibold" : "text-muted-foreground";
};

export default function StopItem({ stopName, distance, departures, isLoading, onRemove, onAddFavorite, many, zone_id }: StopItemProps) {

  // Zabezpieczenie na poziomie UI: ucinamy długie tablice, by widget nie zajmował całego ekranu
  const displayDepartures = React.useMemo(() => {
    if (!departures) return [];
    
    // Ustawiamy limit: 10 dla widoku rozszerzonego (many=true), 5 dla skróconego
    const limit = many ? 10 : 5;
    return departures.slice(0, limit);
  }, [departures, many]);

  return (
    <div className="p-4 bg-card border-b border-border last:border-0">
      <div className="flex justify-between items-start mb-3">
        <h4 className="font-semibold text-sm flex items-center">{stopName}</h4>
        <div className="flex items-center gap-2">
          
          <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-full">
            <MapPin className="w-3 h-3" />
            {/* Bezpieczne zaokrąglanie ułamków, np. 76.2739... -> 76m */}
            {distance !== undefined ? `${Math.round(distance)}m` : zone_id === "S" ? "Szczecin" : "Poznań"}
          </div>

          {onAddFavorite && zone_id !== undefined && zone_id !== "" && (
            <button onClick={onAddFavorite} className="p-1 hover:bg-gray-100 rounded-md text-primary transition-colors">
              <Star className="w-4 h-4" />
            </button>
          )}
          {onRemove && (
            <button onClick={onRemove} className="p-1 hover:bg-gray-100 rounded-md text-red-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2 animate-in fade-in duration-500">
        {isLoading && !departures.length ? (
          <div className="space-y-3 py-2 animate-pulse">
            <div className="h-9 bg-gray-200 rounded-lg w-full" />
            <div className="h-9 bg-gray-200 rounded-lg w-3/4" />
          </div>
        ) : displayDepartures.length > 0 ? (
          displayDepartures.map((dep, idx) => (
            <div key={`${dep.line}-${dep.minutes}-${idx}`} className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 uppercase text-primary font-bold px-2 py-1 rounded-md min-w-[38px] justify-center border shadow-sm">
                  {dep.line}
                </span>
                <span className="text-xs font-semibold truncate max-w-[150px] uppercase tracking-tight text-foreground/80">
                  {dep.direction}
                </span>
              </div>
              <div className="text-right">
                <div className={`text-xs font-bold tabular-nums ${getStatusColor(dep)}`}>
                  {dep.minutes <= 0 ? (
                    <span className="text-blue-600 font-black animate-pulse">TERAZ</span>
                  ) : (
                    `${dep.minutes} min`
                  )}
                </div>
                <div className="text-[9px] text-muted-foreground leading-none mt-0.5">
                  {dep.time}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center py-4 text-[10px] text-muted-foreground italic">
            Brak odjazdów w najbliższym czasie
          </div>
        )}
      </div>
    </div>
  );
}