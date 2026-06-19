"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Trash2, RefreshCw, Plus, Train, AlertCircle } from 'lucide-react';
import { useTrains } from '@/hooks/useTrains';
import { useToast } from '@/providers/ToastProvider';
import { AddButton } from '../CommonButtons';
import NoResultsState from '../NoResultsState';
import LoadingState from '../LoadingState';

interface StationBoardProps {
  readonly onTrainAdded?: () => void;
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

export default function StationBoardWidget({ onTrainAdded }: StationBoardProps) {
  const { addTrain } = useTrains();
  const { toast } = useToast();
  
  const [selectedStations, setSelectedStations] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [boardsData, setBoardsData] = useState<Record<string, { items: any[]; loading: boolean; error: string }>>({});

  useEffect(() => {
    const saved = localStorage.getItem('tracked_station_boards');
    if (saved) {
      try {
        setSelectedStations(JSON.parse(saved));
      } catch {
        setSelectedStations([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('tracked_station_boards', JSON.stringify(selectedStations));
  }, [selectedStations]);

  const fetchBoard = useCallback(async (stationName: string) => {
    setBoardsData(prev => ({
      ...prev,
      [stationName]: { ...(prev[stationName] || { items: [] }), loading: true, error: '' }
    }));

    try {
      const res = await fetch(`/api/transport/station-board?stationName=${encodeURIComponent(stationName)}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Błąd pobierania tablicy');
      }
      const data = await res.json();
      
      setBoardsData(prev => ({
        ...prev,
        [stationName]: { items: data.items || [], loading: false, error: '' }
      }));
    } catch {
      setBoardsData(prev => ({
        ...prev,
        [stationName]: { items: [], loading: false, error: 'Błąd połączenia' }
      }));
    }
  }, []);

  const refreshAllBoards = useCallback(() => {
    selectedStations.forEach(station => {
      fetchBoard(station);
    });
  }, [selectedStations, fetchBoard]);

  useEffect(() => {
    refreshAllBoards();
    const interval = setInterval(refreshAllBoards, 60000);
    return () => clearInterval(interval);
  }, [selectedStations, refreshAllBoards]);

  const handleAddStation = () => {
    const trimmed = searchInput.trim();
    if (!trimmed) return;

    if (selectedStations.length >= 3) {
      toast.error('Możesz przypiąć maksymalnie 3 tablice stacji jednocześnie.');
      return;
    }

    if (selectedStations.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Ta stacja jest już dodana.');
      return;
    }

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

  const handleTrackTrain = async (item: any) => {
    const trainData = {
      trainNumber: item.trainNumber,
      trainName: item.trainName,
      date: item.date,
      departureTime: item.plannedTime,
      from: item.currentStation,
      to: item.to,
      wagon: '',
      seat: ''
    };

    const success = await addTrain(trainData); 
    if (success) {
      toast.success(`Dodano pociąg ${item.trainNumber}!`);
      if (onTrainAdded) onTrainAdded(); 
    }
  };

  const renderBoardState = (board: { items: any[]; loading: boolean; error: string }) => {
    if (board.error) {
      return (
        <div className="p-6 text-center text-sm text-red-500 flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4" /> {board.error}
        </div>
      );
    }

    if (board.loading) {
      return (
        <div className='flex items-center justify-center w-full'>
          <LoadingState/>
        </div>
      );
    }

    if (board.items.length === 0) {
      return <NoResultsState text="odjazdów" />;
    }

    return (
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800 text-textMuted font-semibold">
            <th className="py-2 px-3">Godzina</th>
            <th className="py-2 px-2">Pociąg</th>
            <th className="py-2 px-2">Kierunek</th>
            <th className="py-2 px-2 text-center">Peron</th>
            <th className="py-2 px-2">Status</th>
            <th className="py-2 px-3 text-right"></th>
          </tr>
        </thead>
        <tbody>
          {board.items?.map((item, index) => {
            const isDelayed = item.delay > 0;
            const isCancelled = item.status === 'Odwołany';
            const statusClasses = getStatusBadgeClasses(item.status, isCancelled, isDelayed);

            return (
              <tr 
                key={`${item.trainNumber}-${index}`}
                className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-surface/40 transition-colors font-medium"
              >
                <td className="py-1 px-2 whitespace-nowrap">
                  <span className="text-text font-bold text-sm">{item.plannedTime}</span>
                  {isDelayed && (
                    <span className="ml-1.5 text-red-500 font-bold text-[12px]">
                      +{item.delay}
                    </span>
                  )}
                </td>
                <td className="py-1 px-1.5">
                  <div className="font-bold text-text leading-tight">{item.trainOperator} {item.trainNumber}</div>
                  {item.trainName && <div className="text-[10px] text-textMuted truncate max-w-[60px] md:max-w-[120px]">{item.trainName}</div>}
                </td>
                <td className="py-1 px-1.5 text-text font-semibold truncate max-w-[140px]" title={item.to}>
                  {item.to}
                </td>
                <td className="py-1 px-1.5 text-center font-bold text-text">
                    {item.platform}
                </td>
                <td className="py-1 px-1.5">
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${statusClasses}`}>
                    {item.status}
                  </span>
                </td>
                <td className="py-1 px-1.5 text-right">
                  <button
                    onClick={() => handleTrackTrain(item)}
                    className="inline-flex items-center gap-1 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-md font-bold text-[11px] transition-all shadow-sm"
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
      <div className="card rounded-xl border border-gray-100 dark:border-gray-800 p-4 bg-card shadow-sm">
        <h3 className="font-bold text-text text-base mb-2 flex items-center gap-2">
          <Train className="w-5 h-5 text-primary" /> Tablice stacji ({selectedStations.length}/3)
        </h3>
        
        <form onSubmit={handleAddStation} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-textMuted" />
            <input
              type="text"
              placeholder="Poznań Główny"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="input-field pl-9 py-2 w-full text-sm"
              disabled={selectedStations.length >= 3}
            />
          </div>
          <AddButton onClick={() => handleAddStation()} 
            disabled={selectedStations.length >= 3 || !searchInput.trim()} small/>
        </form>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-1 gap-6">
        {selectedStations.map(station => {
          const board = boardsData[station] || { items: [], loading: true, error: '' };
          return (
            <div key={station} className="card rounded-xl border border-gray-100 dark:border-gray-800 bg-card shadow-sm overflow-hidden flex flex-col">
              <div className="bg-surface px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-text text-base capitalize">
                    {station}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchBoard(station)}
                    className="w-min h-min my-auto p-1.5 sm:p-2 bg-surface hover:bg-surfaceHover text-textSecondary font-medium rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 dark:border-gray-800"
                    title="Odśwież teraz"
                  >
                    <RefreshCw className={`w-4 h-4 ${board.loading ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={() => handleRemoveStation(station)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-textMuted hover:text-red-500 transition-colors"
                    title="Usuń stację"
                  >
                    <Trash2 className="w-4 h-4" />
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