# Product Requirements Document — CineTrack

**Version:** 1.0 | **Owner:** student developer | **Status:** ready for implementation | **Deadline:** 17 Nov 2026 23:59 WIB

## 1. Vision
CineTrack — Discover. Contribute. Collect. A mobile-first film discovery and personal tracking PWA. A new visitor sees a real, populated film catalog, can discover films, contribute a film absent from TMDB and organize a private shelf. No media playback or streaming service.

## 2. Problem and goals
Film fans often forget what they intend to watch; niche or student films may not be available in external catalogs. Provide one combined browsing experience and an offline-accessible personal library. The academic goal is to demonstrate SPA navigation, real REST calls, state management, two CRUD flows, persistent local data, installability/offline operation and Vercel deployment.

Success for responsi: deployed app opens with live movies; evaluator can create/edit/delete a custom film and shelf item, install PWA, reload in airplane mode and use shelf; student identity visible. No numerical grade guarantee.

## 3. Users and ownership
- Visitor: can read public catalog; background anonymous sign-in on startup when online. No signup/login screen required.
- Guest owner: authenticated anonymous user, can create custom movies and modify only their own submissions; CRUD their private shelf.
- Assignment author: identity displayed publicly from build config (name/NIM/group); not an admin role and not tied to a visitor's session. Guest preferences and shelf stats remain private.
- No admin/moderation workflow in MVP. Shared contributions are public; inform user about poster rights and demo nature. Enable anti-abuse/CAPTCHA for open deployment where feasible; restrict dissemination and monitor if not enabled.

## 4. Requirements traceability
| Assignment requirement | Implementation | Tests |
|---|---|---|
| New PWA same technology | React, Vite, Axios, Tailwind, Lucide, PWA plugin | T01, T02 |
| ≥3 navigable pages | Home, Explore, Shelf, Profile; detail and form routes | T03 |
| Profile name, NIM, group | Author section in Profile | T04 |
| ≥1 functional CRUD | Custom catalog AND shelf | T05–T13 |
| Installable and offline | Manifest, service worker, local shelf, draft, cache | T14–T20 |
| Vercel | HTTPS production URL and API proxy | T21 |

## 5. Scope & functional requirements
P0 = must for submission; P1 = if P0 verified; P2 = future. The P0 scope is intentional, not all possible movie-app features.

| ID | Priority | Requirement / acceptance |
|---|---|---|
| FR01 | P0 | Home: trending hero, popular/top rated and community rows; real TMDB data, independently loading/error states. No seed catalog necessary. |
| FR02 | P0 | Explore: debounced title search across both sources, All/TMDB/Community filter, genre filter, pagination or Load more; dedupe stable keys; no fetch of entire TMDB catalog. |
| FR03 | P0 | Movie detail: poster/backdrop, title, year, genres, synopsis, TMDB score when available, runtime and director/cast when present; missing values hidden or labeled. Custom edit/delete only for owner; add to shelf for both. |
| FR04 | P0 | Add custom movie: title, release year, genre(s), synopsis, optional image upload, runtime/director/cast/trailer optional; title/year duplicate warning across both sources before submit; explicit override after warning, server unique normalized title/year per creator; no duplicate create on double click. |
| FR05 | P0 | Edit/delete custom movie: validate, persist, update catalog; delete confirmation, soft-delete from public catalog; existing shelf entries retain a snapshot/reference and indicate unavailable. |
| FR06 | P0 | Shelf: add from details/cards, list, update status/rating/review, remove with confirmation/undo, filter status, title search; no duplicate per user/movie; no need to add rating to save. |
| FR07 | P0 | Profile: author name/NIM/group, guest shelf statistics, My Contributions shortcut, PWA install status, credits and source disclaimer. |
| FR08 | P0 | Data persistence: real Supabase rows when online; local shelf changes survive browser reload and synchronize when valid session reconnects. |
| FR09 | P0 | PWA: installable on supported browsers, app shell and core pages available after first online initialization; offline badge, cached discovery data if available, shelf CRUD and drafts offline, honest unavailable state for uncached data. |
| FR10 | P0 | Deploy production on Vercel; URL accessible on smartphone; API and icons work; no credential leak. |
| FR11 | P0 | Anonymous Auth: reuse session, no repeated account creation, RLS ownership, clear failure/retry states; no writes to another account. |
| FR12 | P1 | Upcoming/Now Playing, recommendations, YouTube trailer link, share via Web Share or copy link, favorite toggle, basic movie roulette. |
| FR13 | P1 | Optional poster/backdrop upload pair (poster upload is P0); profile nickname, app theme preference, additional stats. |
| FR14 | P2 | Permanent accounts, cross-device recovery, community reviews/aggregation, moderation, series, custom collections, notifications. |

