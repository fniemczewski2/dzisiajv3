"use client";
import React, { useState, useMemo, useEffect } from "react";
import Layout from "../../components/Layout";
import { usePlaces } from "../../hooks/usePlaces";
import ImportPlaces from "../../components/places/ImportPlaces";
import PlaceFilters from "../../components/places/PlaceFilters";
import PlacesList from "../../components/places/PlacesList";
import PlacesMap from "../../components/places/PlacesMap";
import PlaceForm from "../../components/places/PlaceForm";
import { Place } from "../../types";
import { Upload } from "lucide-react";
import { useToast } from "../../providers/ToastProvider";
import Head from "next/head";

type ViewMode = "list" | "map";

interface TimeFilter {
  day: number;
  startTime: string;
  endTime: string;
}

const matchesSearchQuery = (place: Place, query: string): boolean => {
  if (!query) return true;
  const lowerQuery = query.toLowerCase();
  const matchesName = place.name.toLowerCase().includes(lowerQuery);
  const matchesAddress = place.address?.toLowerCase().includes(lowerQuery);
  return matchesName || !!matchesAddress;
};

const matchesTags = (place: Place, selectedTags: string[]): boolean => {
  if (selectedTags.length === 0) return true;
  return selectedTags.some((tag) => place.tags?.includes(tag));
};

const matchesTimeFilter = (place: Place, timeFilter: TimeFilter | null): boolean => {
  if (!timeFilter) return true;
  if (!place.opening_hours) return false;

  const dayNames = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const dayName = dayNames[timeFilter.day];
  const hours = place.opening_hours[dayName];

  if (!hours || !Array.isArray(hours) || hours.length === 0) return false;

  const match = hours[0].match(/(\d{2}:\d{2})-(\d{2}:\d{2})/);
  if (!match) return false;

  const [, openTime, closeTime] = match;
  const { startTime, endTime } = timeFilter;

  return openTime <= startTime && closeTime >= endTime && startTime < endTime;
};

export default function PlacesPage() {
  const {
    places,
    loading,
    fetching,
    updatePlace,
    deletePlace,
    importFromGoogleMaps
  } = usePlaces();

  const [showImport, setShowImport] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);
  const { toast } = useToast();

  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    places.forEach((place) => {
      (place.tags || []).forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b, "pl"));
  }, [places]);

  const filteredPlaces = useMemo(() => {
    return places.filter((place) => {
      if (!matchesSearchQuery(place, searchQuery)) return false;
      if (!matchesTags(place, selectedTags)) return false;
      if (!matchesTimeFilter(place, timeFilter)) return false;
      return true;
    });
  }, [places, searchQuery, selectedTags, timeFilter]);

  const handleSavePlace = async (updates: Partial<Place>) => {
    if (!editingPlace) return;
    try {
      await updatePlace(editingPlace.id, updates);
      toast.success("Zmieniono pomyślnie.");
      setEditingPlace(null);
    } catch {
      toast.error("Wystąpił błąd podczas zapisywania miejsca.");
    }
  };

  const handleImport = async (jsonData: any, fetchGoogleData: boolean, autoTag: boolean): Promise<number> => {
    const count = await importFromGoogleMaps(jsonData, fetchGoogleData, autoTag);
    return count || 0;
  };

  const handleDeletePlace = async (id: string) => {
    try {
      await deletePlace(id);
    } catch {
      toast.error("Wystąpił błąd podczas usuwania miejsca.");
    }
  };
  
  useEffect(() => {
      let toastId: string | undefined;
      
      if (fetching && toast.loading) {
        toastId = toast.loading("Ładowanie miejsc...");
      }
  
      return () => {
        if (toastId && toast.dismiss) {
          toast.dismiss(toastId);
        }
      };
  }, [fetching, toast]);

  return (
    <>
    <Head>
      <title>Miejsca - Dzisiaj</title>
    </Head>
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-text">Miejsca</h2>
        {!showImport && (
          <button
            onClick={() => setShowImport(true)}
            className="px-4 py-2 bg-primary hover:bg-secondary text-white font-medium rounded-xl flex items-center gap-2 transition-colors shadow-sm"
          >
            Importuj <Upload className="w-5 h-5" />
          </button>
        )}
      </div>

      {showImport && (
        <ImportPlaces 
          onImport={handleImport}
          onCollapse={() => setShowImport(false)}
        />
      )}

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

      <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-textMuted">
        Wyświetlam: {filteredPlaces.length} z {places.length}
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
          loading={loading}
        />
      )}
    </Layout>
    </>
  );
}