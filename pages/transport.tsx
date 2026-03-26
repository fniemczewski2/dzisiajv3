import React, { useState, useEffect } from "react";
import Head from "next/head";
import Layout from "../components/Layout";
import SearchBar from "../components/SearchBar";
import { useTransport } from "../hooks/useTransport";
import { useSettings } from "../hooks/useSettings";
import { useAuth } from "../providers/AuthProvider";
import NoResultsState from "../components/NoResultsState";
import LoadingState from "../components/LoadingState";
import { useToast } from "../providers/ToastProvider";
import { DeleteButton, FavButton } from "../components/CommonButtons";

interface LocalSearchResult {
  name: string;
  zone_id: string;
  displayString: string;
}

export default function TransportPage() {
  const { supabase } = useAuth(); 
  const { toast } = useToast();
  
  const {
    nearbyGroups,
    favoritesGroups,
    loadingNearby,
    loadingFavorites,
    locationError, 
    fetchFavorites,
  } = useTransport(true);

  console.log(favoritesGroups)

  const { settings, addFavoriteStop, removeFavoriteStop, loading: settingsLoading } = useSettings();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LocalSearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const favoriteStops = Array.isArray(settings.favorite_stops) ? settings.favorite_stops : [];
  const favoritesJSON = JSON.stringify(favoriteStops);
  
  useEffect(() => {
    if (settingsLoading) return;

    try {
      const stops = JSON.parse(favoritesJSON);
      fetchFavorites(stops);
    } catch (e) {
      toast.error("Wystąpił błąd pobierania ulubionych przystanków");
    }
  }, [favoritesJSON, fetchFavorites, settingsLoading]);

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
        console.error("Błąd wyszukiwania przystanków:", error);
        setSuggestions([]);
        setSearchResults([]);
        return;
      }

      const uniqueStops = new Map<string, LocalSearchResult>();

      (data as any[]).forEach((stop) => {
        if (!stop.stop_name) return;

        if (!uniqueStops.has(stop.stop_name)) {
          const isSzczecin = stop.zone_id === "S";
          const cityName = isSzczecin ? "Szczecin" : `Poznań ${stop.zone_id || ""}`;
          const displayString = `${stop.stop_name} (${cityName})`.trim();

          uniqueStops.set(stop.stop_name, {
            name: stop.stop_name,
            zone_id: stop.zone_id || "AUTO",
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

  const handleSuggestionClick = (value: string | any) => {
    const strValue = typeof value === 'string' ? value : value?.target?.innerText || "";
    if (!strValue) return;

    const selectedStop = searchResults.find((s) => s.displayString === strValue);
    
    if (selectedStop) {
      addFavoriteStop(selectedStop.name, selectedStop.zone_id);
      toast.success(`Dodano do ulubionych: ${selectedStop.name}`);
    } else {
      const fallbackName = strValue.split(" (")[0];
      addFavoriteStop(fallbackName, "AUTO");
      toast.success(`Dodano do ulubionych: ${fallbackName}`);
    }
    
    setSearchQuery("");
    setSuggestions([]);
    setSearchResults([]);
  };

  useEffect(() => {
      let toastId: string | undefined;
      if (loadingNearby && nearbyGroups.length === 0) toastId = toast.loading("Ładowanie przystanków...");
      if (loadingFavorites && favoritesGroups.length === 0) toastId = toast.loading("Ładowanie ulubionych...");
      return () => { if (toastId && toast.dismiss) toast.dismiss(toastId); };
  }, [loadingNearby, loadingFavorites, toast]);

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
            onSuggestionClick={handleSuggestionClick}
          />

          <section>
            <h3 className="text-lg font-semibold mb-3">Ulubione</h3>
            <div className="space-y-4">
              {favoriteStops.length === 0 ? (
                <NoResultsState text="ulubionych przystanków" />
              ) : favoritesGroups.length === 0 ? (
                <NoResultsState text="kursów dla wskazanych przystanków" />
              ) : (
                favoritesGroups.map((group) => (
                  <div key={`group_${group.stop_name}`} className="card rounded-xl p-4">
                    <div className="flex justify-between items-center mb-2 border-b pb-2">
                      <h4 className="font-bold text-primary">{group.stop_name}</h4>
                      <DeleteButton
                        onClick={() => removeFavoriteStop(group.stop_name)}
                        small
                      />
                    </div>
                    
                    <div className="grid gap-3">
                      {group.bollards?.map((bollard: any) => (
                        <div key={bollard.bollard_code} className="">
                          <span className="text-[10px] uppercase text-textSecondary font-mono">
                            {bollard.bollard_code}
                          </span>
                          <div className="mt-1">
                            {bollard.departures.map((dep: any, idx: number) => (
                              <div key={idx} className="flex justify-between text-sm py-1 border-b border-border/50 last:border-0">
                                <span className="font-medium w-8">{dep.line}</span>
                                <span className="flex-1 truncate px-2 text-textSecondary">{dep.direction}</span>
                                <span className={dep.is_realtime ? "text-primary font-bold" : ""}>
                                  {dep.minutes} min
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
          
          <section>
            <h3 className="text-lg font-semibold mb-3">Najbliżej (GPS)</h3>
            <div className="space-y-4">
              {locationError && (
                <div className="text-center py-10 w-full" >
                    <h3 className="text-lg font-medium text-text mb-4">Błąd lokalizacji</h3>
                    <p className="text-textSecondary">{locationError}</p>
                </div>
              )}

              {!loadingNearby && !locationError && nearbyGroups.length === 0 && (
                <NoResultsState text="przystanków w pobliżu" />
              )}

              {nearbyGroups.map((group: any) => (
                <div key={`nearby_group_${group.stop_name}`} className="card rounded-xl p-4">
                  <div className="flex flex-wrap justify-between items-center mb-2 border-b pb-2">
                    <h4 className="font-bold text-primary">{group.stop_name}</h4>
                    <div className="flex items-center gap-3">
                      {group.distance && <span className="text-xs text-textSecondary">{group.distance} m</span>}
                      <FavButton
                        onClick={() => {
                          addFavoriteStop(group.stop_name, group.zone_id || "AUTO");
                          toast.success(`Dodano do ulubionych: ${group.stop_name}`);
                        }}
                        small/>

                    </div>
                  </div>
                  
                  <div className="grid gap-3">
                    {group.bollards?.map((bollard: any) => (
                      <div key={`nearby_${bollard.bollard_code}`} className="bg-muted/30 p-2 rounded-lg">
                        <span className="text-[10px] uppercase text-textSecondary font-mono">
                          Słupek: {bollard.bollard_code}
                        </span>
                        <div className="mt-1">
                          {bollard.departures.map((dep: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-sm py-1 border-b border-border/50 last:border-0">
                              <span className="font-medium w-8">{dep.line}</span>
                              <span className="flex-1 truncate px-2 text-textSecondary">{dep.direction}</span>
                              <span className={dep.is_realtime <= 5 ? "text-primary font-bold" : ""}>
                                {dep.minutes} min
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </Layout>
    </>
  );
}