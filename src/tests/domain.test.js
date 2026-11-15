import { describe, it, expect } from "vitest";
import {
  normalizeTmdbMovie,
  normalizeCustomMovie,
  mergeMovies,
  validateMovie,
  validateImage,
  validateShelf,
  shelfSnapshot,
  titleKey,
  validReference,
} from "../domain/movie.js";
const film = {
  title: "A student film",
  release_year: 2026,
  synopsis: "A story about a student filmmaker.",
  genre_ids: [18],
};
describe("movie contracts", () => {
  it("preserves source identities and nullable ratings", () => {
    const t = normalizeTmdbMovie({
      id: 1,
      title: "Film",
      vote_average: 0,
      vote_count: 0,
    });
    const c = normalizeCustomMovie({ id: "1", title: "Film" });
    expect(t.tmdbRating).toBeNull();
    expect(t.year).toBeNull();
    expect(mergeMovies([t, t], [c])).toHaveLength(2);
    expect(shelfSnapshot(t)).toBeNull();
  });
  it("normalizes credits and official trailers", () => {
    const m = normalizeTmdbMovie({
      id: 2,
      genres: [{ id: 18 }],
      credits: {
        crew: [{ job: "Director", name: "A" }],
        cast: [{ name: "B" }],
      },
      videos: {
        results: [
          { site: "YouTube", official: true, type: "Trailer", key: "abc" },
        ],
      },
    });
    expect(m.director).toBe("A");
    expect(m.genreIds).toEqual([18]);
    expect(m.trailerUrl).toContain("watch?v=abc");
  });
  it("validates custom fields and duplicate keys", () => {
    expect(validateMovie(film)).toEqual({});
    expect(titleKey("  A   FILM ")).toBe("a film");
    expect(
      validateMovie({
        ...film,
        title: " ",
        release_year: 2032,
        genre_ids: [999],
        synopsis: "short",
        runtime: 1.5,
        cast_names: ["a".repeat(101)],
        trailer_url: "https://youtube.com.evil.test/",
      }),
    ).toHaveProperty("trailer_url");
    expect(
      Object.keys(
        validateMovie({
          ...film,
          title: " ",
          release_year: 2032,
          genre_ids: [],
          synopsis: "x",
        }),
      ),
    ).toHaveLength(4);
  });
  it("rejects unsafe posters, references, and reviews", () => {
    expect(() =>
      validateImage({ type: "image/svg+xml", name: "p.svg", size: 1 }),
    ).toThrow();
    expect(() =>
      validateImage({ type: "image/png", name: "p.png", size: 6000000 }),
    ).toThrow();
    expect(validReference("tmdb", "1e5")).toBe(false);
    expect(() =>
      validateShelf({ status: "completed", personal_rating: 6, review: "" }),
    ).toThrow();
    expect(() =>
      validateShelf({
        status: "planned",
        personal_rating: null,
        review: "a".repeat(1001),
      }),
    ).toThrow();
  });
});
