// components/calendar/GoogleCalendarSync.tsx
"use client";

import React, { useEffect, useState } from "react";
import {
  RefreshCw,
  Download,
  Upload,
  Link2,
  Link2Off,
  Calendar,
  ChevronDown,
  ChevronUp,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useGoogleCalendar, GoogleCalendarInfo } from "../../hooks/useGoogleCalendar";
import { useToast } from "../../providers/ToastProvider";

interface Props {
  onSyncComplete?: () => void;
}

export default function GoogleCalendarSync({ onSyncComplete }: Props) {
  const {
    connected,
    calendars,
    loading,
    error,
    checkConnection,
    connect,
    disconnect,
    importFromGoogle,
    exportToGoogle,
  } = useGoogleCalendar();

  const { toast } = useToast();

  const [expanded, setExpanded] = useState(false);
  const [selectedCalendar, setSelectedCalendar] = useState<string>("");
  const [importRange, setImportRange] = useState<"30" | "90" | "180" | "365">("90");
  const [lastResult, setLastResult] = useState<{ type: "import" | "export"; imported?: number; exported?: number; skipped?: number } | null>(null);

  useEffect(() => {
    if (expanded && connected === null) {
      checkConnection();
    }
  }, [expanded]);

  useEffect(() => {
    if (calendars.length > 0 && !selectedCalendar) {
      const primary = calendars.find((c) => c.primary);
      setSelectedCalendar(primary?.id || calendars[0]?.id || "");
    }
  }, [calendars]);

  const handleImport = async () => {
    if (!selectedCalendar) return;
    const timeMin = new Date().toISOString();
    const timeMax = new Date(Date.now() + parseInt(importRange) * 86400000).toISOString();
    const result = await importFromGoogle(selectedCalendar, timeMin, timeMax);
    setLastResult({ type: "import", ...result });
    if (result.imported !== undefined) {
      toast.success(`Zaimportowano ${result.imported} nowych wydarzeń (pominięto: ${result.skipped ?? 0})`);
      onSyncComplete?.();
    } else {
      toast.error("Nie udało się zaimportować wydarzeń.");
    }
  };

  const handleExport = async () => {
    if (!selectedCalendar) return;
    const result = await exportToGoogle(selectedCalendar);
    setLastResult({ type: "export", ...result });
    if (result.exported !== undefined) {
      toast.success(`Wyeksportowano ${result.exported} wydarzeń do Google Calendar`);
    } else {
      toast.error("Nie udało się wyeksportować wydarzeń.");
    }
  };

  const handleDisconnect = async () => {
    const ok = await toast.confirm("Czy na pewno chcesz odłączyć Google Calendar? Istniejące zsynchronizowane wydarzenia pozostaną.");
    if (!ok) return;
    await disconnect();
    toast.success("Odłączono Google Calendar.");
    setLastResult(null);
  };

  return (
    <div className="card rounded-xl shadow-sm overflow-hidden mb-6 transition-all">
      {/* Header */}
      <button
        onClick={() => {
          setExpanded((p) => !p);
          if (!expanded && connected === null) checkConnection();
        }}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-white shadow-sm border border-gray-200 dark:border-gray-700 shrink-0">
            <GoogleIcon />
          </div>
          <div className="text-left">
            <p className="font-bold text-text text-sm">Google Calendar</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-textMuted">
              {connected === null ? "Sprawdzanie..." : connected ? "Połączony" : "Niepołączony"}
            </p>
          </div>
          {connected && (
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-500/30 px-2 py-0.5 rounded-full">
              <Check className="w-3 h-3" /> Aktywny
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-textMuted shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-textMuted shrink-0" />
        )}
      </button>

      {/* Body */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 bg-surface px-4 py-4 space-y-4">
          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-sm font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-4 gap-2 text-textMuted">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm font-medium">Ładowanie...</span>
            </div>
          )}

          {/* Not connected */}
          {!loading && connected === false && (
            <div className="space-y-3">
              <p className="text-sm text-textSecondary">
                Połącz swoje konto Google, aby synchronizować wydarzenia między Dzisiaj v3 a Google Calendar.
              </p>
              <button
                onClick={connect}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-text font-bold rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors disabled:opacity-50"
              >
                <GoogleIcon />
                Połącz z Google Calendar
              </button>
            </div>
          )}

          {/* Connected */}
          {!loading && connected === true && (
            <div className="space-y-4">
              {/* Calendar selector */}
              {calendars.length > 0 && (
                <div>
                  <label className="form-label">Kalendarz Google:</label>
                  <select
                    value={selectedCalendar}
                    onChange={(e) => setSelectedCalendar(e.target.value)}
                    className="input-field py-1.5"
                  >
                    {calendars.map((cal) => (
                      <option key={cal.id} value={cal.id}>
                        {cal.summary}{cal.primary ? " (główny)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Import range */}
              <div>
                <label className="form-label">Zakres importu:</label>
                <div className="flex gap-2 flex-wrap">
                  {(["30", "90", "180", "365"] as const).map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setImportRange(days)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                        importRange === days
                          ? "bg-primary text-white border-primary"
                          : "bg-card text-textSecondary border-gray-200 dark:border-gray-700 hover:bg-surface"
                      }`}
                    >
                      {days === "365" ? "1 rok" : `${days} dni`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleImport}
                  disabled={loading || !selectedCalendar}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-secondary text-white font-bold rounded-xl transition-colors disabled:opacity-50 shadow-sm"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Importuj
                </button>
                <button
                  onClick={handleExport}
                  disabled={loading || !selectedCalendar}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-surface hover:bg-surfaceHover text-text font-bold rounded-xl border border-gray-200 dark:border-gray-700 transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  Eksportuj
                </button>
              </div>

              {/* Last result */}
              {lastResult && (
                <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-500/30 text-sm font-medium text-green-700 dark:text-green-400">
                  {lastResult.type === "import" ? (
                    <>
                      <span className="font-bold">Import zakończony:</span>{" "}
                      {lastResult.imported} nowych · {lastResult.skipped} pominiętych
                    </>
                  ) : (
                    <>
                      <span className="font-bold">Eksport zakończony:</span>{" "}
                      {lastResult.exported} wydarzeń
                    </>
                  )}
                </div>
              )}

              {/* Info */}
              <div className="text-xs text-textMuted space-y-1 pt-1 border-t border-gray-100 dark:border-gray-800">
                <p>• <strong>Import</strong> — pobiera nadchodzące wydarzenia z Google do Dzisiaj v3</p>
                <p>• <strong>Eksport</strong> — wysyła Twoje wydarzenia z Dzisiaj v3 do Google Calendar</p>
                <p>• Duplikaty są automatycznie pomijane przy imporcie</p>
              </div>

              {/* Disconnect */}
              <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={handleDisconnect}
                  disabled={loading}
                  className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
                >
                  <Link2Off className="w-3.5 h-3.5" />
                  Odłącz Google Calendar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.259c-.806.54-1.837.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}