// lib/prices/fingerprint.ts
//
// Jednokierunkowy skrót paragonu (SHA-256) wyłącznie do wykrywania ponownego importu tego samego paragonu.
// Skrót powstaje z typu sklepu, daty, sumy i pozycji (nazwa, ilość, wartość); nie zawiera danych osobowych
// i nie pozwala odtworzyć paragonu.

import type { ParsedReceipt } from "@/types/prices";

export async function receiptFingerprint(receipt: ParsedReceipt): Promise<string> {
  const lines = receipt.items.map((item) => `${item.rawName}|${item.quantity}|${item.lineValue.toFixed(2)}`);
  const payload = [receipt.store, receipt.date ?? "", receipt.total?.toFixed(2) ?? "", ...lines].join("\n");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
