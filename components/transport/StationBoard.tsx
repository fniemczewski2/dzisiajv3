// components/transport/StationBoard.tsx

import { USER_LOCAL_STORAGE_KEYS } from "@/config/storage";
import { STATION_BOARD_CLIENT_TIMEOUT_MS, STATION_BOARD_STALE_MS } from "@/config/timing";
import { MAX_TRACKED_STATIONS } from "@/config/limits";
import React, { useState, useSyncExternalStore } from "react";
import { useQueries } from "@tanstack/react-query";
import { Trash2, RefreshCw, Plus, AlertCircle } from "lucide-react";
import { useTrains } from "@/hooks/db/useTrains";
import { AddButton } from "../ui/CommonButtons";
import NoResultsState from "../ui/NoResultsState";
import LoadingState from "../ui/LoadingState";
import { useResponsive } from "@/hooks/useResponsive";
import { StationBoardItem, StationBoardResponse } from "@/types/pkpplk";
import { TrainInput } from "@/types/transport";
import SearchBar from "../ui/SearchBar";

const renderStatusInfo = (status: string, statusClasses: string) => {
  return <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${statusClasses}`}>{status}</span>;
};

const renderStatusInfoSmall = (statusClasses: string) => {
  return <span className={`inline-block h-2 w-2 rounded-full ${statusClasses}`} />;
};

const getStatusBadgeClasses = (status: string, isCancelled: boolean, isDelayed: boolean) => {
  if (isCancelled) {
    return "bg-danger-soft text-danger ";
  }
  if (isDelayed) {
    return "bg-warning-soft text-warning ";
  }
  if (status === "Odjechał") {
    return "bg-surface text-text-secondary ";
  }
  return "bg-success-soft text-success ";
};

const getStatusBadgeClassesSmall = (status: string, isCancelled: boolean, isDelayed: boolean) => {
  if (isCancelled) {
    return "bg-danger-solid ";
  }
  if (isDelayed) {
    return "bg-warning-solid ";
  }
  if (status === "Odjechał") {
    return "bg-input ";
  }
  return "bg-success-solid";
};

interface BoardState {
  items: StationBoardItem[];
  loading: boolean;
  error: string;
  updatedAt?: number;
}

const EMPTY_BOARD: BoardState = { items: [], loading: false, error: "" };

const formatClock = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });

// --- Obserwowane stacje: localStorage jako zewnętrzny magazyn (useSyncExternalStore) ---
const stationListeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedStations: string[] = [];
const NO_STATIONS: string[] = [];

function readStations(): string[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(USER_LOCAL_STORAGE_KEYS.trackedStationBoards);
  } catch {
    return NO_STATIONS;
  }
  if (raw === cachedRaw) return cachedStations;
  cachedRaw = raw;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cachedStations = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    cachedStations = [];
  }
  return cachedStations;
}

const readNoStations = () => NO_STATIONS;

function subscribeStations(listener: () => void) {
  stationListeners.add(listener);
  return () => stationListeners.delete(listener);
}

function writeStations(next: string[]) {
  try {
    localStorage.setItem(USER_LOCAL_STORAGE_KEYS.trackedStationBoards, JSON.stringify(next));
  } catch {
    // Tryb prywatny – lista działa do odświeżenia strony.
    cachedRaw = JSON.stringify(next);
    cachedStations = next;
  }
  stationListeners.forEach((listener) => listener());
}

/** Tablica odjazdów jednej stacji; błąd ma komunikat gotowy do pokazania. */
async function fetchStationBoard(stationName: string, signal: AbortSignal): Promise<StationBoardItem[]> {
  // Limit czasu – zawieszone API PKP nie może trzymać „ładowania” w nieskończoność.
  const timeout = AbortSignal.timeout(STATION_BOARD_CLIENT_TIMEOUT_MS);
  const combined = typeof AbortSignal.any === "function" ? AbortSignal.any([signal, timeout]) : timeout;
  let res: Response;
  try {
    res = await fetch(`/api/transport/station-board?stationName=${encodeURIComponent(stationName)}`, {
      signal: combined,
    });
  } catch (err) {
    if (signal.aborted) throw err;
    throw new Error(
      err instanceof DOMException && err.name === "TimeoutError"
        ? "PKP PLK nie odpowiada. Spróbuj odświeżyć za chwilę."
        : "Brak połączenia z serwerem. Sprawdź internet i odśwież."
    );
  }
  if (res.status === 429) throw new Error("Zbyt wiele zapytań. Odśwież za minutę.");
  if (!res.ok) {
    const errData: { error?: string } = await res.json().catch(() => ({}));
    throw new Error(errData.error || "Nie udało się pobrać tablicy odjazdów.");
  }
  const data: StationBoardResponse = await res.json();
  return data.items || [];
}

interface StationBoardWidgetProps {
  onTrainAdded?: ReturnType<typeof useTrains>["addTrain"];
}

export default function StationBoardWidget({ onTrainAdded }: Readonly<StationBoardWidgetProps> = {}) {
  const { addTrain: addTrainDirectly } = useTrains();
  const addTrain = onTrainAdded ?? addTrainDirectly;
  const isSmallScreen = useResponsive();

  const selectedStations = useSyncExternalStore(subscribeStations, readStations, readNoStations);
  const [searchInput, setSearchInput] = useState("");

  // Tablice odjazdów – po jednym zapytaniu TanStack Query na stację (wspólna pamięć,
  // przycisk „Odśwież” = refetch tej jednej stacji).
  const boardQueries = useQueries({
    queries: selectedStations.map((station) => ({
      queryKey: ["station-board", station],
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchStationBoard(station, signal),
      staleTime: STATION_BOARD_STALE_MS,
    })),
  });
  const boardFor = (index: number): BoardState => {
    const q = boardQueries[index];
    if (!q) return { ...EMPTY_BOARD, loading: true };
    let error = "";
    if (q.error) error = q.error instanceof Error ? q.error.message : "Nie udało się pobrać tablicy odjazdów.";
    return { items: q.data ?? [], loading: q.isFetching, error, updatedAt: q.dataUpdatedAt || undefined };
  };

  const handleAddStation = () => {
    const trimmed = searchInput.trim();
    if (!trimmed || selectedStations.length >= MAX_TRACKED_STATIONS) return;
    setSearchInput("");
    if (selectedStations.some((s) => s.toLocaleLowerCase("pl") === trimmed.toLocaleLowerCase("pl"))) return;
    // Nowa stacja = nowe zapytanie w useQueries, pobierane od razu.
    writeStations([...selectedStations, trimmed]);
  };

  const handleRemoveStation = (stationName: string) => {
    writeStations(selectedStations.filter((s) => s !== stationName));
  };

  const handleTrackTrain = async (item: StationBoardItem) => {
    const trainData: TrainInput = {
      trainNumber: item.trainNumber,
      trainName: item.trainName,
      date: item.date,
      departureTime: item.plannedTime,
      from: item.currentStation,
      to: item.to,
      wagon: "",
      seat: "",
    };

    await addTrain(trainData);
  };

  const renderBoardState = (board: BoardState): React.ReactNode => {
    const errorBanner = board.error ? (
      <div
        role="alert"
        className="m-2 flex items-center gap-2 rounded-lg border border-danger-line bg-danger-soft px-3 py-2 text-sm text-danger"
      >
        <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
        <span>
          {board.error}
          {board.items.length > 0 && board.updatedAt && ` Pokazuję dane z ${formatClock(board.updatedAt)}.`}
        </span>
      </div>
    ) : null;

    if (board.items.length === 0 && board.error) {
      return <>{errorBanner}</>;
    }

    if (board.items.length === 0 && board.loading) {
      return (
        <div className="flex w-full items-center justify-center py-6">
          <LoadingState label="Ładowanie odjazdów" />
        </div>
      );
    }

    if (board.items.length > 0 && board.error) {
      return (
        <>
          {errorBanner}
          {renderBoardState({ ...board, error: "" })}
        </>
      );
    }

    if (board.items.length === 0) {
      return <NoResultsState text="odjazdów" />;
    }

    return (
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-line font-semibold text-text-muted">
            <th scope="col" className="px-2 py-2">
              Godz.
            </th>
            <th scope="col" className="px-2 py-2">
              Pociąg
            </th>
            <th scope="col" className="px-2 py-2">
              Kierunek
            </th>
            <th scope="col" className="px-2 py-2 text-center">
              {!isSmallScreen && "Peron"}
            </th>
            <th scope="col" className="px-2 py-2">
              {!isSmallScreen && "Status"}
            </th>
            <th scope="col" className="px-2 py-2 text-right">
              <span className="sr-only">Akcje</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {board.items?.map((item) => {
            const isDelayed = item.delay > 0;
            const isCancelled = item.status === "Odwołany";
            const statusClasses = isSmallScreen
              ? getStatusBadgeClassesSmall(item.status, isCancelled, isDelayed)
              : getStatusBadgeClasses(item.status, isCancelled, isDelayed);

            return (
              <tr
                key={`${item.trainNumber}-${item.plannedTime}`}
                className="h-10 border-b border-line font-medium transition-colors hover:bg-surface"
              >
                <td className={`w-min px-1 py-1 leading-tight whitespace-nowrap ${isSmallScreen && "flex flex-col"}`}>
                  <span className="text-[14px] font-bold text-text sm:text-sm">{item.plannedTime}</span>
                  {isDelayed && (
                    <span className="ml-1 text-right text-xs font-semibold text-danger">+{item.delay}</span>
                  )}
                </td>
                <td className="px-1 leading-tight">
                  <div className="text-[12px] leading-tight text-text sm:text-sm">
                    {item.trainOperator} {item.trainNumber}
                  </div>
                  {item.trainName && (
                    <div className="max-w-15 truncate text-xs text-text-muted md:max-w-30">{item.trainName}</div>
                  )}
                </td>
                <td
                  className="max-w-22.5 truncate px-1 leading-tight font-semibold text-text md:max-w-40"
                  title={item.to}
                >
                  {item.to}
                </td>
                <td className="my-auto px-1.5 py-1 text-center leading-tight font-bold text-text">{item.platform}</td>
                <td className="my-auto px-1.5 py-1">
                  {isSmallScreen ? renderStatusInfoSmall(statusClasses) : renderStatusInfo(item.status, statusClasses)}
                </td>
                <td className="my-auto px-1.5 py-1">
                  <button
                    onClick={() => handleTrackTrain(item)}
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg bg-primary/10 text-xs font-bold text-primary shadow-sm transition-all hover:bg-secondary-hover hover:text-white"
                    title="Dodaj ten pociąg do Moich Pociągów"
                    disabled={isCancelled}
                  >
                    <Plus className="h-4 w-4" />
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
    <div className="mt-6 space-y-6">
      <h2 className="section-title mb-3">Twoje stacje</h2>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAddStation();
        }}
        className="flex gap-2"
      >
        <SearchBar className="flex-1" placeholder="Poznań Główny" value={searchInput} onChange={setSearchInput} />
        <AddButton
          onClick={handleAddStation}
          disabled={selectedStations.length >= MAX_TRACKED_STATIONS || !searchInput.trim()}
          small
        />
      </form>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-1">
        {selectedStations.map((station, index) => {
          const board = boardFor(index);
          return (
            <div key={station} className="card flex max-w-none flex-col overflow-hidden bg-card shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3">
                <div className="flex min-w-0 flex-col">
                  <h3 className="truncate text-base font-semibold text-text first-letter:uppercase">{station}</h3>
                  <span className="text-xs text-text-muted tabular-nums" aria-live="polite">
                    {board.loading && board.items.length > 0 && "Aktualizuję…"}
                    {!board.loading && board.updatedAt && `Stan na ${formatClock(board.updatedAt)}`}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => void boardQueries[index]?.refetch()}
                    type="button"
                    className="my-auto flex h-min w-min items-center justify-center gap-2 rounded-lg border border-line bg-surface p-1.5 font-medium text-text-secondary transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50 sm:p-2"
                    title="Odśwież teraz"
                    aria-label={`Odśwież odjazdy: ${station}`}
                    disabled={board.loading}
                  >
                    <RefreshCw aria-hidden="true" className={`h-4 w-4 ${board.loading ? "animate-spin" : ""}`} />
                  </button>
                  <button
                    onClick={() => handleRemoveStation(station)}
                    type="button"
                    className="rounded-lg p-2 text-text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                    title="Usuń stację"
                    aria-label={`Usuń stację ${station}`}
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-x-auto p-2">{renderBoardState(board)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
