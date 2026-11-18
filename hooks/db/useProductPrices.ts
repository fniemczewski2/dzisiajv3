// hooks/db/useProductPrices.ts
//
// Katalog cen produktów użytkownika, zapamiętane dopasowania nazw z paragonów i zapis zatwierdzonego importu.
// Plików ani pojedynczych paragonów nie zapisujemy: tylko średnie ceny, liczby wystąpień i skróty paragonów
// (do blokowania ponownego importu tego samego paragonu).

import { useCallback, useMemo } from "react";
import { MAX_PRODUCT_PRICES, PRODUCT_NAME_MAX_LENGTH } from "@/config/limits";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { useRetry } from "@/hooks/useRetry";
import { useQueryState } from "@/hooks/useQueryState";
import { isAbortError } from "@/lib/abortUtils";
import type { ImportChanges } from "@/lib/prices/importPlan";
import { comparePolish, nameKey, roundTo } from "@/lib/prices/text";
import type { PriceUnit, ProductPrice, ReceiptAlias } from "@/types/prices";

const NO_PRICES: ProductPrice[] = [];
const NO_ALIASES: ReceiptAlias[] = [];
const PRICE_COLUMNS = "id, user_id, name, name_key, unit, avg_price, occurrences, updated_at";
const ALIAS_COLUMNS = "id, user_id, store, alias_key, product_name_key";
const UNIQUE_VIOLATION = "23505";

export type CommitResult = "saved" | "duplicate" | "limit" | "error";

export interface PriceInput {
  name: string;
  unit: PriceUnit | null;
  avg_price: number;
  occurrences?: number;
}

