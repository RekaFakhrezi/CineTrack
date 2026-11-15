# PWA, Offline Storage & Synchronization

## 1. User-facing contract
First online bootstrap required: app shell installed/cached, identity initialized and shelf hydrated. After that the installed app or browser can fully reload offline; navigation, profile author info and shelf CRUD function without connection. Cached film discovery is best effort and subject to TMDB terms. A new uncached search/detail needs internet. Custom catalog publishing and uploads are online only; form drafts persist locally including image blob. No promise that browser storage survives user clearing data, eviction or private browsing.

| Feature | Online | Offline after initialization |
|---|---|---|
| App shell and primary routes | yes | yes |
| New TMDB search/detail | yes | cached only (if permitted), otherwise explicit unavailable |
| Community catalog | yes | last cached public results, stale badge |
| Shelf view/edit/add cached/remove | yes | yes, local transaction + outbox |
| Custom movie create/edit/delete | yes | draft create/edit only, no publish/delete |
| Author profile and local stats | yes | yes |
| Upload posters | yes | draft file retained, upload unavailable |
| Sync | yes, valid session | pending |

## 2. Manifest and installability
Use `VitePWA({ strategies:'generateSW', registerType:'prompt', ... })`. Manifest: name `CineTrack — Your Cinema Shelf`, short_name `CineTrack`, id `/`, start_url `/`, scope `/`, display `standalone`, background_color and theme_color `#0B1019`, description, lang `en`, icons `192x192` and `512x512` PNG purpose any plus separate `512x512` maskable. Real generated icons (not blank placeholders); `<link rel=apple-touch-icon>` 180 PNG and meta theme-color. Root paths for Vercel. Register via plugin-supported `virtual:pwa-register/react` or equivalent. App ready offline indicator only after precache completes. Use prompt update to avoid overwriting active forms; persist drafts and pending state before allowing reload. Clear outdated SW caches, not IndexedDB. HTTPS or localhost. `beforeinstallprompt` is browser-dependent: save event, invoke from user gesture, listen for appinstalled, detect standalone; iOS Safari provide Share → Add to Home Screen instructions when appropriate. Do not show fake install button if browser does not support event.

## 3. Workbox strategy
Precache built index.html, JS/CSS chunks, icons, placeholders, bundled font, static genre data. HashRouter routes use one shell and no server rewrite requirement. `navigateFallback: 'index.html'`, denylist `/api/` and non-page requests (verify regex); API responses never rewritten to HTML. Build assets precached including lazy route chunks or verify offline routes; no dev-only success. Use `cleanupOutdatedCaches: true`. Runtime cache rules deliberately narrow:
- App static assets: precache by revision; no generic cache-all.
- Community public snapshots: store sanitized data in IndexedDB only (not HTTP responses with JWT). Stale display and bounded entries (e.g. 100 movies/24h refresh window, offline fallback allowed up to 7d).
- TMDB metadata/images: default no persistent cache until actual terms allow; if confirmed, cache only permitted recent GET results with NetworkFirst or explicit IDB read-through (max ~50 pages/24h or stricter term limit); public posters CacheFirst max ~100 entries/7d or stricter limit. No full mirror, no proxy tokens; expired data removed. If permission not confirmed, no TMDB persistent metadata/poster cache; show placeholder + ID-only reference and local shelf status offline. In either case shelf works; document chosen behavior. Check terms separately from FAQ, not assume license includes offline retention.
- Community public poster URLs: CacheFirst bounded (~100 entries/7d), only exact configured Supabase public bucket origin/path, success statuses only where possible; stale images may remain until expiry. Browser cache eviction possible. Store own custom poster snapshot permitted by rights acknowledgment.
- Never cache Supabase Auth, REST responses, private user data, upload requests, POST/PATCH/DELETE, errors or raw credentials in Workbox. Do not use SW background sync for authenticated mutations: app outbox is authoritative. Avoid caching public proxy error responses or HTML fallbacks.

