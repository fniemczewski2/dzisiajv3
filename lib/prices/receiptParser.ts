// lib/prices/receiptParser.ts
//
// Parser tekstu paragonów Lidl i Biedronki rozpoznanego przez OCR (model angielski, bo najlepiej czyta cyfry).
// OCR myli cyfry (0 ↔ @/O, gubi przecinki), więc każda pozycja jest sprawdzana arytmetycznie (ilość × cena = wartość),
// a suma pozycji porównywana z „Suma PLN”. Gdy tylko jeden z elementów się nie zgadza, wartość da się odtworzyć
// z pozostałych (oznaczenie „corrected”); w przeciwnym razie pozycja trafia do ręcznej weryfikacji („arithmetic”).

import type { ParsedReceipt, ParsedReceiptItem, ReceiptIssue, ReceiptStore } from "@/types/prices";
import { roundTo } from "./text";

const TOLERANCE = 0.011;
const MONEY = String.raw`\d+(?:[.,]\d{1,2})?`;

/** Cyfry przekręcone przez OCR: „@,400kg” → „0,400kg”, „1@9” → „109”. */
function fixOcrDigits(line: string): string {
  return line.replaceAll(/(?<![\p{L}\d])[@O](?=[,.]\d)/gu, "0").replaceAll(/(?<=\d)[@Oo](?=[\d,.])/g, "0");
}

/** „12,99” / „12.99” → 12.99; „249” (OCR zgubił przecinek) → 2.49. */
function parseMoney(token: string): number {
  if (/^\d{3,}$/.test(token)) return Number(token) / 100;
  return Number(token.replace(",", "."));
}

const round2 = (value: number) => roundTo(value, 2);

/** Rozdziela sklejone słowa („PrzypPaprKamis16-20g” → „Przyp Papr Kamis 16-20g”). */
export function displayNameOf(raw: string): string {
  return raw
    .replaceAll(/(?<=\p{Ll})(?=\p{Lu})/gu, " ")
    .replaceAll(/(?<=\p{L})(?=\d)/gu, " ")
    .replaceAll(/\s+/g, " ")
    .replace(/[\s.,]+$/, "")
    .trim();
}

function detectStore(text: string): ReceiptStore | null {
  if (/biedronka|jeronimo\s+martins/i.test(text)) return "biedronka";
  if (/lidl/i.test(text)) return "lidl";
  return null;
}

function parseDate(text: string): string | null {
  const valid = (y: number, m: number, d: number) =>
    y >= 2000 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31
      ? `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`
      : null;
  const iso = /\b(\d{4})-(\d{2})-(\d{2})\b/.exec(text);
  if (iso) {
    const date = valid(Number(iso[1]), Number(iso[2]), Number(iso[3]));
    if (date) return date;
  }
  const pl = /\b(\d{2})[./](\d{2})[./](\d{4})\b/.exec(text);
  if (pl) return valid(Number(pl[3]), Number(pl[2]), Number(pl[1]));
  const short = /DATA:\s*(\d{2})\/(\d{2})\/(\d{2})\b/i.exec(text);
  return short ? valid(2000 + Number(short[3]), Number(short[2]), Number(short[1])) : null;
}

interface DraftItem {
  rawName: string;
  quantity: number;
  weighed: boolean;
  unitPrice: number;
  lineValue: number;
  discount: number;
  /** Wartość wyliczona z ilości i ceny, bo OCR jej nie odczytał. */
  derived?: boolean;
}

const LIDL_PIECES = new RegExp(String.raw`^\s*(\d+)\s*[*xX×«]\s*(${MONEY})\s+(${MONEY})\s*[A-Za-z]?\s*$`);
const LIDL_WEIGHED = new RegExp(
  String.raw`^\s*(\d+[.,]\d{1,3})\s*kg\s*[*xX×«]\s*(${MONEY})\s+(${MONEY})\s*[A-Za-z]?\s*$`
);
const BIEDRONKA_LINE = new RegExp(
  String.raw`^(.+?)\s+\S{1,2}\s+(\d+(?:[.,]\d{1,3})?)\s*[xX×]\s+(${MONEY})\s+(${MONEY}|\S{2,6})\s*$`
);
const DISCOUNT_LABEL = /rabat|taniej|kupon|oferta|voucher|gratis|opust|promo/i;
const NEGATIVE_AMOUNT = new RegExp(String.raw`^(.*?)\s*-\s?(${MONEY})\s*$`);
const POSITIVE_AMOUNT = new RegExp(String.raw`^(.*?)\s+(${MONEY})\s*$`);
const STOP_LINE = /^\s*(?:PTU|Kwota|Suma|Razem|Sprzeda|OPUSTY|Opusty|Udzielono)/;
const AMOUNT = String.raw`(\d[\d ]*[.,]\d{2})`;
const PRIMARY_TOTAL = new RegExp(String.raw`^\s*(?:Suma\s+PLN|Razem)\s+${AMOUNT}\s*$`, "i");
const ANY_PRIMARY = /^\s*(?:Suma\s+PLN|Razem)\b/i;
const SECONDARY_TOTAL = new RegExp(String.raw`^\s*Suma\s+${AMOUNT}\s*$`, "i");
const PAYMENT_LINE = new RegExp(
  String.raw`(?:Lidl\s*Pay|Karta\s+p[łl\wé]atnicza|P[łl\wé]atno[śs\wé]*\s.*|KWOTA:)\s*${AMOUNT}(?:\s*PLN)?\s*$`,
  "i"
);
const DEPOSIT_LINE = new RegExp(String.raw`Opakowania\s+zwrotne\s+suma\s+${AMOUNT}`, "i");
const AMOUNT_ONLY = new RegExp(String.raw`^\s*${MONEY}\s*$`);

