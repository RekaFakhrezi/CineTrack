# API Integration Contract

## 1. Environment
```dotenv
# Browser-safe config, Vite exposes these in bundle:
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_AUTHOR_NAME=
VITE_AUTHOR_NIM=
VITE_AUTHOR_GROUP=
# Server only — NEVER prefix with VITE_:
TMDB_READ_ACCESS_TOKEN=
```
Use `.env.local` ignored by Git; `.env.example` blank values. Vercel Production/Preview env scopes; redeploy after changes. VITE values are public; do not put service role, TMDB token or password there. Author identity intentionally visible; warn user. Validate config and provide actionable missing-key state. No credentials from module reference.

## 2. TMDB read-only proxy
`GET /api/tmdb?endpoint=trending&...` same origin Axios. Server maps a fixed endpoint name to TMDB v3 path (base `https://api.themoviedb.org/3`). Node Vercel function uses server token as Bearer and `Accept: application/json`; timeout 10s. Vite dev adapter reuses handler logic (configureServer, loadEnv on server; no token in HTML). Vercel preview or deployed URL for real function tests. Method GET only, 405 others. Do not pass arbitrary path, host, headers, token or request body to upstream. `id` positive safe integer; `page` 1–500; query 1–100 trimmed; source sort allowlist; genre valid ID; include_adult false; language en-US default; optional region ID for region-specific listings only. Set `append_to_response=credits,videos` server-side for detail if used. No raw upstream credential/error echo. No unbounded retries. Public proxy can still be abused; constrain requests and enable Vercel rate-limit controls if available; do not claim hidden token makes API private. Respect TMDB limits and terms.

| endpoint | Upstream | Allowed inputs | Response |
|---|---|---|---|
| trending | `/trending/movie/week` | page | list |
| popular | `/movie/popular` | page | list |
| top_rated | `/movie/top_rated` | page | list |
| search | `/search/movie` | query,page | list |
| discover | `/discover/movie` | genre,page,sort | list |
| detail | `/movie/{id}` | id | object + credits/videos |
| genres | `/genre/movie/list` | none | genre list |
| upcoming (P1) | `/movie/upcoming` | page | list |
| now_playing (P1) | `/movie/now_playing` | page | list |
| recommendations (P1) | `/movie/{id}/recommendations` | id,page | list |

List contract use TMDB `results,page,total_pages`; normalize each item. Proxy success JSON (raw allowed upstream schema); error `{error:{code,message,retryable}}`, 400 invalid, 404 missing, 405 invalid method, 429 rate-limited (forward safe Retry-After), 502 upstream error, 503 missing token, 504 timeout. Never return HTTP 200 for failed request. Use Cache-Control no-store until license/cache terms verified; if allowed, bounded public caching only; do not cache errors. Source metadata rating `vote_average` and `vote_count`. Poster using config/base + approved size, null fallback. The current FAQ confirms noncommercial API and attribution; separate usage/caching terms must be checked before deployment, no bulk replication.

## 3. Supabase PostgREST via Axios
Base `${VITE_SUPABASE_URL}/rest/v1`. Headers `apikey: <publishable key>`, `Authorization: Bearer <current access JWT>` only when signed-in, `Content-Type: application/json`, `Prefer: return=representation` for create/update. For anon read omit JWT (publishable key is not an auth session). Auth SDK handles anonymous sign-in/session; SDK storage for image operations. Central error normalization, refresh once on 401 only, no retry unsafe writes automatically.

| Operation | HTTP | Route / filter |
|---|---|---|
| List custom active | GET | `/custom_movies?deleted_at=is.null&select=*&order=created_at.desc,id.desc&limit=20&offset=0` |
| Search custom | GET | same + title ilike pattern escaped/encoded, genre_ids `cs.{28}` when selected |
| Detail custom | GET | `/custom_movies?id=eq.<uuid>&deleted_at=is.null&select=*` |
| My contributions | GET | `/custom_movies?created_by=eq.<uid>&deleted_at=is.null&select=*` |
| Create movie | POST | `/custom_movies` with stable id + created_by + validated fields |
| Update movie | PATCH | `/custom_movies?id=eq.<uuid>&created_by=eq.<uid>&deleted_at=is.null` |
| Delete movie (soft) | PATCH | same + `{deleted_at: ISO timestamp}` |
| Read shelf | GET | `/shelf_items?user_id=eq.<uid>&select=*&order=updated_at.desc` |
| Create shelf | POST | `/shelf_items` with stable id + user_id + one source ref |
| Update shelf | PATCH | `/shelf_items?id=eq.<uuid>&user_id=eq.<uid>` |
| Delete shelf | DELETE | same filter; absent row treated idempotently after verified owner scope |
| Profile preference | GET/POST/PATCH | `/profiles`, id=auth.uid; optional nickname only |

Use Axios params and correct PostgREST quoting/escaping; don't concatenate untrusted query syntax. RLS is security boundary; filters are not authorization. Require returned row for expected POST/PATCH (empty PATCH response can mean denied/not found; surface error not success). Shelf user data not in shared cache. Generated `movie_key` and timestamps not sent in mutation body (created_at default; update trigger). For existing item update only mutable fields, not ID/owner/source. `204` deletion allowed; verify absence for ambiguous outcome.

Example custom create body (fictional demo, not seeded):
```json
{"id":"<uuid>","created_by":"<auth.uid>","title":"Demo Student Film","release_year":2026,"synopsis":"A student short film submitted to the community catalog.","genre_ids":[18],"runtime":12,"director":null,"cast_names":[],"poster_path":null,"backdrop_path":null,"trailer_url":null}
```
Shelf body `id,user_id,tmdb_id OR custom_movie_id,status,personal_rating,review,completed_at,snapshot`. For `completed`, completed_at set on first transition; null otherwise. Snapshot restricted per PRD and source terms.

## 4. Upload contract
Validate extension/MIME and size, optionally resize/compress image using browser canvas with cleanup. Use `supabase.storage.from('movie-posters').upload(path,file,{contentType,upsert:false})`; `getPublicUrl(path)` for rendering; save path not URL. No upload offline; draft stores blob in IndexedDB, not base64 in localStorage. Revoke object URLs. On failed publish retain draft and only delete unreferenced uploaded object; retry stable movie UUID. Warn image publicly viewable, require rights acknowledgment. Limit upload to JPEG PNG WebP 5 MiB. No remote URL fetching or arbitrary external poster import.

## 5. Duplicate detection
Search both sources by title before create, compare normalized title + year. Custom database unique active per owner. If TMDB inaccessible, show incomplete check, allow continue after explicit warning. Handle 23505 with friendly message; do not automatically merge two distinct films. For shelf duplicate use unique(user_id,movie_key), reconcile own existing ID without duplicating rows.

## 6. Testing and compliance
Use fixtures only in unit tests. Live API integration needs actual token, Supabase URL/key, migration. No guessing results or credentials. Verify TMDB logo and required notice in Profile Credits. No IMDb labeling for TMDB ratings. Never commit `.env.local` or log Authorization; scan `dist` for token. Check current TMDB API terms and retention rights before enabling cache/snapshot. Links in REFERENCES.
