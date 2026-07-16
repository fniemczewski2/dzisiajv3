import { describe, it, expect } from "vitest";
import { isAllowedPath } from "@/pages/api/tmdb";

describe("isAllowedPath (TMDB proxy allowlist)", () => {
  it("allows the movie search endpoint", () => {
    expect(isAllowedPath("/search/movie")).toBe(true);
  });

  it("allows a specific movie details endpoint", () => {
    expect(isAllowedPath("/movie/12345")).toBe(true);
  });

  it("rejects an unrelated TMDB endpoint", () => {
    expect(isAllowedPath("/account/settings")).toBe(false);
  });

  it("rejects an attempt to escape the API via a crafted path", () => {
    expect(isAllowedPath("/../admin")).toBe(false);
  });

  it("rejects an empty path", () => {
    expect(isAllowedPath("")).toBe(false);
  });
});
