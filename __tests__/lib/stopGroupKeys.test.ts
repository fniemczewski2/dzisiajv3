import { describe, expect, it } from "vitest";
import { withFavoriteKeys, withNearbyKeys } from "@/lib/stopGroupKeys";
import { favoriteKey } from "@/supabase/functions/_shared/stopGrouping";
import type { StopGroup } from "@/types/transport";

const group = (over: Partial<StopGroup>): StopGroup =>
  ({ stop_name: "Rycerska", zone_id: "A", stop_codes: ["RYCE01"], bollards: [], ...over }) as StopGroup;

describe("withFavoriteKeys", () => {
  it("uzupełnia brakujący klucz kluczem pasującego ulubionego", () => {
    const fav = { name: "Rycerska", zone_id: "A" };
    const [g] = withFavoriteKeys([group({ key: undefined as unknown as string })], [fav]);
    expect(g.key).toBe(favoriteKey(fav));
  });

  it("zostawia klucz zwrócony przez serwer", () => {
    const [g] = withFavoriteKeys([group({ key: "poz:rycerska@1,2" })], [{ name: "Rycerska", zone_id: "A" }]);
    expect(g.key).toBe("poz:rycerska@1,2");
  });
});

describe("withNearbyKeys", () => {
  it("tworzy unikalne klucze, gdy serwer ich nie zwraca", () => {
    const groups = withNearbyKeys([
      group({ key: undefined as unknown as string }),
      group({ key: undefined as unknown as string }),
      group({ key: undefined as unknown as string, stop_codes: [], stop_name: "Dębiec" }),
    ]);
    const keys = groups.map((g) => g.key);
    expect(keys.every(Boolean)).toBe(true);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
