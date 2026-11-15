# Run and configure CineTrack

## Local application

Use Node 24 LTS and run `npm ci`, then `npm run dev` from the folder containing package.json. Preserve the package-lock.json. Make a local copy of `.env.example` named `.env.local` and fill values below. `.env.local` is ignored by Git. Restart Vite after changing it.

| Variable | Where to obtain it | Visibility |
|---|---|---|
| VITE_SUPABASE_URL | New Supabase project's API settings | Public |
| VITE_SUPABASE_PUBLISHABLE_KEY | Project publishable key, never service-role/secret key | Public |
| VITE_AUTHOR_NAME | Your actual full name | Public in Profile |
| VITE_AUTHOR_NIM | Your actual NIM | Public in Profile |
| VITE_AUTHOR_GROUP | Your actual group | Public in Profile |
| TMDB_READ_ACCESS_TOKEN | Your TMDB developer account API settings | Server only |

Do not paste secrets into chat or put the TMDB token in a `VITE_` variable. Do not reuse the module's database or keys. Missing configuration is intentionally visible in the app.

## Supabase manual configuration

1. Create a new project. Enable anonymous sign-ins in Authentication settings. The app uses a real anonymous authenticated user, not the public API key as a JWT.
2. Review and execute `supabase/migrations/0001_init.sql` once against the new project through the SQL editor or your migration workflow. It creates three tables, ownership guards, grants, RLS policies, and the public `movie-posters` bucket. No remote migration has been executed by this implementation.
3. Confirm the bucket is public, limited to 5 MiB and JPEG/PNG/WebP. Upload paths are `userUUID/movieUUID/randomUUID.ext`; upload and delete require the owning authenticated user. Public images can be viewed by anyone with their URL.
4. Set the URL/publishable key in `.env.local`. Reload online and confirm guest sign-in. Create a film, upload a permitted poster, edit it, and remove it. Check actual rows and storage objects.
5. In a separate incognito browser/session, verify public reads, denied owner edits, and inability to read the first user's shelf. Also test direct REST calls with the second JWT; hiding owner buttons is not a security test.
6. Configure Supabase rate limits and anonymous-auth abuse protections appropriate to your audience. If enabling CAPTCHA, add the chosen provider's widget/token flow before requiring CAPTCHA for sign-in; the current demo does not implement a CAPTCHA widget. Monitor a publicly shared student demo.

Guest identity is browser-local and cannot be recovered after browser data is cleared. The app will not silently replace a lost identity or upload its pending queue under a different user.

## TMDB and attribution

Set the developer read access token on the server only. `npm run dev` loads it in a Vite server middleware; Vercel uses `api/tmdb.js`. Verify `/api/tmdb?endpoint=popular` returns JSON and `/api/tmdb?endpoint=detail&id=12` works with your token. Invalid endpoints must return 400; missing configuration returns 503.

The official, unmodified logo was downloaded from:
https://www.themoviedb.org/assets/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg

Source requirements: https://developer.themoviedb.org/docs/faq and https://www.themoviedb.org/about/logos-attribution. The app includes the required notice in Profile Credits. Inspect your developer account's actual API/license terms before enabling metadata or poster persistence; no such caching has been enabled. Attribution is not a cache-retention license.

## GitHub and Vercel

1. Create a GitHub repository with your chosen visibility. This folder is not yet a Git repository and no remote has been created. Initialize Git here, stage source/docs/lockfile, check that `.env.local`, node_modules and dist are ignored, then commit and push to your repository. Review the staged files before publishing.
2. Import that repository into Vercel. Use Vite, Node 24.x, install command `npm ci`, build command `npm run build`, output `dist`. If you upload the outer Responsi folder, set Root Directory to `CineTrack_Codex_Planning_Pack`; if this folder is the repository root, leave Root Directory at the root.
3. Set all six environment values in the intended Preview/Production scopes. Redeploy after changes. `api/tmdb.js` must be deployed as a function, not redirected to index.html. HashRouter needs no catchall rewrite.
4. Open the resulting HTTPS URL. Verify all pages, API JSON responses, actual author identity, real film data, both CRUD flows, anonymous ownership, storage, and icon paths. Add Vercel request/rate limiting controls for the public TMDB proxy as available; keeping the upstream token secret does not make this public endpoint private.
5. On Android Chrome, install the app, warm up online, then reopen and reload in airplane mode. Edit a shelf item, remove another, save an image draft, reload, reconnect, and verify actual database rows and cleared queue. On iOS use Share → Add to Home Screen and test separately.
6. Record the verified URL and device results in IMPLEMENTATION_RESULTS.md. The student submits the URL through the assignment form in IMPLEMENTATION_PLAN.md. No deployment or submission was performed.

## Maintenance and diagnostics

- Run `npm run lint`, `npm test`, `npm run build`, and `npm run test:e2e`. Production browser tests need Chrome and permission to launch a headless browser/server. To use a downloaded Playwright Chromium, change the channel in playwright.config.js and install that browser through Playwright.
- `npm run preview` verifies the built shell/service worker but does not implement the serverless proxy. Use `npm run dev` for local live API calls.
- SW caches only the shell and exact configured public poster bucket. Auth/REST requests and the proxy are never runtime-cached. IndexedDB contains the private shelf/outbox and sanitized public movies, not credentials.
- Pending sync errors are retained. Retry manually, reconnect, or correct an entry. Removing a failed new shelf entry queues a safe delete; it is not silently discarded.
- Old posters may remain after successful replacement or ambiguous network outcomes. Do not delete a poster until you have checked every reference, including historical shelf snapshots.
- An update prompt is disabled while a movie form is open. Save the draft and leave the form before updating. Updates preserve IndexedDB.
- The dependency audit reported six low/moderate transitive advisories in build tooling (Workbox's dependency tree). Do not force a plugin downgrade automatically; re-evaluate compatible upstream patches before public release. No high/critical advisory was reported in the checked tree.
