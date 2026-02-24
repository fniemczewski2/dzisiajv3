import React, { useState, useEffect } from "react";
import Head from "next/head";
import Layout from "../components/Layout";
import SearchBar from "../components/SearchBar";
import StopItem from "../components/transport/StopItem";
import { useTransport } from "../hooks/useTransport";
import { useSettings } from "../hooks/useSettings";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

// Rozszerzony typ dla naszych lokalnych wyników
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
    fetchFavorites
  } = useTransport(true);

  const { settings, addFavoriteStop, removeFavoriteStop } = useSettings();
  
  const [searchQuery, setSearchQuery] = useState("");
  
  // Przechowujemy pełne obiekty wyszukiwania (nazwa, strefa i sformatowany tekst)
  const [searchResults, setSearchResults] = useState<LocalSearchResult[]>([]);
  // To podajemy do niezmienionego SearchBara (czyste stringi)
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const favoriteStops = Array.isArray(settings.favorite_stops) ? settings.favorite_stops : [];
  const favoritesJSON = JSON.stringify(favoriteStops);

  useEffect(() => {
    try {
      const stops = JSON.parse(favoritesJSON);
      fetchFavorites(stops);
    } catch (e) {
      console.error("Błąd parsowania ulubionych przystanków:", e);
    }
  }, [favoritesJSON, fetchFavorites]);

  // Logika Wyszukiwarki oparta na lokalnej bazie Supabase
  useEffect(() => {
    const loadSuggestions = async () => {
      if (!searchQuery || searchQuery.trim().length < 2) {
        setSuggestions([]);
        setSearchResults([]);
        return;
      }

      // Szukamy bezpośrednio w tabeli stops
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
      
      data.forEach(stop => {
        if (!uniqueStops.has(stop.stop_name)) {
          // Tworzymy sformatowany tekst do wyświetlenia w starym SearchBarze
          const isSzczecin = stop.zone_id === "S";
          const cityName = isSzczecin ? "Szczecin" : `Poznań ${stop.zone_id}`;
          
          const displayString = `${stop.stop_name} (${cityName})`.trim();

          uniqueStops.set(stop.stop_name, {
            name: stop.stop_name,
            zone_id: stop.zone_id,
            displayString: displayString
          });
        }
      });

      const resultsArray = Array.from(uniqueStops.values()).slice(0, 10);
      
      setSearchResults(resultsArray);
      // Mapujemy tylko pole displayString, bo SearchBar przyjmuje tablicę stringów
      setSuggestions(resultsArray.map(r => r.displayString));
    };

    const debounce = setTimeout(loadSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, supabase]);

  return (
    <>
      <Head><title>Transport – Dzisiajv3</title></Head>
      <Layout>
        <div className="flex items-center mb-4">
          <h2 className="text-2xl font-semibold">Transport</h2>
        </div>

        <div className="space-y-6">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Wyszukaj przystanek..."
            suggestions={suggestions}
            onSuggestionClick={(value) => {
              // 'value' to teraz np. "Ognik • Poznań ( A )"
              // Szukamy w naszych wynikach obiektu, który ma dokładnie taki displayString
              const selectedStop = searchResults.find(s => s.displayString === value);
              
              if (selectedStop) {
                // Dodajemy do bazy czystą nazwę i strefę
                addFavoriteStop(selectedStop.name, selectedStop.zone_id); 
              } else {
                // Zabezpieczenie (fallback): ucinamy string na kropce, by dostać tylko nazwę
                const fallbackName = value.split(" • ")[0];
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
            <div className="bg-card rounded-xl shadow overflow-hidden">
              {favoriteStops.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">Nie masz ulubionych przystanków.</p>
              ) : loadingFavorites && favoritesGroups.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground animate-pulse">Ładowanie...</p>
              ) : favoritesGroups.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground text-red-500">
                  Brak kursów dla ulubionych przystanków (lub błąd pobierania danych).
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

          {/* 📍 NAJBLIŻEJ */}
          <section>
            <h3 className="text-lg font-semibold mb-3">Najbliżej (wg lokalizacji)</h3>
            <div className="bg-card rounded-xl shadow overflow-hidden">
              {loadingNearby && nearbyGroups.length === 0 && (
                <p className="p-4 text-sm text-muted-foreground animate-pulse">Szukanie przystanków w pobliżu...</p>
              )}
              {!loadingNearby && nearbyGroups.length === 0 && (
                <p className="p-4 text-sm text-muted-foreground">Brak przystanków w promieniu 2km.</p>
              )}
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