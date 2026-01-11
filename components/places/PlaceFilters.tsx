import { List, MapPin, Search } from "lucide-react";
import React, { useState } from "react";
import ImportPlaces from "./ImportPlaces";
import { usePlaces } from "../../hooks/usePlaces";

interface TimeFilter {
  day: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
}

interface PlaceFiltersProps {
  availableTags: string[];
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  timeFilter: TimeFilter | null;
  onTimeFilterChange: (filter: TimeFilter | null) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  setViewMode: (mode: "list" | "map") => void;
  viewMode: "list" | "map";
}

const DAYS = [
  "Poniedziałek",
  "Wtorek",
  "Środa",
  "Czwartek",
  "Piątek",
  "Sobota",
  "Niedziela"
];

export default function PlaceFilters({
  availableTags,
  selectedTags,
  onTagsChange,
  timeFilter,
  onTimeFilterChange,
  searchQuery,
  onSearchChange,
  setViewMode,
  viewMode
}: PlaceFiltersProps) {
  const [showTimeFilter, setShowTimeFilter] = useState(false);
  const [showTagFilter, setShowTagFilter] = useState(false);
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const handleTimeFilterChange = (
    field: keyof TimeFilter,
    value: string | number
  ) => {
    const newFilter = timeFilter || { day: 1, startTime: "09:00", endTime: "17:00" };
    onTimeFilterChange({ ...newFilter, [field]: value });
  };

  const clearTimeFilter = () => {
    onTimeFilterChange(null);
    setShowTimeFilter(false);
  };

  return (
    <>
      <div className="w-full flex flex-nowrap items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Nazwa lub adres..."
            className="w-full py-2 border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent flex-1 rounded-xl pl-10 pr-3 bg-white"
          />
        </div>
          {viewMode === "map" ? (
              <button
                onClick={() => setViewMode("list")}
                className={"px-3 py-1.5 rounded-lg transition-colors bg-primary hover:bg-secondary border-transparent text-white flex items-center mt-0"}
              >
                Lista&nbsp;&nbsp;
                <List/>
              </button>
            ) : (
              <button
                onClick={() => setViewMode("map")}
                className={"px-3 py-1.5 rounded-lg transition-colors bg-primary hover:bg-secondary border-transparent text-white flex items-center mt-0"}
              >
                Mapa&nbsp;&nbsp;
                <MapPin/>
              </button>
            )}     
        </div>
      
      <div className="mt-4">

      {/* Tags */}
      {availableTags.length > 0 && (
        
        <div className="mb-2">
          <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tagi
          </label>
          <button
            onClick={() => setShowTagFilter(!showTagFilter)}
            className="text-sm text-primary hover:text-secondary hover:underline mb-2"
          >
            {showTagFilter ? "Ukryj" : "Pokaż"}
          </button>
          </div>
          {showTagFilter && (
          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`
                  px-3 py-1 rounded-full text-sm transition-colors
                  ${
                    selectedTags.includes(tag)
                      ? "bg-primary text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }
                `}
              >
                {tag}
              </button>
            ))}
            </div>
          )}
          </div>
      )}

      {/* Time Filter */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Godziny otwarcia
          </label>
          <button
            onClick={() => setShowTimeFilter(!showTimeFilter)}
            className="text-sm text-primary hover:text-secondary hover:underline"
          >
            {showTimeFilter ? "Ukryj" : "okaż"}
          </button>
        </div>

        {showTimeFilter && (
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Dzień tygodnia
              </label>
              <select
                value={timeFilter?.day ?? 1}
                onChange={(e) =>
                  handleTimeFilterChange("day", parseInt(e.target.value))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              >
                {DAYS.map((day, index) => (
                  <option key={index} value={index}>
                    {day}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Od</label>
                <input
                  type="time"
                  value={timeFilter?.startTime ?? "09:00"}
                  onChange={(e) =>
                    handleTimeFilterChange("startTime", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Do</label>
                <input
                  type="time"
                  value={timeFilter?.endTime ?? "17:00"}
                  onChange={(e) =>
                    handleTimeFilterChange("endTime", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {timeFilter && (
              <button
                onClick={clearTimeFilter}
                className="w-full px-3 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg text-sm transition-colors"
              >
                Wyczyść filtr godzin
              </button>
            )}
          </div>
        )}
      </div>
    </div>
    </>
  );
}