## 4. IndexedDB model
Use Dexie DB `cinetrack-local`, schema version 1, upgrade without dropping unsynced data. Key all private records by `uid` and canonical movie key. Example stores:
```
shelf:       &[uid+movieKey], uid, updatedAt, syncState
outbox:      &[uid+movieKey], uid, revision, nextAttemptAt
publicMovies:&key, source, expiresAt
publicLists: &queryKey, expiresAt
customDrafts:&[uid+draftId], uid, updatedAt
meta:        &key
```
Shelf records include stable UUID, source refs, status, rating/review, snapshot if permitted, `serverKnown` and local revision, local deleted flag/tombstone until ack. Outbox record holds `uid,movieKey,itemId,operation:'upsert'|'delete',payload,revision,attemptCount,nextAttemptAt,lastError`. Draft has JSON fields, optional Blob, stable movie UUID; use `localStorage` for draft metadata/preferences such as sort/source, not image blobs. IndexedDB failures must surface error; don't claim saved if transaction fails. Cache expiration is separate from private shelf lifetime. Limit public cache by LRU/TTL; never evict unsynced private rows. `navigator.storage.persist()` optional, not guaranteed.

## 5. Local-first mutation algorithm
1. Ensure initialized guest namespace. Validate action. In one DB transaction mutate shelf record and coalesce outbox by `(uid,movieKey)` to latest desired state; bump monotonic per-key revision. UI updates only after commit, labels “Saved on device / Pending sync”. No duplicate row on rapid Add, re-add after pending deletion uses stable ID. Delete marks local tombstone and hides row; queue desired delete. If created then deleted before any server attempt, can drop both only when definitely never sent; otherwise keep delete for reconciliation.
2. Trigger flush immediately if online + valid auth, on `online`, startup, visibility foreground and explicit Retry. Connectivity event is hint, not proof; real network failures handled. Single-flight per UID; use Web Locks if available + in-process mutex, coordinate tabs via BroadcastChannel/Dexie liveQuery. Idempotency and revision checks protect fallback.
3. For each op snapshot revision and payload. Verify session UID matches namespace before each request. For upsert: GET own existing row by item id or movie_key when serverKnown false/uncertain; PATCH existing mutable fields, POST if absent. Unique conflict → re-read owned row by movie_key and reconcile ID; if deleted custom no longer accessible on first create, show blocked item with retry/discard decision. DELETE own row by stable id, reconcile by key if uncertain; 404/absent row after scoped verification is success. Do not overwrite with an older revision after a newer local edit.
4. On confirmed server success, in transaction compare latest outbox revision. If same, delete queue op, mark row synced and update returned server metadata (or remove tombstone). If newer, retain latest desired state, update serverKnown/canonical ID, continue flushing. Never overwrite latest local fields with old response. Crash between send and ack → replay safe by stable ID and owner scope.
5. Network errors/429/5xx: leave pending, exponential backoff capped (e.g. 2s–60s with jitter, respect Retry-After). 401 refresh once, then auth blocked. 403/validation/removed custom: error state, no tight retries, allow correction or explicit discard. No silent data loss. If queue empty, refresh shelf from server; merge only server rows with no pending local mutation; preserve tombstones and local changes. Avoid stale remote response overwrite by transaction/version check. Single device guest policy: last local desired state wins for concurrent changes; cross-device conflict resolution P2.

## 6. Reconnect and session edge cases
Offline startup uses last-known UID and SDK session metadata without requiring live auth; never mint new identity offline. If invalid session cannot be refreshed, keep old data isolated and explain; do not upload under a new user. Two tabs share account but revision and server uniqueness prevent duplicates. On connection loss mid-save, keep operation pending; don't count as synced. Public catalog cached independently; if TMDB rate-limited but Supabase works, shelf sync still works. Retry controls show pending/error count. Never clear private store automatically at update. Guest signout/reset omitted P0 because account unrecoverable; if added require explicit warning and confirmation with export/unsynced handling.

## 7. Verification sequence
`npm run build` then `npm run preview` for shell; use `vercel dev` or deployed URL for live proxy. In Chrome Application inspect Manifest, SW activated and controlling page, Cache Storage, IndexedDB; open routes online, add one shelf item, wait for sync. Switch Network offline, close/reopen or reload, edit status, add known cached film (if permitted), delete another, reload again. Inspect queue persists; reconnect, verify queue clears only after server confirmed and rows match. Test iOS manual installation separately; record actual browser/device outcomes, not only Lighthouse. Test uncached film search offline gives clear unavailable state. Test SW update with unsaved form/queue. Test fresh offline visit behavior honestly; no preexisting cache means no app guarantee.
