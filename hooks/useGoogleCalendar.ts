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
  message?: string;
  error?: string;
}

export function useGoogleCalendar() {
  const { supabase } = useAuth();
  const [connected, setConnected] = useState<boolean | null>(null);
  const [calendars, setCalendars] = useState<GoogleCalendarInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getFreshToken = useCallback(async (): Promise<string | null> => {
    let { data: { session } } = await supabase.auth.getSession();

    if (!session || (session.expires_at && session.expires_at * 1000 - Date.now() < 60_000)) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      session = refreshed.session;
    }

    return session?.access_token ?? null;
  }, [supabase]);

  const getHeaders = useCallback(async (): Promise<HeadersInit | null> => {
    const token = await getFreshToken();
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  }, [getFreshToken]);

  const postHeaders = useCallback(async (): Promise<HeadersInit | null> => {
    const token = await getFreshToken();
    if (!token) return null;
    return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  }, [getFreshToken]);

  const checkConnection = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await getHeaders();
      if (!headers) {
        setConnected(false);
        return;
      }
      const res = await fetch("/api/google-calendar?action=list-calendars", { headers });
      if (res.status === 401) {
        setConnected(false);
        return;
      }
      const data = await res.json();
      setConnected(data.connected ?? false);
      setCalendars(data.calendars ?? []);
    } catch (e) {
      console.error("[useGoogleCalendar] checkConnection:", e);
      setError("Nie udało się sprawdzić połączenia z Google Calendar.");
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  const connect = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await getHeaders();
      if (!headers) {
        setError("Brak sesji — zaloguj się ponownie.");
        setLoading(false);
        return;
      }
      const res = await fetch("/api/google-calendar?action=auth-url", { headers });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      const { url } = await res.json();
      globalThis.location.href = url;
    } catch (e: any) {
      setError(`Nie udało się rozpocząć autoryzacji: ${e.message}`);
      setLoading(false);
    }
  }, [getHeaders]);

  const disconnect = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await postHeaders();
      if (!headers) return;
      await fetch("/api/google-calendar?action=disconnect", { method: "DELETE", headers });
      setConnected(false);
      setCalendars([]);
    } catch (e) {
      console.error("[useGoogleCalendar] disconnect:", e);
      setError("Nie udało się rozłączyć.");
    } finally {
      setLoading(false);
    }
  }, [postHeaders]);

  const importFromGoogle = useCallback(
    async (calendarId: string, timeMin?: string, timeMax?: string): Promise<SyncResult> => {
      setLoading(true);
      setError(null);
      try {
        const headers = await postHeaders();
        if (!headers) return { error: "Brak sesji" };

        const res = await fetch("/api/google-calendar?action=import", {
          method: "POST",
          headers,
          body: JSON.stringify({ calendarId, timeMin, timeMax }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        return data;
      } catch (e: any) {
        const msg = `Import nie powiódł się: ${e.message}`;
        setError(msg);
        return { error: msg };
      } finally {
        setLoading(false);
      }
    },
    [postHeaders]
  );

  const exportToGoogle = useCallback(
    async (calendarId: string, eventIds?: string[]): Promise<SyncResult> => {
      setLoading(true);
      setError(null);
      try {
        const headers = await postHeaders();
        if (!headers) return { error: "Brak sesji" };

        const res = await fetch("/api/google-calendar?action=export", {
          method: "POST",
          headers,
          body: JSON.stringify({ calendarId, eventIds }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        return data;
      } catch (e: any) {
        const msg = `Eksport nie powiódł się: ${e.message}`;
        setError(msg);
        return { error: msg };
      } finally {
        setLoading(false);
      }
    },
    [postHeaders]
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