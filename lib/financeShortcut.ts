// lib/financeShortcut.ts
//
// Treść żądania z automatyzacji Skrótów iOS „Transakcja” (Apple Pay): wyłącznie kwota i nazwa sprzedawcy.
// Inne pola (karta, saldo, historia) są ignorowane i nigdy nie trafiają do bazy. Kwota może przyjść jako liczba
// albo tekst z walutą i przecinkiem dziesiętnym („12,34 zł”, „PLN 1 234,50”).

const MAX_SHORTCUT_AMOUNT = 100_000;
const MAX_MERCHANT_LENGTH = 120;

export type FinanceShortcutPayload = { ok: true; amount: number; merchant: string } | { ok: false; error: string };

/** „1 234,50 zł” → 1234.5; null, gdy tekst nie jest kwotą. */
export function parseAmount(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? Math.abs(value) : null;
  if (typeof value !== "string") return null;
  const cleaned = value
    .replaceAll(/[\s\u00a0\u202f]/g, "")
    .replaceAll(/[^\d,.-]/g, "")
    .replace(/^-/, "");
  if (!/^\d+([.,]\d{1,2})?$/.test(cleaned)) return null;
  const n = Number(cleaned.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function parseFinanceShortcutPayload(body: unknown): FinanceShortcutPayload {
  let data = body;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      return { ok: false, error: "Treść nie jest poprawnym JSON." };
    }
  }
  if (!data || typeof data !== "object") return { ok: false, error: "Brak danych." };
  const b = data as Record<string, unknown>;
  const amount = parseAmount(b.amount);
  if (amount === null || amount <= 0 || amount > MAX_SHORTCUT_AMOUNT) {
    return { ok: false, error: "Pole „amount”: kwota większa od 0." };
  }
  const merchant = typeof b.merchant === "string" ? b.merchant.replaceAll(/\s+/g, " ").trim() : "";
  if (!merchant || merchant.length > MAX_MERCHANT_LENGTH) {
    return { ok: false, error: `Pole „merchant”: od 1 do ${MAX_MERCHANT_LENGTH} znaków.` };
  }
  return { ok: true, amount: Math.round(amount * 100) / 100, merchant };
}
