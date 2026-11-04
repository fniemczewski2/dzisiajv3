// components/mail/MailAccountsPanel.tsx

import React from "react";
import { PlusCircle, Trash2 } from "lucide-react";
import { IconActionButton, SecondaryFullButton, ToggleChip } from "@/components/ui/CommonButtons";
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

const PROVIDER_NAME = { gmail: "Gmail", outlook: "Outlook" } as const;

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
    <section aria-labelledby="mail-accounts-heading" className="card space-y-3 p-4">
      <h2 id="mail-accounts-heading" className="section-title">
        Konta pocztowe
      </h2>
      {accounts.length === 0 ? (
        <p className="text-sm text-text-secondary">Nie podłączono jeszcze żadnego konta.</p>
      ) : (
        <ul className="space-y-2">
          {accounts.map((account) => (
            <li key={account.id} className="flex min-w-0 items-center gap-2">
              <div className="min-w-0 flex-1 wrap-anywhere">
                <ToggleChip
                  label={`${account.email} (${PROVIDER_NAME[account.provider]})`}
                  active={selectedId === account.id}
                  onClick={() => onSelect(account.id)}
                />
              </div>
              <IconActionButton
                Icon={Trash2}
                title={`Odłącz konto ${account.email}`}
                variant="danger"
                onClick={() => onDisconnect(account.id)}
                disabled={busy}
              />
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 grid gap-2 border-t border-line pt-2 sm:grid-cols-2">
        <SecondaryFullButton Icon={PlusCircle} onClick={onConnectGmail} disabled={busy}>
          Gmail
        </SecondaryFullButton>
        <SecondaryFullButton Icon={PlusCircle} onClick={onConnectOutlook} disabled={busy}>
          Outlook
        </SecondaryFullButton>
      </div>
    </section>
  );
}
