// types/prices.ts
//
// Katalog cen produktów: średnia cena za jednostkę (zł) liczona ze wszystkich importów (średnia ważona liczbą wystąpień).

export const PRICE_UNITS = ["kg", "litr", "szt.", "opak.", "m"] as const;
export type PriceUnit = (typeof PRICE_UNITS)[number];

export interface ProductPrice {
  id: string;
  user_id: string;
  name: string;
  /** Klucz porównania nazwy: małe litery, bez polskich znaków, zwinięte spacje (zob. nameKey). */
  name_key: string;
  /** Jednostka produktu; null = jeszcze niewybrana. */
  unit: PriceUnit | null;
  /** Średnia cena za jednostkę, zł (po rabatach i promocjach). */
  avg_price: number;
  /** Liczba wystąpień, z których policzono średnią. */
  occurrences: number;
  updated_at?: string;
}

export type NewProductPrice = Pick<ProductPrice, "name" | "unit" | "avg_price" | "occurrences">;

export const RECEIPT_STORES = ["lidl", "biedronka"] as const;
export type ReceiptStore = (typeof RECEIPT_STORES)[number];

export const STORE_LABELS: Record<ReceiptStore, string> = { lidl: "Lidl", biedronka: "Biedronka" };

/** Zapamiętane dopasowanie nazwy z paragonu do produktu w katalogu. */
export interface ReceiptAlias {
  id: string;
  user_id: string;
  store: ReceiptStore;
  alias_key: string;
  product_name_key: string;
}

export type ReceiptIssue =
  /** ilość × cena ≠ wartość i nie udało się tego naprawić. */
  | "arithmetic"
  /** wartość lub cena naprawione na podstawie sumy paragonu. */
  | "corrected"
  /** rabat większy niż wartość pozycji (prawdopodobnie błąd OCR). */
  | "discount";

export interface ParsedReceiptItem {
  /** Nazwa dokładnie jak z OCR. */
  rawName: string;
  /** Nazwa po rozdzieleniu sklejonych słów (Biedronka). */
  displayName: string;
  /** Sztuki albo kilogramy (gdy `weighed`). */
  quantity: number;
  weighed: boolean;
  /** Cena jednostkowa z paragonu (przed rabatem), zł. */
  unitPrice: number;
  /** Wartość pozycji przed rabatem, zł. */
  lineValue: number;
  /** Suma rabatów na pozycji (liczba dodatnia), zł. */
  discount: number;
  /** Wartość po rabacie, zł. */
  netValue: number;
  issues: ReceiptIssue[];
}

export interface ParsedReceipt {
  store: ReceiptStore;
  /** yyyy-MM-dd albo null, gdy nie udało się odczytać. */
  date: string | null;
  /** „Suma PLN” z paragonu (bez kaucji) albo null. */
  total: number | null;
  items: ParsedReceiptItem[];
  /** Suma wartości po rabatach. */
  itemsSum: number;
  /** true, gdy suma pozycji ≠ suma z paragonu (albo brak sumy). */
  totalMismatch: boolean;
}

/** Wiersz importu z CSV. */
export interface CsvPriceRow {
  name: string;
  unit: PriceUnit | null;
  price: number;
}

export type ConflictDecision = "overwrite" | "average" | "keep";
