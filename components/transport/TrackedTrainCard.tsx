// components/TrackedTrainCard.tsx
import React from 'react';
import { Train, MapPin, Loader2 } from 'lucide-react';
import { useTrains } from '../../hooks/useTrains';

interface TrackedTrainProps {
  train: {
    trainNumber: string;
    from: string;
    to: string;
    departureTime: string;
    wagon: string;
    seat: string;
  };
}

export const TrackedTrainCard = ({ train }: TrackedTrainProps) => {
  const { getTrainStatus } = useTrains();
  const { delay, platform, loading } = getTrainStatus(train.trainNumber);
  const isDelayed = delay > 0;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-white dark:from-gray-800 dark:to-gray-900 border border-blue-100 dark:border-gray-700 rounded-2xl p-5 shadow-sm relative overflow-hidden">
      
      {/* Sekcja opóźnienia */}
      {loading ? (
        <div className="absolute top-2 right-2 text-blue-500 animate-spin">
          <Loader2 className="w-4 h-4" />
        </div>
      ) : isDelayed && (
        <div className="absolute top-0 left-0 w-full bg-red-500 text-white text-xs font-bold text-center py-1">
          Opóźnienie: {delay} min
        </div>
      )}

      <div className={`flex justify-between items-start mb-4 ${isDelayed ? 'mt-3' : ''}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
            <Train className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white text-lg leading-tight">
              {train.trainNumber}
            </h4>
            <p className="text-xs text-gray-500 font-medium">PKP Intercity</p>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">
            {train.departureTime}
          </p>
          <div className="inline-flex items-center gap-1 text-xs font-medium bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md mt-1">
            <MapPin className="w-3 h-3 text-gray-500" /> 
            {loading ? 'Ładowanie...' : `Peron ${platform}`}
          </div>
        </div>
      </div>

      {/* Reszta komponentu bez zmian */}
      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300 mb-4 px-2">
        <span className="font-medium truncate max-w-[40%]">{train.from}</span>
        <div className="flex-1 border-t-2 border-dashed border-gray-200 dark:border-gray-700 mx-3 relative">
          <div className="absolute -top-1.5 right-0 w-2 h-2 rounded-full bg-blue-400"></div>
        </div>
        <span className="font-medium truncate max-w-[40%] text-right">{train.to}</span>
      </div>

      <div className="flex gap-2 border-t border-gray-100 dark:border-gray-700 pt-4 mt-2">
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg p-2 text-center border border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-400">Wagon</p>
          <p className="font-bold text-lg dark:text-white">{train.wagon || '-'}</p>
        </div>
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg p-2 text-center border border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-400">Miejsce</p>
          <p className="font-bold text-lg dark:text-white">{train.seat || '-'}</p>
        </div>
      </div>
    </div>
  );
};