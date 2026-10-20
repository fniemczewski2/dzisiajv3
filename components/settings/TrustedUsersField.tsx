// components/settings/TrustedUsersField.tsx
//
// Lista adresów e-mail zaufanych osób. Każdy wiersz ma stały identyfikator
// (nie indeks) – usunięcie środkowej osoby nie przenosi fokusu ani wpisanego
// tekstu do sąsiedniego pola.

import { useState } from "react";
import { PlusCircle } from "lucide-react";
import { DeleteButton } from "@/components/ui/CommonButtons";
import { MAX_TRUSTED_USERS } from "@/config/limits";

interface Row {
  id: string;
  email: string;
}

const toRows = (emails: readonly string[]): Row[] => emails.map((email) => ({ id: crypto.randomUUID(), email }));

export default function TrustedUsersField({
  users,
  onChange,
}: Readonly<{ users: readonly string[]; onChange: (next: string[]) => void }>) {
  const [rows, setRows] = useState<Row[]>(() => toRows(users));
  // Lista z zewnątrz (wczytanie ustawień, zapis w innej karcie) – nowe wiersze w trakcie renderu.
  const usersKey = JSON.stringify(users);
  const [seenKey, setSeenKey] = useState(usersKey);
  if (usersKey !== seenKey) {
    setSeenKey(usersKey);
    if (JSON.stringify(rows.map((r) => r.email)) !== usersKey) setRows(toRows(users));
  }

  const commit = (next: Row[]) => {
    setRows(next);
    onChange(next.map((r) => r.email));
  };

  return (
    <fieldset className="max-w-md min-w-0 space-y-2">
      <legend className="sr-only">Zaufani użytkownicy</legend>
      {rows.map((row, idx) => (
        <div key={row.id} className="flex items-center gap-2">
          <label htmlFor={`trusted-user-${row.id}`} className="sr-only">
            Adres e-mail zaufanej osoby {idx + 1}
          </label>
          <input
            id={`trusted-user-${row.id}`}
            type="email"
            value={row.email}
            placeholder="E-mail"
            onChange={(e) => commit(rows.map((r) => (r.id === row.id ? { ...r, email: e.target.value } : r)))}
            className="input-field"
          />
          <DeleteButton
            small
            ariaLabel={"Usuń " + (row.email || "osobę " + (idx + 1))}
            onClick={() => commit(rows.filter((r) => r.id !== row.id))}
          />
        </div>
      ))}
      {rows.length < MAX_TRUSTED_USERS ? (
        <button
          type="button"
          onClick={() => commit([...rows, { id: crypto.randomUUID(), email: "" }])}
          className="flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <PlusCircle className="h-4 w-4" aria-hidden="true" /> Dodaj osobę
        </button>
      ) : (
        <p className="text-sm text-text-secondary">
          Osiągnięto limit {MAX_TRUSTED_USERS} zaufanych osób. Usuń kogoś z listy, aby dodać nową osobę.
        </p>
      )}
    </fieldset>
  );
}
