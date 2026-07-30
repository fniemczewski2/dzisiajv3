// components/places/PlacesMap.tsx
import "leaflet/dist/leaflet.css";
import React, { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import markerIconUrl from "leaflet/dist/images/marker-icon.png";
import markerIcon2xUrl from "leaflet/dist/images/marker-icon-2x.png";
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";
import { Place } from "@/types/places";
import { escapeHtml, validateUuid } from "@/lib/sanitize";
import NoResultsState from "../ui/NoResultsState";

interface PlacesMapProps {
  places: Place[];
  onPlaceClick?: (place: Place) => void;
}

let defaultIconPatched = false;

export default function PlacesMap({ places, onPlaceClick }: Readonly<PlacesMapProps>) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<LeafletMap | null>(null);
  const markersRef = useRef<LeafletMarker[]>([]);

  useEffect(() => {
    if (!mapRef.current || mapInstance) return;

    let cancelled = false;

    void import("leaflet").then((L) => {
      if (cancelled || !mapRef.current) return;

      if (!defaultIconPatched) {
        L.Icon.Default.mergeOptions({
          iconUrl: markerIconUrl.src,
          iconRetinaUrl: markerIcon2xUrl.src,
          shadowUrl: markerShadowUrl.src,
        });
        defaultIconPatched = true;
      }

      const center: [number, number] =
        places.length > 0 ? [places[0].lat, places[0].lng] : [0, 0];
      const map = L.map(mapRef.current).setView(center, 13);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      setMapInstance(map);
    });

    return () => {
      cancelled = true;
    };

  }, [places.length, mapInstance]);

  useEffect(() => {
    return () => {
      mapInstance?.remove();
    };
  }, [mapInstance]);

  useEffect(() => {
    if (!mapInstance) return;

    let cancelled = false;

    void import("leaflet").then((L) => {
      if (cancelled) return;

      markersRef.current.forEach((marker) => marker?.remove());
      markersRef.current = [];

      const handlePlaceClick = (e: CustomEvent) => {
        const placeId = e.detail;
        const place = places.find((p) => p.id === placeId);
        if (place && onPlaceClick) onPlaceClick(place);
      };

      globalThis.addEventListener("placeClick", handlePlaceClick as EventListener);

      const newMarkers = places
        .map((place) => {
          try {
            const marker = L.marker([place.lat, place.lng]).addTo(mapInstance);

            const safeName = escapeHtml(place.name);
            const safeAddress = place.address ? escapeHtml(place.address) : "";

            const tagsHtml =
              place.tags.length > 0
                ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:8px;">
                    ${place.tags
                      .map(
                        (tag) =>
                          `<span style="padding:2px 6px;background-color:var(--color-primary);color:white;border-radius:4px;font-size:10px;font-weight:bold;text-transform:uppercase;">
                            ${escapeHtml(tag)}
                          </span>`
                      )
                      .join("")}
                  </div>`
                : "";

            let detailsButton = "";
            if (onPlaceClick) {
              const safeId = validateUuid(place.id);
              if (safeId) {
                detailsButton = `<button
                  style="margin-top:12px;width:100%;padding:6px;background-color:var(--color-primary);color:white;border:none;border-radius:8px;font-size:12px;font-weight:bold;cursor:pointer;"
                  onclick="window.dispatchEvent(new CustomEvent('placeClick',{detail:'${safeId}'}))"
                >
                  Szczegóły
                </button>`;
              }
            }

            const popupContent = `
              <div style="min-width:180px;padding:4px;">
                <h3 style="font-weight:bold;font-size:14px;margin:0 0 4px 0;">${safeName}</h3>
                ${safeAddress ? `<p style="font-size:11px;color:var(--color-textSecondary);margin:0;">${safeAddress}</p>` : ""}
                ${tagsHtml}
                ${detailsButton}
              </div>
            `;

            marker.bindPopup(popupContent, { maxWidth: 300 });
            return marker;
          } catch {
            return null;
          }
        })
        .filter((m): m is LeafletMarker => m !== null);

      markersRef.current = newMarkers;

      if (places.length > 0) {
        try {
          const bounds = L.latLngBounds(places.map((p): [number, number] => [p.lat, p.lng]));
          mapInstance.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        } catch {
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [places, mapInstance, onPlaceClick]);

  if (places.length === 0) {
    return <NoResultsState text="miejsc" />;
  }

  return (
    <div className="relative w-full h-[600px] rounded-2xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700">
      <div ref={mapRef} className="w-full h-full" />
      {!mapInstance && (
        <div className="absolute inset-0 card flex justify-center items-center rounded-none border-none shadow-none">
          <div className="text-textMuted font-medium animate-pulse">
            Ładowanie mapy...
          </div>
        </div>
      )}
    </div>
  );
}
