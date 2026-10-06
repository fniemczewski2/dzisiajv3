// hooks/db/useTransport.ts

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useSettings } from "./useSettings";
import { TRANSPORT_API_LIMIT, TRANSPORT_SUGGESTIONS_LIMIT } from "@/config/limits";
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
} from "@/supabase/functions/_shared/stopGrouping";

/** Ile słupków pobrać przy wyszukiwaniu – przystanek ma ich zwykle kilka. */
const SEARCH_POSTS_LIMIT = 300;

const localityCache = new Map<string, string | null>();

/** Miejscowość z /api/transport/locality (Photon/OSM), z cache w pamięci karty. */
export async function fetchLocality(lat: number, lon: number, signal?: AbortSignal): Promise<string | null> {
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

export function describeCluster(cluster: StopCluster, locality: string | null): string {
  return `${cluster.name} (${locality ?? zoneLabel(cluster)})`;
}

export function useTransport(autoRefresh = false) {
  const { supabase } = useAuth();
  const { settings, addFavoriteStop, removeFavoriteStop, upgradeFavoriteStops, loading: settingsLoading } = useSettings();

  const [nearbyGroups, setNearbyGroups] = useState<StopGroup[]>([]);
  const [favoritesGroups, setFavoritesGroups] = useState<StopGroup[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [transportError, setTransportError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LocalSearchResult[]>([]);
  /** Miejscowości dla grup o niejednoznacznych nazwach (klucz: StopGroup.key). */
  const [localities, setLocalities] = useState<Record<string, string | null>>({});
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const lastFetchTime = useRef<Record<string, number>>({});
  const lastCoords = useRef<{ lat: number; lng: number } | null>(null);

  const nearbyAbortRef = useRef<AbortController | null>(null);
  const favoritesAbortRef = useRef<AbortController | null>(null);
  const withRetry = useRetry();

  const fetchNearbyData = useCallback(async () => {
    if (!lastCoords.current) {
      setLoadingNearby(false);
      return;
    }

    nearbyAbortRef.current?.abort();
    const controller = new AbortController();
    nearbyAbortRef.current = controller;

    setLoadingNearby(true);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("transport-departures", {
        body: { lat: lastCoords.current.lat, lon: lastCoords.current.lng },
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;
      if (invokeError) throw new Error("Błąd sieciowy podczas łączenia z funkcją.");

      const parsed = typeof data === "string" ? JSON.parse(data) : data;

      if (parsed?.error === "LOCATION_REQUIRED") {
        setLocationError("Lokalizacja jest wymagana, aby pokazać przystanki w pobliżu.");
        setNearbyGroups([]);
      } else if (parsed?.success) {
        setNearbyGroups(withNearbyKeys(parsed.success as StopGroup[]));
        setLocationError(null);
      }
    } catch {
      if (controller.signal.aborted) return;
      setLocationError("Problem z pobieraniem odjazdów w pobliżu.");
    } finally {
      setLoadingNearby(false);
    }
  }, [supabase]);

  const initLocationAndFetch = useCallback(
    (forcePrompt = false) => {
      setLoadingNearby(true);
      setLocationError(null);

      requestSmartLocation({
        forcePrompt,
        maxAgeMs: 2 * 60 * 1000,
        onSuccess: (position) => {
          lastCoords.current = { lat: position.coords.latitude, lng: position.coords.longitude };
          void fetchNearbyData();
        },
        onError: (err) => {
          setLoadingNearby(false);
          lastCoords.current = null;
          setLocationError(
            err.code === 1
              ? "Brak zgody na lokalizację. Odblokuj w ustawieniach przeglądarki."
              : "Nie udało się pobrać lokalizacji GPS."
          );
        },
      });
    },
    [fetchNearbyData]
  );

  const fetchFavorites = useCallback(
    async (stops: FavoriteStop[]) => {
      if (!stops?.length) {
        setFavoritesGroups([]);
        return;
      }
      const now = Date.now();
      const cacheKey = JSON.stringify(stops);
      if (lastFetchTime.current[cacheKey] && now - lastFetchTime.current[cacheKey] < 5000) return;

      favoritesAbortRef.current?.abort();
      const controller = new AbortController();
      favoritesAbortRef.current = controller;

      setLoadingFavorites(true);
      setTransportError(null);
      try {
        const { data, error } = await supabase.functions.invoke("transport-departures", {
          body: {
            stopNames: stops.map(({ name, zone_id, lat, lon }) => ({ name, zone_id, lat, lon })),
            lat: lastCoords.current?.lat,
            lon: lastCoords.current?.lng,
          },
          signal: controller.signal,
        });

        if (error) throw error;
        const parsed = typeof data === "string" ? JSON.parse(data) : data;
        const groups = withFavoriteKeys((parsed?.success ?? []) as StopGroup[], stops);
        setFavoritesGroups(groups);
        lastFetchTime.current[cacheKey] = now;

        // Stare wpisy (sama nazwa) uzupełniamy położeniem dopasowanej grupy.
        const upgrades = new Map<string, FavoriteStop>();
        for (const g of groups) if (g.resolved) upgrades.set(g.key, g.resolved);
        if (upgrades.size > 0) void upgradeFavoriteStops(upgrades);
      } catch {
        if (controller.signal.aborted) return;
        setTransportError(`Błąd pobierania ulubionych odjazdów.`);
      } finally {
        setLoadingFavorites(false);
      }
    },
    [supabase, upgradeFavoriteStops]
  );

  const favoriteStops = useMemo(
    () => (Array.isArray(settings.favorite_stops) ? settings.favorite_stops : []),
    [settings.favorite_stops]
  );
  const favoritesJSON = useMemo(() => JSON.stringify(favoriteStops), [favoriteStops]);

  useEffect(() => {
    if (settingsLoading) return;
    try {
      const stops = JSON.parse(favoritesJSON);
      void fetchFavorites(stops);
    } catch {
      setTransportError("Wystąpił błąd parsowania przystanków.");
    }
  }, [favoritesJSON, fetchFavorites, settingsLoading]);

  useEffect(() => {
    const loadSuggestions = async () => {
      if (!searchQuery || searchQuery.trim().length < 2) {
        setSuggestions([]);
        setSearchResults((prev) => (prev.length > 0 ? [] : prev));
        return;
      }

      try {
        const q = searchQuery.trim().replaceAll(/[%_\\]/g, (m) => `\\${m}`);
        const { data, error } = await withRetry(() =>
          supabase
            .from("stops")
            .select("stop_code, stop_name, stop_lat, stop_lon, zone_id")
            .ilike("stop_name", `%${q}%`)
            .limit(SEARCH_POSTS_LIMIT)
        );

        if (error || !data) {
          setSuggestions([]);
          setSearchResults([]);
          return;
        }

        // Grupujemy słupki przestrzennie – dwie "Dworcowe" (Poznań i Luboń) to
        // dwie osobne pozycje, a nie jedna, jak przy deduplikacji po nazwie.
        const clusters = clusterStops(data as StopPost[])
          .sort((a, b) => a.name.localeCompare(b.name, "pl") || a.lat - b.lat)
          .slice(0, Math.max(TRANSPORT_SUGGESTIONS_LIMIT, TRANSPORT_API_LIMIT / 3));
        const ambiguous = ambiguousNames(clusters);

        const withLocality = await Promise.all(
          clusters.slice(0, TRANSPORT_SUGGESTIONS_LIMIT).map(async (cluster) => {
            const locality = isAmbiguous(cluster, ambiguous) ? await fetchLocality(cluster.lat, cluster.lon) : null;
            return { cluster, locality };
          })
        );
        if (cancelled) return;

        // Gdy geokoder zwrócił tę samą miejscowość dla obu (albo nic) – dopisujemy numer,
        // żeby pozycje na liście zawsze dało się rozróżnić.
        const seen = new Map<string, number>();
        const resultsArray: LocalSearchResult[] = withLocality.map(({ cluster, locality }) => {
          let displayString = describeCluster(cluster, locality);
          const n = (seen.get(displayString) ?? 0) + 1;
          seen.set(displayString, n);
          if (n > 1) displayString = `${displayString.slice(0, -1)}, ${n})`;
          return { cluster, locality, displayString };
        });

        setSearchResults(resultsArray);
        setSuggestions(resultsArray.map((r) => r.displayString));
      } catch {
        if (cancelled) return;
        setSuggestions([]);
        setSearchResults([]);
      }
    };

    let cancelled = false;
    const debounce = setTimeout(loadSuggestions, 300);
    return () => {
      cancelled = true;
      clearTimeout(debounce);
    };
  }, [searchQuery, supabase, withRetry]);

  const handleSuggestionClick = useCallback(
    (value: string) => {
      const selected = searchResults.find((s) => s.displayString === value);
      if (selected) void addFavoriteStop(favoriteFromCluster(selected.cluster, selected.locality));
      setSearchQuery("");
      setSuggestions([]);
      setSearchResults([]);
    },
    [searchResults, addFavoriteStop]
  );

  /** Dodanie przystanku z sekcji "w pobliżu" – z położeniem tej konkretnej grupy. */
  const addNearbyToFavorites = useCallback(
    (group: StopGroup) => {
      const cluster: StopCluster = {
        key: group.key, name: group.stop_name, network: group.zone_id === "S" ? "szczecin" : "poznan",
        zone_id: group.zone_id, stop_codes: group.stop_codes, lat: group.lat, lon: group.lon,
      };
      return addFavoriteStop(favoriteFromCluster(cluster, localities[group.key] ?? null));
    },
    [addFavoriteStop, localities]
  );

  // Dla przystanków o powtarzających się nazwach dociągamy miejscowość do nagłówka karty.
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
      return group.ambiguous ? localities[group.key] ?? null : null;
    },
    [favoriteStops, localities]
  );

  useEffect(() => {
    initLocationAndFetch();

    let intervalId: ReturnType<typeof setInterval> | null = null;
    if (autoRefresh) {
      intervalId = setInterval(() => {
        if (lastCoords.current) void fetchNearbyData();
      }, 30_000);
    }

    return () => {
      nearbyAbortRef.current?.abort();
      favoritesAbortRef.current?.abort();
      if (intervalId !== null) clearInterval(intervalId);
    };
  }, [initLocationAndFetch, autoRefresh, fetchNearbyData]);

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
