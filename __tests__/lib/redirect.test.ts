// __tests__/lib/redirect.test.ts

import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "@/lib/redirect";

describe("safeRedirectPath", () => {
  it("przepuszcza ścieżki w aplikacji, także z parametrami", () => {
    expect(safeRedirectPath("/tasks")).toBe("/tasks");
    expect(safeRedirectPath("/notes/letters?id=5")).toBe("/notes/letters?id=5");
  });

  it("odrzuca adresy zewnętrzne i protokołowo-względne", () => {
    expect(safeRedirectPath("https://evil.example")).toBe("/");
    expect(safeRedirectPath("//evil.example")).toBe("/");
    expect(safeRedirectPath("/\\evil.example")).toBe("/");
    expect(safeRedirectPath("javascript:alert(1)")).toBe("/");
  });

  it("zamienia /index i puste wartości na stronę główną", () => {
    expect(safeRedirectPath("/index")).toBe("/");
    expect(safeRedirectPath(null)).toBe("/");
    expect(safeRedirectPath(["/calendar", "/x"])).toBe("/calendar");
  });
});
