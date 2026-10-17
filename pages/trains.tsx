// pages/trains.tsx

import React, { useEffect, useState } from "react";
import Seo from "@/components/ui/SEO";
import NoResultsState from "@/components/ui/NoResultsState";
import { SkeletonTrainCard } from "@/components/ui/Skeleton";
import { AddButton } from "@/components/ui/CommonButtons";
import { useToast } from "@/providers/ToastProvider";
import { useTrains } from "@/hooks/db/useTrains";
import AddTrainForm from "@/components/transport/AddTrainWidget";
import { TrackedTrainCard } from "@/components/transport/TrackedTrainCard";
import StationBoardWidget from "@/components/transport/StationBoard";

/** Ile odbytych podróży pokazujemy naraz. */
const PAST_PAGE = 10;

export default function TrainsPage() {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const { trains, pastTrains, addTrain, deleteTrain, refresh, fetching } = useTrains();
  const [pastLimit, setPastLimit] = useState(PAST_PAGE);

  useEffect(() => {
    const fetchTrains = async () => {
      try {
        await refresh();
      } catch {
        toast.error("Błąd pobierania pociągów");
      }
    };
    void fetchTrains();
  }, [refresh, toast]);

  let trainsContent;
  if (fetching) {
    trainsContent = (
      <>
        <SkeletonTrainCard />
        <SkeletonTrainCard />
      </>
    );
  } else if (trains.length === 0) {
    trainsContent = <NoResultsState text="zaplanowanych podróży kolejowych" />;
  } else {
    trainsContent = trains.map((train) => (
      <TrackedTrainCard key={train.id} train={train} onDelete={deleteTrain} />
    ));
  }

  return (
    <>
      <Seo
        title="Pociągi"
        description="Śledź pociągi PKP z opóźnieniem na żywo, dodawaj je z biletu PDF i sprawdzaj tablice odjazdów wybranych stacji."
        canonical="https://dzisiaj.fun/trains"
        keywords="pociągi, PKP, opóźnienia, bilet, rozkład jazdy, tablica odjazdów"
      />
      <div className="flex items-center mb-4">
        <h1 className="page-title">Pociągi</h1>
      </div>

      <div className="space-y-6">
        <section className="min-w-0" aria-labelledby="your-trains-heading">
          <div className="flex items-center justify-between mb-3">
            <h2 id="your-trains-heading" className="text-lg font-semibold">Twoje pociągi</h2>
            {!expanded && <AddButton onClick={() => setExpanded(true)} />}
          </div>
          <AddTrainForm onTrainAdded={addTrain} expanded={expanded} setExpanded={setExpanded} />
          <div className="grid md:grid-cols-2 gap-6 items-start mt-4 min-w-0">
            <div className="space-y-4 min-w-0">{trainsContent}</div>
          </div>
        </section>

        {!fetching && pastTrains.length > 0 && (
          <section className="min-w-0" aria-labelledby="past-trains-heading">
            <details>
              <summary className="flex min-h-11 cursor-pointer items-center text-lg font-semibold">
                <h2 id="past-trains-heading" className="inline">Odbyte podróże ({pastTrains.length})</h2>
              </summary>
              <p className="mb-3 text-sm text-text-secondary">
                Ostatnie 12 miesięcy, od najnowszych. Dla odbytych podróży nie pobieramy statusu z PKP PLK.
              </p>
              <div className="grid md:grid-cols-2 gap-4 items-start min-w-0">
                {pastTrains.slice(0, pastLimit).map((train) => (
                  <TrackedTrainCard key={train.id} train={train} onDelete={deleteTrain} historical />
                ))}
              </div>
              {pastTrains.length > pastLimit && (
                <button
                  type="button"
                  onClick={() => setPastLimit((n) => n + PAST_PAGE)}
                  className="mt-4 min-h-11 w-full rounded-lg border border-line-strong text-sm font-medium text-text hover:bg-surface"
                >
                  Pokaż więcej ({pastTrains.length - pastLimit})
                </button>
              )}
            </details>
          </section>
        )}

        <StationBoardWidget onTrainAdded={addTrain} />
      </div>
    </>
  );
}
