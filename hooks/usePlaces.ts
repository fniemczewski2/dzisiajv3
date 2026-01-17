import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { Place, PlaceInsert, OpeningHours } from "../types";
import { useSession } from "@supabase/auth-helpers-react";
import { generatePlaceTags } from "../lib/placeTagging";

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
        // Return full result for tag generation
        google_data: result,
      };
    } catch (error) {
      console.error("Error fetching place details:", error);
      return null;
    }
  };

  /**
   * Find existing place by coordinates or name
   * Returns the existing place if found, null otherwise
   */
  const findExistingPlace = async (
    name: string,
    lat: number,
    lng: number
  ): Promise<Place | null> => {
    if (!userEmail) return null;

    // Strategy 1: Find by exact coordinates (within 0.0001 degrees ~ 11 meters)
    const coordThreshold = 0.0001;
    
    const { data: coordMatches, error: coordError } = await supabase
      .from("places")
      .select("*")
      .eq("user_email", userEmail)
      .gte("lat", lat - coordThreshold)
      .lte("lat", lat + coordThreshold)
      .gte("lng", lng - coordThreshold)
      .lte("lng", lng + coordThreshold);

    if (coordError) {
      console.error("Error finding by coordinates:", coordError);
    } else if (coordMatches && coordMatches.length > 0) {
      // If we found places at the same coordinates, check if name matches
      const exactMatch = coordMatches.find(
        (p) => p.name.toLowerCase() === name.toLowerCase()
      );
      if (exactMatch) return exactMatch;
      
      // Return the first coordinate match even if name doesn't match exactly
      // (same location = probably same place with slightly different name)
      return coordMatches[0];
    }

    // Strategy 2: Find by exact name (fallback)
    const { data: nameMatches, error: nameError } = await supabase
      .from("places")
      .select("*")
      .eq("user_email", userEmail)
      .ilike("name", name); // Case-insensitive match

    if (nameError) {
      console.error("Error finding by name:", nameError);
      return null;
    }

    return nameMatches && nameMatches.length > 0 ? nameMatches[0] : null;
  };

  const importFromGoogleMaps = async (
    jsonData: any,
    fetchGoogleData = true,
    autoTag = true
  ) => {
    if (!userEmail) return 0;

    try {
      const features = jsonData.features || [];
      const placesToInsert: PlaceInsert[] = [];
      const placesToUpdate: { id: string; updates: Partial<Place> }[] = [];
      let skippedCount = 0;

      for (let i = 0; i < features.length; i++) {
        const feature = features[i];
        
        if (!feature.properties?.location?.name) continue;

        const [lng, lat] = feature.geometry.coordinates;
        
        if (lat === 0 && lng === 0) continue;

        const placeName = feature.properties.location.name;
        const address = feature.properties.location.address || undefined;

        // Check if place already exists
        const existingPlace = await findExistingPlace(placeName, lat, lng);

        const baseData: any = {
          name: placeName,
          address,
          lat,
          lng,
        };

        let googleData = null;

        // Fetch Google Place details if enabled
        if (fetchGoogleData) {
          try {
            const googleDetails = await fetchPlaceDetails(lat, lng, placeName);
            
            if (googleDetails) {
              // Extract google_data before spreading
              googleData = googleDetails.google_data;
              delete googleDetails.google_data;
              
              // Assign other Google details
              Object.assign(baseData, googleDetails);
            }
           
            // Rate limiting: wait 500ms between requests
            if (i < features.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          } catch (error) {
            console.error(`Error fetching Google data for ${placeName}:`, error);
          }
        }

        // Generate automatic tags if enabled
        let tags: string[] = [];
        if (autoTag) {
          try {
            tags = await generatePlaceTags(placeName, googleData);
          } catch (error) {
            console.error(`Error generating tags for ${placeName}:`, error);
            // If tag generation fails, try with just the name
            try {
              tags = await generatePlaceTags(placeName);
            } catch (fallbackError) {
              console.error(`Fallback tag generation also failed for ${placeName}`);
              tags = [];
            }
          }
        }

        if (existingPlace) {
          // Place exists - UPDATE it
          const updates: Partial<Place> = {
            ...baseData,
            tags: tags.length > 0 ? tags : existingPlace.tags, // Keep old tags if new generation failed
            updated_at: new Date().toISOString(),
          };

          placesToUpdate.push({
            id: existingPlace.id,
            updates,
          });

          console.log(`Updating existing place: ${placeName}`);
        } else {
          // Place doesn't exist - INSERT it
          const newPlace: PlaceInsert = {
            user_email: userEmail,
            ...baseData,
            tags,
            notes: undefined,
          };

          placesToInsert.push(newPlace);
          console.log(`Adding new place: ${placeName}`);
        }
      }

      let insertedCount = 0;
      let updatedCount = 0;

      // Insert new places
      if (placesToInsert.length > 0) {
        const { data: insertedData, error: insertError } = await supabase
          .from("places")
          .insert(placesToInsert)
          .select();

        if (insertError) {
          console.error("Error inserting places:", insertError);
          throw insertError;
        }

        insertedCount = insertedData?.length || 0;
        console.log(`Inserted ${insertedCount} new places`);
      }

      // Update existing places
      if (placesToUpdate.length > 0) {
        for (const { id, updates } of placesToUpdate) {
          const { error: updateError } = await supabase
            .from("places")
            .update(updates)
            .eq("id", id);

          if (updateError) {
            console.error(`Error updating place ${id}:`, updateError);
          } else {
            updatedCount++;
          }
        }
        console.log(`Updated ${updatedCount} existing places`);
      }

      // Refresh the places list
      await fetchPlaces();

      // Return total count of processed places
      return insertedCount + updatedCount;
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