# Design Specification — CineTrack

## 1. Art direction
Cinematic editorial, sophisticated dark theme, inspired by film discovery interfaces but original identity. Posters are the primary color; UI stays restrained. Use a custom logo: rounded film-frame outline with a small bookmark notch, wordmark CineTrack. No Netflix or Letterboxd logos or duplicated layouts. English UI labels; concise Indonesian helper text for assignment profile where useful. No fake streaming Play button; trailer clearly labeled.

## 2. Design tokens (CSS custom properties)
| Token | Hex / value | Role |
|---|---|---|
| --bg | #0B1019 | App base |
| --surface | #121B29 | Panels, nav |
| --surface-raised | #1B2637 | Cards, popovers |
| --border | #2E3C51 | Dividers/inputs |
| --text | #F1F5F9 | Primary text |
| --muted | #A7B3C5 | Secondary text |
| --accent | #67E8F9 | Main CTA, active nav |
| --accent-ink | #08202B | Text on accent |
| --rating | #FBBF24 | Stars/ratings |
| --danger | #FCA5A5 | Destructive actions |
| --success | #86EFAC | Synced status |
| --warning | #FCD34D | Offline/pending |

Verify contrast in context; text on posters always uses dark gradient/solid scrim. Font: system UI stack or bundled licensed Inter (no remote font dependency); headings 32–48px desktop, 28–36 mobile, section 20–24, body 14–16, metadata 12–13; line-height 1.45–1.6. Spacing 4/8/12/16/24/32/48/64. Radius 10–16 cards, 12 inputs, 999 pills; subtle shadows, no excessive glassmorphism. Motion 150–220ms opacity/transform, respect prefers-reduced-motion. Use icon + label for important controls.

## 3. Responsive system
- Mobile <640px: top logo + search/add shortcut; bottom fixed navigation Home/Explore/Shelf/Profile (safe area); content padding 16px and bottom nav clearance. Poster grid 2 columns; horizontal rows show 2.2 cards; no page-wide horizontal overflow.
- Tablet 640–1023px: grid 3–4 columns, bottom nav or compact header nav; padding 24px.
- Desktop ≥1024px: left rail ~216px with wordmark/navigation and install link; main content max 1440px; 4–6 column grid; top utility search/add; detail 2-column. Use CSS grid auto-fit with min 150–180px. On 1440px keep content centered, not edge-to-edge endless.
- Hero ~16:9 mobile with text overlay, ~2.4:1 desktop (max height ~480). Poster aspect 2:3; backdrop 16:9; images object-fit cover; placeholder same aspect ratio, lazy load except hero. No auto carousel rotation (accessibility/perf).

## 4. Navigation / route map
`/#/` Home | `/#/explore` Explore | `/#/shelf` My Shelf | `/#/profile` Profile | `/#/movies/:source/:id` Detail | `/#/movies/new` Add | `/#/movies/custom/:id/edit` Edit | `/#/contributions` My Contributions (secondary). Use React Router HashRouter, static routes before dynamic (router ranking still applies). Unknown routes show 404 with Home. Back restores prior search/filter/scroll where practical. Route title updates, focus main heading on navigation. Desktop rail and mobile nav share same route state.

## 5. Page specifications

### Home
Desktop wireframe:
```
[rail: logo / Home / Explore / Shelf / Profile] [search] [ + Add Movie ]
                                                [hero backdrop           ]
                                                [title / summary / Details]
                                                Trending Now      See all
                                                [poster][poster][poster]…
                                                Top Rated         See all
                                                [poster][poster][poster]…
                                                Community Picks   See all
                                                [poster][poster] or CTA
```
Hero one real trending film, year, genre, rating only if available; primary View Details, secondary bookmark. If hero fails use text-only branded welcome and Explore; no invented content. Sections scroll horizontally with accessible arrows and keyboard scroll; separate status per section. Community newest not popularity-ranked; empty CTA “Be the first to add a movie.” See all links set Explore filter/sort.

### Explore
Header “Discover movies” + Add Movie CTA, search input (300ms debounce, clear, Enter), source segmented All / TMDB / Community, genre select/chips, sort (Recommended / Title / Newest; only use valid sort where supported). Grid poster cards. For All, each Load more advances available source cursors independently; merge results, label Community items. If filtered search returns none: “No movies found. Add a missing movie.” Partial failure banner “TMDB is unavailable; showing community results.” Offline: search cached items only; explicit label. Keep filters in URL query after hash or state restored. No artificial totals.

