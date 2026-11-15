# AGENTS.md — Instructions for Codex

## Mission
Build CineTrack from scratch for PPB Modul 5 responsi. Read `README.md` and all files under `docs/` before implementation. `docs/PRD.md` defines scope/acceptance, `docs/DESIGN.md` UI, `docs/DATABASE.md` schema/security, `docs/API.md` integration and `docs/PWA.md` offline semantics. Resolve conflicts in favor of security, explicit assignment requirements, and PRD. Record deviations in README and report them; do not silently reduce scope.

## Non-negotiable
- React + Vite + JS/JSX, Axios for REST, Tailwind, Lucide, vite-plugin-pwa, Vercel. Fresh project; do not clone module app or use Next.js/React Native.
- Routes Home, Explore, My Shelf, Profile, Movie Detail, Add/Edit Custom Movie. Working navigation, two CRUD features, actual installability, actual offline functionality.
- TMDB read-only + custom Supabase catalog merged with `tmdb:<id>` / `custom:<uuid>` keys. No scraping, streaming or fabricated ratings.
- Supabase anonymous authenticated session, RLS for all public tables, ownership policies, real JWT (not publishable key as user token). Public custom reads, owner writes, private shelf. No service role in browser; no privileged key required in app. TMDB server-only token. No permissive write policies or mock-success fallback.
- Offline first for shelf via IndexedDB/outbox; cache public data only subject to source terms. Do not cache authenticated HTTP responses or tokens in service worker. Online-only custom publish with offline drafts. Preserve unsynced operations; never silently discard them.
- Profile must show actual assignment author name/NIM/group in author section from public config. Do not invent personal info; mark missing config clearly. Private guest profile preferences separate from author info.
- Accessible mobile-first design. Real loading, empty, offline, error, retry states. No dead buttons, fake counts or default fabricated film data.
- Acknowledge TMDB in Credits with official approved logo and required notice. Use permitted images only. No copyrighted branding recreation of Netflix/Letterboxd.

## Working procedure
1. Inspect workspace and existing docs. If no app, scaffold in current root without deleting docs. Use an active Node LTS supported by installed Vite; verify requirements and lock dependencies in package-lock.json.
2. Implement phases from implementation plan, with small coherent changes. After each phase run lint/test/build where applicable, report commands and actual outcomes. Do not claim tests ran if not run.
3. Keep UI, domain logic, API services and persistence separated. Use JS JSDoc types for contracts. Avoid unnecessary global state/dependencies.
4. Build actual migration under `supabase/migrations/`; never execute destructive remote SQL without explicit permission. Provide manual setup for credentials, anonymous auth, bucket, migration and Vercel. Never commit `.env.local` or print secrets.
5. Use `.env.example` and startup config error UI. Unit tests use mocks only inside tests; live app never pretends to have data if keys missing. If credentials are absent, continue building and use tests to verify logic, clearly mark real integration unverified.
6. Keep production bundle and server function separate. Validate endpoint allowlist and user input; verify no secret enters dist. Test mobile and deployed PWA if browser tools available, otherwise provide precise manual steps.
7. Run final acceptance matrix; deliver runnable app, documentation, known limitations, exact steps remaining. No final deployment claim without URL verification. Ask user only for essential external credentials/config or destructive actions, and proceed on independent work meanwhile.

## Definition of done
All P0 tests pass (or explicit environment blocker documented), `npm run build` succeeds, production PWA can be installed and reload offline after initialization, shelf CRUD persists across reload and synchronizes safely on reconnect, two separate anonymous sessions cannot mutate one another's data, custom movie appears in hybrid catalog and can be edited/deleted by owner, profile identity visible, Vercel URL validated. No untracked credentials or test fixtures masquerading as production.
