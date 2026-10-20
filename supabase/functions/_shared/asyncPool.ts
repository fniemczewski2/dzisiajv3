// supabase/functions/_shared/asyncPool.ts
//
// Wspólne dla aplikacji (import "@/shared/asyncPool") i Edge Functions.

/**
 * `fn` dla każdego elementu, najwyżej `limit` naraz (wyniki w kolejności wejścia).
 * `limit` = 1 – ściśle jeden po drugim: tam, gdzie kolejność ma znaczenie albo
 * zewnętrzne API ma limit zapytań.
 */
export async function mapPool<T, R>(
  items: Iterable<T>,
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const list = Array.from(items);
  const results: R[] = Array.from({ length: list.length });
  let next = 0;

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

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Pobieranie stron z kursorem (Google, Microsoft Graph, Slack): `fetchPage`
 * przetwarza stronę i zwraca kursor następnej albo undefined. Strony idą kolejno,
 * bo każda potrzebuje kursora poprzedniej.
 */
export async function forEachPage(
  fetchPage: (cursor: string | undefined) => Promise<string | undefined>,
  cursor?: string
): Promise<void> {
  const next = await fetchPage(cursor);
  if (next) await forEachPage(fetchPage, next);
}
