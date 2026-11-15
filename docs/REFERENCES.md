# References & Requirements Basis

## Academic source
User-provided `MODUL 5_Prak PPB_PWA 2(2).docx`, Bab VI — React Progressive Web App (PWA) II. Relevant sections:
- 6.1 Tujuan: PWA, Vercel deployment, ReactJS, RESTful API, SPA with React Hooks, error handling, state management and localStorage persistence.
- 6.3 Dasar Teori: PWA, React JS, Vite, API and Axios.
- 6.4.2 Integrasi Frontend PWA dengan API: Axios config, custom hooks, service layer, Supabase REST, CRUD, localStorage fallback/draft/profile and PWABadge. Dependency installation includes Lucide React, vite-plugin-pwa, Tailwind CSS and Axios.
- 6.4.3 Deploy PWA ke Vercel: GitHub repository, Vercel deployment; 6.4.4 PWA pada Mobile: verify deployed PWA on phone.

Responsi announcement (provided by user): create a new PWA from scratch using same technology; at least three navigable pages, profile with name/NIM/group, at least one functional CRUD, installable/offline, deploy to Vercel and submit URL by 17 Nov 2026 23:59 WIB. The module sample is not a template to clone or a source of credentials. Extra scope (TMDB hybrid catalog, RLS, anonymous auth, offline shelf outbox, design system, testing) is proposed in this project, not mandated verbatim by module.

## Official technical references
Verified or identified on 15 November 2026; confirm current versions/terms when implementing.
- TMDB developer FAQ, free noncommercial use and required attribution: https://developer.themoviedb.org/docs/faq
- TMDB developer docs/API reference: https://developer.themoviedb.org/reference/intro/getting-started
- TMDB approved logos and attribution: https://www.themoviedb.org/about/logos-attribution
- TMDB API terms: review current terms via developer account/API registration; FAQ does not establish cache retention rights. Terms page could not be verified during planning; default to no persistent TMDB metadata/image caching until verified. Do not bulk mirror data or use commercial license without permission.
- Required notice (verbatim from TMDB FAQ): “This product uses the TMDB API but is not endorsed or certified by TMDB.” Use approved logo in Credits/About, less prominent than CineTrack logo, link https://www.themoviedb.org.
- Supabase anonymous sign-ins: https://supabase.com/docs/guides/auth/auth-anonymous (authenticated role, not anon key; no recovery across browser reset; anti-abuse recommendation).
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Storage access controls: https://supabase.com/docs/guides/storage/security/access-control
- Storage public/private buckets: https://supabase.com/docs/guides/storage/buckets/fundamentals
- Vercel Vite: https://vercel.com/docs/frameworks/frontend/vite
- vite-plugin-pwa Workbox generateSW: https://github.com/vite-pwa/vite-plugin-pwa/blob/main/docs/workbox/generate-sw.md
- PWA basics: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps
- React: https://react.dev/ ; Vite: https://vite.dev/guide/ ; Axios: https://axios-http.com/docs/intro

No implementation or deployment has been performed, no real credentials supplied, and the example SQL/design must be validated against actual PostgreSQL/Supabase during implementation. Current service quotas may change; use provider dashboards and avoid claims of unlimited free access.
