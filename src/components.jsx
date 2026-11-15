import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, Check, Film, Search, Star, X } from "lucide-react";
import { useApp } from "./hooks.jsx";
import { moviePath, statuses } from "./domain/movie.js";
import { queryCatalog } from "./repositories/catalog.js";
import { tmdbList } from "./services/tmdb.js";
import { cacheMovieMeta } from "./repositories/metaCache.js";
export function Poster({ movie, ...props }) {
  return (
    <img
      src={movie.posterUrl || "/images/poster.svg"}
      alt={`${movie.title} poster`}
      loading="lazy"
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = "/images/poster.svg";
      }}
      {...props}
    />
  );
}
export function ErrorState({ message, retry }) {
  return (
    <div className="message error" role="alert">
      <p>{message}</p>
      {retry && <button onClick={retry}>Try again</button>}
    </div>
  );
}
export function Empty({
  title = "Nothing here yet",
  text = "Find your next film and make it part of your shelf.",
  action = true,
}) {
  return (
    <div className="empty">
      <Film size={40} />
      <h2>{title}</h2>
      <p>{text}</p>
      {action && (
        <Link className="button primary" to="/explore">
          Explore movies
        </Link>
      )}
    </div>
  );
}
export function Loading() {
  return (
    <div className="grid" aria-busy="true" aria-label="Loading movies">
      {Array.from({ length: 4 }, (_, i) => (
        <div className="skeleton card-skeleton" key={i} />
      ))}
    </div>
  );
}
export function DetailSkeleton() {
  return (
    <div
      className="detail-skeleton"
      aria-busy="true"
      aria-label="Loading movie details"
    >
      <div className="skeleton skeleton-back" />
      <div className="detail skeleton-detail-container">
        <div className="detail-poster-skeleton skeleton" />
        <div className="detail-info-skeleton">
          <div className="skeleton badge-skeleton" />
          <div className="skeleton title-skeleton" />
          <div className="skeleton meta-skeleton" />
          <div className="skeleton rating-skeleton" />
          <div className="skeleton-tags">
            <div className="skeleton tag-skeleton" />
            <div className="skeleton tag-skeleton" />
            <div className="skeleton tag-skeleton" />
          </div>
          <div className="skeleton-synopsis">
            <div className="skeleton line-skeleton" style={{ width: "100%" }} />
            <div className="skeleton line-skeleton" style={{ width: "95%" }} />
            <div className="skeleton line-skeleton" style={{ width: "90%" }} />
            <div className="skeleton line-skeleton" style={{ width: "65%" }} />
          </div>
          <div className="skeleton-actions">
            <div className="skeleton button-skeleton" />
            <div className="skeleton button-skeleton" />
          </div>
        </div>
      </div>
    </div>
  );
}
export function Source({ movie }) {
  return (
    <span className={`badge ${movie.source}`}>
      {movie.source === "tmdb" ? "TMDB" : "Community"}
    </span>
  );
}
export function AddShelf({ movie, className = "" }) {
  const { shelf, save, notify, uid } = useApp();
  const [busy, setBusy] = useState(false);
  const existing = shelf.find((x) => x.movieKey === movie.key && !x.deleted);
  const btnClass = ["button", className].filter(Boolean).join(" ");
  return existing ? (
    <Link className={btnClass} to="/shelf">
      <Check size={17} /> In shelf
    </Link>
  ) : (
    <button
      className={btnClass}
      disabled={busy || !uid || movie.deleted}
      onClick={async () => {
        setBusy(true);
        try {
          cacheMovieMeta(movie);
          await save(movie);
        } catch (e) {
          notify(e.message);
        } finally {
          setBusy(false);
        }
      }}
      aria-label={`Add ${movie.title} to shelf`}
    >
      <Bookmark size={17} />
      {busy ? "Saving…" : "Add to shelf"}
    </button>
  );
}
export function MovieCard({ movie }) {
  useEffect(() => {
    cacheMovieMeta(movie);
  }, [movie]);
  return (
    <article className="movie-card">
      <Link className="poster-link" to={moviePath(movie)}>
        <Poster movie={movie} />
      </Link>
      <div className="card-meta">
        <Source movie={movie} />
        {movie.tmdbRating != null && (
          <span className="rating">
            <Star size={13} />
            {movie.tmdbRating.toFixed(1)}
          </span>
        )}
      </div>
      <div className="card-info">
        <h3>
          <Link to={moviePath(movie)}>{movie.title}</Link>
        </h3>
        <p className="muted">{movie.year || "Year unavailable"}</p>
      </div>
      <AddShelf movie={movie} />
    </article>
  );
}
export function MovieGrid({ items, row = false }) {
  const rowRef = useRef(null);
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const hasDragged = useRef(false);

  const onMouseDown = (e) => {
    if (!row || !rowRef.current) return;
    if (e.target.closest("button, a")) return;
    isDown.current = true;
    hasDragged.current = false;
    startX.current = e.pageX - rowRef.current.offsetLeft;
    scrollLeft.current = rowRef.current.scrollLeft;
    rowRef.current.classList.add("dragging");
  };

  const onMouseLeave = () => {
    if (!row || !rowRef.current) return;
    isDown.current = false;
    rowRef.current.classList.remove("dragging");
  };

  const onMouseUp = () => {
    if (!row || !rowRef.current) return;
    isDown.current = false;
    rowRef.current.classList.remove("dragging");
  };

  const onMouseMove = (e) => {
    if (!isDown.current || !rowRef.current) return;
    e.preventDefault();
    const x = e.pageX - rowRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    if (Math.abs(x - startX.current) > 6) {
      hasDragged.current = true;
    }
    rowRef.current.scrollLeft = scrollLeft.current - walk;
  };

  const onClickCapture = (e) => {
    if (hasDragged.current) {
      e.preventDefault();
      e.stopPropagation();
      hasDragged.current = false;
    }
  };

  return (
    <div
      ref={rowRef}
      className={row ? "movie-row" : "grid"}
      tabIndex={row ? 0 : undefined}
      aria-label={row ? "Movie list; drag horizontally to scroll" : undefined}
      onMouseDown={row ? onMouseDown : undefined}
      onMouseLeave={row ? onMouseLeave : undefined}
      onMouseUp={row ? onMouseUp : undefined}
      onMouseMove={row ? onMouseMove : undefined}
      onClickCapture={row ? onClickCapture : undefined}
    >
      {items.map((m) => (
        <MovieCard key={m.key} movie={m} />
      ))}
    </div>
  );
}
export function Dialog({ title, children, onClose }) {
  const ref = useRef();
  useEffect(() => {
    const el = ref.current;
    const previous = document.activeElement;
    el.showModal();
    return () => {
      el.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog ref={ref} onCancel={onClose} aria-labelledby="dialog-title">
      <div className="section-heading">
        <h2 id="dialog-title">{title}</h2>
        <button aria-label="Close dialog" onClick={onClose}>
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Confirm({ title, text, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Dialog title={title} onClose={() => !busy && onClose()}>
      <p>{text}</p>
      {error && <ErrorState message={error} />}
      <div className="actions">
        <button autoFocus disabled={busy} onClick={onClose}>
          Cancel
        </button>
        <button
          className="danger"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
              onClose();
            } catch (e) {
              setError(e.message);
              setBusy(false);
            }
          }}
        >
          {busy ? "Removing…" : "Remove movie"}
        </button>
      </div>
    </Dialog>
  );
}
export function ShelfEditor({ item, movie, onClose }) {
  const { save } = useApp();
  const [form, setForm] = useState({
    status: item.status,
    personal_rating: item.personal_rating,
    review: item.review,
  });
  const [rating10, setRating10] = useState(
    item.personal_rating ? String(item.personal_rating * 2) : "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Dialog title={`Edit ${movie.title}`} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await save(movie, form);
            onClose();
          } catch (err) {
            setError(err.message);
            setBusy(false);
          }
        }}
      >
        <label>
          Status
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Your rating
          <div className="rating-input-row">
            <input
              type="number"
              min="1"
              max="10"
              step="1"
              className="rating-score-box"
              placeholder="—"
              value={rating10}
              onChange={(e) => {
                const val = e.target.value;
                setRating10(val);
                if (val === "" || val === null) {
                  setForm({ ...form, personal_rating: null });
                } else {
                  const num = Math.min(10, Math.max(1, parseInt(val, 10) || 1));
                  const mapped5 = Math.min(5, Math.max(1, Math.round(num / 2)));
                  setForm({ ...form, personal_rating: mapped5 });
                }
              }}
              aria-label="Rating out of 10"
            />
            <span className="rating-slash">/</span>
            <div className="rating-scale-box">10</div>
          </div>
        </label>
        <label>
          Your review
          <textarea
            value={form.review}
            maxLength={1000}
            onChange={(e) => setForm({ ...form, review: e.target.value })}
          />
          <small>{form.review.length}/1000</small>
        </label>
        {error && <ErrorState message={error} />}
        <div className="actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "Saving…" : "Save on device"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export function SearchModal({ open, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setLoading(false);
      return;
    }
    const t = setTimeout(() => {
      inputRef.current?.focus();
    }, 60);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (recommended.length > 0) return;
    let cancelled = false;
    tmdbList("trending", { page: 1 })
      .then((res) => {
        if (!cancelled && res?.items) {
          setRecommended(res.items.slice(0, 8));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, recommended.length]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await queryCatalog({
          query: query.trim(),
          signal: controller.signal,
        });
        setResults(res.items.slice(0, 10));
      } catch (err) {
        if (err.name !== "AbortError" && err.code !== "ERR_CANCELED") {
          // ignore
        }
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, open]);

  if (!open) return null;

  return (
    <div
      className="search-modal-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="search-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Search movies"
      >
        <div className="search-sheet-handle" />
        <div className="search-modal-header">
          <Search size={18} className="search-modal-icon" />
          <input
            ref={inputRef}
            type="text"
            className="search-modal-input"
            placeholder="Search films, TMDB & community…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={100}
            aria-label="Search film title"
          />
          {query && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Clear search input"
            >
              <X size={16} />
            </button>
          )}
          <button
            type="button"
            className="search-modal-close"
            onClick={onClose}
            aria-label="Close search"
          >
            <X size={18} />
          </button>
        </div>

        <div className="search-modal-body">
          {loading && (
            <div className="search-loading" aria-live="polite">
              <div className="search-spinner" />
              <span>Searching films…</span>
            </div>
          )}

          {!loading && query.trim() && results.length === 0 && (
            <div className="search-empty">
              <Film size={36} className="muted" />
              <p>No films found for &ldquo;{query}&rdquo;</p>
              <small>Try a different keyword or check spelling</small>
            </div>
          )}

          {!loading && !query.trim() && (
            <div className="search-recommendations">
              <div className="search-section-header">
                <strong>Recommended & Trending Now</strong>
              </div>
              {recommended.length > 0 ? (
                <ul className="search-results-list" role="listbox">
                  {recommended.map((movie) => (
                    <li key={movie.key} role="option" aria-selected="false">
                      <Link
                        to={moviePath(movie)}
                        className="search-result-item"
                        onClick={onClose}
                      >
                        <img
                          src={movie.posterUrl || "/images/poster.svg"}
                          alt=""
                          className="search-result-poster"
                          loading="lazy"
                        />
                        <div className="search-result-info">
                          <div className="search-result-title-row">
                            <strong className="search-result-title">{movie.title}</strong>
                            <Source movie={movie} />
                          </div>
                          <div className="search-result-meta">
                            {movie.year && <span>{movie.year}</span>}
                            {movie.tmdbRating ? (
                              <span className="search-result-rating">
                                <Star size={13} fill="currentColor" /> {movie.tmdbRating.toFixed(1)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="search-prompt">
                  <Film size={32} className="muted" />
                  <p>Type a movie title to search TMDB and community films</p>
                </div>
              )}
            </div>
          )}

          {results.length > 0 && (
            <ul className="search-results-list" role="listbox">
              {results.map((movie) => (
                <li key={movie.key} role="option" aria-selected="false">
                  <Link
                    to={moviePath(movie)}
                    className="search-result-item"
                    onClick={onClose}
                  >
                    <img
                      src={movie.posterUrl || "/images/poster.svg"}
                      alt=""
                      className="search-result-poster"
                      loading="lazy"
                    />
                    <div className="search-result-info">
                      <div className="search-result-title-row">
                        <strong className="search-result-title">{movie.title}</strong>
                        <Source movie={movie} />
                      </div>
                      <div className="search-result-meta">
                        {movie.year && <span>{movie.year}</span>}
                        {movie.rating ? (
                          <span className="search-result-rating">
                            <Star size={13} fill="currentColor" /> {movie.rating.toFixed(1)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
