import { useState, useEffect, useCallback, useMemo } from "react";
import { Place, PlaceInsert, OpeningHours } from "../types";
import { generatePlaceTags } from "../lib/placeTagging";
import { useAuth } from "../providers/AuthProvider";
import { useSettings } from "./useSettings";

export function usePlaces() {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const { settings } = useSettings();

  const [rawPlaces, setRawPlaces] = useState<Place[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const places = useMemo(() => {
    if (!settings) return rawPlaces;
    const sorted = [...rawPlaces];
    if (settings.sort_places === "alphabetical") {
      sorted.sort((a, b) => (a.name || "").localeCompare(b.name || "", "pl"));
    } else {
      sorted.sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at || 0).getTime() -
          new Date(a.updated_at || a.created_at || 0).getTime()
      );
    }
    return sorted;
  }, [rawPlaces, settings?.sort_places]);

  const fetchPlaces = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from("places")
        .select("*")
        .eq("user_id", userId);
      if (error) throw error;
      setRawPlaces(data || []);
    } finally {
      setFetching(false);
    }
  }, [userId, supabase]);

  useEffect(() => {
    fetchPlaces();
  }, [fetchPlaces]);

  const addPlace = async (place: PlaceInsert) => {
    if (!userId) throw new Error("Musisz być zalogowany");
    setLoading(true);
    const { data, error } = await supabase
      .from("places")
      .insert([{ ...place, user_id: userId }])
      .select()
      .single();
    if (error) throw error;
    setRawPlaces((prev) => [data, ...prev]);
    setLoading(false);
    return data;
  };

  const updatePlace = async (id: string, updates: Partial<Place>) => {
    if (!userId) throw new Error("Musisz być zalogowany");
    setLoading(true);
    const { data, error } = await supabase
      .from("places")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw error;
    setRawPlaces((prev) => prev.map((p) => (p.id === id ? data : p)));
    setLoading(false);
    return data;
  };

  const deletePlace = async (id: string) => {
    if (!userId) throw new Error("Musisz być zalogowany");
    setLoading(true);
    const { error } = await supabase
      .from("places")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
    setRawPlaces((prev) => prev.filter((p) => p.id !== id));
    setLoading(false);
  };

  const extractHours = (dayText: string): string[] => {
    if (!dayText) return [];
    const safeText = dayText.substring(0, 200);
    const colonIndex = safeText.indexOf(':');
    if (colonIndex === -1) return [];
    const hours = safeText.substring(colonIndex + 1).trim();
    if (!hours) return [];
    const lower = hours.toLowerCase();
    
    if (lower.includes("closed") || lower.includes("nieczynne")) return [];

  const converted = hours
      .replaceAll(/(\d{1,2}):(\d{2})\s{0,10}AM/gi, (_, h, m) => {
        const hour = Number.parseInt(h, 10);
        return `${hour === 12 ? "00" : String(hour).padStart(2, "0")}:${m}`;
      })
      .replaceAll(/(\d{1,2}):(\d{2})\s{0,10}PM/gi, (_, h, m) => {
        const hour = Number.parseInt(h, 10);
        return `${hour === 12 ? 12 : hour + 12}:${m}`;
      })
      .replaceAll("–", "-")
      .replaceAll(/\s/g, "");

    return [converted];
  };

  const fetchPlaceDetails = async (lat: number, lng: number, name: string) => {
    try {
      const params = new URLSearchParams({ name, lat: lat.toString(), lng: lng.toString() });
      const response = await fetch(`/api/google-places?${params}`);
      if (!response.ok) return null;
      const data = await response.json();
      const result = data.result;
      const openingHours: OpeningHours | undefined = result.opening_hours?.weekday_text
        ? {
            monday: extractHours(result.opening_hours.weekday_text[0]),
            tuesday: extractHours(result.opening_hours.weekday_text[1]),
            wednesday: extractHours(result.opening_hours.weekday_text[2]),
            thursday: extractHours(result.opening_hours.weekday_text[3]),
            friday: extractHours(result.opening_hours.weekday_text[4]),
            saturday: extractHours(result.opening_hours.weekday_text[5]),
            sunday: extractHours(result.opening_hours.weekday_text[6]),
          }
        : undefined;
      return {
        phone_number: result.formatted_phone_number,
        website: result.website,
        rating: result.rating,
        opening_hours: openingHours,
        google_place_id: result.place_id,
        google_data: result,
      };
    } catch {
      console.warn("Wystąpił błąd pobierania szczegółów.");
      return null;
    }
  };

  const findExistingPlace = async (name: string, lat: number, lng: number): Promise<Place | null> => {
    if (!userId) return null;
    const threshold = 0.0001;
    const { data: coordMatches } = await supabase
      .from("places")
      .select("*")
      .eq("user_id", userId)
      .gte("lat", lat - threshold)
      .lte("lat", lat + threshold)
      .gte("lng", lng - threshold)
      .lte("lng", lng + threshold);

    if (coordMatches?.length) {
      return (
        coordMatches.find((p: Place) => p.name.toLowerCase() === name.toLowerCase()) ||
        coordMatches[0]
      );
    }
    const { data: nameMatches } = await supabase
      .from("places")
      .select("*")
      .eq("user_id", userId)
      .ilike("name", name);
    return nameMatches?.length ? nameMatches[0] : null;
  };

  const enrichPlaceData = async (
    name: string, 
    lat: number, 
    lng: number, 
    options: { fetchGoogle: boolean; autoTag: boolean }
  ) => {
    let googleDetails = null;
    let tags: string[] = [];

    if (options.fetchGoogle) {
      const details = await fetchPlaceDetails(lat, lng, name);
      if (details) googleDetails = details;
    }

    if (options.autoTag) {
      try {
        tags = await generatePlaceTags(name, googleDetails?.google_data);
      } catch {
        tags = [];
      }
    }

    return { googleDetails, tags };
  };

  const savePlaceRecord = async (existing: Place | null, baseData: any, tags: string[]) => {
    if (existing) {
      const { error } = await supabase
        .from("places")
        .update({
          ...baseData,
          tags: tags.length ? tags : existing.tags,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      return error ?  "error" : "updated";
    }

    const { error } = await supabase
      .from("places")
      .insert([{ ...baseData, tags }]);
    return error ? "error" : "imported";
  };

  const importFromGoogleMaps = async (
    jsonData: any,
    fetchGoogleData = true,
    autoTag = true
  ): Promise<number> => {
    if (!userId) throw new Error("Musisz być zalogowany");
    setLoading(true);

    const features = jsonData.features || [];
    const counts = { imported: 0, updated: 0 };

    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      const name = feature.properties?.location?.name;
      const [lng, lat] = feature.geometry?.coordinates || [0, 0];

      if (!name || (lat === 0 && lng === 0)) continue;

      setMessage(`Przetwarzanie: ${name}…`);

      const existing = await findExistingPlace(name, lat, lng);
      const { googleDetails, tags } = await enrichPlaceData(name, lat, lng, { 
        fetchGoogle: fetchGoogleData, 
        autoTag 
      });

      const baseData = {
        name,
        lat,
        lng,
        user_id: userId,
        address: feature.properties.location.address || undefined,
        ...(googleDetails ? (({ google_data, ...rest }) => rest)(googleDetails) : {}),
      };

      const result = await savePlaceRecord(existing, baseData, tags);
      if (result !== "error") counts[result]++;

      if (fetchGoogleData && i < features.length - 1) {
        await new Promise((r) => setTimeout(r, 400));
      }
    }

    setMessage(`Import zakończony. Dodano: ${counts.imported}, Zaktualizowano: ${counts.updated}`);
    setLoading(false);
    await fetchPlaces();
    return counts.imported + counts.updated;
  };

  return {
    places,
    loading,
    fetching,
    message,
    addPlace,
    updatePlace,
    deletePlace,
    importFromGoogleMaps,
    refreshPlaces: fetchPlaces,
  };
}