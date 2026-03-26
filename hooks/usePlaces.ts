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
    const match = safeText.match(/:\s{0,10}(.+)$/);
    if (!match) return [];

    const hours = match[1].trim();
    const lower = hours.toLowerCase();
    
    if (lower.includes("closed") || lower.includes("nieczynne")) return [];

    const converted = hours
      .replace(/(\d{1,2}):(\d{2})\s{0,10}AM/gi, (_, h, m) => {
        const hour = parseInt(h, 10);
        return `${hour === 12 ? "00" : String(hour).padStart(2, "0")}:${m}`;
      })
      .replace(/(\d{1,2}):(\d{2})\s{0,10}PM/gi, (_, h, m) => {
        const hour = parseInt(h, 10);
        return `${hour === 12 ? 12 : hour + 12}:${m}`;
      })
      .replace(/–/g, "-")
      .replace(/\s/g, ""); 

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
    } catch (err) {
      console.warn("[usePlaces] fetchPlaceDetails failed:", err);
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

  const importFromGoogleMaps = async (
    jsonData: any,
    fetchGoogleData = true,
    autoTag = true
  ): Promise<number> => {
    if (!userId) throw new Error("Musisz być zalogowany");
    setLoading(true);
    const features = jsonData.features || [];
    let importedCount = 0;
    let updatedCount = 0;

    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      if (!feature.properties?.location?.name) continue;

      const [lng, lat] = feature.geometry.coordinates;
      if (lat === 0 && lng === 0) continue;

      const placeName = feature.properties.location.name;
      setMessage(`Przetwarzanie: ${placeName}…`);

      const existingPlace = await findExistingPlace(placeName, lat, lng);
      const baseData: any = {
        name: placeName,
        address: feature.properties.location.address || undefined,
        lat,
        lng,
        user_id: userId,
      };

      let googleData = null;
      if (fetchGoogleData) {
        const details = await fetchPlaceDetails(lat, lng, placeName);
        if (details) {
          googleData = details.google_data;
          const { google_data, ...rest } = details;
          Object.assign(baseData, rest);
        }
        if (i < features.length - 1) await new Promise((r) => setTimeout(r, 400));
      }

      let tags: string[] = [];
      if (autoTag) {
        try {
          tags = await generatePlaceTags(placeName, googleData);
        } catch {
          tags = [];
        }
      }

      if (existingPlace) {
        const { error } = await supabase
          .from("places")
          .update({
            ...baseData,
            tags: tags.length ? tags : existingPlace.tags,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingPlace.id);
        if (!error) updatedCount++;
      } else {
        const { error } = await supabase.from("places").insert([{ ...baseData, tags }]);
        if (!error) importedCount++;
      }
    }

    setMessage(`Import zakończony. Dodano: ${importedCount}, Zaktualizowano: ${updatedCount}`);
    setLoading(false);
    await fetchPlaces();
    return importedCount + updatedCount;
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