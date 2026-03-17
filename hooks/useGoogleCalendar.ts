// hooks/useGoogleCalendar.ts

import { useState, useCallback } from "react";
import { useAuth } from "../providers/AuthProvider";

export interface GoogleCalendarInfo {
  id: string;
  summary: string;
  primary?: boolean;
  backgroundColor?: string;
}

export interface SyncResult {
  imported?: number;
  exported?: number;
  skipped?: number;
  total?: number;
  error?: string;
}

export function useGoogleCalendar() {
  const { supabase } = useAuth();
  const [connected, setConnected] = useState<boolean | null>(null);
  const [calendars, setCalendars] = useState<GoogleCalendarInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getToken = useCallback(async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }, [supabase]);

  const authHeaders = useCallback(async (): Promise<HeadersInit | null> => {
    const token = await getToken();
    if (!token) return null;
    return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  }, [getToken]);

  const checkConnection = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await authHeaders();
      if (!headers) { setConnected(false); return; }

      const res = await fetch("/api/google-calendar?action=list-calendars", { headers });
      if (res.status === 401) { setConnected(false); return; }
      const data = await res.json();
      setConnected(data.connected ?? false);
      setCalendars(data.calendars ?? []);
    } catch {
      setError("Nie udało się sprawdzić połączenia z Google Calendar.");
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  const connect = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await authHeaders();
      if (!headers) {
        setError("Brak sesji. Zaloguj się ponownie.");
        setLoading(false);
        return;
      }
      const res = await fetch("/api/google-calendar?action=auth-url", { headers });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch (e: any) {
      setError(`Nie udało się rozpocząć autoryzacji Google: ${e.message}`);
      setLoading(false);
    }
  }, [authHeaders]);

  const disconnect = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await authHeaders();
      if (!headers) return;
      await fetch("/api/google-calendar?action=disconnect", { method: "DELETE", headers });
      setConnected(false);
      setCalendars([]);
    } catch {
      setError("Nie udało się rozłączyć z Google Calendar.");
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  const importFromGoogle = useCallback(
    async (calendarId: string, timeMin?: string, timeMax?: string): Promise<SyncResult> => {
      setLoading(true);
      setError(null);
      try {
        const headers = await authHeaders();
        if (!headers) return { error: "Brak sesji" };

        const res = await fetch("/api/google-calendar?action=import", {
          method: "POST",
          headers,
          body: JSON.stringify({ calendarId, timeMin, timeMax }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || `HTTP ${res.status}`);
        }
        return await res.json();
      } catch (e: any) {
        const msg = `Nie udało się zaimportować wydarzeń: ${e.message}`;
        setError(msg);
        return { error: msg };
      } finally {
        setLoading(false);
      }
    },
    [authHeaders]
  );

  const exportToGoogle = useCallback(
    async (calendarId: string, eventIds?: string[]): Promise<SyncResult> => {
      setLoading(true);
      setError(null);
      try {
        const headers = await authHeaders();
        if (!headers) return { error: "Brak sesji" };

        const res = await fetch("/api/google-calendar?action=export", {
          method: "POST",
          headers,
          body: JSON.stringify({ calendarId, eventIds }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || `HTTP ${res.status}`);
        }
        return await res.json();
      } catch (e: any) {
        const msg = `Nie udało się wyeksportować wydarzeń: ${e.message}`;
        setError(msg);
        return { error: msg };
      } finally {
        setLoading(false);
      }
    },
    [authHeaders]
  );

  return {
    connected,
    calendars,
    loading,
    error,
    checkConnection,
    connect,
    disconnect,
    importFromGoogle,
    exportToGoogle,
  };
}