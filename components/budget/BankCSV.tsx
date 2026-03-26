"use client";

import React, { useState, useRef } from "react";
import { Upload, AlertCircle, CheckCircle2, FileText } from "lucide-react";
import { useBudgetCategories } from "../../hooks/useBudgetCategories";
import { useBills } from "../../hooks/useBills";
import { useToast } from "../../providers/ToastProvider";
import { useAuth } from "../../providers/AuthProvider";
import { FormButtons } from "../CommonButtons";
import { BudgetCategory } from "../../types";

const REQUIRED_CATEGORIES = [
  "Opłaty stałe",
  "Rozrywka",
  "Odzież",
  "Jedzenie",
  "Elektronika",
  "Transport",
  "Wakacje",
];

const mapCategory = (mbankCat: string, desc: string): string => {
  const c = mbankCat.toLowerCase();
  const d = desc.toLowerCase();

  if (c.includes("tv") || c.includes("internet") || c.includes("telefon") || c.includes("ubezpiecz") || d.includes("ubezpieczenie")) return "Opłaty stałe";
  if (c.includes("rozrywka") || c.includes("multimedia") || c.includes("książki") || c.includes("prasa") || c.includes("sport") || c.includes("hobby") || c.includes("edukacja") || c.includes("kino") || d.includes("kino") || c.includes("teatr")) return "Rozrywka";
  if (c.includes("odzież") || c.includes("obuwie") || d.includes("ubrania")) return "Odzież";
  if (c.includes("żywność") || c.includes("chemia") || c.includes("zdrowie") || c.includes("uroda") || c.includes("supermarket") || c.includes("apteki")) return "Jedzenie";
  if (c.includes("elektronika") || c.includes("rtv") || c.includes("agd")) return "Elektronika";
  if (c.includes("transport") || c.includes("przejazdy") || c.includes("paliwo") || c.includes("komunikacja") || d.includes("ztm") || d.includes("mpk") || d.includes("pkp") || d.includes("regiojet")) return "Transport";
  if (c.includes("podróże") || c.includes("wakacje") || c.includes("hotel") || c.includes("loty") || d.includes("ryanair") || d.includes("wizzair")) return "Wakacje";
  
  return "Inne"; 
};

