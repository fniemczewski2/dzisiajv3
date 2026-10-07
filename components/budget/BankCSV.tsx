// components/budget/BankCSV.tsx

import React, { useState, useRef, useMemo } from "react";
import { Upload, AlertCircle, CheckCircle2, FileText } from "lucide-react";
import { useBudgetCategories } from "@/hooks/db/useBudgetCategories";
import { useBills } from "@/hooks/db/useBills";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { FormButtons } from "../ui/CommonButtons";
import { BudgetCategory, ParsedTransaction } from "@/types/bills";
import { processCsvText, readFileAsText } from "@/lib/csvUtils";
import { BILLS_DEDUP_FETCH_LIMIT } from "@/config/limits";
import { getPostgresErrorCode } from "@/lib/errorUtils";
import { mapPool } from "@/lib/asyncPool";

export default function BankCsvImporter({ year }: { readonly year: number }) {
  const { user, supabase } = useAuth(); 
  const { toast } = useToast();
  const { categories, addCategory } = useBudgetCategories(year);
  const { addBill, fetchBills } = useBills(); 
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedData, setParsedData] = useState<ParsedTransaction[]>([]);
  const [missingCategories, setMissingCategories] = useState<string[]>([]);
  const [duplicatesCount, setDuplicatesCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const categoryBreakdown = useMemo(() => {
    const groups = new Map<string, { count: number; total: number }>();
    for (const t of parsedData) {
      const key = t.mappedCategory.trim() || "Bez kategorii";
      const entry = groups.get(key) ?? { count: 0, total: 0 };
      entry.count += 1;
      entry.total += t.is_income ? t.amount : -t.amount;
      groups.set(key, entry);
    }
    return [...groups.entries()].sort((a, b) => b[1].count - a[1].count);
  }, [parsedData]);

  const formatPln = (value: number) =>
    value.toLocaleString("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 2 });

  const handleFileParse = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const text = await readFileAsText(file);
      const { incomes, expenses } = await fetchBills(false, 1, BILLS_DEDUP_FETCH_LIMIT);
      const result = processCsvText(text, [...incomes, ...expenses], categories);

      if (result.transactions) {
        setParsedData(result.transactions);
        setDuplicatesCount(result.dupes);
        setMissingCategories(result.missingCategories);
      }
    } catch {
      toast.error("Wystąpił problem podczas odczytu pliku.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const findExistingCategory = async (name: string): Promise<BudgetCategory | null> => {
    const { data } = await supabase
      .from("budget_categories")
      .select("*")
      .ilike("name", name.trim())
      .eq("user_id", user?.id)
      .eq("year", year)
      .maybeSingle();
    return data ?? null;
  };

  const resolveMissingCategory = async (missingCat: string): Promise<BudgetCategory | null> => {
    try {
      const isMonthly = missingCat === "Opłaty stałe";
      const newCat = await addCategory({
        name: missingCat,
        monthly_amounts: new Array(12).fill(0),
        is_monthly: isMonthly,
      });
      return newCat ?? null;
    } catch (error) {
      const code = getPostgresErrorCode(error);
      const message = error instanceof Error ? error.message : "";
      const isDuplicate = code === "23505" || message.includes("duplicate key");
      if (!isDuplicate) throw error;
      return findExistingCategory(missingCat);
    }
  };

  const ensureCategoriesExist = async (missing: string[]): Promise<BudgetCategory[]> => {
    const updatedCategories = [...categories];
    for (const missingCat of missing) {
      const targetName = missingCat.toLowerCase().trim();
      if (updatedCategories.some(c => c.name.toLowerCase().trim() === targetName)) continue;

      const resolved = await resolveMissingCategory(missingCat);  
      if (resolved) updatedCategories.push(resolved);
    }
    return updatedCategories;
  };

  const insertBills = async (transactions: ParsedTransaction[], availableCategories: BudgetCategory[]) => {
    const tick = toast.batch((n) => `Dodano rachunki (${n})`);
    let skipped = 0;

    await mapPool(transactions, 3, async (t) => {
      const catTarget = t.mappedCategory.trim().toLowerCase();
      const categoryObj = availableCategories.find((c) => c.name.trim().toLowerCase() === catTarget);
      
      if (!categoryObj?.id) {
        skipped += 1;
        return;
      }

      try {
        await addBill({
          amount: t.amount,
          date: t.date,
          category_id: categoryObj.id,
          description: t.description.substring(0, 50),
          is_income: t.is_income,
          done: true, 
        }, { silent: true });
        tick();
      } catch (billError) {
        if (getPostgresErrorCode(billError) === "23503") {
          throw new Error(`Błąd połączenia z kategorią`);
        }
        throw billError;
      }
    });

    if (skipped > 0) {
      toast.info(`Pominięto ${skipped} operacji bez pasującej kategorii. Dodaj je ręcznie w Rachunkach.`);
    }
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;
    setLoading(true);
    try {
      const updatedCategories = await ensureCategoriesExist(missingCategories);
      await insertBills(parsedData, updatedCategories);
      handleCancel();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Wystąpił błąd podczas importu.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setParsedData([]);
    setMissingCategories([]);
    setDuplicatesCount(0);
  };

  return (
    <div className="widget rounded-xl shadow-sm px-4 py-3 mb-6">
      <div className="flex flex-row items-center justify-between gap-4">
          <h3 className="font-medium text-sm text-text flex items-center gap-4">
            <FileText className="w-5 h-5 text-primary" /> 
            Import z pliku mBank
          </h3>
        
        <div className="max-h-6 flex items-center">
        {parsedData.length === 0 && (
          <label className="cursor-pointer p-2 bg-surface hover:bg-surface-hover text-text-secondary rounded-lg border border-line transition-colors flex items-center gap-2 font-medium text-sm focus-within:ring-2 focus-within:ring-primary/70">
            <Upload className="w-3.5 h-3.5" />
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileParse}
            />
          </label>
        )}
        </div>
      </div>

      {parsedData.length > 0 && (
        <div className="bg-surface border border-line rounded-2xl p-5 animate-in fade-in slide-in-from-top-4 mt-4">
          <h4 className="font-semibold text-text mb-3">Podsumowanie importu</h4>
          
          <ul className="space-y-2 mb-5 text-sm text-text-secondary">
            <li className="flex items-center gap-2">
              <CheckCircle2 aria-hidden="true" className="w-4 h-4 text-green-700 dark:text-green-300" />
              <span>Gotowe do importu: <strong>{parsedData.length} operacji</strong></span>
            </li>
            
            {duplicatesCount > 0 && (
              <li className="flex items-center gap-2 text-text-muted">
                <AlertCircle aria-hidden="true" className="w-4 h-4 text-amber-700 dark:text-amber-300" />
                <span>Pominięto duplikatów: <strong>{duplicatesCount}</strong> (istnieją już w bazie)</span>
              </li>
            )}
            
            {missingCategories.length > 0 && (
              <li className="flex items-start gap-2 pt-2 border-t border-line mt-2">
                <AlertCircle aria-hidden="true" className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-text">Brakuje niezbędnych kategorii.</span>
                  <p className="text-text-muted mt-0.5">Zostaną one dodane automatycznie: {missingCategories.join(", ")}.</p>
                </div>
              </li>
            )}
          </ul>

          {categoryBreakdown.length > 0 && (
            <div className="mb-5">
              <p className="text-sm font-medium text-text mb-1">Przypisane kategorie</p>
              <p className="text-xs text-text-muted mb-2">
                Kategorie dobrano automatycznie na podstawie opisu operacji. Sprawdź je przed importem, a pomyłki popraw później w Rachunkach.
              </p>
              <div className="overflow-x-auto rounded-xl border border-line bg-card">
                <table className="w-full text-sm">
                  <caption className="sr-only">Liczba i suma operacji w każdej kategorii</caption>
                  <thead>
                    <tr className="text-left text-xs text-text-muted">
                      <th scope="col" className="px-3 py-2 font-medium">Kategoria</th>
                      <th scope="col" className="px-3 py-2 font-medium text-right">Operacje</th>
                      <th scope="col" className="px-3 py-2 font-medium text-right">Suma</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryBreakdown.map(([name, { count, total }]) => (
                      <tr key={name} className="border-t border-line">
                        <td className="px-3 py-2 text-text">{name}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-text-secondary">{count}</td>
                        <td className={`px-3 py-2 text-right tabular-nums font-medium ${total >= 0 ? "text-green-700 dark:text-green-300" : "text-text"}`}>
                          {formatPln(total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <FormButtons onClickSave={handleImport} onClickClose={handleCancel} loading={loading}/>
        </div>
      )}
    </div>
  );
}
