"use client";

import React from "react";
import { MapPin, Star, X } from "lucide-react";
import { Departure } from "../../hooks/useTransport";
import NoResultsState from "../NoResultsState";

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
  return dep.is_realtime 
    ? "text-blue-600 dark:text-blue-400 font-bold" 
    : "text-textSecondary font-semibold";
};

export default function StopItem({ stopName, distance, departures, isLoading, onRemove, onAddFavorite, many, zone_id }: Readonly<StopItemProps>) {

  const displayDepartures = React.useMemo(() => {
    if (!departures) return [];
    const limit = many ? 10 : 5;
    return departures.slice(0, limit);
  }, [departures, many]);

  return (
    <div className="p-4 bg-transparent transition-colors hover:bg-surfaceHover">

      <div className="flex justify-between items-start mb-4">
        <h4 className="font-medium text-md text-text flex items-center leading-tight">
          {stopName}
        </h4>
        <div className="flex items-center gap-1.5 shrink-0 pl-2">
          
          <div className="flex items-center gap-1 text-xs font-bold tracking-wider uppercase text-textSecondary bg-surface border border-gray-200 dark:border-gray-700 px-2 py-1 rounded-md">
            <MapPin className="w-3 h-3" />
            {distance !== undefined ? `${Math.round(distance)}m` : zone_id === "S" ? "Szczecin" : "Poznań"}
          </div>

          {onAddFavorite && zone_id !== undefined && zone_id !== "" && (
            <button onClick={onAddFavorite} className="p-1.5 bg-surface hover:bg-yellow-500/10 border border-gray-200 dark:border-gray-700 rounded-md text-yellow-500 transition-colors" title="Dodaj do ulubionych">
              <Star className="w-3.5 h-3.5" />
            </button>
          )}
          {onRemove && (
            <button onClick={onRemove} className="p-1.5 bg-surface hover:bg-red-500/10 border border-gray-200 dark:border-gray-700 rounded-md text-red-500 transition-colors" title="Usuń z ulubionych">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      <div className="space-y-2.5 animate-in fade-in duration-500">
        {isLoading && !departures.length ? (
          <div className="space-y-3 py-2 animate-pulse">
            <div className="h-10 bg-surface rounded-lg w-full" />
            <div className="h-10 bg-surface rounded-lg w-3/4" />
          </div>
        ) : displayDepartures.length > 0 ? (
          displayDepartures.map((dep, idx) => (
            <div key={`${dep.line}-${dep.minutes}-${idx}`} className="flex items-center justify-between group">
              
              <div className="flex items-center gap-3 flex-1 min-w-0 pr-3">
                <span className="flex items-center gap-1 font-bold text-md bg-primary text-white px-1 py:0.5 md:px-2.5 md:py-1.5 rounded-lg min-w-[42px] justify-center shadow-sm shrink-0">
                  {dep.line}
                </span>
                <span className="text-sm font-medium truncate uppercase tracking-tight text-textSecondary group-hover:text-text transition-colors">
                  {dep.direction}
                </span>
              </div>

              <div className="text-right shrink-0">
                <div className={`text-sm tabular-nums tracking-tight ${getStatusColor(dep)}`}>
                  {dep.minutes <= 0 ? (
                    <span className="text-green-600 dark:text-green-500 font-bold animate-pulse">TERAZ</span>
                  ) : (
                    `${dep.minutes} min`
                  )}
                </div>
                <div className="text-[9px] font-medium text-textMuted leading-none mt-0.5 md:mt-1">
                  {dep.time}
                </div>
              </div>

            </div>
          ))
        ) : (
          <NoResultsState text="kursów" />
        )}
      </div>
    </div>
  );
}