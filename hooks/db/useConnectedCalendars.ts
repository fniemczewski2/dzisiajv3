// hooks/db/useConnectedCalendars.ts

import { useQueryState } from "@/hooks/useQueryState";
import { NotSignedInError } from "@/lib/errors";
import { useState, useCallback } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { useRetry } from "@/hooks/useRetry";
import { isAbortError } from "@/lib/abortUtils";
import { ConnectedAccount, ExternalCalendar } from "@/types/events";

type Provider = "google" | "outlook";

export async function fetchProviderCalendars(
  provider: Provider,
  fetchedAccounts: ConnectedAccount[],
  accessToken: string,
  signal: AbortSignal,
  withRetry: ReturnType<typeof useRetry>,
  toast: ReturnType<typeof useToast>["toast"]
): Promise<ExternalCalendar[]> {
  const primaryAccount =
    fetchedAccounts.find((acc) => acc.provider === provider && acc.google_calendar_id === "@account_connection") ||
    fetchedAccounts.find((acc) => acc.provider === provider);
  if (!primaryAccount) return [];

  const endpoint = provider === "google" ? "/api/google-calendar" : "/api/outlook-calendar";
  const errorMessage = provider === "google" ? "Błąd kalendarzy Google." : "Błąd kalendarzy Outlook.";

  try {
    const res = await withRetry(
      () =>
        fetch(`${endpoint}?action=list-calendars`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal,
        }),
      signal
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.calendars) return [];

    // Serwer przypisuje każdy kalendarz do konta, z którego go pobrał
    // (primaryAccountId). Wcześniej nadpisywaliśmy to pierwszym kontem danego
    // dostawcy, więc przy dwóch kontach Google wszystkie kalendarze trafiały
    // pod pierwsze, a włączenie kalendarza drugiego konta zapisywało go
    // z adresem pierwszego (i import szedł złym tokenem).
    return data.calendars.map((cal: ExternalCalendar) => {
      const owner = fetchedAccounts.find((acc) => acc.id === cal.primaryAccountId) ?? primaryAccount;
      const dbMatch = fetchedAccounts.find(
        (acc) =>
          acc.provider === provider && acc.account_email === owner.account_email && acc.google_calendar_id === cal.id
      );
      return {
        id: cal.id,
        summary: cal.summary,
        primary: cal.primary,
        accountId: dbMatch ? dbMatch.id : undefined,
        primaryAccountId: owner.id,
      };
    });
  } catch (err) {
    if (isAbortError(err)) throw err;
    toast.error(errorMessage, { cause: err });
    return [];
  }
}

interface CalendarsState {
  accounts: ConnectedAccount[];
  calendars: ExternalCalendar[];
  selected: string[];
}

const NO_CALENDARS: CalendarsState = { accounts: [], calendars: [], selected: [] };

