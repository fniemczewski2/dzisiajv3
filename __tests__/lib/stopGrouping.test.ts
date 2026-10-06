// __tests__/lib/stopGrouping.test.ts

import { describe, it, expect } from "vitest";
import {
  ambiguousNames,
  clusterStops,
  favoriteFromCluster,
  favoriteKey,
  isAmbiguous,
  isSameStopPlace,
  pickClusterForFavorite,
  type StopPost,
} from "@/supabase/functions/_shared/stopGrouping";

// Dwa przystanki "Dworcowa": w Poznaniu (2 słupki) i w Luboniu (2 słupki), ~7 km od siebie.
const POZNAN = { lat: 52.4020, lon: 16.9110 };
const LUBON = { lat: 52.3470, lon: 16.8770 };
const post = (code: string, name: string, base: { lat: number; lon: number }, dLat = 0, zone = "A"): StopPost => ({
  stop_code: code, stop_name: name, stop_lat: base.lat + dLat, stop_lon: base.lon, zone_id: zone,
});

const posts: StopPost[] = [
  post("DWOR01", "Dworcowa", POZNAN),
  post("DWOR02", "Dworcowa", POZNAN, 0.0008),          // ~90 m dalej – ten sam przystanek
  post("LDWO01", "Dworcowa", LUBON, 0, "B"),
  post("LDWO02", "dworcowa ", LUBON, 0.0006, "B"),     // inna wielkość liter / spacja
  post("DWK01", "Dworzec Zachodni", POZNAN, 0.003),
  { stop_code: null, stop_name: "Dworcowa", stop_lat: POZNAN.lat, stop_lon: POZNAN.lon, zone_id: "A" },
];

describe("clusterStops", () => {
  const clusters = clusterStops(posts);
  const dworcowa = clusters.filter((c) => c.name.toLowerCase().startsWith("dworcowa"));

  it("splits same-named stops in different towns into separate groups", () => {
    expect(dworcowa).toHaveLength(2);
    const codes = dworcowa.map((c) => c.stop_codes).sort((a, b) => a.join(",").localeCompare(b.join(",")));
    expect(codes).toEqual([["DWOR01", "DWOR02"], ["LDWO01", "LDWO02"]]);
  });

  it("keeps nearby posts of one stop together and ignores posts without a code", () => {
    const pzn = dworcowa.find((c) => c.stop_codes.includes("DWOR01"))!;
    expect(pzn.stop_codes).toEqual(["DWOR01", "DWOR02"]);
    expect(pzn.zone_id).toBe("A");
  });

  it("does not merge different names (no substring matching)", () => {
    expect(clusters.find((c) => c.name === "Dworzec Zachodni")?.stop_codes).toEqual(["DWK01"]);
  });

  it("never merges Poznań network stops with Szczecin ones", () => {
    const c = clusterStops([post("1", "Rondo", POZNAN), post("2", "Rondo", POZNAN, 0.0001, "S")]);
    expect(c).toHaveLength(2);
  });

  it("flags the name as ambiguous", () => {
    const amb = ambiguousNames(clusters);
    expect(dworcowa.every((c) => isAmbiguous(c, amb))).toBe(true);
    expect(isAmbiguous(clusters.find((c) => c.name === "Dworzec Zachodni")!, amb)).toBe(false);
  });
});

describe("favorites", () => {
  const clusters = clusterStops(posts);
  const lubon = clusters.find((c) => c.stop_codes.includes("LDWO01"))!;
  const poznan = clusters.find((c) => c.stop_codes.includes("DWOR01"))!;

  it("a favorite added in Luboń resolves only to Luboń (the reported bug)", () => {
    const fav = favoriteFromCluster(lubon, "Luboń");
    const picked = pickClusterForFavorite(fav, clusters, POZNAN); // nawet gdy użytkownik stoi w Poznaniu
    expect(picked?.stop_codes).toEqual(["LDWO01", "LDWO02"]);
  });

  it("legacy name-only favorite picks the group nearest to the user", () => {
    const legacy = { name: "Dworcowa", zone_id: "A" };
    expect(pickClusterForFavorite(legacy, clusters, LUBON)?.key).toBe(lubon.key);
    expect(pickClusterForFavorite(legacy, clusters, POZNAN)?.key).toBe(poznan.key);
  });

  it("Poznań and Luboń favorites are distinct entries with distinct keys", () => {
    const a = favoriteFromCluster(poznan);
    const b = favoriteFromCluster(lubon);
    expect(isSameStopPlace(a, b)).toBe(false);
    expect(favoriteKey(a)).not.toBe(favoriteKey(b));
  });

  it("re-adding the same stop is detected as duplicate", () => {
    expect(isSameStopPlace(favoriteFromCluster(poznan), { ...favoriteFromCluster(poznan), lat: poznan.lat + 0.001 })).toBe(true);
  });
});
