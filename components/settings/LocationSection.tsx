// components/settings/LocationSection.tsx

import React, { useState } from "react";
import { MapPin } from "lucide-react";
import { SecondaryFullButton } from "../ui/CommonButtons";

interface LocationSectionProps {
  onRequestLocation: () => void;
  locationStatus: string | null;
}

export default function LocationSection({ onRequestLocation, locationStatus }: Readonly<LocationSectionProps>) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="card mb-4 p-4 shadow-sm transition-colors sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3 text-text">
          <h3 className="text-lg font-bold">Lokalizacja</h3>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          type="button"
          className="text-xs font-bold text-primary transition-colors hover:text-primary-strong"
        >
          {showDetails ? "Ukryj tech." : "Techniczne"}
        </button>
      </div>

      {showDetails && (
        <div className="mb-5 rounded-lg border border-line bg-surface p-4">
          <div className="flex flex-col justify-between gap-2 text-xs sm:flex-row sm:items-center sm:text-sm">
            <span className="font-semibold text-text-secondary">Aktualne współrzędne:</span>
            <span className="card px-2.5 py-1 font-mono font-medium text-text">{locationStatus || "Brak danych"}</span>
          </div>
        </div>
      )}

      <SecondaryFullButton onClick={() => onRequestLocation()} Icon={MapPin}>
        Pobierz lokalizację
      </SecondaryFullButton>
    </div>
  );
}
