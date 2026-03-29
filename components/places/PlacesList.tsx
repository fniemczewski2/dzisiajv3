"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Place } from "../../types";
import { ChevronDown, Globe, MapPin, Phone, Star, Navigation } from "lucide-react";
import { EditButton, DeleteButton } from "../CommonButtons";
import { useSettings } from "../../hooks/useSettings";
import { useToast } from "../../providers/ToastProvider";
import { useAuth } from "../../providers/AuthProvider";
import { withRetry } from "../../lib/withRetry";
import NoResultsState from "../NoResultsState";

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

interface PlacesListProps {
  places: Place[];
  onEdit: (place: Place) => void;
  onDelete: (id: string) => Promise<void>;
}

const DAY_NAMES: Record<string, string> = {
  monday: "Poniedziałek", tuesday: "Wtorek", wednesday: "Środa",
  thursday: "Czwartek", friday: "Piątek", saturday: "Sobota", sunday: "Niedziela",
};
const DAY_ORDER = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];

export default function PlacesList({ places, onEdit, onDelete }: Readonly<PlacesListProps>) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { settings, requestGeolocation } = useSettings();
  const { toast } = useToast();
  const { user } = useAuth();
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (settings?.sort_places === "distance" && !userCoords) {
      requestGeolocation((coords) => setUserCoords(coords));
    }
  }, [settings?.sort_places, userCoords, requestGeolocation]);

  const toggleExpand = (id: string) =>
    setExpandedId(expandedId === id ? null : id);

  const sortedPlaces = useMemo(() => {
    const sortType = settings?.sort_places || "alphabetical";
    return [...places].sort((a, b) => {
      if (sortType === "distance" && userCoords) {
        const latA = Number(a.lat) || 0, lngA = Number(a.lng) || 0;
        const latB = Number(b.lat) || 0, lngB = Number(b.lng) || 0;
        if (!latA || !lngA) return 1;
        if (!latB || !lngB) return -1;
        return (
          calculateDistance(userCoords.lat, userCoords.lng, latA, lngA) -
          calculateDistance(userCoords.lat, userCoords.lng, latB, lngB)
        );
      }
      return (a.name || "").localeCompare(b.name || "", "pl");
    });
  }, [places, settings?.sort_places, userCoords]);

  const getDistanceText = (latVal?: number | null, lngVal?: number | null) => {
    if (!userCoords || !latVal || !lngVal) return null;
    const d = calculateDistance(userCoords.lat, userCoords.lng, latVal, lngVal);
    return d < 1 ? `${(d * 1000).toFixed(0)} m` : `${d.toFixed(1)} km`;
  };

  const handleDelete = async (id: string) => {
    const ok = await toast.confirm("Czy na pewno chcesz usunąć to miejsce?");
    if (!ok) return;
    await withRetry(
      async () => { await onDelete(id); },
      toast,
      { context: "PlacesList.onDelete", userId: user?.id }
    );
    toast.success("Usunięto pomyślnie.");
  };

  if (places.length === 0) return <NoResultsState text="miejsc" isSearch />;

  return (
    <div className="space-y-3">
      {sortedPlaces.map((place) => {
        const isExpanded = expandedId === place.id;
        const distanceText = getDistanceText(place.lat, place.lng);

        const searchQuery = place.address ? `${place.name}, ${place.address}` : place.name;

        const mapsUrl = place.google_place_id
          ? `https://www.google.com/maps/search/?api=1&query=Google&query_place_id=$${place.google_place_id}`
          : `https://www.google.com/maps/search/?api=1&query=$${encodeURIComponent(searchQuery)}`;

        return (
          <div key={place.id}
            className="card rounded-xl shadow-sm transition-all duration-200 hover:border-primary group overflow-hidden">
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-2 min-w-0">
                  <h3 className="font-bold text-lg text-text leading-tight truncate">{place.name}</h3>
                  {(place.address || distanceText) && (
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-textSecondary">
                      <span className="truncate">{place.address}</span>
                      {distanceText && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-surface text-primary font-semibold rounded-md shrink-0 border border-gray-200 dark:border-gray-700">
                          <Navigation className="w-3 h-3" /> {distanceText}
                        </span>
                      )}
                    </div>
                  )}
                  {place.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {place.tags.map((tag) => (
                        <span key={tag}
                          className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/70 text-primary border border-primary text-[10px] font-bold uppercase tracking-wider rounded-md">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  className="p-2 bg-surface text-textSecondary rounded-lg transition-colors group-hover:bg-blue-100 dark:hover:bg-blue-900 group-hover:text-primary shrink-0"
                  onClick={(e) => { e.stopPropagation(); toggleExpand(place.id); }}>
                  <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                </button>
              </div>
            </div>

            {isExpanded && (
              <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800 pt-4 space-y-4 bg-surface">
                <div className="space-y-2">
                  {place.rating && (
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-surface rounded-md text-yellow-500"><Star className="w-3.5 h-3.5 fill-current" /></div>
                      <span className="text-sm font-bold text-text">{place.rating}/5</span>
                    </div>
                  )}
                  {place.phone_number && (
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-surface rounded-md text-green-500"><Phone className="w-3.5 h-3.5" /></div>
                      <a href={`tel:${place.phone_number}`} className="text-sm font-medium text-primary hover:underline truncate"
                        onClick={(e) => e.stopPropagation()}>
                        {place.phone_number}
                      </a>
                    </div>
                  )}
                  {place.website && (
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-surface rounded-md text-primary"><Globe className="w-3.5 h-3.5" /></div>
                      <a href={place.website} target="_blank" rel="noopener noreferrer"
                        className="text-sm font-medium text-primary hover:underline truncate"
                        onClick={(e) => e.stopPropagation()}>
                        {place.website.replace(/^https?:\/\/(www\.)?/, "")}
                      </a>
                    </div>
                  )}
                </div>

                {place.opening_hours && (
                  <div>
                    <span className="text-[10px] font-bold text-textMuted uppercase tracking-widest block mb-2">Godziny otwarcia:</span>
                    <div className="card p-3 rounded-xl space-y-1.5 shadow-sm">
                      {DAY_ORDER.filter((day) => place.opening_hours?.[day]).map((day) => (
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

                {place.notes && (
                  <div>
                    <span className="text-[10px] font-bold text-textMuted uppercase tracking-widest block mb-2">Notatki:</span>
                    <p className="card p-3 rounded-xl text-sm text-textSecondary leading-relaxed shadow-sm whitespace-pre-wrap">
                      {place.notes}
                    </p>
                  </div>
                )}

                <div className="flex justify-between w-full gap-1 sm:gap-1.5 pt-3 mt-4 border-t border-gray-100 dark:border-gray-800">
                  <a
                    href={mapsUrl}
                    target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-500/30 transition-colors border border-green-200 dark:border-green-500/30"
                    onClick={(e) => e.stopPropagation()}>
                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />
                    <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wide">Nawiguj</span>
                  </a>
                  <EditButton onClick={() => onEdit(place)} />
                  <DeleteButton onClick={() => handleDelete(place.id)} />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}