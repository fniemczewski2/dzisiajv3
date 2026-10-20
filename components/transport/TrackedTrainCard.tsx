// components/transport/TrackedTrainCard.tsx

import { trainStatusWindow } from "@/lib/trainPlan";
import React from "react";
import { MapPin, Loader2, AlertTriangle, Clock, TrainFront, History } from "lucide-react";
import { useTrainStatus } from "@/hooks/db/useTrains";
import { DeleteButton } from "../ui/CommonButtons";

interface TrackedTrainProps {
  train: {
    id: string;
    trainNumber: string;
    trainName: string;
    from: string;
    to: string;
    departureTime: string;
    date: string;
    wagon: string;
    seat: string;
    plannedArrival?: string | null;
  };
  onDelete: (id: string) => void;
  /** Odbyta podróż: bez zapytań o status do PKP PLK, z datą przejazdu. */
  historical?: boolean;
  /** Nadchodząca podróż (przed oknem odpytywania): bez zapytań do PKP PLK. */
  upcoming?: boolean;
}

const upcomingFmt = new Intl.DateTimeFormat("pl-PL", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const pastDateFmt = new Intl.DateTimeFormat("pl-PL", {
  weekday: "short",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export const TrackedTrainCard = ({ train, onDelete, historical = false, upcoming = false }: TrackedTrainProps) => {
  // Odbyte i nadchodzące: bez zapytań do PKP PLK (useTrainStatus pilnuje też okna czasowego).
  const { delay, platform, status, loading, hide } = useTrainStatus(train, { enabled: !historical && !upcoming });
  // Pociąg już dojechał (PKP PLK nie podaje dalszych zdarzeń): zostaje na liście z tym statusem
  // do końca okna (3 h po przyjeździe), potem trafia do „odbytych”.
  const arrived = hide && !historical && !upcoming;
  const isRateLimited = status === "Zbyt wiele zapytań";
  let platformLabel = "Brak peronu";
  if (historical) platformLabel = `Odjazd ${train.date.split("-").reverse().join(".")}`;
  else if (platform && platform !== "-") platformLabel = `Peron ${platform}`;
  const isCancelled = status?.toLowerCase().includes("odwołany");
  const isDepartedFromStart = status?.toLowerCase().includes("w trasie");
  const isDelayed = delay > 0;

  const renderStatusBanner = () => {
    if (upcoming) {
      const window = trainStatusWindow(train);
      return (
        <div className="absolute top-0 left-0 flex w-full items-center justify-center gap-1.5 bg-surface py-1.5 text-center text-xs font-bold text-text-secondary">
          <Clock className="h-3 w-3" aria-hidden="true" />
          Nadchodzący · status od {window ? upcomingFmt.format(new Date(window.start)) : "3 h przed odjazdem"}
        </div>
      );
    }

    if (historical) {
      return (
        <div className="absolute top-0 left-0 flex w-full items-center justify-center gap-1.5 bg-surface py-1.5 text-center text-xs font-bold text-text-secondary">
          <History className="h-3 w-3" aria-hidden="true" />
          Odbyta · {pastDateFmt.format(new Date(`${train.date}T12:00:00`))}
        </div>
      );
    }

    if (loading) {
      return (
        <div className="absolute top-0 left-0 flex w-full items-center justify-center gap-2 bg-surface py-1.5 text-center text-xs font-bold text-text-muted shadow-sm">
          <Loader2 className="h-3 w-3 animate-spin" /> Aktualizacja...
        </div>
      );
    }

    if (arrived) {
      return (
        <div className="absolute top-0 left-0 flex w-full items-center justify-center gap-1.5 bg-surface py-1.5 text-center text-xs font-bold text-text-secondary">
          <MapPin className="h-3 w-3" aria-hidden="true" /> Dojechał
        </div>
      );
    }

    if (isRateLimited) {
      return (
        <div className="absolute top-0 left-0 w-full bg-warning-solid py-1.5 text-center text-xs font-bold text-white shadow-sm">
          Limit zapytań osiągnięty.
        </div>
      );
    }

    if (isCancelled) {
      return (
        <div className="absolute top-0 left-0 flex w-full animate-pulse items-center justify-center gap-1 bg-danger-solid py-1.5 text-center text-xs font-bold text-white shadow-sm">
          <AlertTriangle className="h-3 w-3" /> Pociąg odwołany
        </div>
      );
    }

    if (isDelayed) {
      return (
        <div className="absolute top-0 left-0 flex w-full items-center justify-center gap-1 bg-warning-solid py-1.5 text-center text-xs font-bold text-white shadow-sm">
          <Clock className="h-3 w-3" /> Opóźnienie: {delay} min
        </div>
      );
    }

    if (isDepartedFromStart) {
      return (
        <div className="absolute top-0 left-0 flex w-full items-center justify-center gap-1 bg-deco-violet-solid py-1.5 text-center text-xs font-bold text-white shadow-sm">
          <TrainFront className="h-3 w-3" /> W trasie
        </div>
      );
    }

    return (
      <div className="absolute top-0 left-0 w-full bg-success-solid py-1.5 text-center text-xs font-bold text-white opacity-90 shadow-sm">
        {status}
      </div>
    );
  };

  return (
    <div className="card relative w-full overflow-hidden p-4 pt-10 transition-all">
      {renderStatusBanner()}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-2xl leading-none font-bold text-text">{train.departureTime}</p>
          <div className="mt-1 inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2 py-1 text-xs font-medium">
            <MapPin className="h-3 w-3 text-text-muted" />
            {platformLabel}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <h4 className="text-lg leading-tight font-bold text-text">{train.trainNumber}</h4>
            {train.trainName && <p className="text-xs font-medium text-text-muted">{train.trainName}</p>}
          </div>
        </div>

        <div className="ml-2 w-min">
          <DeleteButton onClick={() => onDelete(train.id)} ariaLabel={`Usuń pociąg ${train.trainNumber}`} />
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between px-1 text-sm text-text">
        <span className="max-w-[40%] truncate font-medium" title={train.from}>
          {train.from}
        </span>
        <div className="relative mx-3 flex-1 border-t-2 border-dashed border-line">
          <div className="absolute -top-1.25 right-0 h-2 w-2 rounded-full bg-primary"></div>
        </div>
        <span className="max-w-[40%] truncate text-right font-medium" title={train.to}>
          {train.to}
        </span>
      </div>

      {train.wagon && train.seat && (
        <div className="mt-2 flex gap-2 border-t border-line pt-3">
          <div className="flex-1 rounded-lg border border-line bg-surface p-2 text-center">
            <p className="text-xs font-semibold text-text-muted">Wagon</p>
            <p className="text-lg font-bold text-text">{train.wagon}</p>
          </div>
          <div className="flex-1 rounded-lg border border-line bg-surface p-2 text-center">
            <p className="text-xs font-semibold text-text-muted">Miejsce</p>
            <p className="text-lg font-bold text-text">{train.seat}</p>
          </div>
        </div>
      )}
    </div>
  );
};
