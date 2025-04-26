import { useState } from 'react';

export default function WaterTracker() {
  const [water, setWater] = useState(0);
  return (
    <div className="mb-6">
      <label className="block mb-2">Daily Water Intake: {water.toFixed(1)}L / 2.0L</label>
      <input
        type="range"
        min="0"
        max="2.0"
        step="0.1"
        value={water}
        onChange={(e) => setWater(parseFloat(e.target.value))}
        className="w-full"
      />
      <div className="w-full bg-gray-200 h-2 rounded mt-1">
        <div
          className="bg-blue-500 h-2 rounded"
          style={{ width: `${(water / 2) * 100}%` }}
        />
      </div>
    </div>
  );
}