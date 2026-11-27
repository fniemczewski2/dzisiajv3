// components/finance/CsvImport.tsx
//
// Import wyciągu z banku (CSV, format mBanku i zgodne). Każda transakcja
// dostaje kategorię (z pliku, a jeśli jej nie ma w budżecie – z historii
// podobnych transakcji, D2) i sugestię powiązania z rachunkiem stałym (D1).
// Ponowny import tego samego pliku niczego nie dubluje, a wydatki zapisane wcześniej automatycznie
// (Apple Pay przez Skróty iOS) są rozpoznawane mimo innego opisu i daty księgowania.

import React, { useRef, useState } from "react";
import { processCsvText, readFileAsText } from "@/lib/csvUtils";
import { DEDUP_DATE_WINDOW_DAYS, splitByDuplicates } from "@/lib/financeDedup";
import { useToast } from "@/providers/ToastProvider";
import type { BudgetCategory } from "@/types/bills";
import type { NewTransaction, RecurringBill, Transaction } from "@/types/finance";
import { UploadButton } from "../ui/CommonButtons";

interface Props {
  categories: readonly BudgetCategory[];
  categoryNames: ReadonlyMap<string, string>;
  bills: readonly RecurringBill[];
  profileId: string | null;
  loadHistory: () => Promise<Transaction[]>;
  withSuggestions: (
    tx: NewTransaction,
    bills: readonly RecurringBill[],
    history: readonly Transaction[],
    categories: readonly BudgetCategory[],
    names: ReadonlyMap<string, string>
  ) => NewTransaction;
  importTransactions: (rows: NewTransaction[]) => Promise<{ added: number; skipped: number }>;
  /** Transakcje z zakresu dat pliku – do rozpoznania wydatków już zapisanych (np. z Apple Pay). */
  loadForDedup: (from: string, to: string) => Promise<Transaction[]>;
}

/** Dzień „yyyy-MM-dd” przesunięty o `days` (arytmetyka w UTC – chodzi o samą datę). */
function shiftDay(day: string, days: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export default function CsvImport({
  categories,
  categoryNames,
  bills,
  profileId,
  loadHistory,
  loadForDedup,
  withSuggestions,
  importTransactions,
}: Readonly<Props>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const onFile = async (file: File) => {
    setBusy(true);
    setResult(null);
    try {
      const parsed = processCsvText(await readFileAsText(file), [], [...categories]);
      if (!parsed.transactions?.length) {
        toast.error(parsed.error ?? "W pliku nie znaleziono transakcji.");
        return;
      }
      const history = await loadHistory();
      const byName = new Map(categories.map((c) => [c.name.toLocaleLowerCase("pl"), c.id]));
      const rows = parsed.transactions.map((t) =>
        withSuggestions(
          {
            date: t.date,
            amount: t.amount,
            is_income: t.is_income,
            description: t.description,
            category_id: byName.get(t.mappedCategory.trim().toLocaleLowerCase("pl")) ?? null,
            profile_id: profileId,
            recurring_bill_id: null,
            link_status: null,
            source: "csv",
            import_key: null,
          },
          bills,
          history,
          categories,
          categoryNames
        )
      );
      // Wydatki dopisane wcześniej automatycznie (Apple Pay) mają inny opis i bywają zaksięgowane
      // innego dnia niż w banku – sam klucz importu by ich nie rozpoznał (lib/financeDedup.ts).
      const dates = rows.map((r) => r.date).sort((a, b) => a.localeCompare(b));
      const existing = await loadForDedup(
        shiftDay(dates[0], -DEDUP_DATE_WINDOW_DAYS),
        shiftDay(dates.at(-1) as string, DEDUP_DATE_WINDOW_DAYS)
      );
      const { fresh, duplicates } = splitByDuplicates(rows, existing);

      const { added, skipped } = fresh.length ? await importTransactions(fresh) : { added: 0, skipped: 0 };
      const suggested = fresh.filter((r) => r.link_status === "suggested").length;
      setResult(
        `Dodano: ${added}. Pominięto jako już zapisane: ${skipped + duplicates.length}.` +
          (suggested ? ` Sugestie powiązań z rachunkami do sprawdzenia: ${suggested}.` : "")
      );
    } catch {
      toast.error("Nie udało się odczytać pliku.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        id="finance-csv"
        // Pole uruchamia przycisk obok – pomijamy je w kolejności tabulacji, ale zostawiamy nazwę.
        tabIndex={-1}
        aria-label="Plik CSV z wyciągiem z banku"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFile(f);
        }}
      />
      <UploadButton onClick={() => inputRef.current?.click()} fileFormat=".csv" small busy={busy} />
      {result && <output className="text-sm text-text-secondary">{result}</output>}
    </div>
  );
}
