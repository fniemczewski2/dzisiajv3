"use client";

import React, { useState } from "react";
import { Bus, ChevronDown, ChevronUp } from "lucide-react";
import LoadingState from "../LoadingState";
import { useTransport } from "../../hooks/useTransport";
import StopItem from "../transport/StopItem";
import NoResultsState from "../NoResultsState";

export default function TransportWidget() {
  const [open, setOpen] = useState(false);
  const { nearbyGroups, loadingNearby, error } = useTransport(open);

  return (
    <div className="widget">
      <div 
        onClick={() => setOpen(!open)} 
        className="flex justify-between items-center px-4 py-3 cursor-pointer hover:bg-surface transition-colors"
      >
        <h3 className="flex font-semibold items-center text-text">
          <span className="text-primary mr-3">
            <Bus className="w-5 h-5 sm:w-6 sm:h-6" />
          </span>
          Transport
        </h3>
        <div className="text-textMuted">
          {open ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </div>

      {open && (
        <div className="animate-in slide-in-from-top-2 border-t border-gray-100 dark:border-gray-800 bg-surface/30">
          
          {/* Komunikat błędu */}
          {error && (
            <div className="p-4 text-center text-sm font-medium text-red-500">
              {error}
            </div>
          )}
          
          {loadingNearby && nearbyGroups.length === 0 && !error ? (
            <div className="p-6 flex justify-center">
              <LoadingState />
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
              {!loadingNearby && nearbyGroups.length === 0 && !error && (
                <NoResultsState text="przystanków w pobliżu" />
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}