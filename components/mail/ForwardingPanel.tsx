// components/mail/ForwardingPanel.tsx
//
// Adresy przekierowania (wariant A). Adres z tokenem jest pokazywany jednorazowo po utworzeniu.

import { MAIL_INBOX_RETENTION_HOURS } from "@/config/limits";
import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { IconActionButton, SecondaryFullButton } from "@/components/ui/CommonButtons";
import type { ForwardingAddress } from "@/lib/mail/client";

interface Props {
  addresses: ForwardingAddress[];
  onCreate: (label: string) => Promise<string | null>;
  onRevoke: (id: string) => void;
  busy: boolean;
}

export default function ForwardingPanel({ addresses, onCreate, onRevoke, busy }: Readonly<Props>) {
  const [label, setLabel] = useState("");
  const [created, setCreated] = useState<string | null>(null);
  const active = addresses.filter((a) => a.revoked_at === null);

  const create = async () => {
    const address = await onCreate(label.trim());
    if (address) {
      setCreated(address);
      setLabel("");
    }
  };

  return (
    <section aria-labelledby="forwarding-heading" className="space-y-3">
      <h2 id="forwarding-heading" className="section-title">
        Przekierowania poczty
      </h2>
      <p className="text-sm text-text-secondary">
        Ustaw w swojej poczcie automatyczne przekierowanie na adres poniżej. Wiadomości są w aplikacji przez{" "}
        {MAIL_INBOX_RETENTION_HOURS} godziny.
      </p>
      {created && (
        <output className="block rounded-lg bg-surface px-3 py-2 text-sm break-all text-text">
          Adres (pokazany jednorazowo): <strong>{created}</strong>
        </output>
      )}
      <ul className="space-y-2">
        {active.map((a) => (
          <li key={a.id} className="flex items-center gap-2">
            <span className="flex-1 text-sm text-text">{a.label || "Bez nazwy"}</span>
            <IconActionButton
              Icon={Trash2}
              title={`Odwołaj adres ${a.label || "bez nazwy"}`}
              variant="danger"
              onClick={() => onRevoke(a.id)}
              disabled={busy}
            />
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex-1 text-sm text-text-secondary">
          Nazwa (opcjonalnie)
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={100}
            className="input-field mt-1 w-full"
          />
        </label>
        <SecondaryFullButton Icon={Plus} onClick={() => void create()} disabled={busy} className="sm:w-auto">
          Utwórz adres
        </SecondaryFullButton>
      </div>
    </section>
  );
}
