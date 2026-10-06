// __tests__/lib/objectUtils.test.ts

import { describe, it, expect } from "vitest";
import { omit } from "@/lib/objectUtils";

describe("omit", () => {
  it("usuwa wskazane klucze i nie zmienia oryginału", () => {
    const src = { id: "1", user_id: "u", title: "T", done: false };
    const out = omit(src, ["id", "user_id"]);
    expect(out).toEqual({ title: "T", done: false });
    expect(src).toEqual({ id: "1", user_id: "u", title: "T", done: false });
  });
  it("brakujący klucz nie przeszkadza", () => {
    const src: { a: number; b?: number } = { a: 1 };
    expect(omit(src, ["b"])).toEqual({ a: 1 });
  });
});
