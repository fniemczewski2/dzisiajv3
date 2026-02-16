import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import SearchBar from "../components/SearchBar";
import StopItem from "../components/transport/StopItem";
import { useTransport } from "../hooks/useTransport";
import { useSettings } from "../hooks/useSettings";
import Head from "next/head";

type FavoriteStop = {
  name: string;
  zone_id: string;
};

export default function TransportPage() {
  const {
    stops: nearbyStops,
    departures,
    loadingStops,
    fetchMultipleStops,
    searchStops,
  } = useTransport(true);

  const {
    settings,
    addFavoriteStop,
    removeFavoriteStop,
  } = useSettings();

  const favoriteStops: FavoriteStop[] =
    (settings.favorite_stops as FavoriteStop[]) || [];

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const zoneToCity = (zoneId: string) =>
    zoneId === "S" ? "Szczecin" : "Poznań";

  const cityToZone = (city: string) =>
    city === "Szczecin" ? "S" : "P";

  // 🔎 SEARCH
  useEffect(() => {
    const loadSuggestions = async () => {
      if (!searchQuery) {
        setSuggestions([]);
        return;
      }

      const results = await searchStops(searchQuery);

      const formatted: string[] = results.map(
        (stop) => `${stop.name} (${zoneToCity(stop.zone_id)})`
      );

      setSuggestions(formatted);
    };

    const debounce = setTimeout(loadSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, searchStops]);

    useEffect(() => {
    if (!favoriteStops.length) return;

    fetchMultipleStops(favoriteStops);
    }, [favoriteStops, fetchMultipleStops]);


  return (
    <>
    <Head>
      <title>Transport – Dzisiajv3</title>
    </Head>
    <Layout>
      <div className="flex items-center mb-4">
        <h2 className="text-2xl font-semibold">Transport</h2>
      </div>

      <div className="space-y-6">

        {/* 🔍 SEARCH */}
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Wyszukaj przystanek..."
          suggestions={suggestions}
          onSuggestionClick={(value: string) => {
            const match = value.match(/^(.*)\s\((.*)\)$/);
            if (!match) return;

            const name = match[1];
            const city = match[2];

            const zone_id = cityToZone(city);

            addFavoriteStop(name, zone_id);

            setSearchQuery("");
            setSuggestions([]);
          }}
        />

        {/* ⭐ FAVORITES */}
        <section>
          <h3 className="text-lg font-semibold mb-3">Ulubione</h3>

          <div className="bg-card rounded-xl shadow overflow-hidden">
            {favoriteStops.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">
                Nie dodałeś jeszcze żadnych przystanków.
              </p>
            )}

            {favoriteStops.map((stop) => {
              const key = `${stop.name}_${stop.zone_id}`;

              return (
                <StopItem
                  key={key}
                  stopName={stop.name}
                  zone_id={stop.zone_id}
                  departures={departures[key] || []}
                  isLoading={loadingStops[key]}
                  onRemove={() =>
                    removeFavoriteStop(stop.name, stop.zone_id)
                  }
                  many={true}
                />
              );
            })}
          </div>
        </section>

        {/* 📍 NEARBY */}
        <section>
          <h3 className="text-lg font-semibold mb-3">Najbliżej</h3>

          <div className="bg-card rounded-xl shadow overflow-hidden">
            {nearbyStops.slice(0, 3).map((stop) => {
              const key = `${stop.name}_${stop.zone_id}`;

              return (
                <StopItem
                  key={key}
                  stopName={stop.name}
                  zone_id={stop.zone_id}
                  distance={stop.distance_meters}
                  departures={departures[key] || []}
                  isLoading={loadingStops[key]}
                  onAddFavorite={() =>
                    addFavoriteStop(stop.name, stop.zone_id)
                  }
                  many={true}
                />
              );
            })}
          </div>
        </section>

      </div>
    </Layout>
    </>
  );
}
