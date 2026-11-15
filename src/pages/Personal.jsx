import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  Bookmark,
  CheckCircle2,
  Clock,
  ExternalLink,
  Film,
  LayoutGrid,
  List,
  Pencil,
  PlayCircle,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  User,
  X,
} from "lucide-react";
import { useApp, useAsync } from "../hooks.jsx";
import { statuses, normalizeTmdbMovie, mergeMovies } from "../domain/movie.js";
import { posterUrl } from "../services/supabase.js";
import { tmdb } from "../services/tmdb.js";
import { customList } from "../services/custom.js";
import { getCachedMovieMeta, cacheMovieMeta } from "../repositories/metaCache.js";
import {
  Poster,
  Empty,
  ErrorState,
  Loading,
  MovieGrid,
  ShelfEditor,
  Confirm,
} from "../components.jsx";
export function movieFromShelf(item) {
  const source = item.tmdb_id ? "tmdb" : "custom";
  const sourceId = String(item.tmdb_id || item.custom_movie_id);
  const cached = getCachedMovieMeta(item.movieKey);
  const poster = item.snapshot?.posterPath
    ? posterUrl(item.snapshot.posterPath)
    : cached?.posterUrl || null;

  return {
    key: item.movieKey,
    source,
    sourceId,
    title:
      item.snapshot?.title ||
      cached?.title ||
      `${source === "tmdb" ? "TMDB movie" : "Community movie"} #${sourceId}`,
    year: item.snapshot?.year ?? cached?.year ?? null,
    genreIds: item.snapshot?.genreIds || cached?.genreIds || [],
    posterPath: item.snapshot?.posterPath || cached?.posterPath || null,
    posterUrl: poster,
  };
}
export function Shelf() {
  const { shelf, queue, save, sync, online, syncError } = useApp();
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent");
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem("cinetrack_shelf_view") || "grid";
    } catch (_err) {
      void _err;
      return "grid";
    }
  });
  const switchView = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem("cinetrack_shelf_view", mode);
    } catch (_err) {
      void _err;
    }
  };
  const [edit, setEdit] = useState(null);
  const [remove, setRemove] = useState(null);
  const [, setRefreshKey] = useState(0);

  const active = shelf.filter((x) => !x.deleted);

  useEffect(() => {
    if (!online) return;
    const missing = active.filter((item) => {
      if (item.snapshot?.title) return false;
      const cached = getCachedMovieMeta(item.movieKey);
      return !cached?.title && item.tmdb_id;
    });

    if (!missing.length) return;

    let cancelled = false;
    Promise.allSettled(
      missing.map((item) =>
        tmdb("detail", { id: item.tmdb_id }).then((raw) => {
          const norm = normalizeTmdbMovie(raw);
          cacheMovieMeta(norm);
        }),
      ),
    ).then(() => {
      if (!cancelled) setRefreshKey((k) => k + 1);
    });

    return () => {
      cancelled = true;
    };
  }, [active, online]);

  const items = active
    .filter(
      (x) =>
        (status === "all" || x.status === status) &&
        movieFromShelf(x).title.toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "title"
        ? movieFromShelf(a).title.localeCompare(movieFromShelf(b).title)
        : sort === "rating"
          ? (b.personal_rating || 0) - (a.personal_rating || 0)
          : b.createdAt.localeCompare(a.createdAt),
    );
  return (
    <>
      <div className="page-heading shelf-page-heading">
        <div>
          <h1>My shelf</h1>
          <p className="muted">
            {active.length} movies saved ·{" "}
            {active.filter((x) => x.status === "completed").length} completed
          </p>
        </div>
        <div className="actions">
          <Link className="button primary" to="/movies/new">
            <Plus size={17} /> Add movie
          </Link>
        </div>
      </div>
      {syncError && <ErrorState message={syncError} retry={() => sync(true)} />}
      <div className="shelf-toolbar">
        <div className="segmented scroll">
          {["all", ...statuses].map((s) => (
            <button
              key={s}
              type="button"
              className="shelf-tab-btn"
              aria-pressed={status === s}
              onClick={() => setStatus(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="shelf-toolbar-right">
          <div className="shelf-search-pill">
            <Search size={15} className="shelf-search-icon" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search shelf..."
              aria-label="Search shelf"
            />
            {query && (
              <button
                type="button"
                className="shelf-search-clear"
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>
          <div className="shelf-sort-pill">
            <span className="shelf-sort-label">Sort:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Sort movies"
            >
              <option value="recent">Recently added</option>
              <option value="title">Title</option>
              <option value="rating">Your rating</option>
            </select>
          </div>
          <div className="view-mode-toggle" role="group" aria-label="View mode">
            <button
              type="button"
              className={`view-mode-btn ${viewMode === "grid" ? "active" : ""}`}
              onClick={() => switchView("grid")}
              title="Grid view"
              aria-label="Grid view"
              aria-pressed={viewMode === "grid"}
            >
              <LayoutGrid size={17} />
            </button>
            <button
              type="button"
              className={`view-mode-btn ${viewMode === "list" ? "active" : ""}`}
              onClick={() => switchView("list")}
              title="Capsule list view"
              aria-label="Capsule list view"
              aria-pressed={viewMode === "list"}
            >
              <List size={17} />
            </button>
          </div>
        </div>
      </div>
      {!items.length ? (
        <Empty
          title={
            active.length
              ? "No matching movies"
              : "Your next chapter starts here"
          }
          text="Save a film from discovery, then track what you watch."
        />
      ) : viewMode === "grid" ? (
        <div className="shelf-grid">
          {items.map((item) => {
            const m = movieFromShelf(item);
            return (
              <article className="shelf-grid-card" key={item.movieKey}>
                <div className="shelf-card-poster-wrap">
                  <Link
                    to={`/movies/${m.source}/${m.sourceId}`}
                    className="shelf-card-poster-link"
                    aria-label={`View details for ${m.title}`}
                  >
                    <Poster movie={m} />
                  </Link>
                  <div className="shelf-card-poster-fade" aria-hidden="true" />
                  <div className="shelf-card-status-corner">
                    <span className="badge">{item.status}</span>
                  </div>
                  <div className="shelf-card-rating-corner" aria-label="Rating">
                    <Star size={13} fill="currentColor" />
                    <span>
                      {item.personal_rating
                        ? `${item.personal_rating * 2}/10`
                        : "?/10"}
                    </span>
                  </div>
                </div>

                <div className="shelf-card-body">
                  <div className="shelf-card-info">
                    <h3 className="shelf-card-title">
                      <Link to={`/movies/${m.source}/${m.sourceId}`}>{m.title}</Link>
                    </h3>
                    <p className="shelf-card-year">{m.year || "Year unavailable"}</p>
                  </div>

                  <div className="shelf-card-actions">
                    <button
                      type="button"
                      className="button shelf-edit-btn"
                      onClick={() => setEdit(item)}
                    >
                      <Pencil size={14} /> Edit
                    </button>
                    <button
                      type="button"
                      className="shelf-remove-bookmark-btn"
                      onClick={() => setRemove(item)}
                      title="Remove from shelf"
                      aria-label="Remove from shelf"
                    >
                      <Bookmark size={18} fill="currentColor" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="shelf-capsule-list">
          {items.map((item) => {
            const m = movieFromShelf(item);
            return (
              <article className="shelf-capsule-card" key={item.movieKey}>
                {m.posterUrl && (
                  <div
                    className="shelf-capsule-backdrop"
                    style={{ backgroundImage: `url(${m.posterUrl})` }}
                    aria-hidden="true"
                  />
                )}
                <div className="shelf-capsule-content">
                  <div className="shelf-capsule-title-row">
                    <h2>
                      <Link to={`/movies/${m.source}/${m.sourceId}`}>
                        {m.title}
                      </Link>
                    </h2>
                    <span className="shelf-capsule-rating">
                      <Star size={12} fill="currentColor" />
                      {item.personal_rating
                        ? `${item.personal_rating * 2}/10`
                        : "?/10"}
                    </span>
                  </div>
                  <div className="shelf-capsule-sub-row">
                    {m.year && <span className="shelf-capsule-year">{m.year}</span>}
                    <span className="badge">{item.status}</span>
                  </div>
                  {item.review && (
                    <p className="shelf-capsule-review">{item.review}</p>
                  )}
                  {item.lastError && (
                    <p className="error-text">{item.lastError}</p>
                  )}
                </div>
                <div className="shelf-capsule-actions">
                  <button
                    type="button"
                    className="button shelf-edit-btn"
                    onClick={() => setEdit(item)}
                  >
                    <Pencil size={14} /> Edit
                  </button>
                  <button
                    type="button"
                    className="shelf-remove-bookmark-btn"
                    onClick={() => setRemove(item)}
                    title="Remove from shelf"
                    aria-label="Remove from shelf"
                  >
                    <Bookmark size={18} fill="currentColor" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {queue.some((x) => x.operation === "delete") && (
        <p className="message">
          {queue.filter((x) => x.operation === "delete").length} removals
          pending.{" "}
          {queue
            .filter((x) => x.operation === "delete" && x.lastError)
            .map((x) => x.lastError)
            .join(" ")}
        </p>
      )}
      {edit && (
        <ShelfEditor
          item={edit}
          movie={movieFromShelf(edit)}
          onClose={() => setEdit(null)}
        />
      )}{" "}
      {remove && (
        <Confirm
          title="Remove from your shelf?"
          text="Your rating and review will be removed. The deletion will sync when connected."
          onClose={() => setRemove(null)}
          onConfirm={() => save(movieFromShelf(remove), {}, true)}
        />
      )}
    </>
  );
}
export function Contributions() {
  const { uid } = useApp();
  const [more, setMore] = useState({
    items: [],
    next: undefined,
    busy: false,
    error: "",
  });
  const result = useAsync(
    () =>
      uid
        ? customList({ uid })
        : Promise.reject(
            Error("Initialize your guest session to see your contributions."),
          ),
    [uid],
  );
  return (
    <>
      <div className="page-heading">
        <h1>My contributions</h1>
        <Link className="button primary" to="/movies/new">
          Add movie
        </Link>
      </div>
      {result.loading ? (
        <Loading />
      ) : result.error ? (
        <ErrorState message={result.error} retry={result.retry} />
      ) : result.data.items.length ? (
        <>
          <MovieGrid items={mergeMovies(result.data.items, more.items)} />
          {more.error && <ErrorState message={more.error} />}
          {(more.next === undefined ? result.data.next : more.next) !==
            null && (
            <button
              className="load-more"
              disabled={more.busy}
              onClick={async () => {
                setMore((s) => ({ ...s, busy: true, error: "" }));
                try {
                  const page = await customList({
                    uid,
                    offset:
                      more.next === undefined ? result.data.next : more.next,
                  });
                  setMore((s) => ({
                    items: mergeMovies(s.items, page.items),
                    next: page.next,
                    busy: false,
                    error: "",
                  }));
                } catch (e) {
                  setMore((s) => ({ ...s, busy: false, error: e.message }));
                }
              }}
            >
              {more.busy ? "Loading…" : "Load more contributions"}
            </button>
          )}
        </>
      ) : (
        <Empty
          title="Tell a story worth discovering"
          text="Your submitted films will appear here."
          action={false}
        />
      )}
    </>
  );
}
export function Profile() {
  const { shelf, queue, uid, authError, retryAuth, sync } = useApp();
  const active = shelf.filter((x) => !x.deleted);
  const rated = active.filter((x) => x.personal_rating);
  const author = [
    ["Name", import.meta.env.VITE_AUTHOR_NAME],
    ["NIM", import.meta.env.VITE_AUTHOR_NIM],
    ["Group", import.meta.env.VITE_AUTHOR_GROUP],
  ];

  const avgRating10 = rated.length
    ? ((rated.reduce((n, x) => n + x.personal_rating, 0) / rated.length) * 2).toFixed(1)
    : null;

  return (
    <div className="profile-container">
      <div className="page-heading profile-page-heading">
        <div>
          <h1>Behind the screen</h1>
          <p className="muted">
            Assignment author profile & your private guest collection.
          </p>
        </div>
      </div>

      <section className="panel profile-author-card">
        <div className="profile-author-badge">
          <ShieldCheck size={14} /> Assignment Author
        </div>
        <div className="profile-author-body">
          <div className="profile-author-logo-wrap">
            <img src="/icons/logo.svg" alt="" className="profile-author-logo" />
          </div>
          <div className="profile-author-details">
            <h2>{import.meta.env.VITE_AUTHOR_NAME || "MUHAMMAD_REKA_FAKHREZI"}</h2>
            <p className="profile-author-course">Responsi Modul 5 · Teknik Komputer</p>
            <dl className="profile-author-dl">
              {author.map(([label, value]) => (
                <div key={label} className="profile-author-dl-row">
                  <dt>{label}</dt>
                  <dd>
                    {value || (
                      <span className="warning">
                        Not configured — set VITE_AUTHOR_{label.toUpperCase()}
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="profile-shelf-section">
        <div className="profile-shelf-header">
          <div>
            <h2>Your private guest shelf</h2>
            <p className="muted">Saved on this device and synced with your anonymous session.</p>
          </div>
          <div className="profile-shelf-actions">
            <Link className="button primary" to="/shelf">
              <Bookmark size={15} /> Open shelf
            </Link>
            <Link className="button" to="/contributions">
              <Film size={15} /> My contributions
            </Link>
          </div>
        </div>

        <div className="profile-stats-grid">
          <div className="profile-stat-box">
            <div className="stat-icon-wrap saved">
              <Bookmark size={18} />
            </div>
            <div className="stat-text-wrap">
              <strong>{active.length}</strong>
              <span>Saved</span>
            </div>
          </div>
          <div className="profile-stat-box">
            <div className="stat-icon-wrap planned">
              <Clock size={18} />
            </div>
            <div className="stat-text-wrap">
              <strong>{active.filter((x) => x.status === "planned").length}</strong>
              <span>Planned</span>
            </div>
          </div>
          <div className="profile-stat-box">
            <div className="stat-icon-wrap watching">
              <PlayCircle size={18} />
            </div>
            <div className="stat-text-wrap">
              <strong>{active.filter((x) => x.status === "watching").length}</strong>
              <span>Watching</span>
            </div>
          </div>
          <div className="profile-stat-box">
            <div className="stat-icon-wrap completed">
              <CheckCircle2 size={18} />
            </div>
            <div className="stat-text-wrap">
              <strong>{active.filter((x) => x.status === "completed").length}</strong>
              <span>Completed</span>
            </div>
          </div>
          <div className="profile-stat-box">
            <div className="stat-icon-wrap rating">
              <Star size={18} fill="currentColor" />
            </div>
            <div className="stat-text-wrap">
              <strong>{avgRating10 ? `${avgRating10}/10` : "Not rated"}</strong>
              <span>Average rating</span>
            </div>
          </div>
        </div>
      </section>

      <div className="profile-sub-grid">
        <section className="panel profile-device-panel">
          <div className="profile-panel-title">
            <User size={18} className="muted" />
            <h3>On this device</h3>
          </div>
          <p className="profile-device-identity">
            {uid ? (
              <span className="status-badge-inline online">● Guest identity active</span>
            ) : (
              <span className="status-badge-inline offline">○ Identity initializing</span>
            )}
            {" · "}
            {queue.length ? `${queue.length} pending sync` : "Fully synced"}
          </p>
          {authError && <ErrorState message={authError} retry={retryAuth} />}
          <div className="profile-sync-action">
            <button
              type="button"
              className="button"
              onClick={() => sync(true)}
              aria-label="Retry synchronization"
            >
              <RefreshCw size={14} /> Retry synchronization
            </button>
          </div>
          <p className="muted profile-device-note">
            Your guest identity belongs to this browser. Clearing site data removes access to your private shelf and contributions. Browser storage can be evicted; offline changes need a connection to reach the cloud.
          </p>
        </section>

        <section className="panel profile-credits-panel">
          <div className="profile-panel-title">
            <Award size={18} className="muted" />
            <h3>Credits & Compliance</h3>
          </div>
          <a
            href="https://www.themoviedb.org"
            target="_blank"
            rel="noreferrer"
            className="profile-tmdb-link"
          >
            <img
              src="/images/tmdb-logo.svg"
              alt="TMDB"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <span>The Movie Database</span>
            <ExternalLink size={13} className="muted" />
          </a>
          <p className="profile-tmdb-notice">
            This product uses the TMDB API but is not endorsed or certified by TMDB.
          </p>
          <p className="muted profile-credits-note">
            TMDB supplies film metadata and source ratings. Community films belong to their contributors. Personal ratings are private. CineTrack does not stream movies.
          </p>
          <div className="profile-version-tag">
            <small>CineTrack 1.0.0 · PWA Ready</small>
          </div>
        </section>
      </div>
    </div>
  );
}