export function useProductPrices() {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const { toast } = useToast();
  const withRetry = useRetry();

  const queryPrices = useCallback(
    async ({ signal }: { signal: AbortSignal }): Promise<ProductPrice[]> => {
      if (!userId) return NO_PRICES;
      try {
        const { data, error } = await withRetry(
          () => supabase.from("product_prices").select(PRICE_COLUMNS).eq("user_id", userId).abortSignal(signal),
          signal
        );
        if (error) throw error;
        return ((data ?? []) as ProductPrice[]).map((row) => ({
          ...row,
          avg_price: Number(row.avg_price),
        }));
      } catch (err) {
        if (!isAbortError(err)) toast.error("Błąd pobierania cen produktów.", { cause: err });
        throw err;
      }
    },
    [supabase, userId, toast, withRetry]
  );
  const {
    data: rawPrices,
    setData: setPrices,
    fetching,
  } = useQueryState<ProductPrice[]>({
    queryKey: ["product-prices", userId ?? null],
    queryFn: queryPrices,
    initial: NO_PRICES,
    enabled: Boolean(userId),
  });

  const queryAliases = useCallback(
    async ({ signal }: { signal: AbortSignal }): Promise<ReceiptAlias[]> => {
      if (!userId) return NO_ALIASES;
      const { data, error } = await withRetry(
        () => supabase.from("receipt_aliases").select(ALIAS_COLUMNS).eq("user_id", userId).abortSignal(signal),
        signal
      );
      if (error) throw error;
      return (data ?? []) as ReceiptAlias[];
    },
    [supabase, userId, withRetry]
  );
  const { data: aliases, setData: setAliases } = useQueryState<ReceiptAlias[]>({
    queryKey: ["receipt-aliases", userId ?? null],
    queryFn: queryAliases,
    initial: NO_ALIASES,
    enabled: Boolean(userId),
  });

  const prices = useMemo(() => [...rawPrices].sort((a, b) => comparePolish(a.name, b.name)), [rawPrices]);

  /** Zapis (dodanie lub zmiana) jednego produktu ręcznie. */
  const savePrice = useCallback(
    async (input: PriceInput): Promise<boolean> => {
      if (!userId) return false;
      const name = input.name.replaceAll(/\s+/g, " ").trim().slice(0, PRODUCT_NAME_MAX_LENGTH);
      const key = nameKey(name);
      if (!key || !(input.avg_price >= 0)) {
        toast.error("Podaj nazwę i cenę produktu.");
        return false;
      }
      const exists = rawPrices.some((entry) => entry.name_key === key);
      if (!exists && rawPrices.length >= MAX_PRODUCT_PRICES) {
        toast.error(`Katalog może mieć najwyżej ${MAX_PRODUCT_PRICES} produktów.`);
        return false;
      }
      const row = {
        user_id: userId,
        name,
        name_key: key,
        unit: input.unit,
        avg_price: roundTo(input.avg_price, 4),
        occurrences: Math.max(1, Math.trunc(input.occurrences ?? 1)),
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await withRetry(() =>
        supabase.from("product_prices").upsert(row, { onConflict: "user_id,name_key" }).select(PRICE_COLUMNS).single()
      );
      if (error || !data) {
        toast.error("Błąd zapisu ceny produktu.", { cause: error });
        return false;
      }
      const saved = { ...(data as ProductPrice), avg_price: Number((data as ProductPrice).avg_price) };
      setPrices((prev) => [...prev.filter((entry) => entry.name_key !== key), saved]);
      return true;
    },
    [userId, rawPrices, supabase, toast, withRetry, setPrices]
  );

  const removePrice = useCallback(
    async (id: string): Promise<boolean> => {
      if (!userId) return false;
      const { error } = await withRetry(() =>
        supabase.from("product_prices").delete().eq("id", id).eq("user_id", userId)
      );
      if (error) {
        toast.error("Błąd usuwania produktu z katalogu cen.", { cause: error });
        return false;
      }
      setPrices((prev) => prev.filter((entry) => entry.id !== id));
      return true;
    },
    [userId, supabase, toast, withRetry, setPrices]
  );

  /**
   * Zapis zatwierdzonego importu. Przy paragonie najpierw rejestrujemy jego skrót: duplikat (ten sam paragon
   * zaimportowany wcześniej) zatrzymuje import, a przy błędzie dalszych kroków skrót jest cofany.
   */
  const commitChanges = useCallback(
    async (changes: ImportChanges, fingerprint?: string): Promise<CommitResult> => {
      if (!userId) return "error";
      const existingKeys = new Set(rawPrices.map((entry) => entry.name_key));
      const newCount = changes.upserts.filter((upsert) => !existingKeys.has(upsert.name_key)).length;
      if (rawPrices.length + newCount > MAX_PRODUCT_PRICES) {
        toast.error(`Katalog może mieć najwyżej ${MAX_PRODUCT_PRICES} produktów.`);
        return "limit";
      }

      let registeredId: string | null = null;
      if (fingerprint) {
        const { data, error } = await withRetry(() =>
          supabase.from("imported_receipts").insert({ user_id: userId, fingerprint }).select("id").single()
        );
        if (error?.code === UNIQUE_VIOLATION) return "duplicate";
        if (error || !data) {
          toast.error("Błąd zapisu importu.", { cause: error });
          return "error";
        }
        registeredId = (data as { id: string }).id;
      }

      try {
        const now = new Date().toISOString();
        if (changes.upserts.length > 0) {
          const rows = changes.upserts.map((upsert) => ({ ...upsert, user_id: userId, updated_at: now }));
          const { data, error } = await withRetry(() =>
            supabase.from("product_prices").upsert(rows, { onConflict: "user_id,name_key" }).select(PRICE_COLUMNS)
          );
          if (error) throw error;
          const saved = ((data ?? []) as ProductPrice[]).map((row) => ({ ...row, avg_price: Number(row.avg_price) }));
          const savedKeys = new Set(saved.map((row) => row.name_key));
          setPrices((prev) => [...prev.filter((entry) => !savedKeys.has(entry.name_key)), ...saved]);
        }
        if (changes.aliases.length > 0) {
          const rows = changes.aliases.map((alias) => ({ ...alias, user_id: userId }));
          const { data, error } = await withRetry(() =>
            supabase
              .from("receipt_aliases")
              .upsert(rows, { onConflict: "user_id,store,alias_key" })
              .select(ALIAS_COLUMNS)
          );
          if (error) throw error;
          const saved = (data ?? []) as ReceiptAlias[];
          const savedKeys = new Set(saved.map((row) => `${row.store}|${row.alias_key}`));
          setAliases((prev) => [...prev.filter((row) => !savedKeys.has(`${row.store}|${row.alias_key}`)), ...saved]);
        }
        return "saved";
      } catch (err) {
        if (registeredId) {
          await supabase.from("imported_receipts").delete().eq("id", registeredId).eq("user_id", userId);
        }
        toast.error("Błąd zapisu cen. Spróbuj ponownie.", { cause: err });
        return "error";
      }
    },
    [userId, rawPrices, supabase, toast, withRetry, setPrices, setAliases]
  );

  return { prices, aliases, fetching, savePrice, removePrice, commitChanges };
}
