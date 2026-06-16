"use client";

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Link2Off, Loader2, Link as LinkIcon } from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';

interface ConnectedAccount {
  id: string;
  provider: 'google' | 'outlook';
  account_email: string;
  google_calendar_id?: string;
}

interface ExternalCalendar {
  id: string;
  summary: string;
  accountId?: string;
  primary?: boolean;
  primaryAccountId?: string;
}

const supabase = createClient();

export default function ConnectedCalendars() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [calendars, setCalendars] = useState<ExternalCalendar[]>([]);
  const [selectedCalendars, setSelectedCalendars] = useState<string[]>([]);
  
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    if (user && expanded) {
      fetchAccountsAndCalendars();
    }
  }, [user, expanded]);

  useEffect(() => {
    if (user) fetchAccountsAndCalendars(true); 
  }, [user]);

  const fetchAccountsAndCalendars = async (onlyAccounts = false) => {
    setLoading(true);
    
    const { data: accountsData, error } = await supabase
      .from('connected_calendars')
      .select('*')
      .eq('user_id', user?.id);
      
    if (error) {
      toast.error('Nie udało się pobrać połączonych kont');
      setLoading(false);
      return;
    }

    const fetchedAccounts = accountsData as any[];
    setAccounts(fetchedAccounts);

    if (onlyAccounts || fetchedAccounts.length === 0) {
      setLoading(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const primaryGoogleAccount = fetchedAccounts.find(acc => acc.provider === 'google' && acc.google_calendar_id === '@account_connection') || fetchedAccounts.find(acc => acc.provider === 'google');
      
      if (primaryGoogleAccount) {
        const res = await fetch('/api/google-calendar?action=list-calendars', {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.calendars) {
            const apiCalendars = data.calendars.map((cal: any) => {
              const parentAcc = fetchedAccounts.find(a => a.id === cal.primaryAccountId);
              
              const dbMatch = parentAcc 
                ? fetchedAccounts.find(acc => acc.account_email === parentAcc.account_email && acc.google_calendar_id === cal.id) 
                : undefined;

              return {
                id: cal.id,
                summary: cal.summary,
                primary: cal.primary,
                accountId: dbMatch ? dbMatch.id : undefined,
                primaryAccountId: cal.primaryAccountId 
              };
            });

            setCalendars(apiCalendars);
            
            const alreadySavedKeys = apiCalendars
              .filter((c: any) => c.accountId)
              .map((c: any) => `${c.primaryAccountId}:::${c.id}`);
            setSelectedCalendars(alreadySavedKeys);
          }
        }
      }
    } catch (err) {
      console.error("Błąd podczas pobierania list kalendarzy:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCalendar = async (primaryAccountForEmail: ConnectedAccount, cal: ExternalCalendar, isCurrentlyOn: boolean) => {
    const key = `${primaryAccountForEmail.id}:::${cal.id}`;
    setTogglingId(cal.id);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Brak sesji");

      if (isCurrentlyOn) {
        // WYŁĄCZANIE (USUWANIE)
        if (cal.accountId) {
          const res = await fetch(`/api/google-calendar?action=disconnect&subCalendarId=${cal.accountId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${session.access_token}` }
          });
          if (!res.ok) throw new Error("Błąd usuwania");
        }
        
        setSelectedCalendars(prev => prev.filter(id => id !== key));
        toast.success(`Odłączono kalendarz: ${cal.summary}`);
        
        // WYMUSZENIE ODŚWIEŻENIA KALENDARZA GŁÓWNEGO
        window.dispatchEvent(new Event("refreshEvents"));
      } else {
        // WŁĄCZANIE (DODAWANIE)
        const { data: newAcc, error: insertErr } = await supabase
          .from('connected_calendars')
          .insert({
            user_id: user?.id,
            provider: 'google',
            account_email: primaryAccountForEmail.account_email,
            google_calendar_id: cal.id,
            calendar_name: cal.summary   
          })
          .select('id')
          .single();

        if (insertErr) throw insertErr;

        const res = await fetch(`/api/google-calendar?action=import`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ calendarId: cal.id, accountId: newAcc.id })
        });

        if (!res.ok) throw new Error("Błąd podczas importu");
        
        const data = await res.json();
        setSelectedCalendars(prev => [...prev, key]);
        toast.success(`Zsynchronizowano kalendarz: ${cal.summary}. Pobrano ${data.imported || 0} wydarzeń.`);
        
        // WYMUSZENIE ODŚWIEŻENIA KALENDARZA GŁÓWNEGO
        window.dispatchEvent(new Event("refreshEvents"));
      }
      
      await fetchAccountsAndCalendars();
    } catch (err: any) {
      toast.error(err.message || "Wystąpił błąd podczas przetwarzania.");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDisconnect = async (id: string, email: string) => {
    const ok = await toast.confirm(
      `Czy na pewno chcesz odłączyć konto ${email}? Spowoduje to również usunięcie wszystkich zaimportowanych z niego wydarzeń.`
    );
    if (!ok) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Brak autoryzacji. Zaloguj się ponownie.");
        return;
      }

      const res = await fetch(`/api/google-calendar?action=disconnect&email=${encodeURIComponent(email)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) throw new Error("Błąd serwera");

      toast.success(`Odłączono konto ${email} oraz usunięto powiązane wydarzenia.`);
      setSelectedCalendars(prev => prev.filter(key => !key.startsWith(`${id}:::`)));
      
      // WYMUSZENIE ODŚWIEŻENIA KALENDARZA GŁÓWNEGO PO USUNIĘCIU CAŁEGO KONTA
      window.dispatchEvent(new Event("refreshEvents"));

      await fetchAccountsAndCalendars();
    } catch (error: any) {
      toast.error(error.message || 'Błąd podczas odłączania konta');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        toast.error("Brak aktywnej sesji. Zaloguj się ponownie.");
        return;
      }

      const res = await fetch('/api/google-calendar?action=auth-url', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) throw new Error(`Błąd HTTP`);

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast.error("Nie udało się rozpocząć logowania do Google");
    }
  };

  const handleConnectOutlook = () => {
    window.location.href = `/api/outlook-calendar?action=auth-url&userId=${user?.id}`;
  };

  const currentStatus = () => {
    const uniqueEmails = new Set(accounts.map(a => a.account_email)).size;
    if (loading && uniqueEmails === 0) return "Sprawdzanie...";
    if (uniqueEmails === 0) return "Brak połączeń";
    return `${uniqueEmails} połączon${uniqueEmails === 1 ? 'e' : uniqueEmails < 5 ? 'e' : 'ych'} kont${uniqueEmails === 1 ? 'o' : 'a'}`;
  };

  return (
    <div className="card rounded-xl shadow-sm overflow-hidden transition-all mt-2">
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-surface dark:bg-zinc-800">
            <LinkIcon className="w-4 h-4 text-textSecondary" />
          </div>
          <div className="text-left">
            <p className="font-bold text-text text-sm">Zewnętrzne Kalendarze</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-textMuted">
              {currentStatus()}
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-textMuted" /> : <ChevronDown className="w-4 h-4 text-textMuted" />}
      </button>

      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 bg-card px-4 py-4 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-4 gap-2 text-textMuted">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm font-medium">Wczytywanie kont i kalendarzy...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {accounts.length > 0 && (
                <div className="space-y-4">
                  <div className="form-label text-sm font-bold">Połączone konta i kalendarze:</div>
                  
                  {Array.from(new Set(accounts.map(a => a.account_email))).map(email => {
                    const primaryAccountForEmail = accounts.find(a => a.account_email === email && (a as any).google_calendar_id === '@account_connection') || accounts.find(a => a.account_email === email)!;
                    const accountCalendars = calendars.filter(c => (c as any).primaryAccountId === primaryAccountForEmail.id);

                    return (
                      <div key={primaryAccountForEmail.id} className="border border-gray-200 dark:border-gray-700 rounded-xl bg-surface overflow-hidden">
                        <div className="flex justify-between items-center p-3 bg-card border-b border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 flex items-center justify-center shrink-0">
                              {primaryAccountForEmail.provider === 'google' ? <GoogleIcon /> : <MicrosoftIcon />}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-text capitalize">{primaryAccountForEmail.provider}</div>
                              <div className="text-xs text-textSecondary">{email}</div>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleDisconnect(primaryAccountForEmail.id, email)} 
                            className="text-red-500 hover:text-red-600 transition-colors p-2"
                            title="Odłącz całe konto"
                          >
                            <Link2Off className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="p-2 space-y-1">
                          {accountCalendars.length === 0 ? (
                            <p className="text-xs text-textMuted p-2">Brak kalendarzy do wyświetlenia.</p>
                          ) : (
                            accountCalendars.map(cal => {
                              const isCurrentlyOn = selectedCalendars.includes(`${primaryAccountForEmail.id}:::${cal.id}`);
                              const isToggling = togglingId === cal.id;

                              return (
                                <div key={cal.id} className="flex items-center justify-between p-2 hover:bg-surfaceHover rounded-lg transition-colors">
                                  <div className="flex items-center gap-3 overflow-hidden pr-4">
                                    <span className="text-sm text-text font-medium truncate">
                                      {cal.summary} {cal.primary && <span className="text-xs text-textMuted ml-1">(Główny)</span>}
                                    </span>
                                  </div>
                                  
                                  <button
                                    type="button"
                                    role="switch"
                                    aria-checked={isCurrentlyOn}
                                    onClick={() => handleToggleCalendar(primaryAccountForEmail, cal, isCurrentlyOn)}
                                    disabled={isToggling}
                                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                      isCurrentlyOn ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                                    } ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  >
                                    {isToggling && (
                                      <div className="absolute inset-0 flex items-center justify-center z-10">
                                        <Loader2 className="w-3 h-3 text-white animate-spin" />
                                      </div>
                                    )}
                                    <span
                                      aria-hidden="true"
                                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                        isCurrentlyOn ? 'translate-x-4' : 'translate-x-0'
                                      } ${isToggling ? 'opacity-0' : 'opacity-100'}`}
                                    />
                                  </button>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="pt-2">
                <div className="form-label mb-2">Dodaj kolejne konto:</div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={handleConnectGoogle} className="flex items-center justify-center gap-2 px-3 py-2.5 bg-surface hover:bg-surfaceHover text-text font-bold text-sm rounded-lg border border-gray-200 dark:border-gray-700 transition-colors shadow-sm">
                    <GoogleIcon /> Google
                  </button>
                  <button onClick={handleConnectOutlook} className="flex items-center justify-center gap-2 px-3 py-2.5 bg-surface hover:bg-surfaceHover text-text font-bold text-sm rounded-lg border border-gray-200 dark:border-gray-700 transition-colors shadow-sm">
                    <MicrosoftIcon /> Outlook
                  </button>
                </div>
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

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
      <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
      <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
    </svg>
  );
}