### Movie Detail
Backdrop + gradient, poster, title, year/runtime, source badge, score `★ 8.6 TMDB` or “Not rated”; synopsis, genre pills; Add to Shelf CTA or In Shelf with edit sheet. Detail action bar owner-only Edit/Delete for custom. Director/cast only if present, trailer external link optional. Related films P1. Deleted custom: if shelf snapshot exists show “Removed from community catalog” and allow shelf edit/remove; otherwise not-found. Distinguish personal stars from source score.

### My Shelf
Header, stats total/completed, tabs All / Planned / Watching / Completed / Dropped, search, sort Recently added / Title / Rating, card/list layout. Each card shows poster, title, status pill, personal stars if set, overflow edit/remove. Edit opens sheet on mobile/dialog desktop with status radio/select, 1–5 star rating plus clear, review textarea counter, Save. Empty state illustrated by original icon, Explore CTA. Offline pending badge per item, status banner, retry sync action. Remove confirmation or toast undo before irreversible queue operation; no fake success.

### Add/Edit Custom Movie
Step-free form: breadcrumb/back, heading, image uploader with preview and clear, title, year, genre multi-select, synopsis, optional runtime/director/cast/trailer. Image rights acknowledgment when selecting file. Duplicate check on title+year blur or button; warning list of possible matches with View existing / Continue anyway. Required field errors adjacent; save disabled while invalid/submitting. Autosave draft (debounce) and restore prompt, unsaved-change confirmation. Offline banner “Draft saved on this device. Connect to publish.” Save button disabled offline. Edit prefilled; replace poster without removing current until DB success. Delete uses modal with impact explanation, cancel default. On success route detail + toast. No uploaded image? local placeholder.

### Profile / My Contributions
Author card: full name, NIM, group (config), “Responsi Modul 5 • Teknik Komputer”; no fabricated profile photo. Separate personal guest stats: total, planned/watching/completed, average personal rating only if rated. Contributions link opens own submissions with edit/delete. Settings includes installation action (or manual iOS instructions), sync status and retry, app version, privacy note, source credits: approved TMDB logo smaller than own logo, exact notice, link. Do not publish visitor NIM/name in community data.

## 6. Shared components
`AppShell`, `DesktopRail`, `MobileNav`, `MovieCard`, `MovieGrid`, `MovieRow`, `Hero`, `SourceBadge`, `RatingBadge`, `StatusPill`, `SearchBar`, `FilterBar`, `EmptyState`, `ErrorState`, `Skeleton`, `OfflineBanner`, `InstallPrompt`, `SyncIndicator`, `ConfirmDialog`, `ShelfEditor`, `PosterUploader`, `Toast`, `Credits`.

MovieCard: stable key, poster link, separate accessible bookmark button (no nested interactive controls), title up to 2 lines, year/source/score; lazy images, fallback `onError` once. Skeleton identical dimensions, no indefinite spinner. Toast success only after local transaction (“Saved on device”) or confirmed server (“Synced”). Error messages actionable and not raw stack traces.

## 7. UX copy and states
| State | Copy / behavior |
|---|---|
| API loading | skeleton + aria-busy |
| First online data fetch failed | “Couldn't load movies. Try again.” retry |
| Offline with cached data | “You're offline. Showing saved content.” |
| Offline no cache | “Connect to discover more movies.” Shelf accessible |
| Shelf pending | “Saved on device · Pending sync” |
| Sync error | “Couldn't sync changes. Your changes are safe on this device.” retry |
| Guest session expired | “Reconnect to restore this session. Changes remain on this device.” |
| Custom delete | “Remove this movie from the community catalog? Existing shelf entries may keep a reference.” |
| No rating | “Not rated” or omit score |

## 8. Accessibility and assets
Semantic landmarks, skip link, labels, alt meaningful (poster title), decorative backdrop alt empty, dialog focus trap/restore and Esc, keyboard star selector, visible focus, live region for status/toast, touch targets ≥44px, never use color alone. CSS safe-area-inset-bottom. Icon assets original SVG and generated PNG 192/512 + maskable 512 (central safe zone). Local placeholder poster/backdrop, no remote fonts or icon CDNs. Obtain official TMDB logo from approved source; do not redraw. Test 360/390/768/1280/1440 widths.
