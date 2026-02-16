import React from "react";
import { MapPin, Star, X } from "lucide-react";
import { Departure } from "../../hooks/useTransport";

interface StopItemProps {
  stopName: string;
  distance?: number;
  departures: Departure[];
  zone_id: string;
  isLoading: boolean;
  onRemove?: () => void;
  onAddFavorite?: () => void;
  many?: boolean;
}

const getStatusColor = (dep: Departure) => {
  if (!dep.is_realtime) return "text-muted-foreground";
  return "text-blue-500 font-semibold";
};

const formatDepartureTime = (minutes: number) => {
  const date = new Date();
  date.setMinutes(date.getMinutes() + minutes);
  return date.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
};

export default function StopItem({ stopName, distance, departures, zone_id, isLoading, onRemove, onAddFavorite, many }: StopItemProps) {

    const filteredDepartures = React.useMemo(() => {
    if (!many) {
        return departures.slice(0, 5);
    }


    const within30 = departures.filter(dep => dep.minutes <= 30);
    const unique: Departure[] = [];

    within30.forEach(dep => {
        const exists = unique.find(
        u => u.line === dep.line && u.direction === dep.direction
        );
        if (!exists) {
        unique.push(dep);
        }
    });

    return unique;
    }, [departures, many]);

  return (
    <div className={`p-4 bg-card border-b border-border last:border-0`}>
      <div className="flex justify-between items-start mb-3">
          <h4 className="font-semibold text-sm flex items-center">{stopName}</h4>
        <div className="flex items-center gap-2">
          {distance !== undefined ? (
            <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-full">
              <MapPin className="w-3 h-3" />
              {Math.round(distance)}m
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-full">
              <MapPin className="w-3 h-3" />
              {zone_id === "S" ? "Szczecin" : "Poznań"}
            </div>
            )}
          {onAddFavorite && (
            <button
                onClick={onAddFavorite}
                className="p-1 hover:bg-gray-100 rounded-md text-primary hover:text-secondary transition-colors"
            >
                <Star className="w-4 h-4" />
            </button>
          )}
          {onRemove && (
            <button onClick={onRemove} className="p-1 hover:bg-gray-100 rounded-md text-red-500 hover:text-red-700 transition-colors">
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
            <div className="h-9 bg-gray-200 rounded-lg w-4/5" />
          </div>
        ) : departures.length > 0 ? (
          
          filteredDepartures.map((dep) => (
            <div key={dep.trip_id} className="flex items-center justify-between group animate-in fade-in duration-500">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-primary font-bold px-2 py-1 rounded-full text-sm min-w-[34px] justify-center border shadow-sm">
                  {dep.line}
                </span>
                <span className="text-xs font-semibold truncate max-w-[130px] uppercase tracking-tight text-foreground/80">
                  {dep.direction}
                </span>
              </div>
              <div className="text-right">
                <div className={`text-xs font-bold tabular-nums ${getStatusColor(dep)}`}>
                  {dep.minutes <= 0 ? (
                    <span className="text-blue-600 animate-pulse">TERAZ</span>
                  ) : (
                    `${dep.minutes} min`
                  )}
                </div>
                <div className="text-[9px] text-muted-foreground leading-none mt-0.5">
                  {formatDepartureTime(dep.minutes)}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center h-[20px] text-[10px] text-muted-foreground italic rounded-lg">
            Brak odjazdów w najbliższym czasie
          </div>
        )}
      </div>
    </div>
  );
}