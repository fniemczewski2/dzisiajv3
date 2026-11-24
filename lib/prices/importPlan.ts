// lib/prices/importPlan.ts
//
// Plan importu: z odczytanego paragonu albo CSV powstaje lista wierszy do weryfikacji (nazwa, jednostka, cena),
// a po zatwierdzeniu lista zmian w katalogu i zapamiętanych dopasowań nazw z paragonu.
//
// Zasady: jednostką produktu jest zawsze jednostka już zapisana w katalogu; dopiero gdy jej nie ma, próbujemy ją
// ustalić z paragonu (waga → kg), a w razie wątpliwości zostaje pusta do decyzji użytkownika. Cena jest za jednostkę,
// po rabatach i promocjach.

import { PRODUCT_NAME_MAX_LENGTH } from "@/config/limits";
import type {
  ConflictDecision,
  CsvPriceRow,
  ParsedReceipt,
  PriceUnit,
  ProductPrice,
  ReceiptAlias,
  ReceiptStore,
} from "@/types/prices";
import { mergePrice, needsDecision, relativeChange } from "./catalog";
import { nameKey, packSizeFromName, roundTo, type PackSize } from "./text";

/** Dane źródłowe pozycji potrzebne do przeliczenia ceny na wybraną jednostkę. */
export interface PriceSource {
  quantity: number;
  weighed: boolean;
  /** Wartość po rabacie, zł. */
  netValue: number;
  packSize: PackSize | null;
}

export interface ReviewRow {
  id: string;
  include: boolean;
  store: ReceiptStore | "csv";
  /** Nazwa z paragonu (pusta dla CSV); po niej zapamiętujemy dopasowanie. */
  rawName: string;
  name: string;
  unit: PriceUnit | null;
  price: number | null;
  /** Gdy true, użytkownik wpisał cenę ręcznie i zmiana jednostki jej nie przelicza. */
  priceEdited: boolean;
  decision: ConflictDecision;
  /** Powody, dla których wiersz wymaga uwagi (pokazywane użytkownikowi). */
  flags: string[];
  source: PriceSource | null;
}

export interface CatalogContext {
  catalog: readonly ProductPrice[];
  aliases: readonly ReceiptAlias[];
  /** Nazwy produktów z przepisów (podpowiedzi nazw bez cen). */
  recipeProducts: readonly string[];
}

/** Cena za wybraną jednostkę z danych pozycji; null, gdy z paragonu nie da się jej ustalić. */
export function priceForUnit(source: PriceSource, unit: PriceUnit | null): number | null {
  if (source.quantity <= 0) return null;
  const perPiece = source.netValue / source.quantity;
  if (source.weighed) return unit === "kg" || unit === null ? roundTo(perPiece, 2) : null;
  switch (unit) {
    case null:
    case "szt.":
    case "opak.":
      return roundTo(perPiece, 2);
    case "kg":
    case "litr": {
      const pack = source.packSize;
      return pack?.unit === unit ? roundTo(perPiece / pack.amount, 2) : null;
    }
    case "m":
      return null;
  }
}

const tokensOf = (key: string) => key.split(" ").filter(Boolean);

/** Najlepsze dopasowanie: alias z poprzedniego importu, dokładna nazwa, a na końcu wszystkie słowa produktu w nazwie z paragonu. */
export function suggestProductName(
  store: ReceiptStore,
  rawName: string,
  displayName: string,
  { catalog, aliases, recipeProducts }: CatalogContext
): { name: string; existing: ProductPrice | undefined } {
  const byKey = new Map(catalog.map((entry) => [entry.name_key, entry]));
  const aliasKey = nameKey(rawName);

  const alias = aliases.find((a) => a.store === store && a.alias_key === aliasKey);
  const aliased = alias ? byKey.get(alias.product_name_key) : undefined;
  if (aliased) return { name: aliased.name, existing: aliased };

  const exact = byKey.get(nameKey(displayName));
  if (exact) return { name: exact.name, existing: exact };

  const itemTokens = new Set(tokensOf(nameKey(displayName)));
  const candidates = [
    ...catalog.map((entry) => ({ name: entry.name, key: entry.name_key, entry })),
    ...recipeProducts.map((name) => ({ name, key: nameKey(name), entry: undefined as ProductPrice | undefined })),
  ];
  let best: (typeof candidates)[number] | undefined;
  for (const candidate of candidates) {
    const tokens = tokensOf(candidate.key);
    if (tokens.length === 0 || !tokens.every((token) => itemTokens.has(token))) continue;
    if (!tokens.some((token) => token.length >= 3)) continue;
    if (!best || tokens.length > tokensOf(best.key).length) best = candidate;
  }
  if (best) return { name: best.name, existing: best.entry ?? byKey.get(best.key) };

  return { name: displayName.slice(0, PRODUCT_NAME_MAX_LENGTH), existing: undefined };
}

