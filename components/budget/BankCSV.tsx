"use client";

import React, { useState, useRef } from "react";
import { Upload, AlertCircle, CheckCircle2, FileText } from "lucide-react";
import { useBudgetCategories } from "@/hooks/db/useBudgetCategories";
import { useBills } from "@/hooks/db/useBills";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { FormButtons } from "../ui/CommonButtons";
import { BudgetCategory, ParsedTransaction } from "@/types";
import { processCsvText, readFileAsText } from "@/lib/csvUtils";

export default function BankCsvImporter({ year }: { readonly year: number }) {
  const { user, supabase } = useAuth(); 
  const { toast } = useToast();
  const { categories, addCategory } = useBudgetCategories(year);
  // Pobieramy expenseItems by przekazać je do deduplikacji
  const { addBill, expenseItems } = useBills(); 
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedData, setParsedData] = useState<ParsedTransaction[]>([]);
  const [missingCategories, setMissingCategories] = useState<string[]>([]);
  const [duplicatesCount, setDuplicatesCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleFileParse = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const text = await readFileAsText(file);
      const result = processCsvText(text, expenseItems, categories);

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

  const ensureCategoriesExist = async (missing: string[]): Promise<BudgetCategory[]> => {
    let updatedCategories = [...categories];
    for (const missingCat of missing) {
      const targetName = missingCat.toLowerCase().trim();
      if (updatedCategories.some(c => c.name.toLowerCase().trim() === targetName)) continue;
      
      try {
        const isMonthly = missingCat === "Opłaty stałe";
        const newCat = await addCategory({ 
          name: missingCat, 
          monthly_amounts: new Array(12).fill(0), 
          is_monthly: isMonthly 
        });
        updatedCategories.push(newCat);
      } catch (error: any) {
        if (error?.code === "23505" || error?.message?.includes("duplicate key")) {
          const { data } = await supabase
            .from("budget_categories")
            .select("*")
            .ilike("name", missingCat.trim())
            .eq("user_id", user?.id)
            .eq("year", year)
            .maybeSingle();
          if (data) updatedCategories.push(data);
        } else {
          throw error;
        }
      }
    }
    return updatedCategories;
  };

  const insertBills = async (transactions: ParsedTransaction[], availableCategories: BudgetCategory[]) => {
    for (const t of transactions) {
      const catTarget = t.mappedCategory.trim().toLowerCase();
      const categoryObj = availableCategories.find((c) => c.name.trim().toLowerCase() === catTarget);
      
      if (!categoryObj?.id) {
        console.warn("Pominięto operację - brak prawidłowego ID kategorii", t);
        continue;
      }

      try {
        await addBill({
          amount: t.amount,
          date: t.date,
          category_id: categoryObj.id,
          description: t.description.substring(0, 50),
          is_income: false,
          done: true, 
        });
      } catch (billError: any) {
        if (billError?.code === "23503") {
          throw new Error(`Błąd połączenia z kategorią "${categoryObj.name}". Odśwież stronę (klawisz F5) i spróbuj ponownie.`);
        }
        throw billError;
      }
    }
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;
    setLoading(true);
    const updatedCategories = await ensureCategoriesExist(missingCategories);
    await insertBills(parsedData, updatedCategories);
    handleCancel();
    setLoading(false);
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
        
        <div className="max-h-[24px] flex items-center">
        {parsedData.length === 0 && (
          <label className="cursor-pointer p-2 bg-surface hover:bg-surfaceHover text-textSecondary rounded-lg border border-gray-200 dark:border-gray-700 transition-colors flex items-center gap-2 font-medium text-sm">
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
        <div className="bg-surface border border-gray-100 dark:border-gray-800 rounded-xl p-5 animate-in fade-in slide-in-from-top-4 mt-4">
          <h4 className="font-bold text-text mb-3">Podsumowanie importu</h4>
          
          <ul className="space-y-2 mb-5 text-sm text-textSecondary">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span>Gotowe do importu: <strong>{parsedData.length} operacji</strong></span>
            </li>
            
            {duplicatesCount > 0 && (
              <li className="flex items-center gap-2 text-textMuted">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span>Pominięto duplikatów: <strong>{duplicatesCount}</strong> (istnieją już w bazie)</span>
              </li>
            )}
            
            {missingCategories.length > 0 && (
              <li className="flex items-start gap-2 pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
                <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-text">Brakuje niezbędnych kategorii.</span>
                  <p className="text-textMuted mt-0.5">Zostaną one dodane automatycznie: {missingCategories.join(", ")}.</p>
                </div>
              </li>
            )}
          </ul>

          <FormButtons onClickSave={handleImport} onClickClose={handleCancel} loading={loading}/>
        </div>
      )}
    </div>
  );
}