const DESCRIPTION_MAPPINGS = [
  { match: ["BIEDRONKA"], name: "Biedronka" },
  { match: ["LIDL"], name: "Lidl" },
  { match: ["KAUFLAND"], name: "Kaufland" },
  { match: ["AUCHAN"], name: "Auchan" },
  { match: ["CARREFOUR"], name: "Carrefour" },
  { match: ["NETTO"], name: "Netto" },
  { match: ["ALDI"], name: "Aldi" },
  { match: ["DINO"], name: "Dino" },
  { match: ["FAWOR"], name: "Fawor" },
  { match: ["PIEKRANIA"], name: "Piekarnia" },
  { match: ["PIEKRANIA NATURA"], name: "Natura" },
  { match: ["ZABKA", "ŻABKA"], name: "Żabka" },
  { match: ["POLOMARKET"], name: "PoloMarket" },
  { match: ["PKP INTERCITY", "PKP IC"], name: "PKP Intercity" },
  { match: ["KWIACIARNIA"], name: "Kwiaciarnia" },
  { match: ["KOLEJE MAZOWIECKIE"], name: "KM", exactWord: true },
  { match: ["KOLEJE WIELKOPOLSKIE", "KW"], name: "KW", exactWord: true },
  { match: ["POLREGIO", "PRZEWOZY REGIONALNE"], name: "PR", exactWord: true },
  { match: ["REGIOJET"], name: "RegioJet" },
  { match: ["UBER"], name: "Uber" },
  { match: ["BOLT"], name: "Bolt" },
  { match: ["FREENOW", "FREE NOW"], name: "FreeNow" },
  { match: ["JAKDOJADE"], name: "Jakdojade" },
  { match: ["SKYCASH"], name: "SkyCash" },
  { match: ["RYANAIR"], name: "Ryanair" },
  { match: ["WIZZAIR"], name: "WizzAir" },
  { match: ["ORLEN"], name: "Orlen" },
  { match: ["BP"], name: "BP", exactWord: true },
  { match: ["SHELL"], name: "Shell" },
  { match: ["CIRCLE K", "CIRCLEK"], name: "Circle K" },
  { match: ["ROSSMANN"], name: "Rossmann" },
  { match: ["SUPER-PHARM", "SUPERPHARM"], name: "Super-Pharm" },
  { match: ["HEBE"], name: "Hebe" },
  { match: ["MCDONALD", "MC DONALD"], name: "McDonald's" },
  { match: ["KFC"], name: "KFC", exactWord: true },
  { match: ["BURGER KING"], name: "Burger King" },
  { match: ["STARBUCKS"], name: "Starbucks" },
  { match: ["PYSZNE", "PYSZNE.PL"], name: "Pyszne.pl" },
  { match: ["GLOVO"], name: "Glovo" },
  { match: ["WOLT"], name: "Wolt" },
  { match: ["NETFLIX"], name: "Netflix" },
  { match: ["SPOTIFY"], name: "Spotify" },
  { match: ["APPLE.COM", "APPLE COM", "ITUNES"], name: "Apple" },
  { match: ["GOOGLE", "YOUTUBE"], name: "Google" },
  { match: ["STEAM"], name: "Steam" },
  { match: ["PLAYSTATION", "SONY"], name: "Sony" },
  { match: ["XBOX"], name: "Xbox" },
  { match: ["INEA"], name: "Inea" },
  { match: ["ALLEGRO"], name: "Allegro" },
  { match: ["AMAZON"], name: "Amazon" },
  { match: ["ALIEXPRESS"], name: "AliExpress" },
  { match: ["INPOST"], name: "InPost" },
  { match: ["IKEA"], name: "IKEA" },
  { match: ["CASTORAMA"], name: "Castorama" },
  { match: ["LEROY MERLIN"], name: "Leroy Merlin" },
  { match: ["DECATHLON"], name: "Decathlon" },
  { match: ["CCC"], name: "CCC", exactWord: true },
  { match: ["ZARA"], name: "Zara" },
  { match: ["H&M"], name: "H&M" },
  { match: ["ZALANDO"], name: "Zalando" },
  { match: ["VINTED"], name: "Vinted" },
  { match: ["PEPCO"], name: "Pepco" },
  { match: ["EMPIK"], name: "Empik" },
  { match: ["KINO MUZA"], name: "Kino Muza" },
  { match: ["CINEMA CITY"], name: "Cinema City" },
  { match: ["MULTIKINO"], name: "Multikino" },
  { match: ["HELIOS"], name: "Helios" },
  { match: ["NATIONALE-NEDERLANDEN"], name: "NN Ubezpieczenie" },
  { match: ["POZNAN ZARZAD"], name: "ZTM Poznań" }
];

const BOILERPLATE_REGEXES = [
  /ZAKUP PRZY UŻYCIU KARTY - INTERNET/gi,
  /ZAKUP PRZY UŻYCIU KARTY W KRAJU/gi,
  /ZAKUP PRZY UŻYCIU KARTY ZA GRANICĄ/gi,
  /ZAKUP PRZY UŻYCIU KARTY/gi,
  /TRANSAKCJA KARTĄ/gi,
  /TRANSAKCJA ZBLIŻENIOWA/gi,
  /PŁATNOŚĆ KARTĄ/gi,
  /OPERACJA BLIK/gi,
  /DATA TRANSAKCJI:/gi,
  /DATA KSIĘGOWANIA:/gi,
  /KARTA:/gi,
  /PRZELEW WEWNĘTRZNY PRZYCHODZĄCY/gi,
  /PRZELEW ŚRODKÓW/gi,
  /\d{2}\.\d{2}\.\d{4}/g,
  /\d{2}-\d{3}\s+[A-Za-zęóąśłżźćńĘÓĄŚŁŻŹĆŃ]+/gi,
  /\d{26}/g 
];

 const cleanDescription = (rawDesc: string): string => {
  const descUpper = rawDesc.toUpperCase();

  const mapped = DESCRIPTION_MAPPINGS.find(m => 
    m.match.some(key => {
      if (m.exactWord) {
        const regex = new RegExp(`\\b${key}\\b`);
        return regex.test(descUpper);
      }
      return descUpper.includes(key);
    })
  );

  if (mapped) return mapped.name;

  let desc = rawDesc;
  for (const regex of BOILERPLATE_REGEXES) {
    desc = desc.replace(regex, "");
  }

  const cleaned = desc.replace(/\s+/g, ' ').trim();
  return cleaned || "Płatność niezidentyfikowana"; 
};

