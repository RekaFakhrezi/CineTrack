export const genres = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science fiction",
  10770: "TV movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
};
export const statuses = ["planned", "watching", "completed", "dropped"];
export const titleKey = (title) =>
  title.trim().toLowerCase().replace(/\s+/g, " ");
export const moviePath = (m) =>
  `/movies/${m.source}/${encodeURIComponent(m.sourceId)}`;
export const uuid = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
export function validReference(source, id) {
  return source === "custom"
    ? uuid(id)
    : source === "tmdb" &&
        /^\d+$/.test(id) &&
        Number.isSafeInteger(Number(id)) &&
        Number(id) > 0;
}
/** @typedef {{key:string,source:'tmdb'|'custom',sourceId:string,title:string,year:number|null,synopsis:string,genreIds:number[],posterUrl:string|null,backdropUrl:string|null,tmdbRating:number|null,voteCount:number|null,runtime:number|null,director:string|null,cast:string[],trailerUrl:string|null,ownerId:string|null,deleted:boolean}} Movie */
/** @returns {Movie} */
export function normalizeTmdbMovie(m) {
  const video = m.videos?.results?.find(
    (v) =>
      v.site === "YouTube" &&
      v.type === "Trailer" &&
      v.official &&
      /^[\w-]+$/.test(v.key),
  );
  return {
    key: `tmdb:${m.id}`,
    source: "tmdb",
    sourceId: String(m.id),
    title: m.title || `TMDB movie #${m.id}`,
    year: m.release_date ? Number(m.release_date.slice(0, 4)) : null,
    synopsis: m.overview || "",
    genreIds: m.genre_ids || m.genres?.map((g) => g.id) || [],
    posterUrl: m.poster_path
      ? `https://image.tmdb.org/t/p/w342${m.poster_path}`
      : null,
    backdropUrl: m.backdrop_path
      ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}`
      : null,
    tmdbRating: m.vote_count > 0 ? m.vote_average : null,
    voteCount: m.vote_count ?? null,
    runtime: m.runtime || null,
    director: m.credits?.crew?.find((p) => p.job === "Director")?.name || null,
    cast: m.credits?.cast?.slice(0, 10).map((p) => p.name) || [],
    trailerUrl: video ? `https://www.youtube.com/watch?v=${video.key}` : null,
    ownerId: null,
    deleted: false,
  };
}
export function normalizeCustomMovie(m, posterUrl = () => null) {
  return {
    key: `custom:${m.id}`,
    source: "custom",
    sourceId: m.id,
    title: m.title,
    year: m.release_year,
    synopsis: m.synopsis,
    genreIds: m.genre_ids || [],
    posterUrl: posterUrl(m.poster_path),
    posterPath: m.poster_path || null,
    backdropUrl: posterUrl(m.backdrop_path),
    tmdbRating: null,
    voteCount: null,
    runtime: m.runtime,
    director: m.director,
    cast: m.cast_names || [],
    trailerUrl: m.trailer_url,
    ownerId: m.created_by,
    deleted: !!m.deleted_at,
  };
}
export const mergeMovies = (...lists) => [
  ...new Map(lists.flat().map((m) => [m.key, m])).values(),
];
export function shelfSnapshot(m) {
  return m.source === "tmdb"
    ? null
    : {
        title: m.title,
        year: m.year,
        genreIds: m.genreIds,
        posterPath: m.posterPath || null,
      };
}
export function validateMovie(f) {
  const errors = {};
  if (!f.title?.trim() || f.title.trim().length > 150)
    errors.title = "Use a title of 1–150 characters.";
  if (
    !Number.isInteger(Number(f.release_year)) ||
    Number(f.release_year) < 1888 ||
    Number(f.release_year) > 2031
  )
    errors.release_year = "Use a year between 1888 and 2031.";
  if (
    !f.synopsis?.trim() ||
    f.synopsis.trim().length < 10 ||
    f.synopsis.trim().length > 2000
  )
    errors.synopsis = "Write a synopsis of 10–2000 characters.";
  if (
    !f.genre_ids?.length ||
    f.genre_ids.length > 19 ||
    f.genre_ids.some((id) => !genres[id])
  )
    errors.genre_ids = "Choose at least one supported genre.";
  if (
    f.runtime &&
    (!Number.isInteger(Number(f.runtime)) || f.runtime < 1 || f.runtime > 600)
  )
    errors.runtime = "Runtime must be 1–600 minutes.";
  if ((f.director || "").length > 150)
    errors.director = "Use at most 150 characters.";
  const cast = Array.isArray(f.cast_names)
    ? f.cast_names
    : (f.cast_names || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
  if (cast.length > 10 || cast.some((x) => x.length > 100))
    errors.cast_names = "Use at most 10 cast names, each up to 100 characters.";
  if (f.trailer_url) {
    try {
      const u = new URL(f.trailer_url);
      if (
        u.protocol !== "https:" ||
        !["youtube.com", "www.youtube.com", "youtu.be"].includes(u.hostname) ||
        u.username ||
        u.password ||
        f.trailer_url.length > 500
      )
        throw Error();
    } catch {
      errors.trailer_url = "Use an HTTPS YouTube link.";
    }
  }
  return errors;
}
export function validateImage(file) {
  if (!file) return;
  const extensions = {
    "image/jpeg": /\.jpe?g$/i,
    "image/png": /\.png$/i,
    "image/webp": /\.webp$/i,
  };
  if (!extensions[file.type]?.test(file.name) || file.size > 5 * 1024 * 1024)
    throw new Error("Choose a JPEG, PNG, or WebP image no larger than 5 MiB.");
}
export function validateShelf(values) {
  if (!statuses.includes(values.status)) throw Error("Choose a valid status.");
  if (
    values.personal_rating !== null &&
    (!Number.isInteger(values.personal_rating) ||
      values.personal_rating < 1 ||
      values.personal_rating > 5)
  )
    throw Error("Rating must be 1–5 or empty.");
  if (typeof values.review !== "string" || values.review.length > 1000)
    throw Error("Review must be at most 1000 characters.");
}
