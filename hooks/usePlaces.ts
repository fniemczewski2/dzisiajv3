import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { Place, PlaceInsert, OpeningHours } from "../types";
import { useSession } from "@supabase/auth-helpers-react";

export function usePlaces() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const session = useSession();
  const userEmail = session?.user?.email || process.env.NEXT_PUBLIC_USER_EMAIL;
  useEffect(() => {
    if (userEmail) {
      fetchPlaces();
    }
  }, [userEmail]);

  const fetchPlaces = async () => {
    if (!userEmail) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("places")
      .select("*")
      .eq("user_email", userEmail)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching places:", error);
    } else {
      setPlaces(data || []);
    }
    setLoading(false);
  };

  const addPlace = async (place: PlaceInsert) => {
    if (!userEmail) return;

    const { data, error } = await supabase
      .from("places")
      .insert([place])
      .select()
      .single();

    if (error) {
      console.error("Error adding place:", error);
      throw error;
    } else {
      setPlaces([data, ...places]);
      return data;
    }
  };

  const updatePlace = async (id: string, updates: Partial<Place>) => {
    const { data, error } = await supabase
      .from("places")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating place:", error);
      throw error;
    } else {
      setPlaces(places.map((p) => (p.id === id ? data : p)));
      return data;
    }
  };

  const deletePlace = async (id: string) => {
    const { error } = await supabase.from("places").delete().eq("id", id);

    if (error) {
      console.error("Error deleting place:", error);
      throw error;
    } else {
      setPlaces(places.filter((p) => p.id !== id));
    }
  };

  const extractHours = (dayText: string): string[] => {
    const match = dayText.match(/:\s*(.+)$/);
    if (!match) return [];
    
    const hours = match[1].trim();
    if (hours.toLowerCase() === "closed" || hours.toLowerCase() === "nieczynne") {
      return [];
    }
    
    let converted = hours;
    
    // AM/PM to 24h
    converted = converted.replace(/(\d+):(\d+)\s*AM/gi, (match, h, m) => {
      const hour = parseInt(h);
      return `${hour === 12 ? '00' : h.padStart(2, '0')}:${m}`;
    });
    
    converted = converted.replace(/(\d+):(\d+)\s*PM/gi, (match, h, m) => {
      const hour = parseInt(h);
      return `${hour === 12 ? 12 : hour + 12}:${m}`;
    });
    
    converted = converted.replace(/–/g, "-").replace(/\s+/g, "");
    
    return [converted];
  };

  const fetchPlaceDetails = async (lat: number, lng: number, name: string) => {
  try {
    const params = new URLSearchParams();
    
    params.append("name", name);
    params.append("lat", lat.toString());
    params.append("lng", lng.toString());

    const response = await fetch(`/api/google-places?${params.toString()}`);

    if (!response.ok) {
      const errorData = await response.json();
      console.warn(`Failed to fetch place details: ${errorData.error}`, errorData);
      return null;
    }

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
    };
  } catch (error) {
    console.error("Error fetching place details:", error);
    return null;
  }
};

const importFromGoogleMaps = async (jsonData: any, fetchGoogleData = true) => {
  if (!userEmail) return 0;

  try {
    const features = jsonData.features || [];
    const placesToImport: PlaceInsert[] = [];

    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      
      if (!feature.properties?.location?.name) continue;

      const [lng, lat] = feature.geometry.coordinates;
      
      if (lat === 0 && lng === 0) continue;

      const placeName = feature.properties.location.name;

      const basePlace: PlaceInsert = {
        user_email: userEmail,
        name: placeName,
        address: feature.properties.location.address || undefined,
        lat,
        lng,
        tags: [],
        google_place_id: undefined, 
        opening_hours: undefined,
        phone_number: undefined,
        website: undefined,
        rating: undefined,
        notes: undefined,
      };

      if (fetchGoogleData) {
        try {
      
          const googleDetails = await fetchPlaceDetails(lat, lng, placeName);
          
          if (googleDetails) {
            Object.assign(basePlace, googleDetails);
          } 
         
          if (i < features.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (error) {
          console.error(`Error fetching Google data for ${placeName}:`, error);
        }
      }

      placesToImport.push(basePlace);
    }

    if (placesToImport.length === 0) {
      throw new Error("Brak prawidłowych miejsc do zaimportowania");
    }

    const { data, error } = await supabase
      .from("places")
      .insert(placesToImport)
      .select();

    if (error) {
      console.error("Error importing places:", error);
      throw error;
    }

    await fetchPlaces();
    return data?.length || 0;
  } catch (error) {
    console.error("Error in importFromGoogleMaps:", error);
    throw error;
  }
};

  return {
    places,
    loading,
    addPlace,
    updatePlace,
    deletePlace,
    importFromGoogleMaps,
    refreshPlaces: fetchPlaces,
  };
}