interface ParsedTransaction {
  date: string; 
  description: string;
  amount: number;
  mappedCategory: string;
}

// 2. REFACTOR: Extract parsing logic into pure functions
const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string || "");
    reader.onerror = reject;
    reader.readAsText(file, "windows-1250");
  });
};

const getColumnIndices = (headers: string[]) => {
  return {
    dateIdx: Math.max(0, headers.findIndex(h => h.includes("data operacji"))),
    descIdx: Math.max(1, headers.findIndex(h => h.includes("opis operacji") || h.includes("szczegóły"))),
    catIdx: headers.findIndex(h => h.includes("kategoria")),
    amountIdx: headers.findIndex(h => h === "kwota" || h === "#kwota" || h.includes("kwota operacji") || h.includes("kwota transakcji"))
  };
};

const parseTransactionLine = (cols: string[], indices: any): ParsedTransaction | null => {
  const dateStr = cols[indices.dateIdx] || "";
  const rawDesc = cols[indices.descIdx] || "";
  
  let kwotaStr = "0";
  let catRaw = "";

  if (indices.amountIdx !== -1 && cols[indices.amountIdx]) {
    kwotaStr = cols[indices.amountIdx];
    catRaw = indices.catIdx !== -1 ? cols[indices.catIdx] : "";
  } else {
    for (let j = 2; j < cols.length; j++) {
      if (/(?:^-?\s*\d[\d\s]*,\d{2})|(?:^-?\d+\.\d{2})/.test(cols[j])) {
        kwotaStr = cols[j];
        catRaw = cols[j-1] || "";
        break; 
      }
    }
  }

  let formattedDate = "";
  if (dateStr.includes("-")) {
      formattedDate = dateStr;
  } else {
      const dateParts = dateStr.split(".");
      if (dateParts.length !== 3) return null;
      const [dd, mm, yyyy] = dateParts;
      formattedDate = `${yyyy}-${mm}-${dd}`;
  }

  const cleanKwota = kwotaStr.replace(/[\s\u00A0]/g, "").replace(/(zł|pln)/gi, "").replace(",", ".");         
  const amount = parseFloat(cleanKwota);

  if (isNaN(amount) || amount >= 0) return null;
  
  const rawLower = rawDesc.toLowerCase();
  const catLower = catRaw.toLowerCase();
  
  if (rawLower.includes("przelew") || catLower.includes("przelew")) return null; 
  if (rawLower.includes("bankomat") || catLower.includes("bankomat")) return null;
  if (rawLower.includes("bankomacie") || catLower.includes("bankomacie")) return null;
  if (rawLower.includes("wpłata") || catLower.includes("wpłata")) return null; 
  if (rawLower.includes("wpłatomat")) return null;

  return {
    date: formattedDate,
    description: cleanDescription(rawDesc),
    amount: Math.abs(amount),
    mappedCategory: mapCategory(catRaw, rawDesc),
  };
};


