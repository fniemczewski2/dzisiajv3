// __tests__/lib/tmdb.test.ts

import { describe, it, expect } from "vitest";
import {
  buildMovieData,
  extractPolishProviders,
  isSafePosterPath,
  normalizeSearchResults,
  posterUrl,
  translateSeriesStatus,
} from "@/lib/tmdb";
import type { MediaSearchResult, TmdbSearchResponse } from "@/types/movies";

describe("normalizeSearchResults", () => {
  const data: TmdbSearchResponse = {
    results: [
      { id: 1, media_type: "movie", title: "Incepcja", release_date: "2010-07-16", vote_average: 8.37, poster_path: "/a.jpg", genre_ids: [28] },
      { id: 2, media_type: "tv", name: "Wiedźmin", first_air_date: "2019-12-20", vote_average: 8.0, poster_path: "/b.jpg" },
      { id: 3, media_type: "person", name: "Henry Cavill" },
      { id: 4, media_type: "tv", name: "Bez plakatu", poster_path: "https://evil.example/x.jpg" },
    ],
  };

  it("keeps movies and series, drops people, uses name for TV", () => {
    const r = normalizeSearchResults(data);
    expect(r.map((x) => [x.mediaType, x.title, x.year])).toEqual([
      ["movie", "Incepcja", 2010],
      ["tv", "Wiedźmin", 2019],
      ["tv", "Bez plakatu", null],
    ]);
    expect(r[0].rating).toBeCloseTo(8.4);
  });

  it("filters by media type", () => {
    expect(normalizeSearchResults(data, "tv").map((x) => x.tmdbId)).toEqual([2, 4]);
  });

  it("rejects poster paths that are not plain TMDB file paths", () => {
    expect(normalizeSearchResults(data, "tv")[1].posterPath).toBeNull();
  });
});

describe("poster helpers", () => {
  it("validates poster paths", () => {
    expect(isSafePosterPath("/abc_DEF-1.jpg")).toBe(true);
    expect(isSafePosterPath("//evil.com/a.jpg")).toBe(false);
    expect(isSafePosterPath("/../a.jpg")).toBe(false);
    expect(posterUrl("/x.jpg", "w92")).toBe("https://image.tmdb.org/t/p/w92/x.jpg");
    expect(posterUrl(null)).toBeNull();
  });
});

describe("extractPolishProviders", () => {
  it("prefers subscription and deduplicates", () => {
    expect(extractPolishProviders({
      results: { PL: {
        flatrate: [{ provider_id: 8, provider_name: "Netflix" }, { provider_id: 8, provider_name: "Netflix" }],
        rent: [{ provider_id: 2, provider_name: "Apple TV" }],
      } },
    })).toEqual(["Netflix"]);
  });

  it("falls back to rent/buy", () => {
    expect(extractPolishProviders({ results: { PL: { rent: [{ provider_id: 2, provider_name: "Apple TV" }] } } })).toEqual(["Apple TV"]);
  });

  it("handles missing PL data", () => {
    expect(extractPolishProviders({ results: {} })).toEqual([]);
    expect(extractPolishProviders(undefined)).toEqual([]);
  });
});

describe("buildMovieData", () => {
  const tv: MediaSearchResult = {
    tmdbId: 71912, mediaType: "tv", title: "Wiedźmin", year: 2019, rating: 8, overview: "Geralt…",
    posterPath: "/w.jpg", genreIds: [10765],
  };

  it("fills series-specific fields from details", () => {
    const d = buildMovieData(tv, {
      id: 71912, name: "Wiedźmin", number_of_seasons: 4, number_of_episodes: 32, status: "Returning Series",
      genres: [{ id: 10765, name: "Sci-Fi & Fantasy" }], vote_average: 7.96,
      "watch/providers": { results: { PL: { flatrate: [{ provider_id: 8, provider_name: "Netflix" }] } } },
    });
    expect(d).toMatchObject({
      media_type: "tv", tmdb_id: 71912, seasons_count: 4, episodes_count: 32,
      series_status: "Emitowany", platform: "Netflix", genre: "Sci-Fi & Fantasy", rating: 8,
    });
  });

  it("uses genre ids when details are unavailable", () => {
    const d = buildMovieData(tv, null);
    expect(d.genre).toBe("Sci-Fi i fantasy");
    expect(d.seasons_count).toBeNull();
  });

  it("never sets series fields for movies", () => {
    const d = buildMovieData({ ...tv, mediaType: "movie" }, { id: 1, title: "X", number_of_seasons: 3 });
    expect(d.seasons_count).toBeNull();
    expect(d.series_status).toBeNull();
    expect(d.title).toBe("X");
  });
});

describe("translateSeriesStatus", () => {
  it("translates known statuses and passes unknown through", () => {
    expect(translateSeriesStatus("Ended")).toBe("Zakończony");
    expect(translateSeriesStatus("Canceled")).toBe("Anulowany");
    expect(translateSeriesStatus("Something")).toBe("Something");
    expect(translateSeriesStatus(undefined)).toBeNull();
  });
});
