"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Trash2, RefreshCw, Plus, AlertCircle } from 'lucide-react';
import { useTrains } from '@/hooks/db/useTrains';
import { AddButton } from '../ui/CommonButtons';
import NoResultsState from '../ui/NoResultsState';
import LoadingState from '../ui/LoadingState';
import { useResponsive } from '@/hooks/useResponsive';

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

export default function StationBoardWidget() {
  const { addTrain } = useTrains();
  const isSmallScreen = useResponsive();
  
  const [selectedStations, setSelectedStations] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [boardsData, setBoardsData] = useState<Record<string, { items: any[]; loading: boolean; error: string }>>({});

    const fetchBoard = useCallback(async (stationName: string) => {
    setBoardsData(prev => ({
      ...prev,
      [stationName]: { ...(prev[stationName] || { items: [] }), loading: true, error: '' }
    }));

    try {
      const res = await fetch(`/api/transport/station-board?stationName=${encodeURIComponent(stationName)}`);
      if (res.status === 429) {
        setBoardsData(prev => ({
        ...prev,
        [stationName]: { items: [], loading: false, error: 'Spróbuj ponownie później' }
      }));
      }
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

  useEffect(() => {
    const saved = localStorage.getItem('tracked_station_boards');
    if (saved) {
      try {
        const parsedStations = JSON.parse(saved);
        setSelectedStations(parsedStations);
        
        parsedStations.forEach((station: string) => {
          fetchBoard(station);
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

    await addTrain(trainData); 
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
            <th className="py-2 px-2">Godz.</th>
            <th className="py-2 px-2">Pociąg</th>
            <th className="py-2 px-2">Kierunek</th>
            <th className="py-2 px-2 text-center">{!isSmallScreen && "Peron"}</th>
            <th className="py-2 px-2">{!isSmallScreen && "Status"}</th>
            <th className="py-2 px-2 text-right"></th>
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
                className="h-[40px] border-b border-gray-50 dark:border-gray-800/50 hover:bg-surface transition-colors font-medium"
              >
                <td className={`px-1 py-1 leading-tight whitespace-nowrap w-min ${isSmallScreen && "flex flex-col"}`}>
                  <span className="text-text font-bold text-[14px] sm:text-sm">{item.plannedTime}</span>
                  {isDelayed && (
                    <span className="ml-1 text-red-600 text-[10px] text-semibold text-right">
                      +{item.delay}
                    </span>
                  )}
                </td>
                <td className='px-1 leading-tight'>
                  <div className="text-text leading-tight text-[12px] sm:text-sm">{item.trainOperator} {item.trainNumber}</div>
                  {item.trainName && <div className="text-[8px] sm:text-[11px] text-textMuted truncate max-w-[60px] md:max-w-[120px]">{item.trainName}</div>}
                </td>
                <td className="px-1 leading-tight text-text font-semibold truncate max-w-[90px] md:max-w-[160px]" title={item.to}>
                  {item.to}
                </td>
                <td className="py-1 px-1.5 my-auto leading-tight text-center font-bold text-text">
                    {item.platform}
                </td>
                <td className="py-1 px-1.5 my-auto">{isSmallScreen ? renderStatusInfoSmall(statusClasses) : renderStatusInfo(item.status, statusClasses) }</td>
                <td className="py-1 px-1.5 my-auto">
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
      
        <h3 className="text-lg font-semibold mb-3">Twoje stacje</h3>
        
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