export function useConnectedCalendars(expanded: boolean) {
  const { user, supabase } = useAuth();
  const { toast } = useToast();
  const withRetry = useRetry();
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Konta zawsze; listy kalendarzy u dostawców – dopiero po rozwinięciu sekcji.
  const queryCalendars = useCallback(
    async ({ signal }: { signal: AbortSignal }): Promise<CalendarsState> => {
      if (!user) throw new NotSignedInError();
      try {
        const { data: accountsData, error } = await withRetry(
          () =>
            supabase
              .from("connected_calendars")
              .select("id, provider, account_email, google_calendar_id, calendar_name, expires_at, sync_error")
              .eq("user_id", user.id)
              .abortSignal(signal),
          signal
        );
        if (error) throw error;

        const accounts = accountsData as ConnectedAccount[];
        if (!expanded || accounts.length === 0) return { accounts, calendars: [], selected: [] };

        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) return { accounts, calendars: [], selected: [] };

        const googleCals = await fetchProviderCalendars(
          "google",
          accounts,
          session.access_token,
          signal,
          withRetry,
          toast
        );
        const outlookCals = await fetchProviderCalendars(
          "outlook",
          accounts,
          session.access_token,
          signal,
          withRetry,
          toast
        );
        const calendars = [...googleCals, ...outlookCals];
        const selected = calendars
          .filter((c: ExternalCalendar) => c.accountId)
          .map((c: ExternalCalendar) => `${c.primaryAccountId}:::${c.id}`);
        return { accounts, calendars, selected };
      } catch (err) {
        if (!isAbortError(err)) toast.error("Błąd podczas pobierania kalendarzy.", { cause: err });
        throw err;
      }
    },
    [user, supabase, toast, withRetry, expanded]
  );
  const {
    data: { accounts, calendars, selected: selectedCalendars },
    setData,
    fetching,
    refetch: fetchAccountsAndCalendars,
  } = useQueryState<CalendarsState>({
    queryKey: ["connected-calendars", user?.id ?? null, expanded],
    queryFn: queryCalendars,
    initial: NO_CALENDARS,
    enabled: Boolean(user),
  });
  const setSelectedCalendars = useCallback(
    (updater: string[] | ((prev: string[]) => string[])) =>
      setData((prev) => ({ ...prev, selected: typeof updater === "function" ? updater(prev.selected) : updater })),
    [setData]
  );

  const handleToggleCalendar = useCallback(
    async (primaryAccountForEmail: ConnectedAccount, cal: ExternalCalendar, isCurrentlyOn: boolean) => {
      if (!user) {
        throw new NotSignedInError();
      }
      const key = `${primaryAccountForEmail.id}:::${cal.id}`;
      setTogglingId(cal.id);
      const previousSelected = selectedCalendars;
      setSelectedCalendars((prev) => (isCurrentlyOn ? prev.filter((id) => id !== key) : [...prev, key]));

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error("Brak sesji");

        const baseApiUrl =
          primaryAccountForEmail.provider === "google" ? "/api/google-calendar" : "/api/outlook-calendar";

        if (isCurrentlyOn) {
          if (cal.accountId) {
            await withRetry(() =>
              fetch(`${baseApiUrl}?action=disconnect&subCalendarId=${cal.accountId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${session.access_token}` },
              })
            );
          }
          toast.success(`Odłączono kalendarz: ${cal.summary}`);
          globalThis.dispatchEvent(new Event("refreshEvents"));
        } else {
          const { data: newAcc, error: insertErr } = await withRetry(() =>
            supabase
              .from("connected_calendars")
              .insert({
                user_id: user.id,
                provider: primaryAccountForEmail.provider,
                account_email: primaryAccountForEmail.account_email,
                google_calendar_id: cal.id,
                calendar_name: cal.summary,
              })
              .select("id")
              .single()
          );

          if (insertErr) throw insertErr;

          await withRetry(() =>
            fetch(`${baseApiUrl}?action=import`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ calendarId: cal.id, accountId: newAcc.id }),
            })
          );

          toast.success(`Zsynchronizowano kalendarz: ${cal.summary}.`);
          globalThis.dispatchEvent(new Event("refreshEvents"));
        }

        await fetchAccountsAndCalendars();
      } catch {
        setSelectedCalendars(previousSelected);
        toast.error(`Wystąpił błąd ${isCurrentlyOn ? "odłączania" : "łączenia"} kalendarza zewnętrznego.`);
      } finally {
        setTogglingId(null);
      }
    },
    [user, supabase, selectedCalendars, fetchAccountsAndCalendars, toast, withRetry, setSelectedCalendars]
  );

  const handleDisconnect = useCallback(
    async (id: string, email: string, provider: "google" | "outlook") => {
      if (!user) {
        throw new NotSignedInError();
      }
      const ok = await toast.confirm(`Czy chcesz odłączyć konto ${email} i usunąć zaimportowane wydarzenia?`);
      if (!ok) return;

      setLoading(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) {
          toast.error("Zaloguj się ponownie.");
          return;
        }

        const baseApiUrl = provider === "google" ? "/api/google-calendar" : "/api/outlook-calendar";
        const res = await withRetry(() =>
          fetch(`${baseApiUrl}?action=disconnect&email=${encodeURIComponent(email)}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${session.access_token}` },
          })
        );

        if (!res.ok) throw new Error("Błąd serwera");

        toast.success(`Odłączono konto ${email} i usunięto wydarzenia.`);
        setSelectedCalendars((prev) => prev.filter((key) => !key.startsWith(`${id}:::`)));
        globalThis.dispatchEvent(new Event("refreshEvents"));

        await fetchAccountsAndCalendars();
      } catch {
        toast.error("Błąd podczas odłączania konta.");
      } finally {
        setLoading(false);
      }
    },
    [user, supabase, fetchAccountsAndCalendars, toast, withRetry, setSelectedCalendars]
  );

  const handleConnectGoogle = useCallback(async () => {
    if (!user) {
      throw new NotSignedInError();
    }
    setLoading(true);
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        toast.error("Zaloguj się ponownie.");
        return;
      }
      const res = await withRetry(() =>
        fetch("/api/google-calendar?action=auth-url", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
      );
      if (!res.ok) throw new Error(`Błąd HTTP`);
      const data = await res.json();
      if (data.url) globalThis.location.href = data.url;
    } catch {
      toast.error("Błąd logowania Google.");
    } finally {
      setLoading(false);
    }
  }, [user, supabase, toast, withRetry]);

  const handleConnectOutlook = useCallback(async () => {
    if (!user) {
      throw new NotSignedInError();
    }
    setLoading(true);
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        toast.error("Zaloguj się ponownie.");
        return;
      }

      const res = await withRetry(() =>
        fetch("/api/outlook-calendar?action=auth-url", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
      );

      if (!res.ok) throw new Error("Błąd HTTP");
      const data = await res.json();

      if (data.url) globalThis.location.href = data.url;
    } catch {
      toast.error("Błąd logowania Outlook.");
    } finally {
      setLoading(false);
    }
  }, [user, supabase, toast, withRetry]);

  return {
    accounts,
    calendars,
    selectedCalendars,
    loading,
    fetching,
    togglingId,
    handleToggleCalendar,
    handleDisconnect,
    handleConnectGoogle,
    handleConnectOutlook,
  };
}
