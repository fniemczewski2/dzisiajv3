// pages/transport.tsx

import React, { useEffect } from "react";
import SearchBar from "@/components/ui/SearchBar";
import { useTransport } from "@/hooks/db/useTransport";
import NoResultsState from "@/components/ui/NoResultsState";
import { SkeletonStopCard } from "@/components/ui/Skeleton";
import { useToast } from "@/providers/ToastProvider";
import { DeleteButton, FavButton } from "@/components/ui/CommonButtons";
import Seo from "@/components/ui/SEO";
import { favoriteKey } from "@/shared/stopGrouping";
import type { StopGroup } from "@/types/transport";

export default function TransportPage() {
  const { toast } = useToast();

  const {
    nearbyGroups,
    favoritesGroups,
    locationError,
    searchQuery,
    setSearchQuery,
    suggestions,
    handleSuggestionClick,
    favoriteStops,
    addNearbyToFavorites,
    removeFavoriteStop,
    localityFor,
    loadingNearby,
    loadingFavorites,
    transportError,
  } = useTransport(true);

  useEffect(() => {
    if (transportError) {
      toast.error(transportError);
    }
  }, [transportError, toast]);

  const favoriteKeys = new Set(favoriteStops.map(favoriteKey));
  const visibleFavorites = favoritesGroups.filter((group) => favoriteKeys.has(group.key));

  const renderStopTitle = (group: StopGroup) => {
    const locality = localityFor(group);
    return (
      <h3
        className="min-w-0 flex-1 truncate pr-2 font-bold text-primary"
        title={locality ? `${group.stop_name}, ${locality}` : group.stop_name}
      >
        {group.stop_name}
        {locality && <span className="ml-1.5 text-xs font-medium text-text-secondary">{locality}</span>}
      </h3>
    );
  };

  let favoritesContent;

  if (loadingFavorites) {
    favoritesContent = (
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <SkeletonStopCard key={i} departures={4} />
        ))}
      </div>
    );
  } else if (favoriteStops.length === 0) {
    favoritesContent = <NoResultsState text="ulubionych przystanków" />;
  } else if (visibleFavorites.length === 0) {
    favoritesContent = <NoResultsState text="kursów dla wskazanych przystanków" />;
  } else {
    favoritesContent = visibleFavorites.map((group) => (
      <div key={`group_${group.key}`} className="card min-w-0 overflow-hidden rounded-xl p-4">
        <div className="mb-2 flex items-center justify-between border-b pb-2">
          {renderStopTitle(group)}
          <DeleteButton onClick={() => removeFavoriteStop(group.key)} small />
        </div>

        <div className="grid min-w-0 gap-3">
          {group.bollards?.map((bollard) => (
            <div key={bollard.bollard_code} className="min-w-0">
              <span className="text-xs font-medium text-text-secondary">{bollard.bollard_code}</span>
              <div className="mt-1 min-w-0">
                {bollard.departures.map((dep) => (
                  <div
                    key={`${dep.line}-${dep.direction}-${dep.time}`}
                    className="grid w-full min-w-0 grid-cols-[2rem_1fr_auto] items-center gap-2 border-b border-line py-1 text-sm last:border-0"
                  >
                    <span className="truncate font-medium">{dep.line}</span>
                    <span className="truncate text-text-secondary" title={dep.direction}>
                      {dep.direction}
                    </span>
                    <span
                      className={`text-right whitespace-nowrap tabular-nums ${dep.is_realtime ? "font-bold text-primary" : ""}`}
                    >
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
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonStopCard key={i} departures={5} />
        ))}
      </div>
    );
  } else if (locationError) {
    nearbyContent = (
      <div className="w-full py-10 text-center">
        <h3 className="mb-4 text-lg font-medium text-text">Błąd lokalizacji</h3>
        <p className="text-text-secondary">{locationError}</p>
      </div>
    );
  } else if (nearbyGroups.length === 0) {
    nearbyContent = <NoResultsState text="przystanków w pobliżu" />;
  } else {
    nearbyContent = nearbyGroups.map((group) => (
      <div key={`nearby_group_${group.key}`} className="card min-w-0 overflow-hidden rounded-xl p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between border-b pb-2">
          {renderStopTitle(group)}
          <div className="flex shrink-0 items-center gap-3">
            {group.distance && (
              <span className="text-xs whitespace-nowrap text-text-secondary">{group.distance} m</span>
            )}
            {/* Toast pokazuje addFavoriteStop – wcześniej pojawiał się podwójnie. */}
            <FavButton
              onClick={() => {
                void addNearbyToFavorites(group);
              }}
              small
            />
          </div>
        </div>

        <div className="grid min-w-0 gap-3">
          {group.bollards?.map((bollard) => (
            <div key={`nearby_${bollard.bollard_code}`} className="min-w-0 rounded-lg bg-surface/60 p-2">
              <span className="text-xs font-medium text-text-secondary">{bollard.bollard_code}</span>
              <div className="mt-1 min-w-0">
                {bollard.departures.map((dep) => (
                  <div
                    key={`${dep.line}-${dep.direction}-${dep.time}`}
                    className="grid w-full min-w-0 grid-cols-[2rem_1fr_auto] items-center gap-2 border-b border-line py-1 text-sm last:border-0"
                  >
                    <span className="truncate font-medium">{dep.line}</span>
                    <span className="truncate text-text-secondary" title={dep.direction}>
                      {dep.direction}
                    </span>
                    <span
                      className={`text-right whitespace-nowrap tabular-nums ${dep.is_realtime ? "font-bold text-primary" : ""}`}
                    >
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
        title="Komunikacja miejska"
        description="Odjazdy na żywo z ulubionych przystanków i przystanków w pobliżu – autobusy i tramwaje w Poznaniu i Szczecinie."
        canonical="https://dzisiaj.fun/transport"
        keywords="transport, komunikacja miejska, przystanki, odjazdy, rozkład jazdy"
      />
      <div className="mb-4 flex items-center">
        <h1 className="page-title">Komunikacja miejska</h1>
      </div>

      <div className="space-y-6">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Wyszukaj przystanek..."
          suggestions={suggestions}
          onSuggestionClick={handleSuggestionClick}
        />

        <section className="min-w-0">
          <h2 className="mb-3 text-lg font-semibold">Ulubione</h2>
          <div className="min-w-0 space-y-4">{favoritesContent}</div>
        </section>

        <section className="min-w-0">
          <h2 className="mb-3 text-lg font-semibold">Najbliżej (GPS)</h2>
          <div className="min-w-0 space-y-4">{nearbyContent}</div>
        </section>
      </div>
    </>
  );
}
