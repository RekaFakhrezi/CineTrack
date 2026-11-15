# Implementation Roadmap

Deadline 17 November 2026, 23:59 WIB. Suggested allocation (not a completion guarantee): 15 Nov foundations/catalog; 16 Nov CRUD/offline; 17 Nov integration tests, polish, deployment and submission buffer. Prioritize P0; cut P1 before compromising offline or RLS. Work in order with vertical slices and build checkpoints.

## Phase 0 — Scaffold/config
- Initialize fresh Vite React project in workspace root; retain docs/AGENTS. Node active LTS supported by installed versions, npm lockfile. Dependencies React Router, Axios, Tailwind + Vite plugin, Lucide, Supabase SDK, Dexie, vite-plugin-pwa; dev lint/test tooling.
- Add scripts dev/build/preview/lint/test (nonwatch command), `.env.example`, `.gitignore`, route skeleton and design tokens. Setup local original logo/placeholders/manifest icons; initial build.
- Create server TMDB proxy adapter (Vite development middleware and Vercel function). Use hash routing so no catchall API conflict. Environment validation. Tests for allowlist and normalizers.
- Gate: app opens 4 routes, no secret in client, build passes.

## Phase 1 — Real film discovery
- TMDB proxy and Axios service, normalization/genre mapping, independent fetch states. Home hero/trending/top rated/popular; Explore search/filter/pagination; detail.
- Implement card, poster fallbacks, responsive navigation, loading/error/empty. No mock data in app. Credits logo+notice. Verify TMDB token with real GET when provided; without token show error and mark live test blocked.
- Gate: real films loaded with valid token, search and detail work; unit merge/validation tests pass.

## Phase 2 — Supabase + custom movie CRUD
- SQL migration/constraints/RLS/storage policies, anonymous auth context and guest reuse; manual setup instructions. Configure project credentials when user supplies them. Create services with JWT Axios interceptor and SDK upload.
- Merge community catalog + TMDB Explore, community Home row, duplicate warning. Implement form with validation, optional poster, edit, soft delete, contributions, owner checks. Profile author config.
- Gate: two anonymous sessions verify owner access; custom film created, listed, editable, soft deleted; image loaded. API errors honest.

## Phase 3 — My Shelf offline-first
- Implement local DB, repository, context, outbox/sync engine. Create/update/delete status/rating/review, local stats, no duplicates. UI pending/error states; cache permitted metadata only. Handle reconnect/session and stale responses. Draft storage + Blob. Unit tests for revision, retries, duplicate, deletion/re-add.
- Gate: online CRUD persisted, offline edit/delete/add with known film, reload retains state, reconnect confirms server, no cross-user leak. Custom draft restore offline.

## Phase 4 — PWA and production polish
- Manifest/icon sizes/maskable, SW precache and denylist, offline install prompt, status UI; test production build, not just dev.
- Responsive tests 360/390/768/1280/1440, keyboard/focus, reduced motion, poster loading, error states. Validate TMDB terms; enable only allowed cache. Use local fallback for missing images. Add P1 only if all P0 stable.
- Gate: production offline reload, navigation all core routes, installed mobile app, no broken assets, no uncaught errors.

## Phase 5 — Deploy and submit
1. Create new GitHub repo (private/public per user choice), commit source and lockfile, ignore env/local caches. Never push credentials. If repo already exists inspect remote before changing.
2. Supabase dashboard: enable anonymous sign-ins, configure CAPTCHA/abuse protections if public, apply migration to new project, create public poster bucket with restrictions and policies. Verify Data API access. Do not use old module database.
3. TMDB account → API settings → developer access token; approved logo/attribution; check current terms. Set server token only in Vercel dashboard.
4. Vercel import repo, framework Vite, root repo, build `npm run build`, output `dist`, install `npm ci` (when lockfile present). API `api/tmdb.js` deployed as function; verify `/api/tmdb?endpoint=popular` returns JSON. HashRouter no catchall rewrite needed. If switch BrowserRouter, explicitly avoid rewriting API/assets, update docs/tests.
5. Set all environment values in production, redeploy. Validate author identity matches student. Test actual HTTPS URL via smartphone, private browser, install, offline reload, CRUD + RLS. Run test matrix; fix P0 issues. Record URL, screenshots, test results and known limits in README.
6. Submit URL via form https://docs.google.com/forms/d/e/1FAIpQLSewTNZPTPadOB8WvdmpVuOxWdu70TzBhoL5r2_5GEa4OgcOXg/viewform before deadline. User submits; Codex must not claim submission without explicit evidence.

## Priority if time runs short
Do not remove assignment conditions. Keep Home/Explore/Shelf/Profile, real TMDB integration, minimal custom movie CRUD (title/year/genre/synopsis/optional poster), shelf status/rating/review, PWA offline shell + reliable shelf, Vercel. Drop trailer/recommendations, animations, backdrop upload, theme toggle, extra stats, custom collections. If community API unavailable, show partial UI, fix credentials/policies before release. If TMDB terms do not allow persistence, use ID-only shelf and placeholders offline; document limitation. Never use mock API responses as evidence of deployed functionality.

## External inputs checklist (user must supply)
- [ ] Student name, NIM, group (public in assignment profile)
- [ ] TMDB developer read access token (server env only)
- [ ] Supabase project URL, publishable key, access to Dashboard to enable auth/migrations/bucket
- [ ] Approved TMDB logo and terms/cache verification
- [ ] GitHub repo and Vercel account/access
- [ ] Browser/device for real PWA installation test

## Delivery checklist for Codex
Actual source files, lockfile, migration, `.env.example`, README run/setup instructions, API and offline behavior docs updated if implementation differs, tests and real outcomes, production build, deployed URL only if verified, list of remaining blockers and manual actions. No claim of completed deployment if user has not configured services.
