import React, { useState, useMemo } from "react";
import { useSession } from "@supabase/auth-helpers-react";
import Layout from "../components/Layout";
import SEO from "../components/SEO";
import LoadingState from "../components/LoadingState";
import { usePlaces } from "../hooks/usePlaces";
import ImportPlaces from "../components/places/ImportPlaces";
import PlaceFilters from "../components/places/PlaceFilters";
import PlacesList from "../components/places/PlacesList";
import PlacesMap from "../components/places/PlacesMap";
import PlaceForm from "../components/places/PlaceForm";
import { Place } from "../types";
import { List, MapPin } from "lucide-react";

type ViewMode = "list" | "map";

interface TimeFilter {
  day: number;
  startTime: string;
  endTime: string;
}

export default function PlacesPage() {
  const session = useSession();
  const userEmail = session?.user?.email || "";

  const {
    places,
    loading,
    updatePlace,
    deletePlace,
    importFromGoogleMaps
  } = usePlaces(userEmail);

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);

  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    places.forEach((place) => {
      place.tags.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [places]);

  const filteredPlaces = useMemo(() => {
    return places.filter((place) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = place.name.toLowerCase().includes(query);
        const matchesAddress = place.address?.toLowerCase().includes(query);
        if (!matchesName && !matchesAddress) return false;
      }

      if (selectedTags.length > 0) {
        const hasTag = selectedTags.some((tag) => place.tags.includes(tag));
        if (!hasTag) return false;
      }
      if (timeFilter && place.opening_hours) {
        const dayNames = [
          "sunday",
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
        ];
        const dayName = dayNames[timeFilter.day];
        const hours = place.opening_hours[dayName];

        if (!hours || !Array.isArray(hours) || hours.length === 0) {
          return false;
        }


        const hoursStr = hours[0];
        const match = hoursStr.match(/(\d{2}:\d{2})-(\d{2}:\d{2})/);
        if (!match) return false;

        const [, openTime, closeTime] = match;

        const requestStart = timeFilter.startTime;
        const requestEnd = timeFilter.endTime;

        const isOpen =
          requestStart >= openTime &&
          requestEnd <= closeTime &&
          requestStart < requestEnd;

        if (!isOpen) return false;
      }

      return true;
    });
  }, [places, searchQuery, selectedTags, timeFilter]);

  const handleSavePlace = async (updates: Partial<Place>) => {
    if (!editingPlace) return;
    try {
      await updatePlace(editingPlace.id, updates);
      setEditingPlace(null);
    } catch (error) {
      console.error("Error updating place:", error);
      alert("Błąd podczas zapisywania miejsca");
    }
  };

const handleImport = async (jsonData: any, fetchGoogleData: boolean): Promise<number> => {
  const count = await importFromGoogleMaps(jsonData, fetchGoogleData);
  return count || 0;
};

  const handleDeletePlace = async (id: string) => {
    try {
      await deletePlace(id);
    } catch (error) {
      console.error("Error deleting place:", error);
      alert("Błąd podczas usuwania miejsca");
    }
  };

  if (loading) {
    return (
      <Layout>
        <LoadingState />
      </Layout>
    );
  }

  return (
      <Layout>
        <SEO
          title="Miejsca"
          description="Zarządzaj swoimi ulubionymi miejscami z Google Maps"
        />
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Miejsca</h2>
            <ImportPlaces onImport={handleImport} />
          </div>

          <PlaceFilters
            availableTags={availableTags}
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
            timeFilter={timeFilter}
            onTimeFilterChange={setTimeFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            setViewMode={setViewMode}
            viewMode={viewMode}
          />

          <div className="mb-4 text-sm text-gray-600">
            Znaleziono: {filteredPlaces.length} / {places.length} miejsc
          </div>

          {viewMode === "list" ? (
            <PlacesList
              places={filteredPlaces}
              onEdit={setEditingPlace}
              onDelete={handleDeletePlace}
            />
          ) : (
            <PlacesMap
              places={filteredPlaces}
              onPlaceClick={setEditingPlace}
            />
          )}

        {editingPlace && (
          <PlaceForm
            place={editingPlace}
            onSave={handleSavePlace}
            onCancel={() => setEditingPlace(null)}
          />
        )}
      </Layout>
  );
}
PlacesPage.auth = true;