export default function BankCsvImporter({ year }: { year: number }) {
  const { user, supabase } = useAuth(); 
  const { toast } = useToast();
  const { categories, addCategory } = useBudgetCategories(year);
  const { expenseItems, addBill } = useBills(); 
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parsedData, setParsedData] = useState<ParsedTransaction[]>([]);
  const [missingCategories, setMissingCategories] = useState<string[]>([]);
  const [duplicatesCount, setDuplicatesCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // 3. REFACTOR: Removed deep nesting by separating file reading and text processing
  const handleFileParse = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await readFileAsText(file);
      processCsvText(text);
    } catch {
      toast.error("Wystąpił błąd podczas odczytu pliku.");
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const processCsvText = (text: string) => {
    const lines = text.split("\n");
    const headerIdx = lines.findIndex((l) => l.includes("Data operacji") || l.includes("#Data operacji"));
    
    if (headerIdx === -1) {
      toast.error("Nieprawidłowy format pliku. Brak nagłówka 'Data operacji'.");
      return;
    }

    const headers = lines[headerIdx].split(";").map(h => h.replace(/^"|"$/g, "").trim().toLowerCase());
    const indices = getColumnIndices(headers);

    const transactions: ParsedTransaction[] = [];
    let dupes = 0;

    for (let i = headerIdx + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = line.split(";").map((c) => c.replace(/^"|"$/g, "").trim());
      if (cols.length < 3) continue; 

      const parsed = parseTransactionLine(cols, indices);
      if (!parsed) continue;

      const isDuplicate = expenseItems.some(
        (b) => b.amount === parsed.amount && b.date === parsed.date && 
        (b.description === parsed.description || b.description?.includes(parsed.description.substring(0, 10)))
      );

      if (isDuplicate) dupes++;
      else transactions.push(parsed);
    }

    if (transactions.length === 0) {
      toast[dupes > 0 ? "info" : "error"](
        dupes > 0 ? `Wszystkie transakcje z pliku (${dupes}) zostały już zaimportowane.` : "W pliku nie znaleziono żadnych nowych wydatków."
      );
    }

    const requiredToCreate = new Set<string>();
    transactions.forEach((t) => {
      const targetName = t.mappedCategory.trim().toLowerCase();
      const exists = categories.some((c) => c.name.trim().toLowerCase() === targetName);
      if (!exists) requiredToCreate.add(t.mappedCategory.trim());
    });

    setParsedData(transactions);
    setDuplicatesCount(dupes);
    setMissingCategories(Array.from(requiredToCreate));
  };

  // 4. REFACTOR: Abstracted category creation loop out of handleImport
  const ensureCategoriesExist = async (missing: string[]): Promise<BudgetCategory[]> => {
    let updatedCategories = [...categories];
    for (const missingCat of missing) {
      const targetName = missingCat.toLowerCase().trim();
      if (updatedCategories.find(c => c.name.toLowerCase().trim() === targetName)) continue;
      
      try {
        const isMonthly = missingCat === "Opłaty stałe";
        const newCat = await addCategory({ name: missingCat, amount: 0, is_monthly: isMonthly });
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

  // 4. REFACTOR: Abstracted bill insertion loop out of handleImport
  const insertBills = async (transactions: ParsedTransaction[], availableCategories: BudgetCategory[]) => {
    for (const t of transactions) {
      const catTarget = t.mappedCategory.trim().toLowerCase();
      const categoryObj = availableCategories.find((c) => c.name.trim().toLowerCase() === catTarget);
      
      if (!categoryObj || !categoryObj.id) {
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

  // 4. REFACTOR: Flattened handleImport main function
  const handleImport = async () => {
    if (parsedData.length === 0) return;
    setLoading(true);

    try {
      const updatedCategories = await ensureCategoriesExist(missingCategories);
      await insertBills(parsedData, updatedCategories);

      toast.success(`Zaimportowano ${parsedData.length} transakcji.`);
      handleCancel();
    } catch (error: any) {
      toast.error(error?.message || "Wystąpił błąd podczas importu danych.");
      console.error(error);
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