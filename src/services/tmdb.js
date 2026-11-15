import axios from "axios";
import { normalizeTmdbMovie } from "../domain/movie.js";
export const tmdb = async (endpoint, params = {}, signal) => {
  if (!navigator.onLine)
    throw Error(
      "Connect to discover more movies. TMDB titles are not stored offline.",
    );
  try {
    const { data } = await axios.get("/api/tmdb", {
      params: { endpoint, ...params },
      signal,
      timeout: 12000,
    });
    if (
      !data ||
      typeof data !== "object" ||
      (endpoint === "detail" ? !data.id : !Array.isArray(data.results))
    ) {
      throw Error(
        "The TMDB proxy is unavailable. Use npm run dev locally or configure the Vercel API function.",
      );
    }
    return data;
  } catch (e) {
    if (axios.isCancel(e)) throw e;
    throw Error(
      e.response?.data?.error?.message ||
        (e.message?.includes("TMDB proxy") ? e.message : null) ||
        "Could not reach TMDB. Please try again.",
      { cause: e },
    );
  }
};
export async function tmdbList(endpoint, params, signal) {
  const data = await tmdb(endpoint, params, signal);
  return {
    items: data.results.filter((m) => !m.adult).map(normalizeTmdbMovie),
    next: data.page < Math.min(data.total_pages, 500) ? data.page + 1 : null,
  };
}
