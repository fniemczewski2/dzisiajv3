import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/providers/ToastProvider';

export interface ConnectedAccount {
  id: string;
  provider: 'google' | 'outlook';
  account_email: string;
  google_calendar_id?: string;
}

export interface ExternalCalendar {
  id: string;
  summary: string;
  accountId?: string;
  primary?: boolean;
  primaryAccountId?: string;
}

export function useConnectedCalendars(expanded: boolean) {
  const { user, supabase } = useAuth();
  const { toast } = useToast();
  
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [calendars, setCalendars] = useState<ExternalCalendar[]>([]);
  const [selectedCalendars, setSelectedCalendars] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    let toastId: string | undefined;
    if (fetching  && toast.loading) toastId = toast.loading("Ładowanie kont i kalendarzy...");
    return () => { if (toastId && toast.dismiss) toast.dismiss(toastId); };
  }, [fetching, toast]);

  const fetchAccountsAndCalendars = useCallback(async (onlyAccounts = false) => {
    if (!user) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }
    setFetching(true);
    
    const { data: accountsData, error } = await supabase
      .from('connected_calendars')
      .select('*')
      .eq('user_id', user.id);
      
    if (error) {
      toast.error('Nie udało się pobrać połączonych kont');
      setFetching(false);
      return;
    }

    const fetchedAccounts = accountsData as any[];
    setAccounts(fetchedAccounts);

    if (onlyAccounts || fetchedAccounts.length === 0) {
      setFetching(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      let combinedCalendars: ExternalCalendar[] = [];

      const primaryGoogleAccount = fetchedAccounts.find(acc => acc.provider === 'google' && acc.google_calendar_id === '@account_connection') || fetchedAccounts.find(acc => acc.provider === 'google');
      if (primaryGoogleAccount) {
        try {
          const res = await fetch('/api/google-calendar?action=list-calendars', {
            headers: { Authorization: `Bearer ${session.access_token}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.calendars) {
              const googleCals = data.calendars.map((cal: any) => {
                const dbMatch = fetchedAccounts.find(acc => acc.account_email === primaryGoogleAccount.account_email && acc.google_calendar_id === cal.id);
                return {
                  id: cal.id,
                  summary: cal.summary,
                  primary: cal.primary,
                  accountId: dbMatch ? dbMatch.id : undefined,
                  primaryAccountId: primaryGoogleAccount.id
                };
              });
              combinedCalendars = [...combinedCalendars, ...googleCals];
            }
          }
        } catch {
          toast.error("Błąd kalendarzy Google");
        }
      }

      const primaryOutlookAccount = fetchedAccounts.find(acc => acc.provider === 'outlook' && acc.google_calendar_id === '@account_connection') || fetchedAccounts.find(acc => acc.provider === 'outlook');
      if (primaryOutlookAccount) {
        try {
          const res = await fetch('/api/outlook-calendar?action=list-calendars', {
            headers: { Authorization: `Bearer ${session.access_token}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.calendars) {
              const outlookCals = data.calendars.map((cal: any) => {
                const dbMatch = fetchedAccounts.find(acc => acc.account_email === primaryOutlookAccount.account_email && acc.google_calendar_id === cal.id);
                return {
                  id: cal.id,
                  summary: cal.summary,
                  primary: cal.primary,
                  accountId: dbMatch ? dbMatch.id : undefined,
                  primaryAccountId: primaryOutlookAccount.id
                };
              });
              combinedCalendars = [...combinedCalendars, ...outlookCals];
            }
          }
        } catch {
          toast.error("Błąd kalendarzy Outlook");
        }
      }

      setCalendars(combinedCalendars);
      
      const alreadySavedKeys = combinedCalendars
        .filter((c: any) => c.accountId)
        .map((c: any) => `${c.primaryAccountId}:::${c.id}`);
      setSelectedCalendars(alreadySavedKeys);

    } catch {
      toast.error("Błąd podczas pobierania kalendarzy.");
    } finally {
      setFetching(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (expanded) {
      fetchAccountsAndCalendars();
    }
  }, [expanded, fetchAccountsAndCalendars]);

  useEffect(() => {
    fetchAccountsAndCalendars(true); 
  }, [fetchAccountsAndCalendars]);

  const handleToggleCalendar = async (primaryAccountForEmail: ConnectedAccount, cal: ExternalCalendar, isCurrentlyOn: boolean) => {
    if (!user) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }
    const key = `${primaryAccountForEmail.id}:::${cal.id}`;
    setTogglingId(cal.id);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Brak sesji");

      const baseApiUrl = primaryAccountForEmail.provider === 'google' ? '/api/google-calendar' : '/api/outlook-calendar';

      if (isCurrentlyOn) {
        if (cal.accountId) {
          await fetch(`${baseApiUrl}?action=disconnect&subCalendarId=${cal.accountId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${session.access_token}` }
          });
        }
        
        setSelectedCalendars(prev => prev.filter(id => id !== key));
        toast.success(`Odłączono kalendarz: ${cal.summary}`);
        globalThis.dispatchEvent(new Event("refreshEvents"));
      } else {
        const { data: newAcc, error: insertErr } = await supabase
          .from('connected_calendars')
          .insert({
            user_id: user?.id,
            provider: primaryAccountForEmail.provider,
            account_email: primaryAccountForEmail.account_email,
            google_calendar_id: cal.id,
            calendar_name: cal.summary   
          })
          .select('id')
          .single();

        if (insertErr) throw insertErr;

        await fetch(`${baseApiUrl}?action=import`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ calendarId: cal.id, accountId: newAcc.id })
        });
        
        setSelectedCalendars(prev => [...prev, key]);
        toast.success(`Zsynchronizowano kalendarz: ${cal.summary}.`);
        globalThis.dispatchEvent(new Event("refreshEvents"));
      }
      
      await fetchAccountsAndCalendars();
    } catch {
      toast.error(`Wystąpił błąd ${isCurrentlyOn ? "odłączania" : "łączenia"} kalendarza zewnętrznego.`);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDisconnect = async (id: string, email: string, provider: 'google' | 'outlook') => {
    if (!user) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }
    const ok = await toast.confirm(
      `Czy chcesz odłączyć konto ${email} i usunąć zaimportowane wydarzenia?`
    );
    if (!ok) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Zaloguj się ponownie.");
        return;
      }

      const baseApiUrl = provider === 'google' ? '/api/google-calendar' : '/api/outlook-calendar';
      const res = await fetch(`${baseApiUrl}?action=disconnect&email=${encodeURIComponent(email)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) throw new Error("Błąd serwera");

      toast.success(`Odłączono konto ${email} i usunięto wydarzenia.`);
      setSelectedCalendars(prev => prev.filter(key => !key.startsWith(`${id}:::`)));
      globalThis.dispatchEvent(new Event("refreshEvents"));

      await fetchAccountsAndCalendars();
    } catch {
      toast.error('Błąd podczas odłączania konta');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGoogle = async () => {
    if (!user) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }
    setLoading(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        toast.error("Zaloguj się ponownie.");
        return;
      }
      const res = await fetch('/api/google-calendar?action=auth-url', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error(`Błąd HTTP`);
      const data = await res.json();
      if (data.url) globalThis.location.href = data.url;
    } catch {
      toast.error("Błąd logowania Google");
    } finally {
      setLoading(false);
    }
  };

  const handleConnectOutlook = async () => {
    if (!user) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }
    setLoading(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        toast.error("Zaloguj się ponownie.");
        return;
      }
      
      const res = await fetch('/api/outlook-calendar?action=auth-url', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      
      if (!res.ok) throw new Error("Błąd HTTP");
      const data = await res.json();
      
      if (data.url) globalThis.location.href = data.url;
    } catch {
      toast.error("Błąd logowania Outlook");
    } finally {
      setLoading(false);
    }
  };


  return {
    accounts,
    calendars,
    selectedCalendars,
    loading,
    togglingId,
    handleToggleCalendar,
    handleDisconnect,
    handleConnectGoogle,
    handleConnectOutlook
  };
}