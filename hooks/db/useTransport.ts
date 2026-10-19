// hooks/db/useTransport.ts

import { NEARBY_REFRESH_MS, FAVORITES_MIN_INTERVAL_MS, SUGGESTIONS_DEBOUNCE_MS } from "@/config/timing";
import { useQuery } from "@tanstack/react-query";
import { containsPattern } from "@/lib/postgrestFilters";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useSettings } from "./useSettings";
import { TRANSPORT_DEPARTURES_LIMIT, TRANSPORT_STOP_SEARCH_LIMIT, TRANSPORT_SUGGESTIONS_LIMIT } from "@/config/limits";
import { requestSmartLocation } from "@/lib/locationUtils";
import { useRetry } from "@/hooks/useRetry";
import { LocalSearchResult, StopGroup } from "@/types/transport";
import { withFavoriteKeys, withNearbyKeys } from "@/lib/stopGroupKeys";
import {
  ambiguousNames,
  clusterStops,
  favoriteFromCluster,
  favoriteKey,
  isAmbiguous,
  type FavoriteStop,
  type StopCluster,
  type StopPost,
} from "@/shared/stopGrouping";

/** Ile słupków pobrać przy wyszukiwaniu – przystanek ma ich zwykle kilka. */

const localityCache = new Map<string, string | null>();

/** Miejscowość z /api/transport/locality (Photon/OSM), z cache w pamięci karty. */
async function fetchLocality(lat: number, lon: number, signal?: AbortSignal): Promise<string | null> {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  if (localityCache.has(key)) return localityCache.get(key) ?? null;
  try {
    const res = await fetch(`/api/transport/locality?lat=${lat.toFixed(6)}&lon=${lon.toFixed(6)}`, { signal });
    if (!res.ok) return null;
    const { locality } = (await res.json()) as { locality: string | null };
    localityCache.set(key, locality ?? null);
    return locality ?? null;
  } catch {
    return null;
  }
}

function zoneLabel(cluster: StopCluster): string {
  if (cluster.network === "szczecin") return "Szczecin";
  return cluster.zone_id && cluster.zone_id !== "AUTO" ? `strefa ${cluster.zone_id}` : "Poznań i okolice";
}

function describeCluster(cluster: StopCluster, locality: string | null): string {
  return `${cluster.name} (${locality ?? zoneLabel(cluster)})`;
}

const NO_GROUPS: StopGroup[] = [];
const NO_RESULTS: LocalSearchResult[] = [];

