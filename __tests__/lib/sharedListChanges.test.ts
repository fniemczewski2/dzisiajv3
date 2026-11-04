// __tests__/lib/sharedListChanges.test.ts

import { describe, it, expect } from "vitest";
import { diffElements, MAX_NOTIFY_LABELS, mergeChange, toPayload, type ChangeBuffer } from "@/lib/sharedListChanges";

const els = (...texts: string[]) => texts.map((text) => ({ text }));

describe("diffElements", () => {
  it("dodane (+1) i usunięte (-1) według tekstu pozycji", () => {
    expect(Object.fromEntries(diffElements(els("a", "b"), els("b", "c", "d")))).toEqual({ c: 1, d: 1, a: -1 });
  });

  it("odhaczenie (ta sama lista tekstów) nie jest zmianą; kolejność nie ma znaczenia", () => {
    expect(diffElements(els("a", "b"), els("b", "a")).size).toBe(0);
  });

  it("powtórzone pozycje liczone osobno; spacje na brzegach i puste teksty ignorowane", () => {
    expect(Object.fromEntries(diffElements(els("a"), els("a", " a ", "a", "  ")))).toEqual({ a: 2 });
  });
});

describe("mergeChange / toPayload", () => {
  const change = (obj: Record<string, number>): ChangeBuffer => new Map(Object.entries(obj));

  it("kolejne zmiany sumują się; dodanie i usunięcie tej samej pozycji znosi się", () => {
    const buffer: ChangeBuffer = new Map();
    mergeChange(buffer, change({ mleko: 1 }));
    mergeChange(buffer, change({ chleb: 1 }));
    mergeChange(buffer, change({ mleko: -1 }));
    expect(Object.fromEntries(buffer)).toEqual({ chleb: 1 });
  });

  it("usunięcie, a potem ponowne dodanie tej samej pozycji też się znosi", () => {
    const buffer: ChangeBuffer = new Map();
    mergeChange(buffer, change({ ser: -1 }));
    mergeChange(buffer, change({ ser: 1 }));
    expect(buffer.size).toBe(0);
  });

  it("ładunek: etykiety dodanych i usuniętych (z powtórzeniami)", () => {
    expect(toPayload(change({ a: 2, b: -1, c: 1 }))).toEqual({ added: ["a", "a", "c"], removed: ["b"] });
  });

  it("ładunek jest ograniczony do limitu serwera", () => {
    const big = new Map(Array.from({ length: MAX_NOTIFY_LABELS + 20 }, (_, i) => [`p${i}`, 1] as [string, number]));
    expect(toPayload(big).added).toHaveLength(MAX_NOTIFY_LABELS);
  });
});
