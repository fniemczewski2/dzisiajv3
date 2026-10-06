// lib/server/safeEqual.ts

import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Porównanie sekretów w czasie stałym. Obie strony są najpierw haszowane
 * SHA-256, więc czas nie zdradza też długości oczekiwanej wartości (zwykłe
 * `timingSafeEqual` wymaga równych długości i wcześniejszy test długości
 * wyciekał ją).
 */
export function safeEqual(expected: string, provided: string): boolean {
  const a = createHash("sha256").update(expected).digest();
  const b = createHash("sha256").update(provided).digest();
  return timingSafeEqual(a, b);
}
