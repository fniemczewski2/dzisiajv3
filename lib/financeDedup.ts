// lib/financeDedup.ts
//
// Rozpoznawanie transakcji, które już są w aplikacji, przy imporcie wyciągu z banku.
//
// Klucz importu (lib/finance.ts) chroni tylko przed ponownym wczytaniem tego samego pliku: wymaga zgodności
// co do dnia i co do znaku opisu. Wydatki dopisane automatycznie z Apple Pay mają inny opis (sama nazwa
// sklepu) i często inną datę niż księgowanie w banku, więc trafiały do aplikacji drugi raz.
//
// Tutaj porównujemy: kierunek, kwotę (z dokładnością do grosza), datę w oknie kilku dni i podobieństwo opisu
// po normalizacji (bez znaków diakrytycznych, wielkości liter, numerów terminali i miast).

/** Ile dni różnicy dopuszczamy między płatnością a jej księgowaniem w banku. */
export const DEDUP_DATE_WINDOW_DAYS = 4;
/** Ile znaków musi mieć wspólny początek opisów, żeby uznać je za ten sam sklep. */
const MIN_PREFIX = 4;

export interface DedupTransaction {
  date: string;
  amount: number;
  is_income: boolean;
  description: string;
}

/** Opis sklepu bez ozdobników: małe litery, bez diakrytyków, bez cyfr i znaków specjalnych. */
export function normalizeMerchant(text: string): string {
  return (text ?? "")
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replaceAll(/[^a-z\s]/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

/** Słowa, które w opisach bankowych nie identyfikują sklepu. */
const NOISE = new Set([
  "platnosc",
  "karta",
  "karty",
  "kartą",
  "transakcja",
  "zakup",
  "sklep",
  "pl",
  "polska",
  "apple",
  "pay",
  "blik",
  "data",
  "operacji",
  "nr",
  "ref",
]);

/** Znaczące słowa opisu (bez szumu i bardzo krótkich wyrazów). */
function tokens(text: string): string[] {
  return normalizeMerchant(text)
    .split(" ")
    .filter((word) => word.length >= 3 && !NOISE.has(word));
}

/** Czy oba opisy wskazują ten sam sklep: wspólne słowo albo wspólny początek nazwy. */
export function sameMerchant(a: string, b: string): boolean {
  const left = tokens(a);
  const right = tokens(b);
  if (left.length === 0 || right.length === 0) return false;
  if (left.some((word) => right.includes(word))) return true;
  const first = left[0];
  const second = right[0];
  const prefix = Math.min(MIN_PREFIX, first.length, second.length);
  return prefix >= MIN_PREFIX && first.slice(0, prefix) === second.slice(0, prefix);
}

/** Różnica dni między datami „yyyy-MM-dd” (wartość bezwzględna). */
function daysApart(a: string, b: string): number {
  const toUtc = (d: string) => Date.parse(`${d}T00:00:00Z`);
  const diff = Math.abs(toUtc(a) - toUtc(b));
  return Number.isNaN(diff) ? Number.POSITIVE_INFINITY : Math.round(diff / 86_400_000);
}

/** Ta sama płatność zapisana dwa razy: ten sam kierunek i kwota, bliska data, ten sam sklep. */
export function isSameTransaction(
  candidate: DedupTransaction,
  existing: DedupTransaction,
  windowDays: number = DEDUP_DATE_WINDOW_DAYS
): boolean {
  if (candidate.is_income !== existing.is_income) return false;
  if (Math.abs(Number(candidate.amount) - Number(existing.amount)) > 0.005) return false;
  if (daysApart(candidate.date, existing.date) > windowDays) return false;
  return sameMerchant(candidate.description, existing.description);
}

/**
 * Podział wierszy z wyciągu na nowe i już zapisane. Jedna istniejąca transakcja pasuje tylko do jednego
 * wiersza – dwa takie same zakupy tego samego dnia nie znikną przez pomyłkę.
 */
export function splitByDuplicates<T extends DedupTransaction>(
  rows: readonly T[],
  existing: readonly DedupTransaction[],
  windowDays: number = DEDUP_DATE_WINDOW_DAYS
): { fresh: T[]; duplicates: T[] } {
  const used = new Set<number>();
  const fresh: T[] = [];
  const duplicates: T[] = [];
  for (const row of rows) {
    const index = existing.findIndex((e, i) => !used.has(i) && isSameTransaction(row, e, windowDays));
    if (index === -1) fresh.push(row);
    else {
      used.add(index);
      duplicates.push(row);
    }
  }
  return { fresh, duplicates };
}
