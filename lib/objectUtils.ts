// lib/objectUtils.ts

/**
 * Kopia obiektu bez wskazanych kluczy. Zastępuje destrukturyzację w stylu
 * `const { id: _id, ...rest } = obj`, która zostawiała nieużywane zmienne.
 */
export function omit<T extends object, K extends keyof T>(obj: T, keys: readonly K[]): Omit<T, K> {
  const skip = new Set<PropertyKey>(keys);
  return Object.fromEntries(Object.entries(obj).filter(([key]) => !skip.has(key))) as Omit<T, K>;
}
