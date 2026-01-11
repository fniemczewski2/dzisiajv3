// components/settings/LocationSection.tsx
import React from "react";
import { MapPin } from "lucide-react";

interface LocationSectionProps {
  onRequestLocation: () => void;
  locationStatus: string | null;
}

export default function LocationSection({
  onRequestLocation,
  locationStatus,
}: LocationSectionProps) {
  return (
    <div className="bg-card mb-4 p-6 rounded-xl shadow space-y-4">
      <h3 className="text-xl font-semibold flex items-center">
        <MapPin className="w-5 h-5 mr-2 text-gray-600" />
        Lokalizacja
      </h3>
      <button
        onClick={onRequestLocation}
        className="px-4 py-2 flex text-white rounded-lg bg-primary hover:bg-secondary"
      >
        Pobierz lokalizację&nbsp;
        <MapPin className="w-5 h-5" />
      </button>
      {locationStatus && (
        <p className="text-sm text-gray-700 mt-2">{locationStatus}</p>
      )}
    </div>
  );
}