function matchItemLine(line: string, store: ReceiptStore): Omit<DraftItem, "rawName" | "discount"> | null {
  if (store === "lidl") {
    const weighed = LIDL_WEIGHED.exec(line);
    if (weighed) {
      return {
        quantity: Number(weighed[1].replace(",", ".")),
        weighed: true,
        unitPrice: parseMoney(weighed[2]),
        lineValue: parseMoney(weighed[3]),
      };
    }
    const pieces = LIDL_PIECES.exec(line);
    return pieces
      ? {
          quantity: Number(pieces[1]),
          weighed: false,
          unitPrice: parseMoney(pieces[2]),
          lineValue: parseMoney(pieces[3]),
        }
      : null;
  }
  return null;
}

/** Dzieli tekst paragonu na pozycje i sumę. Zwraca null, gdy nie rozpoznano sklepu (Lidl, Biedronka). */
export function parseReceiptText(rawText: string): ParsedReceipt | null {
  const store = detectStore(rawText);
  if (!store) return null;

  const lines = rawText
    .split(/\r?\n/)
    .map((line) => fixOcrDigits(line.replaceAll(/\s+/g, " ").trim()).replaceAll(/(\d),\s(\d{2})(?!\d)/g, "$1,$2"));
  const drafts: DraftItem[] = [];
  let pendingName = "";
  let inItems = false;

  for (const line of lines) {
    if (!line) continue;

    if (inItems && STOP_LINE.test(line)) break;

    const last = drafts.at(-1);
    const isDiscountLine =
      last && DISCOUNT_LABEL.test(line) && (NEGATIVE_AMOUNT.test(line) || POSITIVE_AMOUNT.test(line));
    if (last && (isDiscountLine || (NEGATIVE_AMOUNT.test(line) && !/[*x×]\s*\d/.test(line)))) {
      const amount = NEGATIVE_AMOUNT.exec(line) ?? POSITIVE_AMOUNT.exec(line);
      if (amount) last.discount += parseMoney(amount[2]);
      continue;
    }
    if (store === "biedronka" && last && AMOUNT_ONLY.test(line)) continue;

    if (store === "biedronka") {
      const match = BIEDRONKA_LINE.exec(line);
      if (match && !STOP_LINE.test(line)) {
        const quantity = Number(match[2].replace(",", "."));
        const rawName = match[1].trim();
        const weighed = !Number.isInteger(quantity) || (/\bluz\b/i.test(rawName) && /,\d{3}$/.test(match[2]));
        const unitPrice = parseMoney(match[3]);
        const readable = new RegExp(`^${MONEY}$`).test(match[4]);
        drafts.push({
          rawName,
          quantity,
          weighed,
          unitPrice,
          // Nieczytelna wartość (OCR) wyliczamy z ilości i ceny; oznaczamy jako poprawioną.
          lineValue: readable ? parseMoney(match[4]) : quantity * unitPrice,
          discount: 0,
          derived: !readable,
        });
        inItems = true;
      }
      continue;
    }

    const item = matchItemLine(line, store);
    if (item) {
      drafts.push({ rawName: pendingName || "Nieznany produkt", discount: 0, ...item });
      pendingName = "";
      inItems = true;
    } else {
      pendingName = line;
    }
  }

  const total = findTotal(lines);
  const items = repairItems(drafts, total);
  const itemsSum = round2(items.reduce((sum, item) => sum + item.netValue, 0));
  return {
    store,
    date: parseDate(rawText),
    total,
    items,
    itemsSum,
    totalMismatch: total === null || Math.abs(itemsSum - total) > TOLERANCE,
  };
}

function finish(draft: DraftItem, baseIssues: ReceiptIssue[]): ParsedReceiptItem {
  const issues: ReceiptIssue[] = [...baseIssues];
  if (draft.derived && !issues.includes("corrected")) issues.push("corrected");
  if (draft.discount > draft.lineValue + TOLERANCE) issues.push("discount");
  return {
    rawName: draft.rawName,
    displayName: displayNameOf(draft.rawName),
    quantity: draft.quantity,
    weighed: draft.weighed,
    unitPrice: round2(draft.unitPrice),
    lineValue: round2(draft.lineValue),
    discount: round2(draft.discount),
    netValue: round2(draft.lineValue - draft.discount),
    issues,
  };
}

