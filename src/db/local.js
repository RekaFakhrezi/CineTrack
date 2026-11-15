import Dexie from "dexie";
export const db = new Dexie("cinetrack-local");
db.version(1).stores({
  shelf: "&[uid+movieKey],uid,updatedAt,syncState",
  outbox: "&[uid+movieKey],uid,revision,nextAttemptAt",
  publicMovies: "&key,expiresAt",
  customDrafts: "&[uid+draftId],uid",
  meta: "&key",
});
