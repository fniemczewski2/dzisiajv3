// components/settings/VaultDuplicates.tsx
//
// Duplikaty osób przy imporcie z vaultu Obsidiana: plik z folderu „Osoby” ma to samo imię i nazwisko co osoba
// w aplikacji. Użytkownik wybiera: scal z wybraną osobą, utwórz nową (priorytet 5) albo pomiń plik na stałe.
// Decyzja wykonuje się przy następnej synchronizacji.

import React, { useId, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Merge, SkipForward, UserPlus } from "lucide-react";
import { SecondaryFullButton } from "@/components/ui/CommonButtons";
import { useToast } from "@/providers/ToastProvider";

interface Candidate {
  id: string;
  first_name: string;
  last_name: string;
  relationship: string | null;
  priority: number;
  phones: string[];
  emails: string[];
  birthday: string | null;
}

interface Duplicate {
  fileId: string;
  path: string;
  fromVault: {
    relationship: string | null;
    phones: string[];
    emails: string[];
    birthday: string | null;
    hasNotes: boolean;
  };
  candidates: Candidate[];
}

type Action = "merge" | "create" | "skip";

async function postDecision(body: { fileId: string; action: Action; personId?: string }): Promise<void> {
  const res = await fetch("/api/obsidian/import-decisions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Nie udało się zapisać decyzji.");
  }
}

function describe(c: Pick<Candidate, "relationship" | "phones" | "emails" | "birthday">): string {
  const parts = [
    c.relationship || "bez relacji",
    `tel. ${c.phones?.length ?? 0}`,
    `e-mail ${c.emails?.length ?? 0}`,
    c.birthday ? `ur. ${c.birthday}` : null,
  ];
  return parts.filter(Boolean).join(" · ");
}

function DuplicateRow({ item, onDone }: Readonly<{ item: Duplicate; onDone: () => Promise<void> }>) {
  const { toast } = useToast();
  const groupId = useId();
  const [personId, setPersonId] = useState(item.candidates[0]?.id ?? "");
  const [busy, setBusy] = useState(false);

  const decide = async (action: Action) => {
    setBusy(true);
    try {
      await postDecision({ fileId: item.fileId, action, ...(action === "merge" ? { personId } : {}) });
      await onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Błąd zapisu.", { cause: err });
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="card space-y-2 p-3">
      <p className="text-sm text-text">
        <code>{item.path}</code>
        <br />
        <span className="text-text-muted">
          Plik: {describe(item.fromVault)}
          {item.fromVault.hasNotes ? " · notatki" : ""}
        </span>
      </p>
      <fieldset className="space-y-1">
        <legend className="text-sm text-text-secondary">Osoba w aplikacji</legend>
        {item.candidates.map((c) => (
          <label key={c.id} htmlFor={`${groupId}-${c.id}`} className="flex items-center gap-2 text-sm text-text">
            <input
              id={`${groupId}-${c.id}`}
              type="radio"
              name={groupId}
              value={c.id}
              checked={personId === c.id}
              onChange={() => setPersonId(c.id)}
            />
            {c.first_name} {c.last_name}{" "}
            <span className="text-text-muted">
              ({describe(c)}, priorytet {c.priority})
            </span>
          </label>
        ))}
      </fieldset>
      <div className="grid gap-2 sm:grid-cols-3">
        <SecondaryFullButton Icon={Merge} onClick={() => void decide("merge")} disabled={busy || !personId}>
          Scal z wybraną
        </SecondaryFullButton>
        <SecondaryFullButton Icon={UserPlus} onClick={() => void decide("create")} disabled={busy}>
          Utwórz nową
        </SecondaryFullButton>
        <SecondaryFullButton Icon={SkipForward} onClick={() => void decide("skip")} disabled={busy}>
          Pomiń plik
        </SecondaryFullButton>
      </div>
    </li>
  );
}

export default function VaultDuplicates() {
  const queryClient = useQueryClient();
  const duplicates = useQuery({
    queryKey: ["vault-duplicates"],
    queryFn: async () => {
      const res = await fetch("/api/obsidian/import-decisions");
      if (!res.ok) throw new Error("Nie udało się pobrać duplikatów.");
      return ((await res.json()) as { duplicates: Duplicate[] }).duplicates;
    },
  });
  const list = duplicates.data ?? [];
  if (list.length === 0) return null;
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["vault-duplicates"] });

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-text">Duplikaty osób z vaultu ({list.length})</h3>
      <p className="text-sm text-text-secondary">
        Te pliki mają imię i nazwisko osoby, która już jest w aplikacji. Scalenie uzupełnia puste pola i dopisuje
        notatki; nowa osoba dostaje priorytet 5. Decyzje wykonują się przy następnej synchronizacji.
      </p>
      <ul className="space-y-2">
        {list.map((item) => (
          <DuplicateRow key={item.fileId} item={item} onDone={refresh} />
        ))}
      </ul>
    </div>
  );
}
