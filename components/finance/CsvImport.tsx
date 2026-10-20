// components/finance/CsvImport.tsx
//
// Import wyciągu z banku (CSV, format mBanku i zgodne). Każda transakcja
// dostaje kategorię (z pliku, a jeśli jej nie ma w budżecie – z historii
// podobnych transakcji, D2) i sugestię powiązania z rachunkiem stałym (D1).
// Ponowny import tego samego pliku niczego nie dubluje.

import React, { useRef, useState } from "react";
import { processCsvText, readFileAsText } from "@/lib/csvUtils";
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
}

export default function CsvImport({
  categories,
  categoryNames,
  bills,
  profileId,
  loadHistory,
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
      const { added, skipped } = await importTransactions(rows);
      const suggested = rows.filter((r) => r.link_status === "suggested").length;
      setResult(
        `Dodano: ${added}. Pominięto (już były): ${skipped}.` +
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
