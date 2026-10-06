// components/transport/StationBoard.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Trash2, RefreshCw, Plus, AlertCircle } from 'lucide-react';
import { useTrains } from '@/hooks/db/useTrains';
import { AddButton } from '../ui/CommonButtons';
import NoResultsState from '../ui/NoResultsState';
import LoadingState from '../ui/LoadingState';
import { useResponsive } from '@/hooks/useResponsive';
import { StationBoardItem, StationBoardResponse } from '@/types/pkpplk';
import { TrainInput } from '@/types/transport';

const renderStatusInfo = (status: string, statusClasses: string) => {
    return (
      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${statusClasses}`}>
        {status}
      </span>
    )
}

const renderStatusInfoSmall = (statusClasses: string) => {
  return (
    <span className={`inline-block h-2 w-2 rounded-full ${statusClasses}`}/>
  )
}

const getStatusBadgeClasses = (status: string, isCancelled: boolean, isDelayed: boolean) => {

    if (isCancelled) {
      return 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400';
    }
    if (isDelayed) {
      return 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400';
    }
    if (status === 'Odjechał') {
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    }
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400';
  
};

const getStatusBadgeClassesSmall = (status: string, isCancelled: boolean, isDelayed: boolean) => {

    if (isCancelled) {
      return 'bg-red-600 dark:bg-red-400';
    }
    if (isDelayed) {
      return 'bg-orange-600 dark:bg-orange-400';
    }
    if (status === 'Odjechał') {
      return 'bg-gray-600 dark:bg-gray-400';
    }
    return 'bg-green-500';
};

interface BoardState {
  items: StationBoardItem[];
  loading: boolean;
  error: string;
  updatedAt?: number;
}

const EMPTY_BOARD: BoardState = { items: [], loading: false, error: '' };

const formatClock = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

export default function StationBoardWidget() {
  const { addTrain } = useTrains();
  const isSmallScreen = useResponsive();
  
  const [selectedStations, setSelectedStations] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [boardsData, setBoardsData] = useState<Record<string, BoardState>>({});

  const fetchBoard = useCallback(async (stationName: string) => {
    setBoardsData(prev => ({
      ...prev,
      [stationName]: { ...(prev[stationName] ?? EMPTY_BOARD), loading: true, error: '' }
    }));

    const fail = (error: string) =>
      setBoardsData(prev => ({
        ...prev,
        [stationName]: { ...(prev[stationName] ?? EMPTY_BOARD), loading: false, error }
      }));

    try {
      const res = await fetch(`/api/transport/station-board?stationName=${encodeURIComponent(stationName)}`);
      if (res.status === 429) {
        fail('Zbyt wiele zapytań. Odśwież za minutę.');
        return;
      }
      if (!res.ok) {
        const errData: { error?: string } = await res.json().catch(() => ({}));
        fail(errData.error || 'Nie udało się pobrać tablicy odjazdów.');
        return;
      }
      const data: StationBoardResponse = await res.json();

      setBoardsData(prev => ({
        ...prev,
        [stationName]: { items: data.items || [], loading: false, error: '', updatedAt: Date.now() }
      }));
    } catch {
      fail('Brak połączenia z serwerem. Sprawdź internet i odśwież.');
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('tracked_station_boards');
    if (saved) {
      try {
        const parsedStations = JSON.parse(saved);
        setSelectedStations(parsedStations);
        
        parsedStations.forEach((station: string) => {
          void fetchBoard(station);
        });
      } catch {
        setSelectedStations([]);
      }
    }
  }, [fetchBoard]);

  useEffect(() => {
    localStorage.setItem('tracked_station_boards', JSON.stringify(selectedStations));
  }, [selectedStations]);

  const handleAddStation = () => {
    const trimmed = searchInput.trim();
    if (!trimmed) return;

    setSelectedStations(prev => [...prev, trimmed]);
    setSearchInput('');
  };

  const handleRemoveStation = (stationName: string) => {
    setSelectedStations(prev => prev.filter(s => s !== stationName));
    setBoardsData(prev => {
      const copy = { ...prev };
      delete copy[stationName];
      return copy;
    });
  };

  const handleTrackTrain = async (item: StationBoardItem) => {
    const trainData: TrainInput = {
      trainNumber: item.trainNumber,
      trainName: item.trainName,
      date: item.date,
      departureTime: item.plannedTime,
      from: item.currentStation,
      to: item.to,
      wagon: '',
      seat: ''
    };

    await addTrain(trainData); 
  };

  const renderBoardState = (board: BoardState): React.ReactNode => {
    const errorBanner = board.error ? (
      <div role="alert" className="m-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800/60 dark:bg-red-900/30 dark:text-red-200 flex items-center gap-2">
        <AlertCircle aria-hidden="true" className="w-4 h-4 shrink-0" />
        <span>
          {board.error}
          {board.items.length > 0 && board.updatedAt && ` Pokazuję dane z ${formatClock(board.updatedAt)}.`}
        </span>
      </div>
    ) : null;

    if (board.items.length === 0 && board.error) {
      return errorBanner;
    }

    if (board.items.length === 0 && board.loading) {
      return (
        <div className='flex items-center justify-center w-full py-6'>
          <LoadingState label="Ładowanie odjazdów" />
        </div>
      );
    }

    if (board.items.length > 0 && board.error) {
      return (
        <>
          {errorBanner}
          {renderBoardState({ ...board, error: '' })}
        </>
      );
    }

    if (board.items.length === 0) {
      return <NoResultsState text="odjazdów" />;
    }

    return (
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800 text-text-muted font-semibold">
            <th scope="col" className="py-2 px-2">Godz.</th>
            <th scope="col" className="py-2 px-2">Pociąg</th>
            <th scope="col" className="py-2 px-2">Kierunek</th>
            <th scope="col" className="py-2 px-2 text-center">{!isSmallScreen && "Peron"}</th>
            <th scope="col" className="py-2 px-2">{!isSmallScreen && "Status"}</th>
            <th scope="col" className="py-2 px-2 text-right"></th>
          </tr>
        </thead>
        <tbody>
          {board.items?.map((item) => {
            const isDelayed = item.delay > 0;
            const isCancelled = item.status === 'Odwołany';
            const statusClasses = 
                isSmallScreen ? 
                  getStatusBadgeClassesSmall(item.status, isCancelled, isDelayed) :
                  getStatusBadgeClasses(item.status, isCancelled, isDelayed);

            return (
              <tr 
                key={`${item.trainNumber}-${item.plannedTime}`}
                className="h-10 border-b border-gray-50 dark:border-gray-800/50 hover:bg-surface transition-colors font-medium"
              >
                <td className={`px-1 py-1 leading-tight whitespace-nowrap w-min ${isSmallScreen && "flex flex-col"}`}>
                  <span className="text-text font-bold text-[14px] sm:text-sm">{item.plannedTime}</span>
                  {isDelayed && (
                    <span className="ml-1 text-red-700 dark:text-red-300 text-[11px] font-semibold text-right">
                      +{item.delay}
                    </span>
                  )}
                </td>
                <td className='px-1 leading-tight'>
                  <div className="text-text leading-tight text-[12px] sm:text-sm">{item.trainOperator} {item.trainNumber}</div>
                  {item.trainName && <div className="text-[10px] sm:text-[11px] text-text-muted truncate max-w-15 md:max-w-30">{item.trainName}</div>}
                </td>
                <td className="px-1 leading-tight text-text font-semibold truncate max-w-22.5 md:max-w-40" title={item.to}>
                  {item.to}
                </td>
                <td className="py-1 px-1.5 my-auto leading-tight text-center font-bold text-text">
                    {item.platform}
                </td>
                <td className="py-1 px-1.5 my-auto">{isSmallScreen ? renderStatusInfoSmall(statusClasses) : renderStatusInfo(item.status, statusClasses) }</td>
                <td className="py-1 px-1.5 my-auto">
                  <button
                    onClick={() => handleTrackTrain(item)}
                    type='button'
                    className="inline-flex items-center gap-1 bg-primary/10 hover:bg-secondary-hover text-primary hover:text-white rounded-md font-bold text-[11px] transition-all shadow-sm"
                    title="Dodaj ten pociąg do Moich Pociągów"
                    disabled={isCancelled}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  return (
    <div className="space-y-6 mt-6">
      
        <h3 className="text-lg font-semibold mb-3">Twoje stacje</h3>
        
        <form onSubmit={handleAddStation} className="flex gap-2">
          <div className="relative flex-1">
            <Search aria-hidden="true" className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
            <input
              type="text"
              placeholder="Poznań Główny"
              aria-label="Nazwa stacji"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="input-field pl-9 py-2 w-full text-sm"
              disabled={selectedStations.length >= 3}
            />
          </div>
          <AddButton onClick={() => handleAddStation()} 
            disabled={selectedStations.length >= 3 || !searchInput.trim()} small/>
        </form>

      <div className="grid grid-cols-1 xl:grid-cols-1 gap-6">
        {selectedStations.map(station => {
          const board = boardsData[station] ?? { ...EMPTY_BOARD, loading: true };
          return (
            <div key={station} className="card max-w-none rounded-2xl bg-card shadow-sm overflow-hidden flex flex-col">
              <div className="bg-surface px-4 py-3 border-b border-line flex justify-between items-center gap-3">
                <div className="flex flex-col min-w-0">
                  <h2 className="font-semibold text-text text-base first-letter:uppercase truncate">
                    {station}
                  </h2>
                  <span className="text-xs text-text-muted tabular-nums" aria-live="polite">
                    {board.loading && board.items.length > 0 && 'Aktualizuję…'}
                    {!board.loading && board.updatedAt && `Stan na ${formatClock(board.updatedAt)}`}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchBoard(station)}
                    type='button'
                    className="w-min h-min my-auto p-1.5 sm:p-2 bg-surface hover:bg-surface-hover text-text-secondary font-medium rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 dark:border-gray-800"
                    title="Odśwież teraz"
                    aria-label={`Odśwież odjazdy: ${station}`}
                    disabled={board.loading}
                  >
                    <RefreshCw aria-hidden="true" className={`w-4 h-4 ${board.loading ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={() => handleRemoveStation(station)}
                    type='button'
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-text-muted hover:text-red-700 dark:hover:text-red-300 transition-colors"
                    title="Usuń stację"
                    aria-label={`Usuń stację ${station}`}
                  >
                    <Trash2 aria-hidden="true" className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-2 overflow-x-auto flex-1">
                {renderBoardState(board)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
