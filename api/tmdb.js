import { handleTmdb } from "../server/tmdbProxy.js";
export default function handler(req, res) {
  return handleTmdb(req, res, process.env.TMDB_READ_ACCESS_TOKEN);
}
