// supabase/functions/_shared/asyncPool.ts – kopia lib/asyncPool.ts (Edge Functions nie importują kodu aplikacji).

/**
 * Wywołuje `fn` dla każdego elementu, najwyżej `limit` naraz, i czeka na
 * wszystkie. Zastępuje pętle `for … { await … }` tam, gdzie iteracje są od
 * siebie niezależne: zamiast czekać na każdą po kolei, kolejne zadanie
 * startuje, gdy tylko zwolni się miejsce (bez blokowania na najwolniejszym
 * elemencie paczki, jak przy `for (chunk) await Promise.all(chunk)`).
 *
 * Wyniki są w kolejności wejścia. Pierwszy błąd odrzuca całość – jeśli
 * iteracje mają być od siebie odporne, łap błędy wewnątrz `fn`.
 */
export async function mapPool<T, R>(
  items: Iterable<T>,
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const list = Array.from(items);
  const results = new Array<R>(list.length);
  let next = 0;

  // Rekurencyjny „pracownik”: bierze kolejny element, kończy go i sięga po
  // następny. Każde `await` oddaje sterowanie, więc stos nie rośnie.
  const worker = async (): Promise<void> => {
    const index = next++;
    if (index >= list.length) return;
    results[index] = await fn(list[index], index);
    return worker();
  };

  const workers = Array.from({ length: Math.max(1, Math.min(limit, list.length)) }, worker);
  await Promise.all(workers);
  return results;
}