let rowCounter = 0;
// Przypisanie poza wyrażeniem (czytelność, reguła S1121): licznik rośnie w osobnej instrukcji.
function nextId(): string {
  rowCounter += 1;
  return `row-${rowCounter}`;
}

/** Wiersze do weryfikacji z paragonu: jeden na pozycję. */
export function buildReceiptRows(receipt: ParsedReceipt, context: CatalogContext): ReviewRow[] {
  return receipt.items.map((item) => {
    const source: PriceSource = {
      quantity: item.quantity,
      weighed: item.weighed,
      netValue: item.netValue,
      packSize: packSizeFromName(item.displayName),
    };
    const { name, existing } = suggestProductName(receipt.store, item.rawName, item.displayName, context);
    const unit: PriceUnit | null = existing?.unit ?? (item.weighed ? "kg" : null);
    const price = priceForUnit(source, unit);
    const flags: string[] = [];

    if (item.issues.includes("arithmetic")) flags.push("Ilość × cena nie zgadza się z wartością, sprawdź liczby.");
    if (item.issues.includes("discount")) flags.push("Rabat większy niż wartość pozycji, sprawdź rabat.");
    if (item.issues.includes("corrected")) flags.push("Wartość poprawiona na podstawie sumy paragonu.");
    if (unit === null) flags.push("Wybierz jednostkę.");
    else if (price === null) flags.push(`Z paragonu nie da się ustalić ceny za ${unit}, wpisz ją.`);

    return {
      id: nextId(),
      include: true,
      store: receipt.store,
      rawName: item.rawName,
      name,
      unit,
      price,
      priceEdited: false,
      decision: "keep",
      flags,
      source,
    };
  });
}

/** Wiersze do weryfikacji z CSV. Jednostka istniejącego produktu ma pierwszeństwo przed jednostką z pliku. */
export function buildCsvRows(rows: readonly CsvPriceRow[], { catalog }: CatalogContext): ReviewRow[] {
  const byKey = new Map(catalog.map((entry) => [entry.name_key, entry]));
  return rows.map((row) => {
    const existing = byKey.get(nameKey(row.name));
    const flags: string[] = [];
    let include = true;
    if (existing?.unit && row.unit && existing.unit !== row.unit) {
      flags.push(
        `Plik podaje ${row.unit}, a w katalogu jest ${existing.unit}. Ceny nie da się przeliczyć, wiersz pominięty.`
      );
      include = false;
    }
    const unit = existing?.unit ?? row.unit;
    if (unit === null) flags.push("Wybierz jednostkę.");
    return {
      id: nextId(),
      include,
      store: "csv" as const,
      rawName: "",
      name: row.name,
      unit,
      price: row.price,
      priceEdited: true,
      decision: "keep" as const,
      flags,
      source: null,
    };
  });
}

/** Wiersz gotowy do zapisu: ma nazwę, dodatnią cenę i (dla nowego produktu) jednostkę. */
export function rowIssues(row: ReviewRow): string | null {
  if (!row.name.trim()) return "brak nazwy";
  if (row.name.trim().length > PRODUCT_NAME_MAX_LENGTH) return "nazwa za długa";
  if (row.price === null || Number.isNaN(row.price) || row.price <= 0) return "brak ceny";
  if (row.unit === null) return "brak jednostki";
  return null;
}

