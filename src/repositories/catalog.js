import { tmdbList } from "../services/tmdb.js";
import { customList } from "../services/custom.js";
import { mergeMovies } from "../domain/movie.js";
export async function queryCatalog({
  query = "",
  genre = "",
  source = "all",
  sort = "popular",
  cursors = { tmdb: 1, custom: 0 },
  signal,
}) {
  const jobs = [];
  const sources = [];
  if (source !== "custom" && cursors.tmdb !== null) {
    sources.push("tmdb");
    const endpoint = query
      ? "search"
      : genre
        ? "discover"
        : sort === "top_rated"
          ? "top_rated"
          : "popular";
    jobs.push(
      tmdbList(
        endpoint,
        { page: cursors.tmdb, ...(query ? { query } : genre ? { genre } : {}) },
        signal,
      ),
    );
  }
  if (source !== "tmdb" && cursors.custom !== null) {
    sources.push("custom");
    jobs.push(customList({ query, genre, offset: cursors.custom, signal }));
  }
  const results = await Promise.allSettled(jobs);
  const items = [];
  const errors = [];
  const next = { ...cursors };
  let stale = false;
  results.forEach((r, i) => {
    const s = sources[i];
    if (r.status === "fulfilled") {
      items.push(
        ...r.value.items.filter(
          (m) =>
            s !== "tmdb" ||
            !query ||
            !genre ||
            m.genreIds.includes(Number(genre)),
        ),
      );
      next[s] = r.value.next;
      stale ||= !!r.value.stale;
    } else if (r.reason?.code !== "ERR_CANCELED")
      errors.push(
        `${s === "tmdb" ? "TMDB" : "Community"}: ${r.reason.message}`,
      );
  });
  return { items: mergeMovies(items), next, errors, stale };
}
