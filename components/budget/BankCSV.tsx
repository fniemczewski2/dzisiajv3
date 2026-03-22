"use client";

import React, { useState, useRef } from "react";
import { Upload, AlertCircle, CheckCircle2, FileText } from "lucide-react";
import { useBudgetCategories } from "../../hooks/useBudgetCategories";
import { useBills } from "../../hooks/useBills";
import { useToast } from "../../providers/ToastProvider";
import { useAuth } from "../../providers/AuthProvider";
import { FormButtons } from "../CommonButtons";

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
  if (c.includes("rozrywka") || c.includes("multimedia") || c.includes("książki") || c.includes("prasa") || c.includes("sport") || c.includes("hobby") || c.includes("edukacja") || c.includes("kino")) return "Rozrywka";
  if (c.includes("odzież") || c.includes("obuwie") || d.includes("ubrania")) return "Odzież";
  if (c.includes("żywność") || c.includes("chemia") || c.includes("zdrowie") || c.includes("uroda") || c.includes("supermarket") || c.includes("apteki")) return "Jedzenie";
  if (c.includes("elektronika") || c.includes("rtv") || c.includes("agd")) return "Elektronika";
  if (c.includes("transport") || c.includes("przejazdy") || c.includes("paliwo") || c.includes("komunikacja")) return "Transport";
  if (c.includes("podróże") || c.includes("wakacje") || c.includes("hotel") || c.includes("loty") || d.includes("pkp") || d.includes("ryanair") || d.includes("wizzair")) return "Wakacje";
  
  return "Inne"; 
};

