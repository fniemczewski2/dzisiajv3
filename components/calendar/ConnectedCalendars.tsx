"use client";

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Link2Off, Loader2, Link as LinkIcon, Download } from 'lucide-react';
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
  const [importing, setImporting] = useState(false);

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

      // Szukamy wiersza autoryzacyjnego albo jakiegokolwiek kalendarza z tego konta, żeby pobrać listę API
      const primaryGoogleAccount = fetchedAccounts.find(acc => acc.provider === 'google' && acc.google_calendar_id === '@account_connection') || fetchedAccounts.find(acc => acc.provider === 'google');
      
      if (primaryGoogleAccount) {
        const res = await fetch('/api/google-calendar?action=list-calendars', {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.calendars) {
            const apiCalendars = data.calendars.map((cal: any) => {
              // Szukamy konta głównego (rodzica) dla tego kalendarza (zwracanego przez backend)
              const parentAcc = fetchedAccounts.find(a => a.id === cal.primaryAccountId);
              
              // Sprawdzamy, czy ten konkretny sub-kalendarz jest już u nas w bazie
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
            
            // Automatycznie zaznacz te kalendarze, które już są zapisane w bazie danych
            const alreadySavedIds = apiCalendars.filter((c: any) => c.accountId).map((c: any) => c.id);
            setSelectedCalendars(alreadySavedIds);
          }
        }
      }
    } catch (err) {
      console.error("Błąd podczas pobierania list kalendarzy:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleImportSelected = async (currentAccount: ConnectedAccount) => {
    const fullPrimaryAcc = accounts.find(a => a.account_email === currentAccount.account_email && (a as any).google_calendar_id === '@account_connection') || accounts.find(a => a.account_email === currentAccount.account_email)!;
    if (!fullPrimaryAcc) return;

    const calsToProcess = calendars.filter(c => selectedCalendars.includes(c.id) && c.primaryAccountId === fullPrimaryAcc.id);
    if (calsToProcess.length === 0) return;

    setImporting(true);
    let totalImported = 0;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Brak sesji");

      for (const cal of calsToProcess) {
        let currentDbId = cal.accountId;

        // KROK A: Jeśli kalendarz nie ma jeszcze wiersza w bazie, tworzymy go jako nowy wpis connected_calendars!
        if (!currentDbId) {
          const { data: newAcc, error: insertErr } = await supabase
            .from('connected_calendars')
            .insert({
              user_id: user?.id,
              provider: 'google',
              account_email: fullPrimaryAcc.account_email,
              access_token: (fullPrimaryAcc as any).access_token,
              refresh_token: (fullPrimaryAcc as any).refresh_token,
              expires_at: (fullPrimaryAcc as any).expires_at,
              google_calendar_id: cal.id, // ID sub-kalendarza
              calendar_name: cal.summary   // Nazwa sub-kalendarza
            })
            .select('id')
            .single();

          if (insertErr) {
            console.error("Błąd tworzenia sub-kalendarza w bazie:", insertErr);
            continue;
          }
          currentDbId = newAcc.id;
        }

        // KROK B: Wywołanie istniejącego API importu przekazując ID nowo utworzonego/istniejącego rekordu
        const res = await fetch(`/api/google-calendar?action=import`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ 
            calendarId: cal.id,      // e.g. 'primary' lub ID grupy
            accountId: currentDbId    // UUID nowego wiersza z connected_calendars
          })
        });

        if (res.ok) {
          const data = await res.json();
          totalImported += data.imported || 0;
        }
      }

      toast.success(`Zapisano konfigurację kalendarzy i pobrano ${totalImported} wydarzeń.`);
      await fetchAccountsAndCalendars(); // Odśwież widok
    } catch (err) {
      toast.error("Wystąpił błąd podczas przetwarzania.");
    } finally {
      setImporting(false);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      // Bezpieczniejsze pobranie samej sesji do autoryzacji zapytań
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        toast.error("Brak aktywnej sesji. Zaloguj się ponownie.");
        console.error("Session Error:", sessionError);
        return;
      }

      const res = await fetch('/api/google-calendar?action=auth-url', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(`Błąd HTTP ${res.status}: ${errorData.error || 'Nieznany błąd'}`);
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast.error("Nie udało się rozpocząć logowania do Google");
      console.error("[Google Auth Error]:", error.message || error);
    }
  };

  const handleConnectOutlook = () => {
    window.location.href = `/api/outlook-calendar?action=auth-url&userId=${user?.id}`;
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
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Błąd serwera");
      }

      toast.success(`Odłączono konto ${email} oraz usunięto powiązane wydarzenia.`);
      
      // Czyszczenie stanu lokalnego zaznaczonych pozycji
      setSelectedCalendars(prev => prev.filter(calId => 
        !calendars.find(c => c.id === calId && c.accountId === id)
      ));
      
      await fetchAccountsAndCalendars();
    } catch (error: any) {
      toast.error(error.message || 'Błąd podczas odłączania konta');
      console.error("[Disconnect Error]:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCalendarSelection = (calendarId: string) => {
    setSelectedCalendars(prev => 
      prev.includes(calendarId) 
        ? prev.filter(id => id !== calendarId)
        : [...prev, calendarId]
    );
  };

  const currentStatus = () => {
    // Liczymy tylko unikalne adresy e-mail (ignorujemy nadmiarowe wiersze poszczególnych kalendarzy i wiersz techniczny)
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
                    console.log(accounts)
                    console.log(primaryAccountForEmail)
                    console.log(calendars)
                    const accountCalendars = calendars.filter(c => (c as any).primaryAccountId === primaryAccountForEmail.id);
                    const selectedForThisAccount = accountCalendars.filter(c => selectedCalendars.includes(c.id));

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

                        <div className="p-3 space-y-2">
                          {accountCalendars.length === 0 ? (
                            <p className="text-xs text-textMuted pl-2">Brak kalendarzy do wyświetlenia.</p>
                          ) : (
                            accountCalendars.map(cal => (
                              <label key={cal.id} className="flex items-center gap-3 p-2 hover:bg-surfaceHover rounded-lg cursor-pointer transition-colors">
                                <input 
                                  type="checkbox" 
                                  checked={selectedCalendars.includes(cal.id)}
                                  onChange={() => toggleCalendarSelection(cal.id)}
                                  className="rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <span className="text-sm text-text font-medium truncate">
                                  {cal.summary} {cal.primary && <span className="text-xs text-textMuted ml-1">(Główny)</span>}
                                </span>
                              </label>
                            ))
                          )}

                          {accountCalendars.length > 0 && (
                            <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-800">
                              <button
                                onClick={() => handleImportSelected(primaryAccountForEmail)}
                                disabled={selectedForThisAccount.length === 0 || importing}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary text-white font-bold text-sm rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                {importing 
                                  ? "Importowanie..." 
                                  : `Pobierz wydarzenia z zaznaczonych (${selectedForThisAccount.length})`}
                              </button>
                            </div>
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