import { BOILERPLATE_REGEXES, DESCRIPTION_MAPPINGS, REQUIRED_CATEGORIES } from "@/config/constants";
import { ParsedTransaction, BudgetCategory } from "@/types/bills";

interface ColumnIndices {
  dateIdx: number;
  descIdx: number;
  catIdx: number;
  amountIdx: number;
}

export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) || "");
    reader.onerror = reject;
    reader.readAsText(file, "windows-1250");
  });
};

const mapCategory = (mbankCat: string, desc: string): string => {
  const c = mbankCat.toLowerCase();
  const d = desc.toLowerCase();

  if (c.includes("tv") || c.includes("internet") || c.includes("telefon") || c.includes("ubezpiecz") || d.includes("ubezpieczenie")) return "Opłaty stałe";
  if (c.includes("rozrywka") || c.includes("multimedia") || c.includes("książki") || c.includes("prasa") || c.includes("sport") || c.includes("hobby") || c.includes("edukacja") || c.includes("kino") || d.includes("kino") || c.includes("teatr")) return "Rozrywka";
  if (c.includes("odzież") || c.includes("obuwie") || d.includes("ubrania")) return "Odzież";
  if (c.includes("żywność") || c.includes("chemia") || c.includes("zdrowie") || c.includes("uroda") || c.includes("supermarket") || c.includes("apteki")) return "Jedzenie";
  if (c.includes("gastronomia") || c.includes("restauracja") || c.includes("kawiarnia") || c.includes("fast food") || d.includes("mcdonald") || d.includes("kfc") || d.includes("burger king") || d.includes("starbucks") || d.includes("pyszne") || d.includes("glovo") || d.includes("wolt") || c.includes("jedzenie")) return "Gastronomia";
  if (c.includes("elektronika") || c.includes("rtv") || c.includes("agd")) return "Elektronika";
  if (c.includes("transport") || c.includes("przejazdy") || c.includes("paliwo") || c.includes("komunikacja") || d.includes("ztm") || d.includes("mpk") || d.includes("pkp") || d.includes("regiojet")) return "Podróże";
  if (c.includes("podróże") || c.includes("wakacje") || c.includes("hotel") || c.includes("loty") || d.includes("ryanair") || d.includes("wizzair")) return "Wakacje";
  
  return "Inne"; 
};

const cleanDescription = (rawDesc: string): string => {
  const descUpper = rawDesc.toUpperCase();

  const mapped = DESCRIPTION_MAPPINGS.find(m => 
    m.match.some(key => {
      if (m.exactWord) {
        const regex = new RegExp(String.raw`\b${key}\b`);
        return regex.test(descUpper);
      }
      return descUpper.includes(key);
    })
  );

  if (mapped) return mapped.name;

  let desc = rawDesc;
  for (const regex of BOILERPLATE_REGEXES) {
    desc = desc.replaceAll(regex, "");
  }

  const cleaned = desc.replaceAll(/\s+/g, ' ').trim();
  return cleaned || "Płatność niezidentyfikowana"; 
};

