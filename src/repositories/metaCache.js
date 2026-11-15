const META_CACHE_KEY = "cinetrack_movie_meta";

export function cacheMovieMeta(movie) {
  if (!movie || !movie.key) return;
  try {
    const raw = localStorage.getItem(META_CACHE_KEY);
    const cache = raw ? JSON.parse(raw) : {};
    cache[movie.key] = {
      key: movie.key,
      title: movie.title,
      year: movie.year,
      posterUrl: movie.posterUrl,
      posterPath: movie.posterPath || null,
      genreIds: movie.genreIds || [],
    };
    localStorage.setItem(META_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore storage quota/parse errors
  }
}

export function getCachedMovieMeta(key) {
  try {
    const raw = localStorage.getItem(META_CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    return cache[key] || null;
  } catch {
    return null;
  }
}

