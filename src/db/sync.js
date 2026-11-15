import { db } from "./local.js";
import { rest, currentSession } from "../services/supabase.js";
import { mutablePayload } from "../repositories/shelf.js";
const active = new Map();
export async function reconcileOperation(
  op,
  transport = rest,
  session = currentSession,
) {
  await session(op.uid);
  const params = {
    user_id: `eq.${op.uid}`,
    movie_key: `eq.${op.movieKey}`,
    select: "*",
  };
  const existing = (await transport("shelf_items", { uid: op.uid, params }))[0];
  await session(op.uid);
  if (op.operation === "delete") {
    if (existing)
      await transport("shelf_items", {
        uid: op.uid,
        method: "DELETE",
        params: { user_id: `eq.${op.uid}`, id: `eq.${existing.id}` },
      });
    return null;
  }
  const data = mutablePayload(op.payload);
  if (existing)
    return (
      await transport("shelf_items", {
        uid: op.uid,
        method: "PATCH",
        params: { id: `eq.${existing.id}`, user_id: `eq.${op.uid}` },
        data,
      })
    )[0];
  try {
    return (
      await transport("shelf_items", {
        uid: op.uid,
        method: "POST",
        data: {
          ...data,
          id: op.itemId,
          user_id: op.uid,
          tmdb_id: op.payload.tmdb_id,
          custom_movie_id: op.payload.custom_movie_id,
        },
      })
    )[0];
  } catch (e) {
    if (e.code === "23505") {
      const row = (await transport("shelf_items", { uid: op.uid, params }))[0];
      if (row) {
        await session(op.uid);
        return (
          await transport("shelf_items", {
            uid: op.uid,
            method: "PATCH",
            params: { id: `eq.${row.id}`, user_id: `eq.${op.uid}` },
            data,
          })
        )[0];
      }
    }
    throw e;
  }
}
export async function acknowledge(op, serverRow) {
  await db.transaction("rw", db.shelf, db.outbox, async () => {
    const key = [op.uid, op.movieKey];
    const latest = await db.outbox.get(key);
    const item = await db.shelf.get(key);
    if (!latest || !item) return;
    if (latest.revision === op.revision) {
      await db.outbox.delete(key);
      if (op.operation === "delete") await db.shelf.delete(key);
      else
        await db.shelf.put({
          ...item,
          id: serverRow.id,
          syncState: "synced",
          lastError: null,
        });
    } else if (serverRow) {
      await db.shelf.put({ ...item, id: serverRow.id });
      await db.outbox.put({
        ...latest,
        itemId: serverRow.id,
        payload: { ...latest.payload, id: serverRow.id },
      });
    }
  });
}
export async function hydrate(uid, transport = rest) {
  const version = (await db.meta.get(`version:${uid}`))?.value || 0;
  const rows = await transport("shelf_items", {
    uid,
    params: { user_id: `eq.${uid}`, select: "*" },
  });
  await db.transaction("rw", db.shelf, db.outbox, db.meta, async () => {
    if (((await db.meta.get(`version:${uid}`))?.value || 0) !== version) return;
    const pending = new Set(
      (await db.outbox.where("uid").equals(uid).toArray()).map(
        (x) => x.movieKey,
      ),
    );
    const remoteKeys = new Set(rows.map((r) => r.movie_key));
    for (const row of rows)
      if (!pending.has(row.movie_key)) {
        const old = await db.shelf.get([uid, row.movie_key]);
        await db.shelf.put({
          id: row.id,
          uid,
          movieKey: row.movie_key,
          tmdb_id: row.tmdb_id,
          custom_movie_id: row.custom_movie_id,
          snapshot: row.snapshot,
          ...mutablePayload(row),
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          revision: old?.revision || 0,
          deleted: false,
          syncState: "synced",
        });
      }
    for (const row of await db.shelf.where("uid").equals(uid).toArray())
      if (
        !pending.has(row.movieKey) &&
        !remoteKeys.has(row.movieKey) &&
        row.syncState === "synced"
      )
        await db.shelf.delete([uid, row.movieKey]);
  });
}
export function flushShelf(
  uid,
  { force = false, send = reconcileOperation, load = hydrate } = {},
) {
  if (!uid || !navigator.onLine) return Promise.resolve();
  if (active.has(uid)) return active.get(uid);
  const run = async () => {
    // Re-read the queue after each acknowledgement so edits made during requests stay pending.
    let processed = 0;
    while (processed++ < 100) {
      const ops = await db.outbox.where("uid").equals(uid).toArray();
      const op = ops.find(
        (x) =>
          (force || x.nextAttemptAt <= Date.now()) && (!x.blocked || force),
      );
      if (!op) break;
      try {
        const row = await send(op);
        await acknowledge(op, row);
      } catch (e) {
        await db.transaction("rw", db.shelf, db.outbox, async () => {
          const key = [uid, op.movieKey];
          const latest = await db.outbox.get(key);
          if (latest?.revision !== op.revision) return;
          const blocked = [400, 401, 403, 404, 409, 422].includes(e.status);
          const attempts = op.attemptCount + 1;
          await db.outbox.put({
            ...op,
            blocked,
            attemptCount: attempts,
            lastError: e.message,
            nextAttemptAt:
              Date.now() +
              Math.max(
                e.retryAfter * 1000 || 0,
                Math.min(60000, 2000 * 2 ** Math.min(attempts, 5)) +
                  Math.random() * 1000,
              ),
          });
          await db.shelf.update(key, {
            syncState: "error",
            lastError: e.message,
          });
        });
        break;
      }
    }
    if (!(await db.outbox.where("uid").equals(uid).count())) await load(uid);
  };
  const promise = (
    navigator.locks
      ? navigator.locks.request(`cinetrack-sync:${uid}`, run)
      : run()
  ).finally(() => active.delete(uid));
  active.set(uid, promise);
  return promise;
}