const formatDateStr = (dateStr: string): string | null => {
  if (dateStr.includes("-")) return dateStr;
  const dateParts = dateStr.split(".");
  if (dateParts.length !== 3) return null;
  return `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
};

const extractAmountAndCategory = (cols: string[], indices: ColumnIndices) => {
  if (indices.amountIdx !== -1 && cols[indices.amountIdx]) {
    return {
      kwotaStr: cols[indices.amountIdx],
      catRaw: indices.catIdx === -1 ? "" : cols[indices.catIdx]
    };
  }
  for (let j = 2; j < cols.length; j++) {
    if (/(?:^-?\s*\d[\d\s]*,\d{2})|(?:^-?\d+\.\d{2})/.test(cols[j])) {
      return { kwotaStr: cols[j], catRaw: cols[j-1] || "" };
    }
  }
  return { kwotaStr: "0", catRaw: "" };
};

const isExcludedTransaction = (rawDesc: string, catRaw: string): boolean => {
  const rawLower = rawDesc.toLowerCase();
  const catLower = catRaw.toLowerCase();
  const keywords = ["przelew", "bankomat", "bankomacie", "wpłata", "wpłatomat"];
  return keywords.some(kw => rawLower.includes(kw) || catLower.includes(kw));
};

const parseTransactionLine = (cols: string[], indices: ColumnIndices): ParsedTransaction | null => {
  const dateStr = cols[indices.dateIdx] || "";
  const rawDesc = cols[indices.descIdx] || "";
  
  const { kwotaStr, catRaw } = extractAmountAndCategory(cols, indices);

  const formattedDate = formatDateStr(dateStr);
  if (!formattedDate) return null;

  const cleanKwota = kwotaStr.replaceAll(/[\s\u00A0]/g, "").replaceAll(/(zł|pln)/gi, "").replaceAll(",", ".");        
  const amount = Number.parseFloat(cleanKwota);

  if (Number.isNaN(amount) || amount >= 0) return null;
  if (isExcludedTransaction(rawDesc, catRaw)) return null;

  return {
    date: formattedDate,
    description: cleanDescription(rawDesc),
    amount: Math.abs(amount),
    mappedCategory: mapCategory(catRaw, rawDesc),
  };
};

const isDuplicateTransaction = (parsed: ParsedTransaction, expenseItems: any[]) => {
  return expenseItems.some(
    (b) => b.amount === parsed.amount && b.date === parsed.date && 
    (b.description === parsed.description || b.description?.includes(parsed.description.substring(0, 10)))
  );
};

const getMissingCategories = (transactions: ParsedTransaction[], categories: BudgetCategory[]) => {
  const required = new Set<string>();
  
  transactions.forEach((t) => {
    const mappedName = t.mappedCategory.trim();
    const targetName = mappedName.toLowerCase();
    const exists = categories.some((c) => c.name.trim().toLowerCase() === targetName);
    const isRequiredCategory = REQUIRED_CATEGORIES.some(
      (rc) => rc.toLowerCase() === targetName
    );
    if (!exists && isRequiredCategory) {
      required.add(mappedName);
    }
  });
  
  return Array.from(required);
};

const getColumnIndices = (headers: string[]): ColumnIndices => {
  return {
    dateIdx: Math.max(0, headers.findIndex(h => h.includes("data operacji"))),
    descIdx: Math.max(1, headers.findIndex(h => h.includes("opis operacji") || h.includes("szczegóły"))),
    catIdx: headers.findIndex(h => h.includes("kategoria")),
    amountIdx: headers.findIndex(h => h === "kwota" || h === "#kwota" || h.includes("kwota operacji") || h.includes("kwota transakcji"))
  };
};

const extractTransactionsFromLines = (
  lines: string[],
  startIndex: number,
  indices: ColumnIndices,
  expenseItems: any[]
) => {
  const transactions: ParsedTransaction[] = [];
  let dupes = 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(";").map((c) => c.replaceAll(/^"|"$/g, "").trim());
    if (cols.length < 3) continue;

    const parsed = parseTransactionLine(cols, indices);
    if (!parsed) continue;

    if (isDuplicateTransaction(parsed, expenseItems)) {
      dupes++;
    } else {
      transactions.push(parsed);
    }
  }

  return { transactions, dupes };
};

export const processCsvText = (
  text: string, 
  expenseItems: any[], 
  categories: BudgetCategory[]
) => {
  const lines = text.split("\n");
  const headerIdx = lines.findIndex((l) => l.includes("Data operacji") || l.includes("#Data operacji"));
  
  if (headerIdx === -1) {
    return { error: "Nieprawidłowy format pliku. Brak nagłówka 'Data operacji'." };
  }

  const headers = lines[headerIdx].split(";").map(h => h.replaceAll(/^"|"$/g, "").trim().toLowerCase());
  const indices = getColumnIndices(headers);
  
  const { transactions, dupes } = extractTransactionsFromLines(
    lines, 
    headerIdx + 1, 
    indices, 
    expenseItems
  );

  let info;
  let error;

  if (transactions.length === 0) {
    const isDuplicateOnly = dupes > 0;
    if (isDuplicateOnly) {
      info = `Wszystkie transakcje z pliku (${dupes}) zostały już zaimportowane.`;
    } else {
      error = "W pliku nie znaleziono żadnych nowych wydatków.";
    }
  }

  const missingCategories = getMissingCategories(transactions, categories);

  return {
    transactions,
    dupes,
    missingCategories,
    error,
    info
  };
};