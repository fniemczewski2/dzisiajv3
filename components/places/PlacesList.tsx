import React, { useState } from "react";
import { Place } from "../../types";
import { ChevronDown, Globe, MapPin, Phone, Star } from "lucide-react";
import { EditButton, DeleteButton } from "../CommonButtons"; // Używamy ujednoliconych przycisków!
import NoResultsState from "../NoResultsState";

interface PlacesListProps {
  places: Place[];
  onEdit: (place: Place) => void;
  onDelete: (id: string) => void;
}

export default function PlacesList({
  places,
  onEdit,
  onDelete,
}: PlacesListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (places.length === 0) {
    return (
      <NoResultsState
        text="miejsc"
        isSearch
      />
    );
  }

  const DAY_NAMES: { [key: string]: string } = {
    monday: "Poniedziałek", tuesday: "Wtorek", wednesday: "Środa",
    thursday: "Czwartek", friday: "Piątek", saturday: "Sobota", sunday: "Niedziela",
  };

  const DAY_ORDER = [
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
  ];

  return (
    <div className="space-y-3">
      {places.map((place) => {
        const isExpanded = expandedId === place.id;

        return (
          <div
            key={place.id}
            className="bg-card rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 transition-all duration-200 hover:border-primary/50 group overflow-hidden"
          >
            {/* Header */}
            <div
              className="p-4 cursor-pointer"
              onClick={() => toggleExpand(place.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-2 min-w-0">
                  <h3 className="font-bold text-lg text-text leading-tight truncate">
                    {place.name}
                  </h3>
                  {place.address && (
                    <p className="text-xs text-textSecondary mt-1 truncate">{place.address}</p>
                  )}
                  {place.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {place.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold uppercase tracking-wider rounded-md"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  className="p-2 bg-surface text-textSecondary rounded-lg transition-colors group-hover:bg-primary/10 group-hover:text-primary shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(place.id);
                  }}
                >
                  <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                </button>
              </div>
            </div>

            {/* Rozwinięte Detale */}
            {isExpanded && (
              <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800 pt-4 space-y-4 bg-surface/30">
                
                {/* Informacje (Ocena, Tel, WWW) */}
                <div className="space-y-2">
                  {place.rating && (
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-surface rounded-md text-yellow-500"><Star className="w-3.5 h-3.5 fill-current"/></div>
                      <span className="text-sm font-bold text-text">{place.rating}/5</span>
                    </div>
                  )}
                  {place.phone_number && (
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-surface rounded-md text-green-500"><Phone className="w-3.5 h-3.5"/></div>
                      <a href={`tel:${place.phone_number}`} className="text-sm font-medium text-primary hover:underline truncate" onClick={(e) => e.stopPropagation()}>
                        {place.phone_number}
                      </a>
                    </div>
                  )}
                  {place.website && (
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-surface rounded-md text-blue-500"><Globe className="w-3.5 h-3.5"/></div>
                      <a href={place.website} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline truncate" onClick={(e) => e.stopPropagation()}>
                        {place.website.replace(/^https?:\/\/(www\.)?/, '')}
                      </a>
                    </div>
                  )}
                </div>

                {/* Godziny Otwarcia */}
                {place.opening_hours && (
                  <div>
                    <span className="text-[10px] font-bold text-textMuted uppercase tracking-widest block mb-2">Godziny otwarcia:</span>
                    <div className="bg-card border border-gray-100 dark:border-gray-800 p-3 rounded-xl space-y-1.5 shadow-sm">
                    {DAY_ORDER
                      .filter(day => place.opening_hours?.[day])
                      .map((day) => (
                        <div key={day} className="text-xs flex justify-between">
                          <span className="font-semibold text-textSecondary">{DAY_NAMES[day]}</span>
                          <span className="text-text font-medium text-right">
                            {Array.isArray(place.opening_hours![day]) 
                              ? place.opening_hours![day].join(", ") 
                              : place.opening_hours![day]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notatki */}
                {place.notes && (
                  <div>
                    <span className="text-[10px] font-bold text-textMuted uppercase tracking-widest block mb-2">Notatki:</span>
                    <p className="bg-card border border-gray-100 dark:border-gray-800 p-3 rounded-xl text-sm text-textSecondary leading-relaxed shadow-sm whitespace-pre-wrap">
                      {place.notes}
                    </p>
                  </div>
                )}

                {/* Przyciski Akcji */}
                <div className="flex justify-between w-full gap-1 sm:gap-1.5 pt-3 mt-4 border-t border-gray-100 dark:border-gray-800">
                  <a
                    href={
                      place.google_place_id
                        ? `https://google.com/maps/place/?q=place_id:${place.google_place_id}` // Poprawiony link do Google Maps na mobile/web
                        : `https://google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name}${place.address ? ", " + place.address : ""}`)}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-500/30 transition-colors border border-green-200 dark:border-green-500/30"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />
                    <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wide">Nawiguj</span>
                  </a>
                  
                  <EditButton onClick={() => { onEdit(place); }} />
                  
                  <DeleteButton onClick={() => { 
                    if (confirm("Czy na pewno usunąć?")) onDelete(place.id); 
                  }} />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}