const productOf = (draft: DraftItem) => draft.quantity * draft.unitPrice;
const isConsistent = (draft: DraftItem) => Math.abs(productOf(draft) - draft.lineValue) <= TOLERANCE;
const sumNet = (drafts: readonly DraftItem[]) => drafts.reduce((sum, d) => sum + d.lineValue - d.discount, 0);

/** Suma paragonu: „Suma PLN”/„Razem”; gdy OCR ją zepsuł, większość odczytów płatności pomniejszona o kaucję. */
function findTotal(lines: readonly string[]): number | null {
  const money = (token: string) => parseMoney(token.replaceAll(" ", ""));
  for (const line of lines) {
    const match = PRIMARY_TOTAL.exec(line);
    if (match) return money(match[1]);
  }

  const start = lines.findIndex((line) => ANY_PRIMARY.test(line));
  let deposit = 0;
  const candidates: number[] = [];
  lines.forEach((line, index) => {
    const dep = DEPOSIT_LINE.exec(line);
    if (dep) deposit = money(dep[1]);
    const secondary = start !== -1 && index > start ? SECONDARY_TOTAL.exec(line) : null;
    const payment = PAYMENT_LINE.exec(line);
    const found = secondary?.[1] ?? payment?.[1];
    if (found) candidates.push(money(found));
  });
  if (candidates.length === 0) return null;

  const adjusted = candidates.map((value) => round2(value - deposit));
  const counts = new Map<number, number>();
  for (const value of adjusted) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

/** Zamienia jedną cyfrę „8” na „0” w liczbie (częsta pomyłka OCR); zwraca wszystkie warianty. */
function eightToZeroVariants(value: number): number[] {
  const text = value.toFixed(2);
  const variants: number[] = [];
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "8") variants.push(Number(`${text.slice(0, i)}0${text.slice(i + 1)}`));
  }
  return variants;
}

/** Jeden błędny odczyt „8” zamiast „0” w rabacie lub wartości pozycji, gdy dokładnie jedna zamiana domyka sumę. */
function repairEightZero(
  drafts: DraftItem[],
  total: number
): { index: number; field: "discount" | "lineValue"; value: number } | null {
  const gap = total - sumNet(drafts);
  if (Math.abs(gap) <= TOLERANCE || Math.abs(gap) > 20) return null;
  const hits: { index: number; field: "discount" | "lineValue"; value: number }[] = [];
  drafts.forEach((draft, index) => {
    for (const value of eightToZeroVariants(draft.discount)) {
      if (Math.abs(gap - (draft.discount - value)) <= TOLERANCE) hits.push({ index, field: "discount", value });
    }
    for (const value of eightToZeroVariants(draft.lineValue)) {
      const consistent = Math.abs(draft.quantity * draft.unitPrice - value) <= TOLERANCE;
      if (consistent && Math.abs(gap - (value - draft.lineValue)) <= TOLERANCE)
        hits.push({ index, field: "lineValue", value });
    }
  });
  return hits.length === 1 ? hits[0] : null;
}

/** Naprawia pozycje, w których ilość × cena ≠ wartość, o ile suma paragonu rozstrzyga, co jest błędne. */
function repairItems(input: DraftItem[], total: number | null): ParsedReceiptItem[] {
  const drafts = input.map((draft) => ({ ...draft }));
  const eightZero = total === null ? null : repairEightZero(drafts, total);
  const touched = new Set<number>();
  if (eightZero) {
    drafts[eightZero.index][eightZero.field] = eightZero.value;
    touched.add(eightZero.index);
  }
  const items = repairBroken(drafts, total);
  return items.map((item, index) =>
    touched.has(index) && !item.issues.includes("corrected") ? { ...item, issues: [...item.issues, "corrected"] } : item
  );
}

function repairBroken(drafts: DraftItem[], total: number | null): ParsedReceiptItem[] {
  const broken = drafts.filter((draft) => !isConsistent(draft));
  if (broken.length === 0) return drafts.map((draft) => finish(draft, []));

  if (total !== null && Math.abs(sumNet(drafts) - total) <= TOLERANCE) {
    // Wartości pozycji są dobre, błędna jest cena jednostkowa.
    return drafts.map((draft) =>
      isConsistent(draft)
        ? finish(draft, [])
        : finish({ ...draft, unitPrice: draft.lineValue / draft.quantity }, ["corrected"])
    );
  }

  if (total !== null) {
    const recomputed = drafts.map((draft) => (isConsistent(draft) ? draft : { ...draft, lineValue: productOf(draft) }));
    if (Math.abs(sumNet(recomputed) - total) <= TOLERANCE) {
      // Cena i ilość są dobre, błędna jest wartość pozycji.
      return recomputed.map((draft, index) => finish(draft, isConsistent(drafts[index]) ? [] : ["corrected"]));
    }
  }

  return drafts.map((draft) => finish(draft, isConsistent(draft) ? [] : ["arithmetic"]));
}
