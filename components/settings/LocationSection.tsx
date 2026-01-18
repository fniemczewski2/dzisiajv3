// components/settings/LocationSection.tsx
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
    <div className="bg-card mb-4 p-6 rounded-xl shadow space-y-4">
      <div className="flex items-center">
        <MapPin className="w-5 h-5 mr-2 text-gray-600 flex-shrink-0" />
          <h3 className="text-xl w-full font-semibold flex items-center">
          Lokalizacja
          </h3>
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="text-sm text-primary hover:underline"
      >
        {showDetails ? 'Ukryj' : 'Szczegóły'}
      </button>
      </div>
      {showDetails && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Lokalizacja:</span>
            <span className="px-2 py-1 font-mono rounded text-sm text-gray-700">
              {locationStatus}
            </span>
          </div>
        </div>
      )}
      <button
        onClick={onRequestLocation}
        className="px-4 py-2 flex text-white rounded-lg bg-primary hover:bg-secondary"
      >
        Pobierz lokalizację&nbsp;
        <MapPin className="w-5 h-5" />
      </button>
    </div>
  );
}