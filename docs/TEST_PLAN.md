# Test Plan & Responsi Acceptance Matrix

## 1. Execution
Use Vitest for pure logic/React Testing Library for user interactions, optional Playwright for browser automation. Integration/manual tests require real Supabase project and TMDB token; do not silently substitute fixtures. Test on deployed HTTPS and at least one supported Android Chrome device; iOS Safari optional. Record result Pass/Fail/Blocked, date, environment, actual evidence. All below initially NOT RUN because this is planning only.

| ID | Priority | Scenario | Expected result | Method |
|---|---|---|---|---|
| T01 | P0 | Fresh install dependencies, lint, unit tests, production build | Commands exit 0; no missing imports | CLI |
| T02 | P0 | Open online with valid config / without token | Actual TMDB data / actionable error; never fake catalog | Browser + API |
| T03 | P0 | Navigate Home, Explore, Shelf, Profile, details/form; reload/deep link | All routes work, mobile/desktop nav | Browser |
| T04 | P0 | Profile author identity | Actual name/NIM/group configured, visible; no guest data leaked | Browser |
| T05 | P0 | Explore search from both sources, genre/source filter, Load more | Correct normalized results, no duplicate canonical keys, partial failure handled | Unit + live |
| T06 | P0 | Create custom movie including poster | Saved row, real uploaded image, visible in community and Explore | Live |
| T07 | P0 | Edit custom title/synopsis/poster | Updated DB and UI, old poster kept until confirmed | Live |
| T08 | P0 | Delete custom movie | Confirm, disappears public, owner tombstone exists, old shelf retained | Live |
| T09 | P0 | Invalid inputs/duplicate title/year/oversize file | Valid errors, no invalid/duplicate record, warning and override behavior | Unit + live |
| T10 | P0 | Add TMDB and custom to shelf, repeat add | One row per movie/user, real DB rows, planned default | Live |
| T11 | P0 | Update status/rating/review and remove | Persists after reload, completed_at correct, delete absent after sync | Live |
| T12 | P0 | Session A creates movie, B reads/tries update/delete and A shelf | B can read active public film, cannot edit A or read A shelf, direct API denied/no row | Live RLS |
| T13 | P0 | Unauthenticated direct REST write/upload, wrong path, malicious payload | Rejected; no broad policies; XSS displayed as text | Live security |
| T14 | P0 | Inspect manifest, icons, activated SW; install supported Android | Valid manifest, correct icon/name, installed opens standalone | Device |
| T15 | P0 | Online warm-up then full offline reload on Home/Shelf/Profile | App shell opens; no browser error; shelf persists | Device/DevTools |
| T16 | P0 | Offline edit status/rating/review, remove, add cached film if available; reload | Local records and outbox survive; pending status visible | Browser |
| T17 | P0 | Reconnect after offline mutations | Queue clears only on success; server rows match latest local state | Live |
| T18 | P0 | Simulate failure mid-send / double save / newer edit in flight | No duplicate/lost edit; revision handling, retry/error visible | Unit + browser |
| T19 | P0 | Offline uncached search, unavailable TMDB, custom draft offline | Clear unavailable, local draft restores, upload/publish disabled | Browser |
| T20 | P0 | Invalid session or new UID with old queue; SW update | Old queue isolated, not lost or replayed; update safe | Unit + browser |
| T21 | P0 | Deploy Vercel HTTPS and production API / deep link | JSON endpoint works, no HTML response, pages/icons/installation available | Production |
| T22 | P0 | Check bundle and Git for secret; inspect SW cache | No TMDB token/service key, no auth/private response cache | CLI + DevTools |
| T23 | P0 | Credits TMDB logo, notice, data labeling | Approved logo, exact disclaimer, real source score not IMDb | Manual |
| T24 | P0 | Mobile/desktop, keyboard, contrast, dialogs, errors | No overflow, accessible controls, meaningful states | Manual |
| T25 | P1 | Trailer/share/roulette/upcoming | Works when implemented, graceful unsupported fallback | Browser |

## 2. Unit-test targets
- `normalizeTmdbMovie` and custom: missing poster/date/vote, key collision prevention, genres and detail credits. Merge dedupe stable keys, source partial error, pagination cursors advance independently, aborted stale search ignored.
- Validation: whitespace title, year bounds, empty synopsis/genres, rating range, review limit, HTTPS YouTube validation, image MIME/size, title/year normalized duplicate.
- Proxy allowlist rejects invalid endpoint, id/page, arbitrary URL, method; secret never returned; upstream timeout and 429 mapping.
- Shelf repository: stable ID, add twice, update status transitions, delete/re-add, local transaction failure not success. Outbox coalesce/revision, failure retention, stale ack, crash replay, no replay under wrong UID, conflict reconciliation, hydrate remote without replacing pending local.
- RLS integration with actual A/B JWTs: owner-only updates, private shelf/profile, anonymous public read and no write, storage owner prefix and size, deleted film not visible to B except B shelf snapshot.

## 3. Manual offline test script (record evidence)
1. Open deployed URL online on Chrome; confirm Home real data, profile, one custom and one TMDB shelf item. Wait until synced; verify Supabase rows. Visit all primary routes. Wait for SW ready.
2. Install via browser/Install app action. Launch standalone. Enable airplane mode or DevTools Offline; close/reopen app and reload. Confirm shell, profile, shelf statuses, and cached content or permitted fallback.
3. Change one shelf item to Completed and rate 4; remove another; add a known cached film if available; save custom draft with image but do not publish. Reload offline. Confirm changes persisted and pending badges.
4. Reconnect; observe sync, check database and queue. Verify newest state after reload. Restore draft, publish when online. Force network failure during sync and repeat; never claim synced until server confirmed.
5. Open incognito as B; inspect owner controls and direct RLS requests using B session. Do not use SQL Editor to simulate B (admin bypasses RLS). Remove demo contribution via A after test, keep proof if needed.
6. Test mobile 360/390px, install UI and icons. Check DevTools Application SW/manifest/cache/IndexedDB. Record screenshot or short video of install/offline/CRUD. No requirement to submit video unless assistant instructs.

## 4. Suggested demo narrative (2–4 minutes if asked)
Open Home → explain TMDB source via Axios proxy → Explore and search → add custom movie with poster, edit, show merged catalog → add both kinds to My Shelf, edit rating/status, remove → Profile student identity + TMDB credits → install PWA → offline reopen and modify shelf → reconnect verify sync → show production URL. Explain service worker vs IndexedDB, RLS, and limitation: no new live data or upload offline.

## 5. Release record template
```
Build commit:
Production URL:
Date/time (WIB):
Browsers/devices:
Tests passed:
Failed / blocked tests:
Known limitations:
TMDB cache terms checked (link/date/decision):
Submission performed by student (yes/no):
```
