// __tests__/lib/asyncPool.test.ts

import { describe, it, expect } from "vitest";
import { mapPool, chunk } from "@/lib/asyncPool";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("mapPool", () => {
  it("zwraca wyniki w kolejności wejścia, nawet gdy kończą się w innej", async () => {
    const delays = [30, 5, 20, 1];
    const out = await mapPool(delays, 4, async (ms, i) => { await sleep(ms); return i; });
    expect(out).toEqual([0, 1, 2, 3]);
  });

  it("nigdy nie przekracza limitu równoległych zadań", async () => {
    let running = 0;
    let peak = 0;
    await mapPool(Array.from({ length: 20 }, (_, i) => i), 3, async () => {
      running++;
      peak = Math.max(peak, running);
      await sleep(2);
      running--;
    });
    expect(peak).toBe(3);
  });

  it("limit 1 przetwarza elementy po kolei", async () => {
    const order: number[] = [];
    await mapPool([3, 1, 2], 1, async (ms) => { await sleep(ms); order.push(ms); });
    expect(order).toEqual([3, 1, 2]);
  });

  it("pusta lista kończy się od razu", async () => {
    expect(await mapPool([], 5, () => Promise.resolve(1))).toEqual([]);
  });

  it("przyjmuje dowolny iterowalny obiekt, np. Map", async () => {
    const m = new Map([["a", 1], ["b", 2]]);
    expect(await mapPool(m, 2, ([k, v]) => Promise.resolve(`${k}${v}`))).toEqual(["a1", "b2"]);
  });

  it("odrzuca całość przy pierwszym błędzie", async () => {
    await expect(
      mapPool([1, 2, 3], 2, (n) => (n === 2 ? Promise.reject(new Error("boom")) : Promise.resolve(n)))
    ).rejects.toThrow("boom");
  });
});

describe("chunk", () => {
  it("dzieli na fragmenty o zadanym rozmiarze", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 3)).toEqual([]);
  });
});