## 6. User journeys
**Discover:** launch → trending/popular → Explore → query + filter → detail → Add to shelf → shelf status. If API unavailable, show last data (if permitted and cached), error retry and accessible community/shelf.

**Contribute:** Explore → Add Movie → title/year → duplicate check → complete form/optional poster → save → detail → community/home row refresh. Edit from own detail/My Contributions; delete after confirmation. TMDB entries cannot be edited.

**Offline:** online visit + shelf saved → airplane mode → reopen app → shelf reads local data → edit status/rating/add known cached movie/remove → pending sync indicator → reconnect → outbox flush → success or visible retry. New search is limited to cache; draft custom can be edited but publish disabled until online.

**Evaluator:** first visit → Profile verifies assignment identity → navigate four primary pages → test both CRUD online → install → full offline reload and shelf edit → reconnect and verify database.

## 7. Data rules
- Movie source and source ID immutable; key `tmdb:<positive integer>` or `custom:<uuid>`; normalize to one Movie type. Never treat TMDB rating as personal score.
- Custom films display Community badge and no aggregate rating in MVP. User personal rating is optional integer 1–5; statuses `planned`, `watching`, `completed`, `dropped`.
- Required custom fields: title 1–150, release year 1888–current year+5, ≥1 genre, synopsis 10–2000 chars. Runtime optional 1–600 minutes, director ≤150, cast ≤10 names each ≤100, trailer HTTPS YouTube link only (optional). Image optional; JPEG/PNG/WebP ≤5 MiB, compress to ~1 MiB when practical, placeholders if missing. Trim input; no HTML rendering; poster rights acknowledgment on upload. Genre values map to TMDB movie genre IDs; fixed list from config/official endpoint.
- Shelf review ≤1000 chars, status default planned; completed_at set on transition to completed and cleared on transition away; no future completed date. Snapshot for custom metadata; TMDB cache/metadata retention only if terms allow; use ID-only fallback otherwise.
- Duplicate custom title/year: warn cross-source using exact case/whitespace-normalized title+year, do not block same-title unrelated releases; unique for own active exact normalized pair. If upstream unavailable, warn duplicate check incomplete rather than claim verified.

## 8. Nonfunctional requirements
Responsive 360px–1440px, keyboard navigable, focus visible, contrast WCAG AA target, reduced motion, 44px targets, semantic labels. Lazy-load posters, request only current pages, loading placeholders, no layout shift; target usable first load under typical broadband (not hard SLA). All user writes scoped by auth.uid; validate on database plus client; prevent XSS via React escaping; do not log tokens. Offline state must never claim sync before server success. Handle quota, expired session, network failure. Use source attribution, public poster consent and no video distribution.

## 9. Out of scope and constraints
No streaming/video upload, payment, external recommendations AI, permanent multi-device login, full TMDB mirror, bulk data ingestion, IMDb rating scraping, cloud offline poster uploads. Initial online bootstrap required. Guest sessions not recoverable after clearing site storage; no guarantees for browser cache eviction or provider outages. Anonymous public submissions can be abused; MVP is a student demo, not a production-ready social catalog. Commercial use needs separate TMDB licensing.

## 10. Release gate
P0 tests listed in TEST_PLAN; no fabricated identity or keys. Missing credentials block live tests/deployment, not coding. Must verify current TMDB terms/cache policy, approved attribution logo, anonymous auth setting, database migration, real Vercel URL and actual offline install before submitting.
