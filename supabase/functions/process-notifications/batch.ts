// supabase/functions/process-notifications/batch.ts
//
// Zapytania zbiorcze zamiast zapytań w pętli po użytkownikach (N+1):
// jedno zapytanie na typ powiadomienia i jedno na tabelę danych, wyniki
// pogrupowane po user_id w pamięci.

import type { SupabaseClient } from "../_shared/supabase.ts";
import { chunk } from "../_shared/asyncPool.ts";

/** Ile identyfikatorów w jednym filtrze `.in()` – adres zapytania nie może być zbyt długi. */
const IN_CHUNK = 200;

/** Użytkownicy, którzy dostali już dziś powiadomienie danego typu (opcjonalnie w danym „slocie”). */
export async function usersNotifiedToday(
  supabase: SupabaseClient,
  type: string,
  startOfDayUTC: string,
  userIds: readonly string[],
  slot?: number
): Promise<Set<string>> {
  const notified = new Set<string>();
  for (const ids of chunk(userIds, IN_CHUNK)) {
    let query = supabase
      .from("notifications")
      .select("user_id")
      .eq("type", type)
      .gte("created_at", startOfDayUTC)
      .in("user_id", ids);
    if (slot !== undefined) query = query.contains("data", { slot });
    const { data, error } = await query;
    if (error) throw error;
    for (const row of data ?? []) notified.add(row.user_id as string);
  }
  return notified;
}

/** Proste filtry kolumn stosowane obok `user_id IN (...)`. */
export interface RowFilters {
  eq?: Record<string, string | number | boolean>;
  neq?: Record<string, string | number | boolean>;
  gte?: Record<string, string>;
  lt?: Record<string, string>;
}

/** Wiersze tabeli dla wielu użytkowników naraz, pogrupowane po user_id. */
export async function rowsByUser<T extends { user_id: string }>(
  supabase: SupabaseClient,
  table: string,
  columns: string,
  userIds: readonly string[],
  filters: RowFilters = {}
): Promise<Map<string, T[]>> {
  const grouped = new Map<string, T[]>();
  for (const ids of chunk(userIds, IN_CHUNK)) {
    let query = supabase.from(table).select(columns).in("user_id", ids);
    for (const [column, value] of Object.entries(filters.eq ?? {})) query = query.eq(column, value);
    for (const [column, value] of Object.entries(filters.neq ?? {})) query = query.neq(column, value);
    for (const [column, value] of Object.entries(filters.gte ?? {})) query = query.gte(column, value);
    for (const [column, value] of Object.entries(filters.lt ?? {})) query = query.lt(column, value);
    const { data, error } = await query;
    if (error) throw error;
    for (const row of (data ?? []) as unknown as T[]) {
      const list = grouped.get(row.user_id) ?? [];
      list.push(row);
      grouped.set(row.user_id, list);
    }
  }
  return grouped;
}
