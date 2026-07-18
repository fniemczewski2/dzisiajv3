import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/providers/ToastProvider';
import { useRetry } from '@/hooks/useRetry';
import { ConnectedAccount, ExternalCalendar } from '@/types/events';

export function useConnectedCalendars(expanded: boolean) {
  const { user, supabase } = useAuth();
  const { toast } = useToast();
  const withRetry = useRetry();

  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [calendars, setCalendars] = useState<ExternalCalendar[]>([]);
  const [selectedCalendars, setSelectedCalendars] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchAccountsAndCalendars = useCallback(
    async (onlyAccounts = false) => {
      if (!user) {
  
        throw new Error("Unauthorized");
      }
      setFetching(true);

      try {
        const { data: accountsData, error } = await withRetry(async () =>
          supabase
            .from('connected_calendars')
            .select('id, provider, account_email, google_calendar_id, calendar_name, expires_at')
            .eq('user_id', user.id)
        );

        if (error) throw error;

        const fetchedAccounts = accountsData as ConnectedAccount[];
        setAccounts(fetchedAccounts);

        if (onlyAccounts || fetchedAccounts.length === 0) {
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        let combinedCalendars: ExternalCalendar[] = [];

        const primaryGoogleAccount =
          fetchedAccounts.find((acc) => acc.provider === 'google' && acc.google_calendar_id === '@account_connection') ||
          fetchedAccounts.find((acc) => acc.provider === 'google');
        if (primaryGoogleAccount) {
          try {
            const res = await withRetry(async () =>
              fetch('/api/google-calendar?action=list-calendars', {
                headers: { Authorization: `Bearer ${session.access_token}` },
              })
            );
            if (res.ok) {
              const data = await res.json();
              if (data.calendars) {
                const googleCals = data.calendars.map((cal: ExternalCalendar) => {
                  const dbMatch = fetchedAccounts.find(
                    (acc) => acc.account_email === primaryGoogleAccount.account_email && acc.google_calendar_id === cal.id
                  );
                  return {
                    id: cal.id,
                    summary: cal.summary,
                    primary: cal.primary,
                    accountId: dbMatch ? dbMatch.id : undefined,
                    primaryAccountId: primaryGoogleAccount.id,
                  };
                });
                combinedCalendars = [...combinedCalendars, ...googleCals];
              }
            }
          } catch {
            toast.error("Błąd kalendarzy Google.");
          }
        }

        const primaryOutlookAccount =
          fetchedAccounts.find((acc) => acc.provider === 'outlook' && acc.google_calendar_id === '@account_connection') ||
          fetchedAccounts.find((acc) => acc.provider === 'outlook');
        if (primaryOutlookAccount) {
          try {
            const res = await withRetry(async () =>
              fetch('/api/outlook-calendar?action=list-calendars', {
                headers: { Authorization: `Bearer ${session.access_token}` },
              })
            );
            if (res.ok) {
              const data = await res.json();
              if (data.calendars) {
                const outlookCals = data.calendars.map((cal: ExternalCalendar) => {
                  const dbMatch = fetchedAccounts.find(
                    (acc) => acc.account_email === primaryOutlookAccount.account_email && acc.google_calendar_id === cal.id
                  );
                  return {
                    id: cal.id,
                    summary: cal.summary,
                    primary: cal.primary,
                    accountId: dbMatch ? dbMatch.id : undefined,
                    primaryAccountId: primaryOutlookAccount.id,
                  };
                });
                combinedCalendars = [...combinedCalendars, ...outlookCals];
              }
            }
          } catch {
            toast.error("Błąd kalendarzy Outlook.");
          }
        }

        setCalendars(combinedCalendars);

        const alreadySavedKeys = combinedCalendars
          .filter((c: ExternalCalendar) => c.accountId)
          .map((c: ExternalCalendar) => `${c.primaryAccountId}:::${c.id}`);
        setSelectedCalendars(alreadySavedKeys);
      } catch {
        toast.error("Błąd podczas pobierania kalendarzy.");
      } finally {
        setFetching(false);
      }
    },
    [user, supabase, toast, withRetry]
  );

  useEffect(() => {
    fetchAccountsAndCalendars(!expanded);
  }, [expanded, fetchAccountsAndCalendars]);

  const handleToggleCalendar = useCallback(
    async (primaryAccountForEmail: ConnectedAccount, cal: ExternalCalendar, isCurrentlyOn: boolean) => {
      if (!user) {
  
        throw new Error("Unauthorized");
      }
      const key = `${primaryAccountForEmail.id}:::${cal.id}`;
      setTogglingId(cal.id);
      const previousSelected = selectedCalendars;
      setSelectedCalendars((prev) => (isCurrentlyOn ? prev.filter((id) => id !== key) : [...prev, key]));

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error("Brak sesji");

        const baseApiUrl = primaryAccountForEmail.provider === 'google' ? '/api/google-calendar' : '/api/outlook-calendar';

        if (isCurrentlyOn) {
          if (cal.accountId) {
            await withRetry(async () =>
              fetch(`${baseApiUrl}?action=disconnect&subCalendarId=${cal.accountId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${session.access_token}` },
              })
            );
          }
          toast.success(`Odłączono kalendarz: ${cal.summary}`);
          globalThis.dispatchEvent(new Event("refreshEvents"));
        } else {
          const { data: newAcc, error: insertErr } = await withRetry(async () =>
            supabase
              .from('connected_calendars')
              .insert({
                user_id: user.id,
                provider: primaryAccountForEmail.provider,
                account_email: primaryAccountForEmail.account_email,
                google_calendar_id: cal.id,
                calendar_name: cal.summary,
              })
              .select('id')
              .single()
          );

          if (insertErr) throw insertErr;

          await withRetry(async () =>
            fetch(`${baseApiUrl}?action=import`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
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
    [user, supabase, selectedCalendars, fetchAccountsAndCalendars, toast, withRetry]
  );

  const handleDisconnect = useCallback(
    async (id: string, email: string, provider: 'google' | 'outlook') => {
      if (!user) {
  
        throw new Error("Unauthorized");
      }
      const ok = await toast.confirm(`Czy chcesz odłączyć konto ${email} i usunąć zaimportowane wydarzenia?`);
      if (!ok) return;

      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          toast.error("Zaloguj się ponownie.");
          return;
        }

        const baseApiUrl = provider === 'google' ? '/api/google-calendar' : '/api/outlook-calendar';
        const res = await withRetry(async () =>
          fetch(`${baseApiUrl}?action=disconnect&email=${encodeURIComponent(email)}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${session.access_token}` },
          })
        );

        if (!res.ok) throw new Error("Błąd serwera");

        toast.success(`Odłączono konto ${email} i usunięto wydarzenia.`);
        setSelectedCalendars((prev) => prev.filter((key) => !key.startsWith(`${id}:::`)));
        globalThis.dispatchEvent(new Event("refreshEvents"));

        await fetchAccountsAndCalendars();
      } catch {
        toast.error('Błąd podczas odłączania konta.');
      } finally {
        setLoading(false);
      }
    },
    [user, supabase, fetchAccountsAndCalendars, toast, withRetry]
  );

  const handleConnectGoogle = useCallback(async () => {
    if (!user) {

      throw new Error("Unauthorized");
    }
    setLoading(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        toast.error("Zaloguj się ponownie.");
        return;
      }
      const res = await withRetry(async () =>
        fetch('/api/google-calendar?action=auth-url', {
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

      throw new Error("Unauthorized");
    }
    setLoading(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        toast.error("Zaloguj się ponownie.");
        return;
      }

      const res = await withRetry(async () =>
        fetch('/api/outlook-calendar?action=auth-url', {
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
