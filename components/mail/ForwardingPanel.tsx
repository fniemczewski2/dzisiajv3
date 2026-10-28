// components/mail/ForwardingPanel.tsx
//
// Adresy przekierowania (wariant A). Adres z tokenem jest pokazywany jednorazowo po utworzeniu.

import React, { useState } from "react";
import type { ForwardingAddress } from "@/lib/mail/client";
import { INBOX_RETENTION_HOURS } from "@/lib/mail/forwarding";

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
        {INBOX_RETENTION_HOURS} godziny.
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
            <button
              type="button"
              onClick={() => onRevoke(a.id)}
              disabled={busy}
              aria-label={`Odwołaj adres ${a.label || a.id}`}
              className="min-h-11 rounded-lg px-3 text-sm text-danger hover:bg-danger-soft disabled:opacity-50"
            >
              Odwołaj
            </button>
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
        <button
          type="button"
          onClick={() => void create()}
          disabled={busy}
          className="min-h-11 rounded-lg border border-line-strong px-4 text-sm font-semibold text-text hover:bg-surface disabled:opacity-50"
        >
          Utwórz adres
        </button>
      </div>
    </section>
  );
}
