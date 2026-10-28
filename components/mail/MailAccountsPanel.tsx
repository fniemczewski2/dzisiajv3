// components/mail/MailAccountsPanel.tsx

import React from "react";
import type { MailAccount } from "@/lib/mail/client";

interface Props {
  accounts: MailAccount[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onConnectGmail: () => void;
  onConnectOutlook: () => void;
  onDisconnect: (id: string) => void;
  busy: boolean;
}

export default function MailAccountsPanel({
  accounts,
  selectedId,
  onSelect,
  onConnectGmail,
  onConnectOutlook,
  onDisconnect,
  busy,
}: Readonly<Props>) {
  return (
    <section aria-labelledby="mail-accounts-heading" className="space-y-3">
      <h2 id="mail-accounts-heading" className="section-title">
        Konta pocztowe
      </h2>
      {accounts.length === 0 ? (
        <p className="text-sm text-text-secondary">Nie podłączono jeszcze żadnego konta.</p>
      ) : (
        <ul className="space-y-2">
          {accounts.map((account) => (
            <li key={account.id} className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onSelect(account.id)}
                aria-pressed={selectedId === account.id}
                className={`min-h-11 flex-1 rounded-lg border px-3 text-left text-sm ${
                  selectedId === account.id
                    ? "border-primary font-semibold text-text"
                    : "border-line text-text-secondary"
                }`}
              >
                {account.email} <span className="text-xs">({account.provider === "gmail" ? "Gmail" : "Outlook"})</span>
              </button>
              <button
                type="button"
                onClick={() => onDisconnect(account.id)}
                disabled={busy}
                aria-label={`Odłącz konto ${account.email}`}
                className="min-h-11 rounded-lg px-3 text-sm text-danger hover:bg-danger-soft disabled:opacity-50"
              >
                Odłącz
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={onConnectGmail}
        disabled={busy}
        className="min-h-11 rounded-lg border border-line-strong px-4 text-sm font-semibold text-text hover:bg-surface disabled:opacity-50"
      >
        Podłącz konto Gmail
      </button>
      <button
        type="button"
        onClick={onConnectOutlook}
        disabled={busy}
        className="min-h-11 rounded-lg border border-line-strong px-4 text-sm font-semibold text-text hover:bg-surface disabled:opacity-50"
      >
        Podłącz konto Outlook
      </button>
    </section>
  );
}
