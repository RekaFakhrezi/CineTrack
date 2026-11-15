const genres = [
  28, 12, 16, 35, 80, 99, 18, 10751, 14, 36, 27, 10402, 9648, 10749, 878, 10770,
  53, 10752, 37,
];
const paths = {
  trending: "/trending/movie/week",
  popular: "/movie/popular",
  top_rated: "/movie/top_rated",
  search: "/search/movie",
  discover: "/discover/movie",
  genres: "/genre/movie/list",
  upcoming: "/movie/upcoming",
  now_playing: "/movie/now_playing",
};
export function upstreamUrl(params) {
  const endpoint = params.get("endpoint");
  if (
    !Object.hasOwn(paths, endpoint) &&
    !["detail", "recommendations"].includes(endpoint)
  )
    throw new Error("Unknown endpoint.");
  const allowed = new Set([
    "endpoint",
    ...({
      search: ["query", "page"],
      discover: ["genre", "sort", "page"],
      detail: ["id"],
      recommendations: ["id", "page"],
      genres: [],
    }[endpoint] || ["page"]),
  ]);
  for (const key of params.keys())
    if (!allowed.has(key) || params.getAll(key).length !== 1)
      throw new Error("Unsupported parameter.");
  const integer = (name, min, max, fallback) => {
    const raw = params.get(name) ?? fallback;
    const n = Number(raw);
    if (
      !/^\d+$/.test(String(raw)) ||
      !Number.isSafeInteger(n) ||
      n < min ||
      n > max
    )
      throw new Error(`Invalid ${name}.`);
    return n;
  };
  const id = ["detail", "recommendations"].includes(endpoint)
    ? integer("id", 1, Number.MAX_SAFE_INTEGER)
    : null;
  const url = new URL(
    "https://api.themoviedb.org/3" +
      (id
        ? `/movie/${id}${endpoint === "recommendations" ? "/recommendations" : ""}`
        : paths[endpoint]),
  );
  url.searchParams.set("language", "en-US");
  if (allowed.has("page"))
    url.searchParams.set("page", integer("page", 1, 500, "1"));
  if (endpoint === "search") {
    const query = params.get("query")?.trim();
    if (!query || query.length > 100)
      throw new Error("Search must be 1–100 characters.");
    url.searchParams.set("query", query);
  }
  if (endpoint === "discover") {
    if (params.has("genre")) {
      const genre = integer("genre", 1, 20000);
      if (!genres.includes(genre)) throw new Error("Invalid genre.");
      url.searchParams.set("with_genres", genre);
    }
    const sort = params.get("sort") || "popularity.desc";
    if (
      ![
        "popularity.desc",
        "vote_average.desc",
        "primary_release_date.desc",
        "title.asc",
      ].includes(sort)
    )
      throw new Error("Invalid sort.");
    url.searchParams.set("sort_by", sort);
  }
  if (["search", "discover"].includes(endpoint))
    url.searchParams.set("include_adult", "false");
  if (endpoint === "detail")
    url.searchParams.set("append_to_response", "credits,videos");
  return url;
}
export async function proxyTmdb(method, params, token, transport = fetch) {
  const fail = (status, code, message, retryable = false) => ({
    status,
    body: { error: { code, message, retryable } },
  });
  if (method !== "GET") return fail(405, "METHOD", "Only GET is supported.");
  let url;
  try {
    url = upstreamUrl(params);
  } catch (e) {
    return fail(400, "INPUT", e.message);
  }
  if (!token)
    return fail(
      503,
      "CONFIG",
      "TMDB is not configured. Set TMDB_READ_ACCESS_TOKEN on the server.",
    );
  try {
    const response = await transport(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    if (!response.ok) {
      const status =
        response.status === 404 ? 404 : response.status === 429 ? 429 : 502;
      return {
        ...fail(
          status,
          "UPSTREAM",
          status === 404
            ? "Movie not found."
            : status === 429
              ? "TMDB is busy. Please try again shortly."
              : "TMDB is unavailable. Please try again.",
          status !== 404,
        ),
        retryAfter: /^\d{1,6}$/.test(response.headers.get("retry-after") || "")
          ? response.headers.get("retry-after")
          : null,
      };
    }
    return { status: 200, body: await response.json() };
  } catch (e) {
    return fail(
      e.name === "TimeoutError" ? 504 : 502,
      "NETWORK",
      "Could not reach TMDB. Try again.",
      true,
    );
  }
}
export async function handleTmdb(
  req,
  res,
  token = process.env.TMDB_READ_ACCESS_TOKEN,
) {
  const result = await proxyTmdb(
    req.method,
    new URL(req.url, "http://localhost").searchParams,
    token,
  );
  res.statusCode = result.status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  if (result.status === 405) res.setHeader("Allow", "GET");
  if (result.retryAfter) res.setHeader("Retry-After", result.retryAfter);
  res.end(JSON.stringify(result.body));
}
