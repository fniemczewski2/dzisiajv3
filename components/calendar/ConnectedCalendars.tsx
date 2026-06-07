"use client";

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Link2Off, Plus, Loader2, Link as LinkIcon } from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';

interface ConnectedAccount {
  id: string;
  provider: 'google' | 'outlook';
  account_email: string;
}

const supabase = createClient();

export default function ConnectedCalendars() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && expanded) {
      fetchAccounts();
    }
  }, [user, expanded]);

  // Pobieramy dane również na start, żeby znać status w nagłówku
  useEffect(() => {
    if (user) fetchAccounts();
  }, [user]);

  const fetchAccounts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('connected_calendars')
      .select('id, provider, account_email')
      .eq('user_id', user?.id);
      
    if (data) {
      setAccounts(data as ConnectedAccount[]);
    } else if (error) {
      toast.error('Nie udało się pobrać połączonych kalendarzy');
    }
    setLoading(false);
  };

  const handleConnectGoogle = () => {
    window.location.href = `/api/google-calendar?userId=${user?.id}`;
  };

  const handleConnectOutlook = () => {
    window.location.href = `/api/outlook-calendar?userId=${user?.id}`;
  };

  const handleDisconnect = async (id: string, email: string) => {
    const ok = await toast.confirm(`Czy na pewno chcesz odłączyć konto ${email}?`);
    if (!ok) return;

    const { error } = await supabase.from('connected_calendars').delete().eq('id', id);
    if (error) {
      toast.error('Błąd podczas odłączania konta');
    } else {
      toast.success(`Odłączono konto ${email}`);
      fetchAccounts();
    }
  };

  const currentStatus = () => {
    if (loading && accounts.length === 0) return "Sprawdzanie...";
    if (accounts.length === 0) return "Brak połączeń";
    return `${accounts.length} połączon${accounts.length === 1 ? 'e' : accounts.length < 5 ? 'e' : 'ych'} kont${accounts.length === 1 ? 'o' : 'a'}`;
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
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-textMuted shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-textMuted shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 bg-card px-4 py-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-4 gap-2 text-textMuted">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm font-medium">Ładowanie połączonych kont...</span>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Lista połączonych kont */}
              {accounts.length > 0 && (
                <div className="space-y-2">
                  <div className="form-label">Połączone konta:</div>
                  {accounts.map(account => (
                    <div 
                      key={account.id} 
                      className="flex justify-between items-center p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-surface"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 flex items-center justify-center shrink-0">
                          {account.provider === 'google' ? <GoogleIcon /> : <MicrosoftIcon />}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-text capitalize">
                            {account.provider}
                          </div>
                          <div className="text-xs text-textSecondary">
                            {account.account_email}
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDisconnect(account.id, account.account_email)} 
                        className="text-red-500 hover:text-red-600 transition-colors p-2"
                        title="Odłącz konto"
                      >
                        <Link2Off className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Sekcja dodawania nowych kont */}
              <div className="pt-2">
                <div className="form-label mb-2">Dodaj kolejne konto:</div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleConnectGoogle}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 bg-surface hover:bg-surfaceHover text-text font-bold text-sm rounded-lg border border-gray-200 dark:border-gray-700 transition-colors shadow-sm"
                  >
                    <GoogleIcon />
                    Google
                  </button>
                  <button
                    onClick={handleConnectOutlook}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 bg-surface hover:bg-surfaceHover text-text font-bold text-sm rounded-lg border border-gray-200 dark:border-gray-700 transition-colors shadow-sm"
                  >
                    <MicrosoftIcon />
                    Outlook
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

// Ikona Google (Zachowana ze starego komponentu)
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

// Nowa Ikona Microsoft (Flat Logo)
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