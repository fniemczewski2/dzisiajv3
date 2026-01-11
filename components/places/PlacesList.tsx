import React, { useState } from "react";
import { Place } from "../../types";
import { ChevronDown, Globe, MapPin, Phone, Star, Edit2, Trash2 } from "lucide-react";

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
      <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
        Brak miejsc do wyświetlenia
      </div>
    );
  }

  const DAY_NAMES: { [key: string]: string } = {
    monday: "Poniedziałek",
    tuesday: "Wtorek",
    wednesday: "Środa",
    thursday: "Czwartek",
    friday: "Piątek",
    saturday: "Sobota",
    sunday: "Niedziela",
  };

  const DAY_ORDER = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  return (
    <div className="space-y-3">
      {places.map((place) => {
        const isExpanded = expandedId === place.id;

        return (
          <div
            key={place.id}
            className="bg-white rounded-lg shadow hover:shadow-md transition-shadow"
          >
            {/* Header */}
            <div
              className="p-4 cursor-pointer"
              onClick={() => toggleExpand(place.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-800">
                    {place.name}
                  </h3>
                  {place.address && (
                    <p className="text-sm text-gray-600 mt-1">{place.address}</p>
                  )}
                  {place.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {place.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  className="text-gray-400 hover:text-gray-600 transition-colors ml-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(place.id);
                  }}
                >
                  {isExpanded ? <ChevronDown className="transform rotate-180" /> : <ChevronDown />}
                </button>
              </div>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
              <div className="px-4 pb-4 border-t border-gray-100 pt-4 space-y-3">
                {place.rating && (
                  <div className="text-sm flex items-center gap-2">
                    <span className="text-gray-600" title="ocena"><Star className="w-4 h-4"/></span>
                    <span className="font-medium">{place.rating}/5</span>
                  </div>
                )}

                {place.phone_number && (
                  <div className="text-sm flex items-center gap-2">
                    <span className="text-gray-600" title="telefon"><Phone className="w-4 h-4"/></span>
                    <a
                      href={`tel:${place.phone_number}`}
                      className="text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {place.phone_number}
                    </a>
                  </div>
                )}

                {place.website && (
                  <div className="text-sm flex items-center gap-2">
                    <span className="text-gray-600" title="strona"><Globe className="w-4 h-4"/></span>
                    <a
                      href={place.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {place.website}
                    </a>
                  </div>
                )}

                {place.opening_hours && (
                  <div className="text-sm">
                    <div className="bg-gray-50 p-2 rounded space-y-1">
                    {DAY_ORDER
                      .filter(day => place.opening_hours?.[day])
                      .map((day) => (
                        <div key={day} className="text-xs">
                          <span className="font-medium">
                            {DAY_NAMES[day]}:
                          </span>{" "}
                          {Array.isArray(place.opening_hours![day]) 
                            ? place.opening_hours![day].join(", ") 
                            : place.opening_hours![day]}
                        </div>
                      ))}
                  </div>
                  </div>
                )}

                {place.notes && (
                  <div className="text-sm">
                    <span className="text-gray-600 block mb-1">Notatki:</span>
                    <p className="bg-gray-50 p-2 rounded text-gray-700">
                      {place.notes}
                    </p>
                  </div>
                )}
                {/* Actions */}
                <div className="flex gap-2 sm:gap-3 pt-2 justify-end">
                  <a
                    href={
                      place.google_place_id
                        ? `https://www.google.com/maps/place/?q=place_id:${place.google_place_id}`
                        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            `${place.name}${place.address ? ', ' + place.address : ''}`
                          )}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col px-1.5 items-center justify-center rounded-lg text-green-500 hover:text-green-700 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MapPin className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span className="text-[9px] sm:text-[11px]">Mapy</span>
                  </a>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(place);
                    }}
                    className="flex flex-col px-1.5 items-center justify-center rounded-lg text-primary hover:text-secondary transition-colors"
                    aria-label="Edytuj"
                  >
                    <Edit2 className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span className="text-[9px] sm:text-[11px]">Edytuj</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Czy na pewno chcesz usunąć to miejsce?")) {
                        onDelete(place.id);
                      }
                    }}
                    className="flex flex-col px-1.5 items-center justify-center rounded-lg text-red-500 hover:text-red-600 transition-colors"
                    aria-label="Usuń"
                  >
                    <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span className="text-[9px] sm:text-[11px]">Usuń</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}