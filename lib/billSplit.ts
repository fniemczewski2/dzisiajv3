// lib/billSplit.ts
//
// Tekst podziału kosztów do wysłania (schowek, udostępnianie, e-mail). Zawiera wyłącznie kwoty i procenty;
// dochody netto nie są częścią wiadomości.

export const BILL_SPLIT_SUBJECT = "Podział kosztów mieszkania";

export interface BillSplitSummary {
  total: number;
  share1: number;
  share2: number;
}

const money = (value: number): string => `${value.toFixed(2)} zł`;

/** Procent w tej samej postaci, jaka jest pokazana w kalkulatorze (zaokrąglenie do pełnych). */
const percent = (share: number, total: number): string => ((share / total) * 100 || 0).toFixed(0);

export function formatBillSplit(summary: BillSplitSummary): string {
  return [
    BILL_SPLIT_SUBJECT,
    `Suma kosztów: ${money(summary.total)}`,
    `Osoba 1: ${money(summary.share1)} (${percent(summary.share1, summary.total)}%)`,
    `Osoba 2: ${money(summary.share2)} (${percent(summary.share2, summary.total)}%)`,
  ].join("\n");
}

/** Link `mailto:` z tematem i treścią; wiadomość wysyła użytkownik we własnym kliencie poczty. */
export function buildMailtoHref(subject: string, body: string): string {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
