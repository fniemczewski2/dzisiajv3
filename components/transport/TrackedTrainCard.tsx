// components/transport/TrackedTrainCard.tsx

import React from 'react';
import { MapPin, Loader2, AlertTriangle, Clock, TrainFront, History } from 'lucide-react';
import { useTrainStatus } from '@/hooks/db/useTrains';
import { DeleteButton } from '../ui/CommonButtons';

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
  };
  onDelete: (id: string) => void;
  /** Odbyta podróż: bez zapytań o status do PKP PLK, z datą przejazdu. */
  historical?: boolean;
}

const pastDateFmt = new Intl.DateTimeFormat('pl-PL', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });

export const TrackedTrainCard = ({ train, onDelete, historical = false }: TrackedTrainProps) => {
  // Dla odbytych podróży status jest zbędny – nie odpytujemy API (limit zapytań).
  const { delay, platform, status, loading, hide } = useTrainStatus(train, { enabled: !historical });
  if (hide && !historical) return null;
  const isRateLimited = status === 'Zbyt wiele zapytań';
  let platformLabel = 'Brak peronu';
  if (historical) platformLabel = `Odjazd ${train.date.split('-').reverse().join('.')}`;
  else if (platform && platform !== '-') platformLabel = `Peron ${platform}`;
  const isCancelled = status?.toLowerCase().includes('odwołany');
  const isDepartedFromStart = status?.toLowerCase().includes('w trasie');
  const isDelayed = delay > 0;

  const renderStatusBanner = () => {
    if (historical) {
      return (
        <div className="absolute top-0 left-0 w-full bg-surface text-text-secondary text-xs font-bold text-center py-1.5 flex items-center justify-center gap-1.5">
          <History className="w-3 h-3" aria-hidden="true" />
          Odbyta · {pastDateFmt.format(new Date(`${train.date}T12:00:00`))}
        </div>
      );
    }

    if (loading) {
      return (
        <div className="absolute top-0 left-0 w-full bg-surface text-text-muted text-xs font-bold text-center py-1.5 shadow-sm flex items-center justify-center gap-2">
          <Loader2 className="w-3 h-3 animate-spin" /> Aktualizacja...
        </div>
      )
    }

    if (isRateLimited) {
      return (
        <div className="absolute top-0 left-0 w-full bg-yellow-700 text-white text-xs font-bold text-center py-1.5 shadow-sm">
          Limit zapytań osiągnięty.
        </div>
      );
    }

    if (isCancelled) {
      return (
        <div className="absolute top-0 left-0 w-full bg-red-600 text-white text-xs font-bold text-center py-1.5 flex justify-center items-center gap-1 shadow-sm animate-pulse">
          <AlertTriangle className="w-3 h-3" /> Pociąg odwołany
        </div>
      );
    }

    if (isDelayed) {
      return (
        <div className="absolute top-0 left-0 w-full bg-orange-700 text-white text-xs font-bold text-center py-1.5 shadow-sm flex justify-center items-center gap-1">
          <Clock className="w-3 h-3" /> Opóźnienie: {delay} min
        </div>
      );
    }

    if (isDepartedFromStart) {
      return (
        <div className="absolute top-0 left-0 w-full bg-indigo-600 text-white text-xs font-bold text-center py-1.5 shadow-sm flex justify-center items-center gap-1">
          <TrainFront className="w-3 h-3" /> W trasie
        </div>
      );
    }

    return (
      <div className="absolute top-0 left-0 w-full bg-emerald-600 text-white text-xs font-bold text-center py-1.5 shadow-sm opacity-90">
        {status}
      </div>
    );
  };

  return (
    <div className="p-4 pt-10 w-full card rounded-xl relative overflow-hidden transition-all">

      {renderStatusBanner()}
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col gap-2">
          <p className="text-2xl font-bold text-text leading-none">
            {train.departureTime}
          </p>
          <div className="inline-flex items-center gap-1 text-xs font-medium bg-surface px-2 py-1 rounded-lg mt-1 border border-gray-100 dark:border-gray-800">
            <MapPin className="w-3 h-3 text-text-muted" /> 
            {platformLabel}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-right">
            <h4 className="font-bold text-text text-lg leading-tight">
              {train.trainNumber}
            </h4>
            {train.trainName && (
            <p className="text-xs text-text-muted font-medium">
              {train.trainName}
            </p>
            )}
          </div>
        </div>
        
        <div className="w-min ml-2">
          <DeleteButton onClick={() => onDelete(train.id)} ariaLabel={`Usuń pociąg ${train.trainNumber}`} />
        </div>
      </div>
      
      <div className="flex items-center justify-between text-sm text-text mb-4 px-1">
        <span className="font-medium truncate max-w-[40%]" title={train.from}>{train.from}</span>
        <div className="flex-1 border-t-2 border-dashed border-gray-200 dark:border-gray-700 mx-3 relative">
          <div className="absolute -top-1.25 right-0 w-2 h-2 rounded-full bg-primary"></div>
        </div>
        <span className="font-medium truncate max-w-[40%] text-right" title={train.to}>{train.to}</span>
      </div>

      {(train.wagon && train.seat) && (
        <div className="flex gap-2 border-t border-gray-100 dark:border-gray-800 pt-3 mt-2">
          <div className="flex-1 bg-surface rounded-lg p-2 text-center border border-gray-100 dark:border-gray-800">
            <p className="text-xs text-text-muted font-semibold">Wagon</p>
            <p className="font-bold text-lg text-text">{train.wagon}</p>
          </div>
          <div className="flex-1 bg-surface rounded-lg p-2 text-center border border-gray-100 dark:border-gray-800">
            <p className="text-xs text-text-muted font-semibold">Miejsce</p>
            <p className="font-bold text-lg text-text">{train.seat}</p>
          </div>
        </div>
      )}
    </div>
  );
};
