// lib/postgrestFilters.ts
//
// Bezpieczne składanie filtrów PostgREST. Wartości wstawiane do `.or()` i do
// wzorców `ilike` są walidowane albo escapowane, żeby dane wejściowe nie
// mogły zmienić znaczenia filtra (przecinki, nawiasy, znaki wieloznaczne).

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class InvalidFilterValueError extends Error {
  constructor(what: string) {
    super(`Nieprawidłowa wartość filtra: ${what}.`);
    this.name = "InvalidFilterValueError";
  }
}

/** Zwraca UUID bez zmian albo rzuca błąd – nigdy nie wstawiamy do filtra niesprawdzonego tekstu. */
export function assertUuid(value: string): string {
  if (!UUID.test(value)) throw new InvalidFilterValueError("identyfikator");
  return value;
}

/**
 * Filtr „wiersz należy do osoby albo jest jej udostępniony”:
 * `owner.eq.<id>,shared.eq.<id>` dla `.or()`.
 */
export function ownedOrSharedFilter(ownerColumn: string, sharedColumn: string, userId: string): string {
  const id = assertUuid(userId);
  return `${ownerColumn}.eq.${id},${sharedColumn}.eq.${id}`;
}

/** Znacznik czasu ISO 8601 w cudzysłowie, gotowy do filtra `.or()`. */
export function quotedIsoTimestamp(value: string): string {
  if (Number.isNaN(Date.parse(value)) || /["\\,()]/.test(value)) throw new InvalidFilterValueError("data");
  return `"${value}"`;
}

/** Escapuje znaki specjalne LIKE (`\\`, `%`, `_`). */
export function escapeLikePattern(text: string): string {
  return text.replaceAll(/[\\%_]/g, (char) => `\\${char}`);
}

/** Wzorzec `ilike` „zawiera tekst” z escapowaniem. */
export function containsPattern(text: string): string {
  return `%${escapeLikePattern(text.trim())}%`;
}