const cleanDescription = (rawDesc: string): string => {
  let desc = rawDesc;
  const descUpper = desc.toUpperCase();
  if (descUpper.includes("BIEDRONKA")) return "Biedronka";
  if (descUpper.includes("LIDL")) return "Lidl";
  if (descUpper.includes("KAUFLAND")) return "Kaufland";
  if (descUpper.includes("AUCHAN")) return "Auchan";
  if (descUpper.includes("CARREFOUR")) return "Carrefour";
  if (descUpper.includes("NETTO")) return "Netto";
  if (descUpper.includes("ALDI")) return "Aldi";
  if (descUpper.includes("DINO")) return "Dino";
  if (descUpper.includes("FAWOR")) return "Fawor";
  if (descUpper.includes("PIEKRANIA NATURA")) return "Natura";
  if (descUpper.includes("ZABKA") || descUpper.includes("ŻABKA")) return "Żabka";
  if (descUpper.includes("POLOMARKET")) return "PoloMarket";
  if (descUpper.includes("PKP INTERCITY") || descUpper.includes("PKP IC")) return "PKP Intercity";
  if (descUpper.includes("KOLEJE MAZOWIECKIE")) return "KM";
  if (descUpper.includes("KOLEJE WIELKOPOLSKIE") || descUpper.includes("KW")) return "KW";
  if (descUpper.includes("POLREGIO") || descUpper.includes("PRZEWOZY REGIONALNE")) return "PR";
  if (descUpper.includes("REGIOJET")) return "RegioJet";
  if (descUpper.includes("UBER")) return "Uber";
  if (descUpper.includes("BOLT")) return "Bolt";
  if (descUpper.includes("FREENOW") || descUpper.includes("FREE NOW")) return "FreeNow";
  if (descUpper.includes("JAKDOJADE")) return "Jakdojade";
  if (descUpper.includes("SKYCASH")) return "SkyCash";
  if (descUpper.includes("RYANAIR")) return "Ryanair";
  if (descUpper.includes("WIZZAIR")) return "WizzAir";
  if (descUpper.includes("ORLEN")) return "Orlen";
  if (descUpper.includes("BP")) return "BP";
  if (descUpper.includes("SHELL")) return "Shell";
  if (descUpper.includes("CIRCLE K") || descUpper.includes("CIRCLEK")) return "Circle K";
  if (descUpper.includes("ROSSMANN")) return "Rossmann";
  if (descUpper.includes("SUPER-PHARM") || descUpper.includes("SUPERPHARM")) return "Super-Pharm";
  if (descUpper.includes("HEBE")) return "Hebe";
  if (descUpper.includes("MCDONALD") || descUpper.includes("MC DONALD")) return "McDonald's";
  if (descUpper.includes("KFC")) return "KFC";
  if (descUpper.includes("BURGER KING")) return "Burger King";
  if (descUpper.includes("STARBUCKS")) return "Starbucks";
  if (descUpper.includes("PYSZNE") || descUpper.includes("PYSZNE.PL")) return "Pyszne.pl";
  if (descUpper.includes("GLOVO")) return "Glovo";
  if (descUpper.includes("WOLT")) return "Wolt";
  if (descUpper.includes("NETFLIX")) return "Netflix";
  if (descUpper.includes("SPOTIFY")) return "Spotify";
  if (descUpper.includes("APPLE.COM") || descUpper.includes("APPLE COM") || descUpper.includes("ITUNES")) return "Apple";
  if (descUpper.includes("GOOGLE") || descUpper.includes("YOUTUBE")) return "Google";
  if (descUpper.includes("STEAM")) return "Steam";
  if (descUpper.includes("PLAYSTATION") || descUpper.includes("SONY")) return "Sony";
  if (descUpper.includes("XBOX")) return "Xbox";
  if (descUpper.includes("INEA")) return "Inea";
  if (descUpper.includes("ALLEGRO")) return "Allegro";
  if (descUpper.includes("AMAZON")) return "Amazon";
  if (descUpper.includes("ALIEXPRESS")) return "AliExpress";
  if (descUpper.includes("INPOST")) return "InPost";
  if (descUpper.includes("IKEA")) return "IKEA";
  if (descUpper.includes("CASTORAMA")) return "Castorama";
  if (descUpper.includes("LEROY MERLIN")) return "Leroy Merlin";
  if (descUpper.includes("OBI")) return "OBI";
  if (descUpper.includes("DECATHLON")) return "Decathlon";
  if (descUpper.includes("CCC")) return "CCC";
  if (descUpper.includes("ZARA")) return "Zara";
  if (descUpper.includes("H&M")) return "H&M";
  if (descUpper.includes("ZALANDO")) return "Zalando";
  if (descUpper.includes("VINTED")) return "Vinted";
  if (descUpper.includes("PEPCO")) return "Pepco";
  if (descUpper.includes("EMPIK")) return "Empik";
  if (descUpper.includes("KINO MUZA")) return "Kino Muza";
  if (descUpper.includes("CINEMA CITY")) return "Cinema City";
  if (descUpper.includes("MULTIKINO")) return "Multikino";
  if (descUpper.includes("HELIOS")) return "Helios";
  if (descUpper.includes("NATIONALE-NEDERLANDEN")) return "NN Ubezpieczenie"
  if (descUpper.includes("POZNAN ZARZAD TRANSPORTU")) return "ZTM Poznań"

  const boilerplate = [
    "ZAKUP PRZY UŻYCIU KARTY - INTERNET",
    "ZAKUP PRZY UŻYCIU KARTY W KRAJU",
    "ZAKUP PRZY UŻYCIU KARTY ZA GRANICĄ",
    "ZAKUP PRZY UŻYCIU KARTY",
    "TRANSAKCJA KARTĄ",
    "TRANSAKCJA ZBLIŻENIOWA",
    "PŁATNOŚĆ KARTĄ",
    "OPERACJA BLIK",
    "DATA TRANSAKCJI:",
    "DATA KSIĘGOWANIA:",
    "KARTA:",
  ];

  for (const b of boilerplate) {
    const regex = new RegExp(b, "gi");
    desc = desc.replace(regex, "");
  }

  desc = desc.replace(/\d{2}\.\d{2}\.\d{4}/g, "");
  desc = desc.replace(/\d{2}-\d{3}\s+[A-Za-zęóąśłżźćńĘÓĄŚŁŻŹĆŃ]+/gi, "");
  let cleaned = desc.replace(/\s+/g, ' ').trim();
  
  return cleaned || "Płatność kartą / BLIK"; 
};

