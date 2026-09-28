// __tests__/pages/api/tmdb.test.ts

import { describe, it, expect } from "vitest";
import { isAllowedPath, buildTmdbUrl } from "@/pages/api/tmdb";

describe("isAllowedPath (TMDB proxy allowlist)", () => {
  it.each([
    "/search/movie", "/search/tv", "/search/multi",
    "/movie/12345", "/tv/1399",
    "/movie/12345/watch/providers", "/tv/1399/watch/providers",
  ])("allows %s", (p) => {
    expect(isAllowedPath(p)).toBe(true);
  });

  it.each([
    "/account/settings",
    "/../admin",
    "",
    "/movie/../account/1",       // wcześniej przechodziło (prefiks "/movie/")
    "/tv/1399/../../account",
    "/movie/abc",
    "/movie/1/credits",
    "/search/person",
    "/search/movie?x=1",
  ])("rejects %s", (p) => {
    expect(isAllowedPath(p)).toBe(false);
  });
});

describe("buildTmdbUrl", () => {
  it("keeps only allowlisted params and forces key/language/adult", () => {
    const url = buildTmdbUrl("/search/multi", {
      query: "Dark", api_key: "evil", language: "en-US", include_adult: "true", foo: "bar",
    }, "SECRET");
    expect(url.searchParams.get("query")).toBe("Dark");
    expect(url.searchParams.get("api_key")).toBe("SECRET");
    expect(url.searchParams.get("language")).toBe("pl-PL");
    expect(url.searchParams.get("include_adult")).toBe("false");
    expect(url.searchParams.has("foo")).toBe(false);
  });

  it("accepts only the watch/providers append", () => {
    expect(buildTmdbUrl("/tv/1", { append_to_response: "watch/providers" }, "k").searchParams.get("append_to_response")).toBe("watch/providers");
    expect(buildTmdbUrl("/tv/1", { append_to_response: "credits,account" }, "k").searchParams.has("append_to_response")).toBe(false);
  });
});
