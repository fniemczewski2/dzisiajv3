// supabase/functions/_shared/asyncPool.ts – kopia lib/asyncPool.ts (Edge Functions nie importują kodu aplikacji).

export async function mapPool<T, R>(
  items: Iterable<T>,
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const list = Array.from(items);
  const results = new Array<R>(list.length);
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
