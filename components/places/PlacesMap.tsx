import React, { useEffect, useRef, useState, useCallback } from "react";
import { Place } from "../../types";
import NoResultsState from "../NoResultsState";

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

      // Naprawa z-indexów ORAZ dodanie wsparcia Dark Mode dla pop-upów Leafleta
      const style = document.createElement("style");
      style.textContent = `
        .leaflet-container { z-index: 0 !important; }
        .leaflet-pane { z-index: 400 !important; }
        .leaflet-tile-pane { z-index: 200 !important; }
        .leaflet-overlay-pane { z-index: 400 !important; }
        .leaflet-shadow-pane { z-index: 500 !important; }
        .leaflet-marker-pane { z-index: 600 !important; }
        .leaflet-tooltip-pane { z-index: 650 !important; }
        .leaflet-popup-pane { z-index: 700 !important; }
        .leaflet-map-pane canvas { z-index: 100 !important; }
        .leaflet-control { z-index: 800 !important; }
        
        /* Dark Mode overrides dla Leaflet Popups */
        .leaflet-popup-content-wrapper, .leaflet-popup-tip {
          background-color: var(--color-card) !important;
          color: var(--color-text) !important;
          border: 1px solid var(--color-border);
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1) !important;
        }
        .leaflet-popup-close-button {
          color: var(--color-textMuted) !important;
        }
        .leaflet-popup-close-button:hover {
          color: var(--color-text) !important;
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
    const center = places.length > 0 ? [places[0].lat, places[0].lng] : [52.406, 16.925];
    const map = L.map(mapRef.current).setView(center, 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    setMapInstance(map);

    return () => {
      if (map) map.remove();
    };
  }, [mapLoaded, places.length]);

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
      if (marker && mapInstance) marker.remove();
    });
    markersRef.current = [];

    const handlePlaceClick = (e: CustomEvent) => {
      const placeId = e.detail;
      const place = places.find((p) => p.id === placeId);
      if (place && onPlaceClick) onPlaceClick(place);
    };

    window.addEventListener("placeClick", handlePlaceClick as EventListener);

    const newMarkers = places.map((place) => {
      try {
        const marker = L.marker([place.lat, place.lng]).addTo(mapInstance);

        const tagsHtml = place.tags.length > 0
          ? `<div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:8px;">
              ${place.tags.map(tag => 
                `<span style="padding:2px 6px; background-color:var(--color-primary); color:white; border-radius:4px; font-size:10px; font-weight:bold; text-transform:uppercase;">
                  ${escapeHtml(tag)}
                </span>`
              ).join("")}
            </div>`
          : "";

        const detailsButton = onPlaceClick
          ? `<button 
              style="margin-top:12px; width:100%; padding:6px; background-color:var(--color-primary); color:white; border:none; border-radius:8px; font-size:12px; font-weight:bold; cursor:pointer;"
              onclick="window.dispatchEvent(new CustomEvent('placeClick', { detail: '${place.id}' }))"
            >
              Szczegóły
            </button>`
          : "";

        const popupContent = `
          <div style="min-width:180px; padding:4px;">
            <h3 style="font-weight:bold; font-size:14px; margin:0 0 4px 0;">${escapeHtml(place.name)}</h3>
            ${place.address ? `<p style="font-size:11px; color:var(--color-textSecondary); margin:0;">${escapeHtml(place.address)}</p>` : ""}
            ${tagsHtml}
            ${detailsButton}
          </div>
        `;

        marker.bindPopup(popupContent, { maxWidth: 300 });
        return marker;
      } catch (e) {
        return null;
      }
    }).filter(Boolean);

    markersRef.current = newMarkers;

    if (places.length > 0 && mapInstance) {
      try {
        const bounds = L.latLngBounds(places.map((p) => [p.lat, p.lng]));
        mapInstance.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      } catch (e) {}
    }

    return () => window.removeEventListener("placeClick", handlePlaceClick as EventListener);
  }, [places, mapInstance, mapLoaded, onPlaceClick, escapeHtml]);

  if (!mapLoaded) {
    return (
      <div className="bg-card rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 flex justify-center items-center h-[600px]">
        <div className="text-textMuted font-medium animate-pulse">Ładowanie mapy...</div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden relative z-0">
      <div ref={mapRef} className="h-[600px] w-full" />
      <NoResultsState text="miejsc" />
    </div>
  );
}