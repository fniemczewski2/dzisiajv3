import React, { useEffect, useState } from "react";
import SearchBar from "@/components/ui/SearchBar";
import { useTransport } from "@/hooks/db/useTransport";
import NoResultsState from "@/components/ui/NoResultsState";
import { SkeletonStopCard } from "@/components/ui/Skeleton";
import { useToast } from "@/providers/ToastProvider";
import { AddButton, DeleteButton, FavButton } from "@/components/ui/CommonButtons";
import Seo from "@/components/ui/SEO";
import { useTrains } from "@/hooks/db/useTrains";
import AddTrainForm from "@/components/transport/AddTrainWidget"; 
import { TrackedTrainCard } from "@/components/transport/TrackedTrainCard";
import StationBoardWidget from "@/components/transport/StationBoard";

export default function TransportPage() {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);

  const {
    nearbyGroups,
    favoritesGroups,
    locationError, 
    searchQuery,
    setSearchQuery,
    suggestions,
    handleSuggestionClick,
    favoriteStops,
    addFavoriteStop,
    removeFavoriteStop,
    loadingNearby,
    loadingFavorites,
    transportError
  } = useTransport(true);

  const { trains, addTrain, deleteTrain, refresh, loading: trainsLoading } = useTrains();

  useEffect(() => {
    const fetchAll = async () => {
      try {
        await refresh();
      } catch (error: any) {
        toast.error(error.message || "Nie udało się pobrać pociągów");
      }
    };
    fetchAll();
  }, [refresh, toast]);

  const loading = trainsLoading || loadingNearby || loadingFavorites;

  useEffect(() => {
    if (transportError) {
      toast.error(transportError);
    }
  }, [transportError, toast]);

  const visibleFavorites = favoritesGroups.filter((group) => 
    favoriteStops.some((stop: any) => stop.name === group.stop_name)
  );

  let favoritesContent;

  if (loadingFavorites) {
    favoritesContent = (
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => <SkeletonStopCard key={i} departures={4} />)}
      </div>
    );
  } else if (favoriteStops.length === 0) {
    favoritesContent = <NoResultsState text="ulubionych przystanków" />;
  } else if (visibleFavorites.length === 0) {
    favoritesContent = <NoResultsState text="kursów dla wskazanych przystanków" />;
  } else {
    favoritesContent = visibleFavorites.map((group) => (
      <div key={`group_${group.stop_name}`} className="card rounded-xl p-4">
        <div className="flex justify-between items-center mb-2 border-b pb-2">
          <h4 className="font-bold text-primary">{group.stop_name}</h4>
          <DeleteButton onClick={() => removeFavoriteStop(group.stop_name)} small />
        </div>
        
        <div className="grid gap-3">
          {group.bollards?.map((bollard: any) => (
            <div key={bollard.bollard_code} className="">
              <span className="text-[10px] uppercase text-textSecondary font-mono">
                {bollard.bollard_code}
              </span>
              <div className="mt-1">
                {bollard.departures.map((dep: any, idx: number) => (
                  <div key={`${dep.line}-${dep.direction}-${idx}`} className="flex justify-between text-sm py-1 border-b border-border/50 last:border-0">
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
    ));
  }

  let nearbyContent;

  if (loadingNearby) {
    nearbyContent = (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => <SkeletonStopCard key={i} departures={5} />)}
      </div>
    );
  } else if (locationError) {
    nearbyContent = (
      <div className="text-center py-10 w-full" >
          <h3 className="text-lg font-medium text-text mb-4">Błąd lokalizacji</h3>
          <p className="text-textSecondary">{locationError}</p>
      </div>
    );
  } else if (nearbyGroups.length === 0) {
    nearbyContent = <NoResultsState text="przystanków w pobliżu" />;
  } else {
    nearbyContent = nearbyGroups.map((group: any) => (
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
                {bollard.bollard_code}
              </span>
              <div className="mt-1">
                {bollard.departures.map((dep: any, idx: number) => (
                  <div key={`${dep.line}-${dep.direction}-${idx}`} className="flex justify-between text-sm py-1 border-b border-border/50 last:border-0">
                    <span className="font-medium w-8">{dep.line}</span>
                    <span className="flex-1 truncate px-2 text-textSecondary">{dep.direction}</span>
                    <span className={dep.minutes <= 5 ? "text-primary font-bold" : ""}>
                      {dep.minutes} min
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    ));
  }

  return (
    <>
      <Seo
        title="Transport | Dzisiaj.Fun"
        description="Sprawdzaj rzeczywiste odjazdy komunikacji miejskiej i zarządzaj swoimi ulubionymi przystankami."
        canonical="https://dzisiaj.funransport"
        keywords="transport, komunikacja miejska, przystanki, odjazdy, rozkład jazdy"
      />
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
              {favoritesContent}
            </div>
          </section>
          
          <section>
            <h3 className="text-lg font-semibold mb-3">Najbliżej (GPS)</h3>
            <div className="space-y-4">
               {nearbyContent}
            </div>
          </section>
        <StationBoardWidget onTrainAdded={refresh} /> 
        <section>
          <div className="flex items-center justify-between mb-3">
             <h3 className="text-lg font-semibold">
                Twoje pociągi
             </h3>
              {!expanded && (
                <AddButton
                  onClick={() => setExpanded((p) => !p)}
                />
              )}
          </div>
          <AddTrainForm onTrainAdded={addTrain} expanded={expanded} setExpanded={setExpanded}/>
          <div className="grid md:grid-cols-2 gap-6 items-start mt-4">
            <div className="space-y-4">
              {trains.length === 0 ? (
                <NoResultsState text="zaplanowanych podróży kolejowych" />
              ) : (
                trains.map((train) => (
                  <TrackedTrainCard 
                    key={train.id} 
                    train={train} 
                    onDelete={deleteTrain}
                  />
                ))
              )}
            </div>
          </div>
        </section>
        </div>
    </>
  );
}