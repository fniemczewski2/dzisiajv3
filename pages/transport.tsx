import React, { useState, useEffect } from "react";
import Head from "next/head";
import Layout from "../components/Layout";
import SearchBar from "../components/SearchBar";
import StopItem from "../components/transport/StopItem";
import { useTransport } from "../hooks/useTransport";
import { useSettings } from "../hooks/useSettings";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

// Rozszerzony typ dla lokalnych wyników wyszukiwania
interface LocalSearchResult {
  name: string;
  zone_id: string;
  displayString: string;
}

export default function TransportPage() {
  const supabase = useSupabaseClient();
  const {
    nearbyGroups,
    favoritesGroups,
    loadingNearby,
    loadingFavorites,
    locationError, // Pobieramy błąd lokalizacji z hooka
    initLocationAndFetch, // Funkcja do ręcznego odświeżenia GPS
    fetchFavorites,
  } = useTransport(true);

  const { settings, addFavoriteStop, removeFavoriteStop } = useSettings();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LocalSearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const favoriteStops = Array.isArray(settings.favorite_stops) ? settings.favorite_stops : [];
  const favoritesJSON = JSON.stringify(favoriteStops);

  // Efekt dla ulubionych przystanków
  useEffect(() => {
    try {
      const stops = JSON.parse(favoritesJSON);
      fetchFavorites(stops);
    } catch (e) {
      console.error("Błąd parsowania ulubionych przystanków:", e);
    }
  }, [favoritesJSON, fetchFavorites]);

  // Logika Wyszukiwarki (Lokalna baza Supabase)
  useEffect(() => {
    const loadSuggestions = async () => {
      if (!searchQuery || searchQuery.trim().length < 2) {
        setSuggestions([]);
        setSearchResults([]);
        return;
      }

      const { data, error } = await supabase
        .from("stops")
        .select("stop_name, zone_id")
        .ilike("stop_name", `%${searchQuery}%`)
        .limit(30);

      if (error || !data) {
        setSuggestions([]);
        setSearchResults([]);
        return;
      }

      const uniqueStops = new Map<string, LocalSearchResult>();

      data.forEach((stop) => {
        if (!uniqueStops.has(stop.stop_name)) {
          const isSzczecin = stop.zone_id === "S";
          const cityName = isSzczecin ? "Szczecin" : `Poznań ${stop.zone_id}`;
          const displayString = `${stop.stop_name} (${cityName})`.trim();

          uniqueStops.set(stop.stop_name, {
            name: stop.stop_name,
            zone_id: stop.zone_id,
            displayString: displayString,
          });
        }
      });

      const resultsArray = Array.from(uniqueStops.values()).slice(0, 10);
      setSearchResults(resultsArray);
      setSuggestions(resultsArray.map((r) => r.displayString));
    };

    const debounce = setTimeout(loadSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, supabase]);

  return (
    <>
      <Head>
        <title>Transport – Dzisiajv3</title>
      </Head>
      <Layout>
        <div className="flex items-center mb-4">
          <h2 className="text-2xl font-semibold text-foreground">Transport</h2>
        </div>

        <div className="space-y-6">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Wyszukaj przystanek..."
            suggestions={suggestions}
            onSuggestionClick={(value) => {
              const selectedStop = searchResults.find((s) => s.displayString === value);
              if (selectedStop) {
                addFavoriteStop(selectedStop.name, selectedStop.zone_id);
              } else {
                const fallbackName = value.split(" (")[0];
                addFavoriteStop(fallbackName, "AUTO");
              }
              setSearchQuery("");
              setSuggestions([]);
              setSearchResults([]);
            }}
          />

          {/* ⭐ ULUBIONE */}
          <section>
            <h3 className="text-lg font-semibold mb-3">Ulubione</h3>
            <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
              {favoriteStops.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground italic">
                  Nie masz jeszcze ulubionych przystanków.
                </p>
              ) : loadingFavorites && favoritesGroups.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground animate-pulse">
                  Ładowanie kursów...
                </p>
              ) : favoritesGroups.length === 0 ? (
                <p className="p-4 text-sm text-destructive">
                  Brak kursów dla Twoich ulubionych lokalizacji.
                </p>
              ) : (
                favoritesGroups.map((group) => (
                  <StopItem
                    key={`fav_${group.stop_name}`}
                    stopName={group.stop_name}
                    departures={group.departures}
                    isLoading={loadingFavorites}
                    onRemove={() => removeFavoriteStop(group.stop_name)}
                    many={true}
                    zone_id={group.zone_id}
                  />
                ))
              )}
            </div>
          </section>

          {/* 📍 NAJBLIŻEJ (Zintegrowane z błędami GPS) */}
          <section>
            <h3 className="text-lg font-semibold mb-3">Najbliżej (GPS)</h3>
            <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
              {/* 1. Stan: Pobieranie lokalizacji */}
              {loadingNearby && nearbyGroups.length === 0 && (
                <p className="p-6 text-center text-sm text-muted-foreground animate-pulse">
                  Szukanie przystanków w Twojej okolicy...
                </p>
              )}

              {/* 2. Stan: Błąd geolokalizacji lub brak zgody */}
              {locationError && (
                <div className="p-6 text-center space-y-3">
                  <p className="text-sm text-orange-500 font-medium">{locationError}</p>
                  <button
                    onClick={initLocationAndFetch}
                    className="text-xs bg-primary text-primary-foreground px-4 py-2 rounded-full font-medium hover:opacity-90 transition-opacity"
                  >
                    Udostępnij lokalizację
                  </button>
                </div>
              )}

              {/* 3. Stan: Mamy GPS, ale brak przystanków w promieniu 2-5km */}
              {!loadingNearby && !locationError && nearbyGroups.length === 0 && (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  Brak przystanków w promieniu 2 km od Twojej pozycji.
                </p>
              )}

              {/* 4. Lista wyników */}
              {nearbyGroups.map((group: any) => (
                <StopItem
                  key={`nearby_${group.stop_name}`}
                  stopName={group.stop_name}
                  distance={group.distance}
                  departures={group.departures}
                  isLoading={loadingNearby}
                  onAddFavorite={() => addFavoriteStop(group.stop_name, group.zone_id || "AUTO")}
                  many={true}
                />
              ))}
            </div>
          </section>
        </div>
      </Layout>
    </>
  );
}