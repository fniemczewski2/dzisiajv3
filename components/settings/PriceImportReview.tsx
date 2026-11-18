// components/settings/PriceImportReview.tsx
//
// Tabela weryfikacji importu (paragon albo CSV): użytkownik poprawia nazwę, jednostkę i cenę, wybiera, co zrobić przy
// zmianie ceny o więcej niż próg, i zatwierdza. Wiersze z brakami nie pozwalają zapisać, dopóki ich nie uzupełnisz
// albo nie odznaczysz; niezgodna suma paragonu wymaga osobnego potwierdzenia.

import React, { useId, useState } from "react";
import { PRICE_CHANGE_THRESHOLD } from "@/config/limits";
import {
  priceForUnit,
  rowChange,
  rowIssues,
  rowNeedsDecision,
  type ReviewRow,
  type ReviewSession,
} from "@/lib/prices/importPlan";
import { formatPln } from "@/lib/prices/text";
import { nameKey } from "@/lib/prices/text";
import { PRICE_UNITS, type ConflictDecision, type PriceUnit, type ProductPrice } from "@/types/prices";
import { CancelButton, SaveButton } from "../ui/CommonButtons";

const DECISIONS: { value: ConflictDecision; label: string }[] = [
  { value: "keep", label: "Nie aktualizuj" },
  { value: "average", label: "Uśrednij" },
  { value: "overwrite", label: "Nadpisz nową ceną" },
];

interface Props {
  session: ReviewSession;
  catalog: readonly ProductPrice[];
  /** Nazwy do podpowiedzi (przepisy i katalog). */
  nameOptions: readonly string[];
  busy: boolean;
  onConfirm: (rows: ReviewRow[], fingerprint?: string) => void;
  onCancel: () => void;
}

export default function PriceImportReview({
  session,
  catalog,
  nameOptions,
  busy,
  onConfirm,
  onCancel,
}: Readonly<Props>) {
  const listId = useId();
  const [rows, setRows] = useState<ReviewRow[]>(session.rows);
  const [mismatchConfirmed, setMismatchConfirmed] = useState(false);

  const patch = (id: string, change: Partial<ReviewRow>) =>
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...change } : row)));

  const changeUnit = (row: ReviewRow, unit: PriceUnit | null) => {
    const recomputed = row.source && !row.priceEdited ? priceForUnit(row.source, unit) : null;
    patch(row.id, { unit, price: recomputed ?? row.price });
  };

  const included = rows.filter((row) => row.include);
  const incomplete = included.filter((row) => rowIssues(row) !== null).length;
  const mismatchBlocks = session.totalMismatch && !mismatchConfirmed;
  const canSave = !busy && included.length > 0 && incomplete === 0 && !mismatchBlocks;

  return (
    <section
      className="mb-4 rounded-lg border border-line-strong p-3 sm:p-4"
      aria-label={`Weryfikacja: ${session.title}`}
    >
      <h4 className="mb-1 text-base font-bold text-text">{session.title}</h4>
      {session.notes.map((note) => (
        <p key={note} className="mb-1 text-xs text-text-secondary">
          {note}
        </p>
      ))}

      {session.totalMismatch && (
        <div role="alert" className="my-3 rounded-lg border border-warning-line bg-warning-soft p-3 text-sm">
          <p className="mb-2 font-semibold text-warning">
            Suma pozycji nie zgadza się z sumą na paragonie. Odczyt mógł pomylić cyfry, sprawdź ceny.
          </p>
          <label className="flex items-center gap-2 text-text">
            <input
              type="checkbox"
              checked={mismatchConfirmed}
              onChange={(e) => setMismatchConfirmed(e.target.checked)}
              className="h-5 w-5 accent-primary"
            />
            Sprawdziłem pozycje i chcę je zapisać
          </label>
        </div>
      )}

      <datalist id={listId}>
        {nameOptions.map((name) => (
          <option key={name} value={name} aria-label={name} />
        ))}
      </datalist>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-text-secondary">
              <th scope="col" className="w-10 py-2 pr-2">
                <span className="sr-only">Uwzględnij</span>
              </th>
              <th scope="col" className="py-2 pr-2">
                Produkt
              </th>
              <th scope="col" className="w-28 py-2 pr-2">
                Jednostka
              </th>
              <th scope="col" className="w-32 py-2 pr-2">
                Cena (zł za jednostkę)
              </th>
              <th scope="col" className="py-2">
                Uwagi
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const label = row.rawName || row.name;
              const change = rowChange(row, catalog);
              const needsDecision = rowNeedsDecision(row, catalog);
              const existing = catalog.find((entry) => entry.name_key === nameKey(row.name));
              return (
                <tr key={row.id} className="border-b border-line align-top">
                  <td className="py-2 pr-2">
                    <input
                      type="checkbox"
                      checked={row.include}
                      onChange={(e) => patch(row.id, { include: e.target.checked })}
                      aria-label={`Uwzględnij: ${label}`}
                      className="h-5 w-5 accent-primary"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="text"
                      list={listId}
                      value={row.name}
                      onChange={(e) => patch(row.id, { name: e.target.value })}
                      aria-label={`Nazwa produktu dla: ${label}`}
                      className="input-field py-1.5"
                      disabled={!row.include}
                    />
                    {row.rawName && (
                      <span className="mt-0.5 block text-xs text-text-muted">Na paragonie: {row.rawName}</span>
                    )}
                  </td>
                  <td className="py-2 pr-2">
                    <select
                      value={row.unit ?? ""}
                      onChange={(e) => changeUnit(row, (e.target.value || null) as PriceUnit | null)}
                      aria-label={`Jednostka: ${label}`}
                      className="input-field py-1.5"
                      disabled={!row.include}
                    >
                      <option value="">Wybierz</option>
                      {PRICE_UNITS.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={row.price ?? ""}
                      onChange={(e) =>
                        patch(row.id, {
                          price: e.target.value === "" ? null : Number(e.target.value),
                          priceEdited: true,
                        })
                      }
                      aria-label={`Cena za jednostkę: ${label}`}
                      className="input-field py-1.5"
                      disabled={!row.include}
                    />
                  </td>
                  <td className="py-2 text-xs text-text-secondary">
                    {row.flags.map((flag) => (
                      <p key={flag}>{flag}</p>
                    ))}
                    {row.include && needsDecision && existing && change !== null && (
                      <div className="mt-1">
                        <p className="text-warning">
                          Cena różni się o {Math.round(change * 100)}% od średniej {formatPln(existing.avg_price)} zł
                          (próg {Math.round(PRICE_CHANGE_THRESHOLD * 100)}%).
                        </p>
                        <label className="sr-only" htmlFor={`${row.id}-decision`}>
                          Co zrobić z ceną: {label}
                        </label>
                        <select
                          id={`${row.id}-decision`}
                          value={row.decision}
                          onChange={(e) => patch(row.id, { decision: e.target.value as ConflictDecision })}
                          className="input-field mt-1 py-1"
                        >
                          {DECISIONS.map((decision) => (
                            <option key={decision.value} value={decision.value}>
                              {decision.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <output className="block text-xs text-text-secondary">
          Do zapisu: {included.length}
          {incomplete > 0 ? `, do uzupełnienia: ${incomplete}` : ""}
        </output>
        <div className="flex gap-2">
          <CancelButton onClick={onCancel} disabled={busy} />
          <SaveButton onClick={() => onConfirm(rows, session.fingerprint)} disabled={!canSave} />
        </div>
      </div>
    </section>
  );
}
