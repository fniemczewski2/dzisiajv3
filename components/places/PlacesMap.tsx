import React, { useEffect, useRef, useState, useCallback } from "react";
import { Place } from "../../types";
import { Info } from "lucide-react";

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

      // Add custom CSS to fix z-index issues
      const style = document.createElement("style");
      style.textContent = `
        .leaflet-container {
          z-index: 0 !important;
        }
        .leaflet-pane {
          z-index: 400 !important;
        }
        .leaflet-tile-pane {
          z-index: 200 !important;
        }
        .leaflet-overlay-pane {
          z-index: 400 !important;
        }
        .leaflet-shadow-pane {
          z-index: 500 !important;
        }
        .leaflet-marker-pane {
          z-index: 600 !important;
        }
        .leaflet-tooltip-pane {
          z-index: 650 !important;
        }
        .leaflet-popup-pane {
          z-index: 700 !important;
        }
        .leaflet-map-pane canvas {
          z-index: 100 !important;
        }
        .leaflet-control {
          z-index: 800 !important;
        }
      `;
      document.head.appendChild(style);

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

  // Helper function to escape HTML
  const escapeHtml = useCallback((text: string): string => {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }, []);

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

    // Add event listener for custom place click event
    const handlePlaceClick = (e: CustomEvent) => {
      const placeId = e.detail;
      const place = places.find((p) => p.id === placeId);
      if (place && onPlaceClick) {
        onPlaceClick(place);
      }
    };

    window.addEventListener("placeClick", handlePlaceClick as EventListener);

    const newMarkers = places
      .map((place) => {
        try {
          const marker = L.marker([place.lat, place.lng]).addTo(mapInstance);

          const tagsHtml =
            place.tags.length > 0
              ? `<div class="flex flex-wrap gap-1 mt-2">
                    ${place.tags
                      .map(
                        (tag) =>
                          `<span class="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">${escapeHtml(
                            tag
                          )}</span>`
                      )
                      .join("")}
                  </div>`
              : "";

            const detailsButton = onPlaceClick
            ? `<button 
                class="mt-2 px-3 py-1 bg-primary text-white rounded-lg text-xs hover:bg-secondary transition-colors w-full flex items-center justify-center gap-1"
                onclick="window.dispatchEvent(new CustomEvent('placeClick', { detail: '${place.id}' }))"
              >
                <span>Szczegóły</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              </button>`
            : "";

          const popupContent = `
            <div class="p-2 min-w-[200px]">
              <h3 class="font-bold text-sm">${escapeHtml(place.name)}</h3>
              ${
                place.address
                  ? `<p class="text-xs text-gray-600 mt-1">${escapeHtml(
                      place.address
                    )}</p>`
                  : ""
              }
              ${tagsHtml}
              ${detailsButton}
            </div>
          `;

          marker.bindPopup(popupContent, {
            maxWidth: 300,
            className: "custom-popup",
          });

          return marker;
        } catch (e) {
          console.error("Error creating marker:", e);
          return null;
        }
      })
      .filter(Boolean);

    markersRef.current = newMarkers;

    if (places.length > 0 && mapInstance) {
      try {
        const bounds = L.latLngBounds(places.map((p) => [p.lat, p.lng]));
        mapInstance.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      } catch (e) {
        console.error("Error fitting bounds:", e);
      }
    }

    return () => {
      window.removeEventListener(
        "placeClick",
        handlePlaceClick as EventListener
      );
    };
  }, [places, mapInstance, mapLoaded, onPlaceClick, escapeHtml]);

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
    <div className="bg-white rounded-lg shadow overflow-hidden" style={{ position: 'relative', zIndex: 0 }}>
      <div ref={mapRef} className="h-[600px] w-full" style={{ zIndex: 0 }} />
      {places.length === 0 && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 pointer-events-none"
          style={{ zIndex: 900 }}
        >
          <p className="text-gray-500">Brak miejsc do wyświetlenia</p>
        </div>
      )}
    </div>
  );
}