// components/WaterTracker.tsx

import { useState } from "react";
import { Droplet } from "lucide-react";

export default function WaterTracker() {
  const [water, setWater] = useState(0);
  const fillPercent = (water / 2) * 100;

  return (
    <div className="bg-card rounded-xl shadow p-4 mb-4">
      {/* Nagłówek z ikoną */}
      <div className="flex items-center mb-4">
        <Droplet className="w-6 h-6 mr-2" />
        <span className="font-medium text-gray-700">
          Spożycie wody:{" "}
          <span className="font-medium">{water.toFixed(1)}L</span> / 2.0L
        </span>
      </div>

      {/* Kontener paska postępu + ukryty suwak */}
      <div className="relative w-full h-3 bg-secondary/10 rounded">
        {/* wypełnienie */}
        <div
          className="absolute left-0 top-0 h-3 rounded bg-primary transition-all duration-200"
          style={{ width: `${fillPercent}%` }}
        />

        {/* nasze kółko */}
        <div
          className="absolute top-1/2 w-4 h-4 rounded-full bg-primary border-2 border-white transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200"
          style={{ left: `${fillPercent}%` }}
        />

        {/* niewidoczny input range nad paskiem */}
        <input
          title="water"
          type="range"
          min="0"
          max="2.0"
          step="0.1"
          value={water}
          onChange={(e) => setWater(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
}
