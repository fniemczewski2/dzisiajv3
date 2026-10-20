// components/calendar/ConnectedCalendars.tsx

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Link2Off, Loader2, Link as LinkIcon, AlertTriangle } from "lucide-react";
import { useConnectedCalendars } from "@/hooks/db/useConnectedCalendars";

export default function ConnectedCalendars() {
  const [expanded, setExpanded] = useState(false);

  const {
    accounts,
    calendars,
    selectedCalendars,
    loading,
    togglingId,
    handleToggleCalendar,
    handleDisconnect,
    handleConnectGoogle,
    handleConnectOutlook,
  } = useConnectedCalendars(expanded);

  const currentStatus = () => {
    const rootAccounts = accounts.filter((a) => a.google_calendar_id === "@account_connection");
    if (loading && rootAccounts.length === 0) return "Sprawdzanie...";
    const count = rootAccounts.length;
    if (count === 0) return "Brak połączeń";
    if (count === 1) return "1 połączone konto";
    if (count > 1 && count < 5) return `${count} połączone konta`;
    return `${count} połączonych kont`;
  };

  const mainAccounts = accounts.filter((a) => a.google_calendar_id === "@account_connection");

  return (
    <div className="card mt-2 overflow-hidden shadow-sm transition-all">
      <button
        onClick={() => setExpanded((p) => !p)}
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-surface"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface">
            <LinkIcon className="h-4 w-4 text-text-secondary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-text">Zewnętrzne Kalendarze</p>
            <p className="text-xs font-medium text-text-muted">{currentStatus()}</p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-text-muted" />
        ) : (
          <ChevronDown className="h-4 w-4 text-text-muted" />
        )}
      </button>

      {expanded && (
        <div className="space-y-6 border-t border-line bg-card px-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-4 text-text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">Wczytywanie kont i kalendarzy...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {mainAccounts.length > 0 && (
                <div className="space-y-4">
                  <div className="form-label text-sm font-bold">Połączone konta i kalendarze:</div>

                  {mainAccounts.map((account) => {
                    const accountCalendars = calendars.filter((c) => c.primaryAccountId === account.id);

                    return (
                      <div key={account.id} className="overflow-hidden rounded-xl border border-line bg-surface">
                        <div className="flex items-center justify-between border-b border-line bg-card p-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                              {account.provider === "google" ? <GoogleIcon /> : <MicrosoftIcon />}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-text capitalize">{account.provider}</div>
                              <div className="text-xs text-text-secondary">{account.account_email}</div>
                              {account.sync_error && (
                                <div className="mt-0.5 flex items-center gap-1 text-xs font-medium text-warning">
                                  <AlertTriangle className="h-3 w-3 shrink-0" />
                                  <span>Wymaga ponownej autoryzacji – połącz konto ponownie</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDisconnect(account.id, account.account_email, account.provider)}
                            type="button"
                            className="p-2 text-danger transition-colors hover:text-danger"
                            title="Odłącz całe konto"
                          >
                            <Link2Off className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="space-y-1 p-2">
                          {accountCalendars.length === 0 ? (
                            <p className="p-2 text-xs text-text-muted">Brak kalendarzy do wyświetlenia.</p>
                          ) : (
                            accountCalendars.map((cal) => {
                              const isCurrentlyOn = selectedCalendars.includes(`${account.id}:::${cal.id}`);
                              const isToggling = togglingId === cal.id;

                              return (
                                <div
                                  key={cal.id}
                                  className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-surface-hover"
                                >
                                  <div className="flex items-center gap-3 overflow-hidden pr-4">
                                    <span className="truncate text-sm font-medium text-text">
                                      {cal.summary}{" "}
                                      {cal.primary && <span className="ml-1 text-xs text-text-muted">(Główny)</span>}
                                    </span>
                                  </div>

                                  <button
                                    type="button"
                                    role="switch"
                                    aria-checked={isCurrentlyOn}
                                    onClick={() => handleToggleCalendar(account, cal, isCurrentlyOn)}
                                    disabled={isToggling}
                                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
                                      isCurrentlyOn ? "bg-primary" : "bg-line-strong"
                                    } ${isToggling ? "cursor-not-allowed opacity-50" : ""}`}
                                  >
                                    {isToggling && (
                                      <div className="absolute inset-0 z-10 flex items-center justify-center">
                                        <Loader2 className="h-3 w-3 animate-spin text-white" />
                                      </div>
                                    )}
                                    <span
                                      aria-hidden="true"
                                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                        isCurrentlyOn ? "translate-x-4" : "translate-x-0"
                                      } ${isToggling ? "opacity-0" : "opacity-100"}`}
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
                  <button
                    type="button"
                    onClick={handleConnectGoogle}
                    className="flex items-center justify-center gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 text-sm font-bold text-text shadow-sm transition-colors hover:bg-surface-hover"
                  >
                    <GoogleIcon decorative /> Google
                  </button>
                  <button
                    type="button"
                    onClick={handleConnectOutlook}
                    className="flex items-center justify-center gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 text-sm font-bold text-text shadow-sm transition-colors hover:bg-surface-hover"
                  >
                    <MicrosoftIcon decorative /> Outlook
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

/** Logo dostawcy: z nazwą, gdy stoi samo; ukryte, gdy obok jest napis (`decorative`). */
function GoogleIcon({ decorative = false }: Readonly<{ decorative?: boolean }>) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": "Google" })}
    >
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.259c-.806.54-1.837.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}

function MicrosoftIcon({ decorative = false }: Readonly<{ decorative?: boolean }>) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 21 21"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": "Microsoft" })}
    >
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}
