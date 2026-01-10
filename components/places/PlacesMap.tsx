import React, { useEffect, useRef, useState } from "react";
import { Place } from "../../types";

interface PlacesMapProps {
  places: Place[];
  onPlaceClick?: (place: Place) => void;
}

export default function PlacesMap({ places, onPlaceClick }: PlacesMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined" && !mapLoaded) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);

      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => setMapLoaded(true);
      document.head.appendChild(script);
    }
  }, [mapLoaded]);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current || mapInstance) return;

    const L = (window as any).L;
    const center =
      places.length > 0 ? [places[0].lat, places[0].lng] : [52.406, 16.925]; 
    const map = L.map(mapRef.current).setView(center, 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    setMapInstance(map);

    return () => {
      if (map) {
        map.remove();
      }
    };
  }, [mapLoaded, places.length]);

  useEffect(() => {
    if (!mapInstance || !mapLoaded) return;

    const L = (window as any).L;
    if (!L) return;

    markersRef.current.forEach((marker) => {
      if (marker && mapInstance) {
        try {
          marker.remove();
        } catch (e) {
          console.error("Error removing marker:", e);
        }
      }
    });
    markersRef.current = [];

    const newMarkers = places.map((place) => {
      try {
        const marker = L.marker([place.lat, place.lng]).addTo(mapInstance);

        const popupContent = `
          <div class="p-2">
            <h3 class="font-bold text-sm">${place.name}</h3>
            ${place.address ? `<p class="text-xs text-gray-600 mt-1">${place.address}</p>` : ""}
            ${
              place.tags.length > 0
                ? `<div class="flex flex-wrap gap-1 mt-2">
                    ${place.tags
                      .map(
                        (tag) =>
                          `<span class="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">${tag}</span>`
                      )
                      .join("")}
                  </div>`
                : ""
            }
          </div>
        `;

        marker.bindPopup(popupContent);

        if (onPlaceClick) {
          marker.on("click", () => onPlaceClick(place));
        }

        return marker;
      } catch (e) {
        console.error("Error creating marker:", e);
        return null;
      }
    }).filter(Boolean);

    markersRef.current = newMarkers;

    if (places.length > 0 && mapInstance) {
      try {
        const bounds = L.latLngBounds(
          places.map((p) => [p.lat, p.lng])
        );
        mapInstance.fitBounds(bounds, { padding: [50, 50] });
      } catch (e) {
        console.error("Error fitting bounds:", e);
      }
    }
  }, [places, mapInstance, mapLoaded, onPlaceClick]);

  if (!mapLoaded) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">Ładowanie mapy...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden relative">
      <div ref={mapRef} className="h-[600px] w-full" />
      {places.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 pointer-events-none">
          <p className="text-gray-500">Brak miejsc do wyświetlenia</p>
        </div>
      )}
    </div>
  );
}