export function useTransport(autoRefresh = false) {
  const { supabase } = useAuth();
  const {
    settings,
    addFavoriteStop,
    removeFavoriteStop,
    upgradeFavoriteStops,
    loading: settingsLoading,
  } = useSettings();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  /** Miejscowości dla grup o niejednoznacznych nazwach (klucz: StopGroup.key). */
  const [localities, setLocalities] = useState<Record<string, string | null>>({});
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(true);
  const [geoError, setGeoError] = useState<string | null>(null);
  const withRetry = useRetry();

  // --- Odjazdy w pobliżu (TanStack Query; odświeżanie co 30 s przy autoRefresh) -------------
  const nearbyQuery = useQuery({
    queryKey: ["nearby-departures", coords ? coords.lat.toFixed(4) : null, coords ? coords.lng.toFixed(4) : null],
    enabled: coords !== null,
    staleTime: 0,
    refetchInterval: autoRefresh ? NEARBY_REFRESH_MS : false,
    refetchIntervalInBackground: false,
    queryFn: async ({ signal }): Promise<{ groups: StopGroup[]; locationRequired: boolean }> => {
      const { data, error } = await supabase.functions.invoke("transport-departures", {
        body: { lat: coords?.lat, lon: coords?.lng },
        signal,
      });
      if (error) throw new Error("Błąd sieciowy podczas łączenia z funkcją.");
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      if (parsed?.error === "LOCATION_REQUIRED") return { groups: [], locationRequired: true };
      return { groups: withNearbyKeys((parsed?.success ?? []) as StopGroup[]), locationRequired: false };
    },
  });
  const nearbyGroups = nearbyQuery.data?.groups ?? NO_GROUPS;
  let locationError = geoError;
  if (!locationError && nearbyQuery.data?.locationRequired) {
    locationError = "Lokalizacja jest wymagana, aby pokazać przystanki w pobliżu.";
  } else if (!locationError && nearbyQuery.error) {
    locationError = "Problem z pobieraniem odjazdów w pobliżu.";
  }
  const loadingNearby = locating || (coords !== null && nearbyQuery.isFetching);

  /** Ustalenie położenia (przy wejściu na stronę albo po kliknięciu „Pokaż w pobliżu”). */
  const requestLocation = useCallback((forcePrompt = false) => {
    requestSmartLocation({
      forcePrompt,
      maxAgeMs: 2 * 60 * 1000,
      onSuccess: (position) => {
        setGeoError(null);
        setLocating(false);
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      onError: (err) => {
        setLocating(false);
        setCoords(null);
        setGeoError(
          err.code === 1
            ? "Brak zgody na lokalizację. Odblokuj w ustawieniach przeglądarki."
            : "Nie udało się pobrać lokalizacji GPS."
        );
      },
    });
  }, []);

  const initLocationAndFetch = useCallback(
    (forcePrompt = false) => {
      setLocating(true);
      setGeoError(null);
      requestLocation(forcePrompt);
    },
    [requestLocation]
  );

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // --- Odjazdy z ulubionych przystanków --------------------------------------------------
  const favoriteStops = useMemo(
    () => (Array.isArray(settings.favorite_stops) ? settings.favorite_stops : []),
    [settings.favorite_stops]
  );
  const favoritesJSON = useMemo(() => JSON.stringify(favoriteStops), [favoriteStops]);

  const favoritesQuery = useQuery({
    queryKey: ["favorite-departures", favoritesJSON],
    enabled: !settingsLoading && favoriteStops.length > 0,
    // Ponowne wejście w ciągu 5 s nie odpytuje serwera (wcześniej ręczny licznik czasu).
    staleTime: FAVORITES_MIN_INTERVAL_MS,
    queryFn: async ({ signal }): Promise<StopGroup[]> => {
      const stops = JSON.parse(favoritesJSON) as FavoriteStop[];
      const { data, error } = await supabase.functions.invoke("transport-departures", {
        body: {
          stopNames: stops.map(({ name, zone_id, lat, lon }) => ({ name, zone_id, lat, lon })),
          lat: coords?.lat,
          lon: coords?.lng,
        },
        signal,
      });
      if (error) throw error;
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      const groups = withFavoriteKeys((parsed?.success ?? []) as StopGroup[], stops);
      const upgrades = new Map<string, FavoriteStop>();
      for (const g of groups) if (g.resolved) upgrades.set(g.key, g.resolved);
      if (upgrades.size > 0) void upgradeFavoriteStops(upgrades);
      return groups;
    },
  });
  const favoritesGroups = favoriteStops.length > 0 ? (favoritesQuery.data ?? NO_GROUPS) : NO_GROUPS;
  const loadingFavorites = favoritesQuery.isFetching;
  const transportError = favoritesQuery.error ? "Błąd pobierania ulubionych odjazdów." : null;

  // --- Podpowiedzi przystanków (opóźnienie 300 ms, potem zapytanie z pamięcią) ------------
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), SUGGESTIONS_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const suggestionsQuery = useQuery({
    queryKey: ["stop-suggestions", debouncedQuery.trim()],
    enabled: debouncedQuery.trim().length >= 2,
    queryFn: async (): Promise<LocalSearchResult[]> => {
      const { data, error } = await withRetry(() =>
        supabase
          .from("stops")
          .select("stop_code, stop_name, stop_lat, stop_lon, zone_id")
          .ilike("stop_name", containsPattern(debouncedQuery))
          .limit(TRANSPORT_STOP_SEARCH_LIMIT)
      );
      if (error || !data) return [];

      const clusters = clusterStops(data as StopPost[])
        .sort((a, b) => a.name.localeCompare(b.name, "pl") || a.lat - b.lat)
        .slice(0, Math.max(TRANSPORT_SUGGESTIONS_LIMIT, TRANSPORT_DEPARTURES_LIMIT / 3));
      const ambiguous = ambiguousNames(clusters);
      const withLocality = await Promise.all(
        clusters.slice(0, TRANSPORT_SUGGESTIONS_LIMIT).map(async (cluster) => {
          const locality = isAmbiguous(cluster, ambiguous) ? await fetchLocality(cluster.lat, cluster.lon) : null;
          return { cluster, locality };
        })
      );
      const seen = new Map<string, number>();
      return withLocality.map(({ cluster, locality }) => {
        let displayString = describeCluster(cluster, locality);
        const n = (seen.get(displayString) ?? 0) + 1;
        seen.set(displayString, n);
        if (n > 1) displayString = `${displayString.slice(0, -1)}, ${n})`;
        return { cluster, locality, displayString };
      });
    },
  });
  // Pole wyczyszczone lub za krótkie – podpowiedzi znikają od razu, bez czekania na opóźnienie.
  const searchResults = searchQuery.trim().length >= 2 ? (suggestionsQuery.data ?? NO_RESULTS) : NO_RESULTS;
  const suggestions = useMemo(() => searchResults.map((r) => r.displayString), [searchResults]);

  const handleSuggestionClick = useCallback(
    (value: string) => {
      const selected = searchResults.find((s) => s.displayString === value);
      if (selected) void addFavoriteStop(favoriteFromCluster(selected.cluster, selected.locality));
      setSearchQuery("");
    },
    [searchResults, addFavoriteStop]
  );

  /** Dodanie przystanku z sekcji "w pobliżu" – z położeniem tej konkretnej grupy. */
  const addNearbyToFavorites = useCallback(
    (group: StopGroup) => {
      const cluster: StopCluster = {
        key: group.key,
        name: group.stop_name,
        network: group.zone_id === "S" ? "szczecin" : "poznan",
        zone_id: group.zone_id,
        stop_codes: group.stop_codes,
        lat: group.lat,
        lon: group.lon,
      };
      return addFavoriteStop(favoriteFromCluster(cluster, localities[group.key] ?? null));
    },
    [addFavoriteStop, localities]
  );

  useEffect(() => {
    const favByKey = new Map(favoriteStops.map((f) => [favoriteKey(f), f]));
    const missing = [...nearbyGroups, ...favoritesGroups].filter(
      (g) => g.ambiguous && typeof g.lat === "number" && !(g.key in localities) && !favByKey.get(g.key)?.locality
    );
    if (missing.length === 0) return;
    const controller = new AbortController();
    void Promise.all(
      missing.map(async (g) => [g.key, await fetchLocality(g.lat, g.lon, controller.signal)] as const)
    ).then((entries) => {
      if (!controller.signal.aborted) setLocalities((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    });
    return () => controller.abort();
  }, [nearbyGroups, favoritesGroups, favoriteStops, localities]);

  /** Miejscowość do wyświetlenia przy nazwie grupy (tylko gdy nazwa jest niejednoznaczna). */
  const localityFor = useCallback(
    (group: StopGroup): string | null => {
      const stored = favoriteStops.find((f) => favoriteKey(f) === group.key)?.locality;
      if (stored) return stored;
      return group.ambiguous ? (localities[group.key] ?? null) : null;
    },
    [favoriteStops, localities]
  );

  return {
    nearbyGroups,
    favoritesGroups,
    locationError,
    searchQuery,
    setSearchQuery,
    suggestions,
    handleSuggestionClick,
    initLocationAndFetch,
    favoriteStops,
    addFavoriteStop,
    addNearbyToFavorites,
    removeFavoriteStop,
    localityFor,
    loadingNearby,
    loadingFavorites,
    transportError,
  };
}
