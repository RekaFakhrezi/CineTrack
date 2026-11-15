import { rest, supabase, posterUrl, currentSession } from "./supabase.js";
import {
  normalizeCustomMovie,
  validateMovie,
  validateImage,
} from "../domain/movie.js";
import { db } from "../db/local.js";
const normalize = (m) => normalizeCustomMovie(m, posterUrl);
export const escapeSearch = (q) => q.replace(/[\\%_*]/g, (c) => "\\" + c);
export async function customList({
  query = "",
  genre = "",
  offset = 0,
  uid,
  signal,
} = {}) {
  if (!navigator.onLine) {
    const all = await db.publicMovies
      .where("expiresAt")
      .above(Date.now())
      .toArray();
    const items = all
      .map((x) => x.movie)
      .filter(
        (m) =>
          (!uid || m.ownerId === uid) &&
          m.title.toLowerCase().includes(query.toLowerCase()) &&
          (!genre || m.genreIds.includes(Number(genre))),
      );
    return {
      items: items.slice(offset, offset + 20),
      next: offset + 20 < items.length ? offset + 20 : null,
      stale: true,
    };
  }
  const params = {
    select: "*",
    deleted_at: "is.null",
    order: "created_at.desc,id.desc",
    limit: 20,
    offset,
  };
  if (query) params.title = `ilike.%${escapeSearch(query)}%`;
  if (genre) params.genre_ids = `cs.{${Number(genre)}}`;
  if (uid) params.created_by = `eq.${uid}`;
  const rows = await rest("custom_movies", { params, signal, uid });
  const items = rows.map(normalize);
  await db.transaction("rw", db.publicMovies, async () => {
    await db.publicMovies.bulkPut(
      items.map((movie) => ({
        key: movie.key,
        movie,
        expiresAt: Date.now() + 7 * 86400000,
      })),
    );
    await db.publicMovies.where("expiresAt").below(Date.now()).delete();
    const count = await db.publicMovies.count();
    if (count > 100) {
      const old = await db.publicMovies
        .orderBy("expiresAt")
        .limit(count - 100)
        .primaryKeys();
      await db.publicMovies.bulkDelete(old);
    }
  });
  return { items, next: rows.length === 20 ? offset + 20 : null, stale: false };
}
export async function customDetail(id, signal) {
  if (!navigator.onLine) {
    const cached = await db.publicMovies.get(`custom:${id}`);
    if (cached?.expiresAt > Date.now()) return { ...cached.movie, stale: true };
    throw Error("This movie is not available offline. Connect to load it.");
  }
  const rows = await rest("custom_movies", {
    params: { id: `eq.${id}`, deleted_at: "is.null", select: "*" },
    signal,
  });
  if (!rows.length)
    throw Error("Movie unavailable or removed from the community catalog.");
  return normalize(rows[0]);
}
export async function saveCustom(uid, id, fields, file, editing) {
  if (!navigator.onLine)
    throw Error("Connect to publish. Your draft is saved on this device.");
  if (Object.keys(validateMovie(fields)).length)
    throw Error("Check the highlighted fields.");
  await currentSession(uid);
  validateImage(file);
  const data = {
    title: fields.title.trim(),
    release_year: Number(fields.release_year),
    synopsis: fields.synopsis.trim(),
    genre_ids: fields.genre_ids,
    runtime: fields.runtime ? Number(fields.runtime) : null,
    director: fields.director?.trim() || null,
    cast_names: Array.isArray(fields.cast_names)
      ? fields.cast_names
      : (fields.cast_names || "")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
    trailer_url: fields.trailer_url || null,
    poster_path: fields.poster_path || null,
  };
  let uploadedPath;
  if (file) {
    const ext = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    }[file.type];
    const path = `${uid}/${id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("movie-posters")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw Error("Poster upload failed. Your draft is retained.");
    data.poster_path = path;
    uploadedPath = path;
  }
  try {
    // Reconcile ambiguous creates by the draft's stable UUID before another POST.
    const existing = await rest("custom_movies", {
      uid,
      params: {
        id: `eq.${id}`,
        created_by: `eq.${uid}`,
        select: "id,deleted_at",
      },
    });
    if (existing[0]?.deleted_at)
      throw Error("This contribution was removed. Start a new movie draft.");
    const update = editing || existing.length > 0;
    const rows = await rest("custom_movies", {
      uid,
      method: update ? "PATCH" : "POST",
      params: update
        ? { id: `eq.${id}`, created_by: `eq.${uid}`, deleted_at: "is.null" }
        : {},
      data: update ? data : { ...data, id, created_by: uid },
    });
    await db.publicMovies.delete(`custom:${id}`);
    return normalize(rows[0]);
  } catch (error) {
    if (uploadedPath) {
      // On uncertain outcomes, retain the object unless a successful read proves it unreferenced.
      try {
        const rows = await rest("custom_movies", {
          uid,
          params: {
            id: `eq.${id}`,
            created_by: `eq.${uid}`,
            select: "poster_path,backdrop_path",
          },
        });
        if (
          !rows.some(
            (row) =>
              row.poster_path === uploadedPath ||
              row.backdrop_path === uploadedPath,
          )
        )
          await supabase.storage.from("movie-posters").remove([uploadedPath]);
      } catch {
        /* Retain for manual owner cleanup; never delete an uncertain reference. */
      }
    }
    throw error;
  }
}
export async function deleteCustom(uid, id) {
  if (!navigator.onLine) throw Error("Connect to remove a community movie.");
  await rest("custom_movies", {
    uid,
    method: "PATCH",
    params: { id: `eq.${id}`, created_by: `eq.${uid}`, deleted_at: "is.null" },
    data: { deleted_at: new Date().toISOString() },
  });
  await db.publicMovies.delete(`custom:${id}`);
}