/** Zmiana ceny względem średniej w katalogu (0,25 = 25%) albo null, gdy produktu nie ma lub brak ceny. */
export function rowChange(row: ReviewRow, catalog: readonly ProductPrice[]): number | null {
  const existing = catalog.find((entry) => entry.name_key === nameKey(row.name));
  if (!existing || row.price === null) return null;
  if (row.unit && existing.unit && row.unit !== existing.unit) return null;
  return relativeChange(existing.avg_price, row.price);
}

export function rowNeedsDecision(row: ReviewRow, catalog: readonly ProductPrice[]): boolean {
  const existing = catalog.find((entry) => entry.name_key === nameKey(row.name));
  if (!existing || row.price === null) return false;
  if (row.unit && existing.unit && row.unit !== existing.unit) return false;
  return needsDecision(existing, row.price);
}

export interface PriceUpsert {
  name: string;
  name_key: string;
  unit: PriceUnit;
  avg_price: number;
  occurrences: number;
}

export interface AliasUpsert {
  store: ReceiptStore;
  alias_key: string;
  product_name_key: string;
}

export interface ImportChanges {
  upserts: PriceUpsert[];
  aliases: AliasUpsert[];
  skipped: number;
}

/**
 * Zatwierdzone wiersze → zmiany w katalogu. Wiersze tego samego produktu łączą się po kolei (każdy to jedno wystąpienie).
 * Zmiana jednostki istniejącego produktu zaczyna jego statystykę od nowa, bo cen w różnych jednostkach nie da się uśrednić.
 */
export function buildChanges(rows: readonly ReviewRow[], catalog: readonly ProductPrice[]): ImportChanges {
  const working = new Map<string, PriceUpsert & { existed: boolean }>();
  for (const entry of catalog) {
    if (entry.unit) {
      working.set(entry.name_key, {
        name: entry.name,
        name_key: entry.name_key,
        unit: entry.unit,
        avg_price: entry.avg_price,
        occurrences: entry.occurrences,
        existed: true,
      });
    }
  }
  const touched = new Set<string>();
  const aliases = new Map<string, AliasUpsert>();
  let skipped = 0;

  for (const row of rows) {
    if (!row.include || rowIssues(row) !== null) {
      if (row.include) skipped += 1;
      continue;
    }
    const key = nameKey(row.name);
    const unit = row.unit as PriceUnit;
    const price = row.price as number;
    const current = working.get(key);
    const catalogEntry = catalog.find((entry) => entry.name_key === key);

    let next: { avg_price: number; occurrences: number };
    if (current && current.unit !== unit) {
      next = { avg_price: roundTo(price, 4), occurrences: 1 };
    } else if (!current && catalogEntry) {
      // Produkt bez jednostki w katalogu: wybrana teraz jednostka, a istniejąca średnia wchodzi do uśredniania.
      next = mergePrice(catalogEntry, { price }, "average");
    } else {
      next = mergePrice(current, { price }, row.decision);
    }

    working.set(key, {
      name: current?.name ?? catalogEntry?.name ?? row.name.trim(),
      name_key: key,
      unit,
      ...next,
      existed: true,
    });
    touched.add(key);

    if (row.store !== "csv" && row.rawName) {
      const aliasKey = nameKey(row.rawName);
      if (aliasKey && aliasKey !== key)
        aliases.set(`${row.store}|${aliasKey}`, { store: row.store, alias_key: aliasKey, product_name_key: key });
    }
  }

  const upserts = [...touched].map((key) => {
    const { existed: _existed, ...upsert } = working.get(key)!;
    return upsert;
  });
  return { upserts, aliases: [...aliases.values()], skipped };
}

/** Jedna porcja do weryfikacji: plik CSV albo jeden paragon. */
export interface ReviewSession {
  id: string;
  kind: "csv" | "receipt";
  title: string;
  rows: ReviewRow[];
  /** Informacje dla użytkownika (np. pominięte wiersze CSV). */
  notes: string[];
  /** Suma pozycji ≠ suma paragonu: zapis wymaga potwierdzenia. */
  totalMismatch: boolean;
  /** Skrót paragonu (tylko dla paragonów). */
  fingerprint?: string;
}
