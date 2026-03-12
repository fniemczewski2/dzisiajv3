import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { Place, PlaceInsert, OpeningHours } from "../types";
import { generatePlaceTags } from "../lib/placeTagging";
import { useAuth } from "../providers/AuthProvider";

export function usePlaces() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const { user } = useAuth();
  const userId = user?.id;

  const fetchPlaces = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const { data, error } = await supabase
      .from("places")
      .select("*")
      .eq("user_id", userId)
      .order('name', { ascending: true });

    if (error) {
      console.error("Error fetching places:", error);
    } else {
      setPlaces(data || []);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchPlaces();
  }, [fetchPlaces]);

  const addPlace = async (place: PlaceInsert) => {
    if (!userId) throw new Error("Musisz być zalogowany");
    console.log(place)
    const { data, error } = await supabase
      .from("places")
      .insert([{ ...place, user_id: userId }])
      .select()
      .single();

    if (error) {
      console.error("Error adding place:", error);
      throw error;
    }
    
    setPlaces(prev => [data, ...prev]);
    return data;
  };

  const updatePlace = async (id: string, updates: Partial<Place>) => {
    if (!userId) throw new Error("Musisz być zalogowany");

    const { data, error } = await supabase
      .from("places")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId) // Zabezpieczenie RLS
      .select()
      .single();

    if (error) {
      console.error("Error updating place:", error);
      throw error;
    }
    
    setPlaces(prev => prev.map((p) => (p.id === id ? data : p)));
    return data;
  };

  const deletePlace = async (id: string) => {
    if (!userId) throw new Error("Musisz być zalogowany");

    const { error } = await supabase
      .from("places")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.error("Error deleting place:", error);
      throw error;
    }
    
    setPlaces(prev => prev.filter((p) => p.id !== id));
  };

  const extractHours = (dayText: string): string[] => {
    if (!dayText) return [];
    const match = dayText.match(/:\s*(.+)$/);
    if (!match) return [];
    
    const hours = match[1].trim();
    const lowerHours = hours.toLowerCase();
    if (lowerHours.includes("closed") || lowerHours.includes("nieczynne")) {
      return [];
    }
    
    let converted = hours
      .replace(/(\d+):(\d+)\s*AM/gi, (_, h, m) => {
        const hour = parseInt(h);
        return `${hour === 12 ? '00' : h.padStart(2, '0')}:${m}`;
      })
      .replace(/(\d+):(\d+)\s*PM/gi, (_, h, m) => {
        const hour = parseInt(h);
        return `${hour === 12 ? 12 : hour + 12}:${m}`;
      })
      .replace(/–/g, "-")
      .replace(/\s+/g, "");
    
    return [converted];
  };

  const fetchPlaceDetails = async (lat: number, lng: number, name: string) => {
    try {
      const params = new URLSearchParams({
        name,
        lat: lat.toString(),
        lng: lng.toString()
      });

      const response = await fetch(`/api/google-places?${params.toString()}`);
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
    } catch (error) {
      console.error("Error fetching place details:", error);
      return null;
    }
  };

  const findExistingPlace = async (name: string, lat: number, lng: number): Promise<Place | null> => {
    if (!userId) return null;
    const coordThreshold = 0.0001;
    
    // Szukanie po koordynatach
    const { data: coordMatches } = await supabase
      .from("places")
      .select("*")
      .eq("user_id", userId)
      .gte("lat", lat - coordThreshold)
      .lte("lat", lat + coordThreshold)
      .gte("lng", lng - coordThreshold)
      .lte("lng", lng + coordThreshold);

    if (coordMatches && coordMatches.length > 0) {
      const exactMatch = coordMatches.find(p => p.name.toLowerCase() === name.toLowerCase());
      return exactMatch || coordMatches[0];
    }

    // Fallback: po nazwie
    const { data: nameMatches } = await supabase
      .from("places")
      .select("*")
      .eq("user_id", userId)
      .ilike("name", name);

    return nameMatches && nameMatches.length > 0 ? nameMatches[0] : null;
  };

  const importFromGoogleMaps = async (jsonData: any, fetchGoogleData = true, autoTag = true) => {
    if (!userId) throw new Error("Brak zalogowanego użytkownika");

    try {
      const features = jsonData.features || [];
      let importedCount = 0;
      let updatedCount = 0;

      for (let i = 0; i < features.length; i++) {
        const feature = features[i];
        if (!feature.properties?.location?.name) continue;

        const [lng, lat] = feature.geometry.coordinates;
        if (lat === 0 && lng === 0) continue;

        const placeName = feature.properties.location.name;
        setMessage(`Przetwarzanie: ${placeName}...`);

        const existingPlace = await findExistingPlace(placeName, lat, lng);
        const baseData: any = {
          name: placeName,
          address: feature.properties.location.address || undefined,
          lat,
          lng,
          user_id: userId
        };

        let googleData = null;
        if (fetchGoogleData) {
          const googleDetails = await fetchPlaceDetails(lat, lng, placeName);
          if (googleDetails) {
            googleData = googleDetails.google_data;
            delete googleDetails.google_data;
            Object.assign(baseData, googleDetails);
          }
          if (i < features.length - 1) await new Promise(r => setTimeout(r, 400));
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
          const { error: updErr } = await supabase
            .from("places")
            .update({
              ...baseData,
              tags: tags.length > 0 ? tags : existingPlace.tags,
              updated_at: new Date().toISOString()
            })
            .eq("id", existingPlace.id);
          if (!updErr) updatedCount++;
        } else {
          const { error: insErr } = await supabase
            .from("places")
            .insert([{ ...baseData, tags }]);
          if (!insErr) importedCount++;
        }
      }

      setMessage(`Import zakończony. Dodano: ${importedCount}, Zaktualizowano: ${updatedCount}`);
      await fetchPlaces();
      return importedCount + updatedCount;
    } catch (error) {
      console.error("Import error:", error);
      setMessage("Wystąpił błąd podczas importu.");
      throw error;
    }
  };

  return {
    places,
    loading,
    message,
    addPlace,
    updatePlace,
    deletePlace,
    importFromGoogleMaps,
    refreshPlaces: fetchPlaces,
  };
}