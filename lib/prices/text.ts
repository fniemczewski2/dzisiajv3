// lib/prices/text.ts
//
// Wspólne funkcje na nazwach, jednostkach i cenach (CSV, paragony, lista zakupów).

import type { PriceUnit } from "@/types/prices";

/** Klucz porównania: małe litery, bez znaków diakrytycznych (także „ł”), tylko litery i cyfry, zwinięte spacje. */
export function nameKey(raw: string): string {
  return raw
    .toLocaleLowerCase("pl")
    .normalize("NFD")
    .replaceAll(/\p{M}/gu, "")
    .replaceAll("ł", "l")
    .replaceAll(/[^a-z0-9]+/g, " ")
    .trim();
}

const UNIT_ALIASES: Record<string, PriceUnit> = {
  kg: "kg",
  kilogram: "kg",
  l: "litr",
  litr: "litr",
  litry: "litr",
  szt: "szt.",
  sztuka: "szt.",
  opak: "opak.",
  opakowanie: "opak.",
  op: "opak.",
  m: "m",
  mb: "m",
  metr: "m",
};

/** „opak” → „opak.”, „szt” → „szt.”, „l” → „litr”; null dla pustej lub nieznanej jednostki. */
export function normalizeUnit(raw: string | null | undefined): PriceUnit | null {
  if (!raw) return null;
  const key = raw.trim().toLocaleLowerCase("pl").replace(/\.$/, "");
  if (!key) return null;
  return UNIT_ALIASES[key] ?? null;
}

/** „7,99zł”, „7.99 zł”, „1 234,50” → liczba; null dla wartości nieliczbowych lub ujemnych. */
export function parsePrice(raw: string | number | null | undefined): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) && raw >= 0 ? roundTo(raw, 4) : null;
  if (!raw) return null;
  const cleaned = raw
    .replaceAll(/z[łl]\.?|pln/gi, "")
    .replaceAll(/\s|\u00a0/g, "")
    .replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? roundTo(value, 4) : null;
}

export function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

const plnFormat = new Intl.NumberFormat("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 5.99 → „5,99”. */
export function formatPln(value: number): string {
  return plnFormat.format(value);
}

/** „5,99 zł / kg”; bez jednostki „5,99 zł”. */
export function formatUnitPrice(price: number, unit: PriceUnit | null): string {
  return unit ? `${formatPln(price)} zł / ${unit}` : `${formatPln(price)} zł`;
}

export interface PackSize {
  /** Ilość w kg albo litrach. */
  amount: number;
  unit: "kg" | "litr";
}

/** Gramatura lub pojemność z nazwy: „500g”, „1kg”, „330 ml”, „0,5l”; null, gdy jej nie ma. */
export function packSizeFromName(name: string): PackSize | null {
  const match = /(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l)\b/i.exec(name);
  if (!match) return null;
  const value = Number(match[1].replace(",", "."));
  if (!Number.isFinite(value) || value <= 0) return null;
  switch (match[2].toLowerCase()) {
    case "kg":
      return { amount: value, unit: "kg" };
    case "g":
      return { amount: value / 1000, unit: "kg" };
    case "l":
      return { amount: value, unit: "litr" };
    default:
      return { amount: value / 1000, unit: "litr" };
  }
}

const collator = new Intl.Collator("pl", { sensitivity: "base" });
export const comparePolish = collator.compare;
