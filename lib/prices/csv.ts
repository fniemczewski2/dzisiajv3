// lib/prices/csv.ts
//
// Import cen z pliku CSV o stałym formacie: nazwa, jednostka, cena (np. `Ananas,kg,"7,99zł"`).
// Nagłówek (pierwsza kolumna zaczyna się od „Nazwa”) jest pomijany. Jednostki są ujednolicane („opak” → „opak.”).

import { MAX_PRICE_IMPORT_ROWS, PRODUCT_NAME_MAX_LENGTH } from "@/config/limits";
import type { CsvPriceRow } from "@/types/prices";
import { nameKey, normalizeUnit, parsePrice } from "./text";

export interface CsvSkippedRow {
  line: number;
  reason: string;
}

export interface CsvParseResult {
  rows: CsvPriceRow[];
  skipped: CsvSkippedRow[];
  /** Wiersze z pustą lub nieznaną jednostką (jednostkę wybierze użytkownik przy weryfikacji). */
  withoutUnit: number;
}

/** Rozbija tekst CSV na rekordy (cudzysłowy, przecinki i nowe linie w polach, CRLF). */
export function splitCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function parsePriceCsv(text: string): CsvParseResult {
  const records = splitCsv(text);
  const rows: CsvPriceRow[] = [];
  const skipped: CsvSkippedRow[] = [];
  const seen = new Set<string>();
  let withoutUnit = 0;

  records.forEach((record, index) => {
    const line = index + 1;
    const [rawName = "", rawUnit = "", rawPrice = ""] = record.map((cell) => cell.trim());
    if (record.every((cell) => cell.trim() === "")) return;
    if (index === 0 && /^nazwa/i.test(rawName)) return;

    const name = rawName.replaceAll(/\s+/g, " ").slice(0, PRODUCT_NAME_MAX_LENGTH);
    if (!name) return skipped.push({ line, reason: "brak nazwy produktu" });
    const price = parsePrice(rawPrice);
    if (price === null) return skipped.push({ line, reason: `nieprawidłowa cena „${rawPrice}”` });
    const key = nameKey(name);
    if (!key) return skipped.push({ line, reason: "nazwa bez liter i cyfr" });
    if (seen.has(key)) return skipped.push({ line, reason: `duplikat produktu „${name}”` });
    if (rows.length >= MAX_PRICE_IMPORT_ROWS) {
      return skipped.push({ line, reason: `przekroczono limit ${MAX_PRICE_IMPORT_ROWS} wierszy` });
    }

    seen.add(key);
    const unit = normalizeUnit(rawUnit);
    if (!unit) withoutUnit += 1;
    rows.push({ name, unit, price });
  });

  return { rows, skipped, withoutUnit };
}
