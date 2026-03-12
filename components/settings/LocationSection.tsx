import React, { useState } from "react";
import { MapPin } from "lucide-react";

interface LocationSectionProps {
  onRequestLocation: () => void;
  locationStatus: string | null;
}

export default function LocationSection({
  onRequestLocation,
  locationStatus,
}: LocationSectionProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="card rounded-xl shadow-sm p-4 sm:p-6 mb-4 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 text-text">
          <div>
            <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
          </div>
          <h3 className="text-lg font-bold">Lokalizacja</h3>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs font-bold uppercase tracking-wider text-primary hover:text-secondary transition-colors"
        >
          {showDetails ? 'Ukryj tech.' : 'Techniczne'}
        </button>
      </div>

      {showDetails && (
        <div className="bg-surface border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs sm:text-sm gap-2">
            <span className="font-semibold text-textSecondary">Aktualne współrzędne:</span>
            <span className="px-2.5 py-1 font-mono font-medium rounded-md card text-text">
              {locationStatus || 'Brak danych'}
            </span>
          </div>
        </div>
      )}
      
      <button
        onClick={onRequestLocation}
        className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-secondary text-white font-bold rounded-xl shadow-sm transition-colors"
      >
        <span>Pobierz lokalizację</span>
        <MapPin className="w-5 h-5" />
      </button>
    </div>
  );
}