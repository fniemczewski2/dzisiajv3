// lib/server/inboundAuth.ts

import { safeEqual } from "@/lib/server/safeEqual";

/** Czy nagłówek bramki poczty zawiera oczekiwany sekret. Brak sekretu po stronie serwera = odmowa. */
export function isInboundAuthorized(expected: string | undefined, provided: string | undefined): boolean {
  if (!expected || !provided) return false;
  return safeEqual(expected, provided);
}
