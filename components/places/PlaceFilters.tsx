import { List, MapPin } from "lucide-react";
import React, { useMemo, useState } from "react";
import { usePlaces } from "../../hooks/usePlaces";
import SearchBar from "../SearchBar";

interface TimeFilter {
  day: number; 
  startTime: string; 
  endTime: string; 
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
  "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"       
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

  const handleTimeFilterChange = (field: keyof TimeFilter, value: string | number) => {
    const newFilter = timeFilter || { day: 0, startTime: "09:00", endTime: "17:00" };
    onTimeFilterChange({ ...newFilter, [field]: value });
  };

  const clearTimeFilter = () => {
    onTimeFilterChange(null);
    setShowTimeFilter(false);
  };

  const { places } = usePlaces(); 
  const suggestions = useMemo(() => {
    if (!places) return [];
    return places
      .flatMap((p) => [p.name, p.address])
      .filter((s): s is string => typeof s === "string")
      .slice(0, 20);
  }, [places]);

  return (
    <div className="mb-6">
      <div className="w-full flex flex-nowrap items-center gap-2">
         <SearchBar
           value={searchQuery}
           onChange={onSearchChange}
           placeholder="Szukaj po nazwie lub adresie..."
           suggestions={suggestions}
           onSuggestionClick={onSearchChange}
           className="flex-1"
         />
         <button
           onClick={() => setViewMode(viewMode === "map" ? "list" : "map")}
           className="px-4 py-2 rounded-xl transition-colors bg-primary hover:bg-secondary text-white flex items-center justify-center gap-2 h-[42px] min-w-[90px] font-medium"
         >
           {viewMode === "map" ? (
             <>Lista <List className="w-5 h-5"/></>
           ) : (
             <>Mapa <MapPin className="w-5 h-5"/></>
           )}
         </button>
      </div>
      
      <div className="mt-4 space-y-3">
        {availableTags.length > 0 && (
          <div className="card rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-textSecondary">
                Tagi
              </label>
              <button
                onClick={() => setShowTagFilter(!showTagFilter)}
                className="text-xs font-bold text-primary hover:text-secondary uppercase tracking-wider transition-colors"
              >
                {showTagFilter ? "Ukryj" : "Filtruj po tagach"}
              </button>
            </div>
            
            {showTagFilter && (
              <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
                      selectedTags.includes(tag)
                        ? "bg-primary text-white border-primary"
                        : "bg-surface text-textSecondary hover:text-text border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="card rounded-xl p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-textSecondary">
              Godziny otwarcia
            </label>
            <button
              onClick={() => setShowTimeFilter(!showTimeFilter)}
              className="text-xs font-bold text-primary hover:text-secondary uppercase tracking-wider transition-colors"
            >
              {showTimeFilter ? "Ukryj" : "Filtruj po czasie"}
            </button>
          </div>

          {showTimeFilter && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-3">
              <div>
                <label className="form-label">Dzień tygodnia:</label>
                <select
                  value={timeFilter?.day ?? 0}
                  onChange={(e) => handleTimeFilterChange("day", parseInt(e.target.value))}
                  className="input-field py-1.5"
                >
                  {DAYS.map((day, index) => (
                    <option key={index} value={index}>{day}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0 max-w-[100%]">
                  <label className="form-label">Od godziny:</label>
                  <input
                    type="time"
                    value={timeFilter?.startTime ?? "09:00"}
                    onChange={(e) => handleTimeFilterChange("startTime", e.target.value)}
                    className="input-field py-1.5"
                  />
                </div>
                <div className="min-w-0 max-w-[100%]">
                  <label className="form-label">Do godziny:</label>
                  <input
                    type="time"
                    value={timeFilter?.endTime ?? "17:00"}
                    onChange={(e) => handleTimeFilterChange("endTime", e.target.value)}
                    className="input-field py-1.5"
                  />
                </div>
              </div>

              {timeFilter && (
                <div className="pt-2">
                  <button
                    onClick={clearTimeFilter}
                    className="w-full px-4 py-2 bg-surface hover:bg-surfaceHover text-textSecondary hover:text-text font-bold rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
                  >
                    Wyczyść filtr czasowy
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}