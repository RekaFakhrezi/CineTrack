# Implementation and acceptance record

Date: 15 November 2026 (Asia/Jakarta). Local environment: Windows, Node 24.13.1, npm 11.8.0. Production URL: **not deployed**. Credentials and author configuration: **not supplied**.

Original planning files have been preserved. Actual code, package lock, icons, official TMDB logo, migration, and tests are now present. No remote database, repository, hosting, or assignment submission was changed.

## Roadmap evidence

| Phase | Local implementation / checks | External gate |
|---|---|---|
| 0 Scaffold | Fresh React/Vite app, four routes, proxy allowlist; first build and 11 proxy tests passed | None for compilation |
| 1 Discovery | Home, independent source errors, Explore search/filter/pagination, detail, normalizers and source-aware merging | Real TMDB token required |
| 2 Community | Auth, Axios CRUD, poster upload, draft UUID reconciliation, form, owner controls, SQL RLS and storage policies | Enable anonymous auth and execute migration in a new Supabase project |
| 3 Shelf | IndexedDB transactions, queue coalescing, stable IDs, revision acknowledgement, retries, tombstones, hydration guards, offline drafts | Live reconnect and cloud synchronization require configured Supabase |
| 4 PWA | Generated icons, manifest, precache, installation/update handling; Chrome production route/offline-shell tests at 360/390/768/1280/1440 passed | Actual Android/iOS installation remains manual |
| 5 Release | Vercel-compatible API and setup instructions supplied | Repository, Vercel account/configuration, deployed HTTPS/device verification and student submission remain |

## Automated checks

- `npm run lint`: passed with no diagnostics.
- `npm test`: 26 tests passed across five files, including SQL execution in embedded PostgreSQL.
- `npm run build`: passed; generated manifest, service worker, icons and production assets. Initial shell build was repeated after discovery, CRUD, offline and PWA additions.
- `npm run test:e2e`: 2 production Chrome tests passed. Coverage includes routes, no-config states, five viewport widths, no horizontal overflow, offline shell reload, exclusion of API/auth/REST from SW caches, and isolated-fixture shelf edits/removals plus image-draft restoration after offline reload. A fixture initialization race and overly strict dropdown-label selector were corrected during testing.
- SQL test uses an embedded PostgreSQL instance with test-only auth/storage schemas: checks migration syntax, immutable owner guard, public reads, denied cross-owner update, private shelf isolation, unauthenticated write rejection and continued editing of shelves referencing a removed custom film. It does **not** verify Supabase Auth issuance, real JWTs, storage API behavior, project grants or deployment.
- No fixtures or fake films are bundled into the live app. Browser fixtures exist only in isolated test contexts.
- `npm audit --omit=dev`: zero reported production dependency vulnerabilities. The full build-tool tree still reports the six low/moderate advisories described below.
- All 12 original Markdown documents were compared against the supplied ZIP: their original contents remain intact (README has an appended implementation section).
- Browser asset scan found no `TMDB_READ_ACCESS_TOKEN`, `service_role`, or `sb_secret_` markers. Only `.env.example` exists; no live credentials were introduced. Repeat a secret scan after configuring a release build.
- The downloaded TMDB logo is unmodified. API data caching remains disabled pending actual retention terms.

## Acceptance matrix

| Tests from TEST_PLAN | Result / evidence |
|---|---|
| T01 | Local lint, tests and production builds passed; lockfile present |
| T02 | Missing-config UI verified. Real TMDB data blocked by credentials |
| T03 | Main routes/form verified in production Chrome; detail normalization/proxy boundary covered by unit tests; live detail pending token |
| T04 | Explicit missing-author state verified; actual identity must be configured |
| T05 | Merge, independent cursor failure, filters and search code implemented; live two-source results pending credentials |
| T06–T08 | Custom create/edit/soft-delete and poster flow implemented; real service verification blocked |
| T09 | Validation, unsafe trailers/images, source references and duplicate title normalization tested; real uniqueness/upload checks pending |
| T10–T11 | Shelf repository and offline UI checks; real remote rows pending |
| T12–T13 | Embedded PostgreSQL RLS denial tests passed; two real anonymous JWTs and storage security pending |
| T14 | Manifest/icons/SW generated and Chrome control verified; physical-device installation pending |
| T15 | Production Chrome offline reload and navigation passed |
| T16 | Offline shelf/draft browser checks use test-only local fixtures; unit durability tests passed |
| T17 | Safe acknowledgement/retry logic tested; live reconnect blocked |
| T18 | Rapid add, stale ack, uncertain-create replay, failure retention and transaction rollback tested |
| T19 | No-cache and source-error states implemented; image draft restoration tested in isolated browser |
| T20 | Wrong-session send denied in tests; update deferred on forms; real session-expiry/provider tests pending |
| T21 | Blocked: no deployment/account/repository supplied |
| T22 | Server token remains outside src; no authenticated HTTP runtime-cache rule; bundle secret-marker scan required at release after real configuration |
| T23 | Approved TMDB logo, exact notice and separate rating labels implemented |
| T24 | Five responsive viewport checks and mobile screenshot inspection; native focus-trapped dialogs, visible focus, reduced motion, labels and 44px controls implemented; physical-device/screen-reader review pending |
| T25 | External official YouTube trailer links implemented; remaining P1 omitted |

## Known limits

TMDB shelf entries intentionally show an ID label because permanent title/poster snapshots are disabled. Community offline browsing uses up to 100 recently fetched records for seven days; it is not a complete catalog. Duplicate discovery checks search a page per source and warn when incomplete. My Contributions loads 20 at a time with Load more. Offset pagination can drift during concurrent public edits, with canonical-key deduplication.

Web Locks coordinate supported browsers/tabs; stable UUIDs and database uniqueness still prevent duplicate rows in fallback browsers, but full cross-device conflict resolution is out of scope. Guest recovery, moderation and CAPTCHA UI are not included. Retained old posters need cautious manual owner cleanup. Browser storage eviction remains possible. The public proxy needs hosting-level abuse controls before broad exposure.

Six low/moderate dependency advisories were reported in the build-tool tree; no forced major downgrade was applied. P0 service/device/deployment gates above must be completed before claiming assignment readiness.
