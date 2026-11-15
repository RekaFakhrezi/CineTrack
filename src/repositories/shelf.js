import { db } from "../db/local.js";
import {
  shelfSnapshot,
  validateShelf,
  validReference,
} from "../domain/movie.js";
export async function mutateShelf(uid, movie, changes = {}, remove = false) {
  if (!uid) throw Error("Connect once to initialize your private shelf.");
  if (!validReference(movie.source, movie.sourceId))
    throw Error("Invalid movie reference.");
  return db.transaction("rw", db.shelf, db.outbox, db.meta, async () => {
    const key = [uid, movie.key];
    const old = await db.shelf.get(key);
    const now = new Date().toISOString();
    if (old && !old.deleted && !remove && !Object.keys(changes).length)
      return old;
    const item = {
      id: old?.id || crypto.randomUUID(),
      uid,
      movieKey: movie.key,
      tmdb_id: movie.source === "tmdb" ? Number(movie.sourceId) : null,
      custom_movie_id: movie.source === "custom" ? movie.sourceId : null,
      snapshot: old?.snapshot ?? shelfSnapshot(movie),
      status: old?.status || "planned",
      personal_rating: old?.personal_rating ?? null,
      review: old?.review || "",
      completed_at: old?.completed_at || null,
      createdAt: old?.createdAt || now,
      ...changes,
      updatedAt: now,
      deleted: remove,
      syncState: "pending",
      revision: (old?.revision || 0) + 1,
    };
    validateShelf(item);
    item.completed_at =
      item.status === "completed" ? old?.completed_at || now : null;
    await db.shelf.put(item);
    await db.outbox.put({
      uid,
      movieKey: movie.key,
      itemId: item.id,
      operation: remove ? "delete" : "upsert",
      payload: item,
      revision: item.revision,
      attemptCount: 0,
      nextAttemptAt: 0,
    });
    const version = await db.meta.get(`version:${uid}`);
    await db.meta.put({
      key: `version:${uid}`,
      value: (version?.value || 0) + 1,
    });
    return item;
  });
}
export const mutablePayload = (item) => ({
  status: item.status,
  personal_rating: item.personal_rating,
  review: item.review,
  completed_at: item.completed_at,
  snapshot: item.snapshot,
});