interface ParsedTransaction {
  date: string; 
  description: string;
  amount: number;
  mappedCategory: string;
}

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

  const handleFileParse = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsText(file, "windows-1250");
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split("\n");
      const headerIdx = lines.findIndex((l) => l.includes("Data operacji") || l.includes("#Data operacji"));
      
      if (headerIdx === -1) {
        toast.error("Nieprawidłowy format pliku. Brak nagłówka 'Data operacji'.");
        return;
      }

      const transactions: ParsedTransaction[] = [];
      let dupes = 0;

      for (let i = headerIdx + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = line.split(";").map((c) => c.replace(/^"|"$/g, "").trim());
        if (cols.length < 3) continue; 

        const dateStr = cols[0];
        const rawDesc = cols[1];
        
        let kwotaStr = "0";
        let catRaw = "";

        if (cols.length === 4) {
          catRaw = cols[2];
          kwotaStr = cols[3];
        } else {
          for (let j = cols.length - 1; j >= 2; j--) {
            if (/[\d]+,[\d]{2}/.test(cols[j])) {
              kwotaStr = cols[j];
              if (j > 0 && /[\d]+,[\d]{2}/.test(cols[j-1])) {
                kwotaStr = cols[j-1];
                catRaw = cols[j-2] || "";
              } else {
                catRaw = cols[j-1] || "";
              }
              break;
            }
          }
        }

        const dateParts = dateStr.split(".");
        if (dateParts.length !== 3) continue;
        const [dd, mm, yyyy] = dateParts;
        const formattedDate = `${yyyy}-${mm}-${dd}`;

        const cleanKwota = kwotaStr
          .replace(/[\s\u00A0]/g, "") 
          .replace(/(zł|pln)/gi, "")  
          .replace(",", ".");         
          
        const amount = parseFloat(cleanKwota);

        if (isNaN(amount)) continue;

        if (amount >= 0) continue; 
        if (rawDesc.toLowerCase().includes("przelew") || catRaw.toLowerCase().includes("przelew")) continue; 
        if (rawDesc.toLowerCase().includes("bankomat") || catRaw.toLowerCase().includes("bankomat")) continue;
        if (rawDesc.toLowerCase().includes("bankomacie") || catRaw.toLowerCase().includes("bankomacie")) continue;
        if (rawDesc.toLowerCase().includes("wpłata") || catRaw.toLowerCase().includes("wpłata")) continue; 
        if (rawDesc.toLowerCase().includes("wpłatomat")) continue;

        const mappedCat = mapCategory(catRaw, rawDesc);
        const absoluteAmount = Math.abs(amount);
        
        const cleanDesc = cleanDescription(rawDesc);

        const isDuplicate = expenseItems.some(
          (b) => b.amount === absoluteAmount && b.date === formattedDate && (b.description === cleanDesc || b.description?.includes(cleanDesc.substring(0, 10)))
        );

        if (isDuplicate) {
          dupes++;
        } else {
          transactions.push({
            date: formattedDate,
            description: cleanDesc,
            amount: absoluteAmount,
            mappedCategory: mappedCat,
          });
        }
      }

      const requiredToCreate = new Set<string>();
      transactions.forEach((t) => {
        const targetName = t.mappedCategory.trim().toLowerCase();
        const exists = categories.some((c) => c.name.trim().toLowerCase() === targetName);
        if (!exists) {
          requiredToCreate.add(t.mappedCategory.trim());
        }
      });

      setParsedData(transactions);
      setDuplicatesCount(dupes);
      setMissingCategories(Array.from(requiredToCreate));
    };

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;
    setLoading(true);

    try {
      let updatedCategories = [...categories];
      
      for (const missingCat of missingCategories) {
        const targetName = missingCat.toLowerCase().trim();
        const exists = updatedCategories.find(c => c.name.toLowerCase().trim() === targetName);
        
        if (!exists) {
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
      }

      for (const t of parsedData) {
        const catTarget = t.mappedCategory.trim().toLowerCase();
        const categoryObj = updatedCategories.find((c) => c.name.trim().toLowerCase() === catTarget);
        
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
    <div className="card rounded-xl shadow-sm px-4 py-3 mb-6">
      <div className="flex flex-row items-center justify-between gap-4">
        
          <h3 className="font-medium text-sm text-text flex items-center gap-4">
            <FileText className="w-5 h-5 text-primary" /> 
            Import z pliku
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