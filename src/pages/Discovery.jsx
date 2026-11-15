import { useEffect, useRef, useState } from "react";
import {
  Link,
  useSearchParams,
  useParams,
  useNavigate,
} from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Search, Star } from "lucide-react";
import { tmdb, tmdbList } from "../services/tmdb.js";
import { customList, customDetail, deleteCustom } from "../services/custom.js";
import { queryCatalog } from "../repositories/catalog.js";
import {
  genres,
  mergeMovies,
  moviePath,
  normalizeTmdbMovie,
  validReference,
} from "../domain/movie.js";
import { useApp, useAsync } from "../hooks.jsx";
import {
  Loading,
  DetailSkeleton,
  ErrorState,
  Empty,
  MovieGrid,
  Poster,
  Source,
  AddShelf,
  Confirm,
} from "../components.jsx";
function Section({ title, endpoint, community = false, onHero }) {
  const result = useAsync(
    (signal) =>
      community ? customList({ signal }) : tmdbList(endpoint, {}, signal),
    [endpoint, community],
  );
  useEffect(() => {
    if (onHero && result.data?.items) {
      const slides = result.data.items.filter((m) => m.backdropUrl).slice(0, 5);
      if (slides.length) onHero(slides);
    }
  }, [result.data, onHero]);
  return (
    <section>
      <div className="section-heading">
        <h2>{title}</h2>
        <a href="#catalog" className="see-all-link">
          See all
        </a>
      </div>
      {result.loading ? (
        <Loading />
      ) : result.error ? (
        community ? (
          <div className="community-notice">
            <p className="muted">
              Community films will appear here once submitted. (Database table pending setup in Supabase).
            </p>
          </div>
        ) : (
          <ErrorState message={result.error} retry={result.retry} />
        )
      ) : result.data.items.length ? (
        <MovieGrid items={result.data.items} row />
      ) : (
        <Empty
          title="The community starts with you"
          text="Add a missing film to the catalog."
          action={false}
        />
      )}
    </section>
  );
}
export function Home() {
  const [slides, setSlides] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const dragStartX = useRef(null);
  const dragStartY = useRef(null);
  const isHeroDragging = useRef(false);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [slides.length]);

  const hero = slides[currentIndex] || slides[0] || null;

  const nextSlide = () => {
    if (slides.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }
  };

  const prevSlide = () => {
    if (slides.length > 1) {
      setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
    }
  };

  const handleHeroMouseDown = (e) => {
    if (e.button !== 0 || e.target.closest("button, a")) return;
    dragStartX.current = e.clientX;
    dragStartY.current = e.clientY;
    isHeroDragging.current = true;
  };

  const handleHeroMouseUp = (e) => {
    if (!isHeroDragging.current || dragStartX.current === null) return;
    const diffX = e.clientX - dragStartX.current;
    const diffY = Math.abs(e.clientY - (dragStartY.current || 0));
    isHeroDragging.current = false;
    dragStartX.current = null;
    if (Math.abs(diffX) > 40 && Math.abs(diffX) > diffY) {
      if (diffX < 0) nextSlide();
      else prevSlide();
    }
  };

  const handleHeroTouchStart = (e) => {
    if (e.target.closest("button, a")) return;
    dragStartX.current = e.touches[0].clientX;
    dragStartY.current = e.touches[0].clientY;
  };

  const handleHeroTouchEnd = (e) => {
    if (dragStartX.current === null) return;
    const touch = e.changedTouches[0];
    const diffX = touch.clientX - dragStartX.current;
    const diffY = Math.abs(touch.clientY - (dragStartY.current || 0));
    dragStartX.current = null;
    if (Math.abs(diffX) > 40 && Math.abs(diffX) > diffY) {
      if (diffX < 0) nextSlide();
      else prevSlide();
    }
  };

  return (
    <>
      <div
        className={`hero ${hero ? "has-backdrop" : ""}`}
        style={
          hero
            ? {
                backgroundImage: `linear-gradient(180deg, rgba(11,16,25,0.15) 0%, rgba(11,16,25,0.7) 65%, #0b1019 100%), linear-gradient(90deg, rgba(11,16,25,0.96) 0%, rgba(11,16,25,0.65) 50%, rgba(11,16,25,0.15) 100%), url("${hero.backdropUrl}")`,
              }
            : undefined
        }
        onMouseDown={handleHeroMouseDown}
        onMouseUp={handleHeroMouseUp}
        onTouchStart={handleHeroTouchStart}
        onTouchEnd={handleHeroTouchEnd}
      >
        <div className="hero-content">
          <p className="hero-tagline">Trending now</p>
          <div className="hero-title-row">
            <h1 className="hero-title">{hero?.title || "A life in movies."}</h1>
            {hero?.tmdbRating != null && (
              <div className="hero-title-rating">
                <Star size={17} fill="currentColor" />
                <span>{hero.tmdbRating.toFixed(1)} / 10</span>
              </div>
            )}
          </div>
          {hero?.year && <p className="hero-year">{hero.year}</p>}
          <p className="hero-synopsis">
            {hero?.synopsis ||
              "Discover something remarkable. Give an independent film its audience. Keep every watch in one place."}
          </p>
          <div className="actions hero-actions">
            <Link
              className="button primary hero-button"
              to={hero ? moviePath(hero) : "/shelf"}
            >
              {hero ? "View details" : "My shelf"}
            </Link>
            {hero && <AddShelf movie={hero} className="hero-button" />}
          </div>
        </div>

        {slides.length > 1 && (
          <>
            <button
              type="button"
              className="hero-arrow prev"
              onClick={prevSlide}
              aria-label="Previous slide"
            >
              <ChevronLeft size={44} strokeWidth={2.4} />
            </button>
            <button
              type="button"
              className="hero-arrow next"
              onClick={nextSlide}
              aria-label="Next slide"
            >
              <ChevronRight size={44} strokeWidth={2.4} />
            </button>
            <div className="hero-dots" aria-label="Hero slides">
              {slides.map((s, idx) => (
                <button
                  key={s.key || idx}
                  type="button"
                  className={`hero-dot ${idx === currentIndex ? "active" : ""}`}
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`Go to slide ${idx + 1}: ${s.title}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
      <Section
        title="Trending this week"
        endpoint="trending"
        onHero={setSlides}
      />
      <Section title="Top rated" endpoint="top_rated" />
      <CatalogSection />
    </>
  );
}

export function CatalogSection() {
  const [source, setSource] = useState("all");
  const [genre, setGenre] = useState("");
  const [sort, setSort] = useState("popular");
  const [state, setState] = useState({
    items: [],
    errors: [],
    loading: true,
    next: { tmdb: 1, custom: 0 },
  });
  const controller = useRef();
  const generation = useRef(0);

  const change = (key, value) => {
    if (key === "source") setSource(value);
    if (key === "genre") setGenre(value);
    if (key === "sort") setSort(value);
  };

  const load = async (reset = false) => {
    controller.current?.abort();
    const c = new AbortController();
    controller.current = c;
    const gen = ++generation.current;
    setState((s) => ({
      ...s,
      loading: true,
      ...(reset ? { items: [], errors: [] } : {}),
    }));
    try {
      const data = await queryCatalog({
        source,
        genre,
        sort,
        cursors: reset ? { tmdb: 1, custom: 0 } : state.next,
        signal: c.signal,
      });
      if (!c.signal.aborted && gen === generation.current) {
        setState((s) => ({
          ...data,
          items: reset ? data.items : mergeMovies(s.items, data.items),
          loading: false,
        }));
      }
    } catch (e) {
      if (!c.signal.aborted) {
        setState((s) => ({ ...s, loading: false, errors: [e.message] }));
      }
    }
  };

  useEffect(() => {
    load(true);
    return () => controller.current?.abort(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, genre, sort]);

  const more =
    (source !== "custom" && state.next.tmdb !== null) ||
    (source !== "tmdb" && state.next.custom !== null);

  return (
    <section className="catalog-section" id="catalog">
      <div className="section-heading">
        <div>
          <h2>Discover & Community Catalog</h2>
          <p className="muted">
            Big-screen favorites from TMDB combined with independent stories from the community.
          </p>
        </div>
      </div>
      <div className="filters">
        <div className="filter-row">
          <div className="segmented">
            {[
              ["all", "All films"],
              ["tmdb", "TMDB"],
              ["custom", "Community"],
            ].map(([v, t]) => (
              <button
                key={v}
                type="button"
                aria-pressed={source === v}
                onClick={() => change("source", v)}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="filter-selects">
            <div className="select-pill">
              <label htmlFor="genre-select">Genre</label>
              <select
                id="genre-select"
                value={genre}
                onChange={(e) => change("genre", e.target.value)}
              >
                <option value="">All genres</option>
                {Object.entries(genres).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            {source !== "custom" && (
              <div className="select-pill">
                <label htmlFor="sort-select">TMDB order</label>
                <select
                  id="sort-select"
                  value={sort}
                  disabled={!!genre}
                  onChange={(e) => change("sort", e.target.value)}
                >
                  <option value="popular">Popular</option>
                  <option value="top_rated">Top rated</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>
      {state.stale && (
        <p className="message">
          Offline: showing previously saved community movies.
        </p>
      )}
      {state.errors.length > 0 && state.items.length > 0 ? (
        <div className="partial-warning" role="status">
          <span>⚠️ {state.errors.join(" · ")}</span>
          <button type="button" onClick={() => load(false)}>Retry</button>
        </div>
      ) : (
        state.errors.map((e) => (
          <ErrorState key={e} message={e} retry={() => load(false)} />
        ))
      )}
      {state.items.length > 0 && <MovieGrid items={state.items} />}
      {!state.loading && state.items.length === 0 && (
        <Empty
          title="No films found"
          text="Try picking another genre or explore community films."
          action={false}
        />
      )}
      {state.loading && <Loading />}
      {more && (
        <div className="load-more">
          <button
            type="button"
            className="button"
            disabled={state.loading}
            onClick={() => load(false)}
          >
            {state.loading ? "Loading…" : "Load more films"}
          </button>
        </div>
      )}
    </section>
  );
}
export function Explore() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") || "";
  const source = params.get("source") || "all";
  const genre = params.get("genre") || "";
  const sort = params.get("sort") || "popular";
  const [input, setInput] = useState(query);
  const [state, setState] = useState({
    items: [],
    errors: [],
    loading: true,
    next: { tmdb: 1, custom: 0 },
  });
  const controller = useRef();
  const generation = useRef(0);
  useEffect(() => {
    setInput(query);
  }, [query]);
  useEffect(() => {
    if (input === query) return;
    const timer = setTimeout(
      () =>
        setParams(
          (p) => {
            const next = new URLSearchParams(p);
            input ? next.set("q", input) : next.delete("q");
            return next;
          },
          { replace: true },
        ),
      300,
    );
    return () => clearTimeout(timer);
  }, [input, query, setParams]);
  const change = (key, value) =>
    setParams((p) => {
      const next = new URLSearchParams(p);
      value ? next.set(key, value) : next.delete(key);
      return next;
    });
  const load = async (reset = false) => {
    controller.current?.abort();
    const c = new AbortController();
    controller.current = c;
    const gen = ++generation.current;
    setState((s) => ({
      ...s,
      loading: true,
      ...(reset ? { items: [], errors: [] } : {}),
    }));
    try {
      const data = await queryCatalog({
        query,
        source,
        genre,
        sort,
        cursors: reset ? { tmdb: 1, custom: 0 } : state.next,
        signal: c.signal,
      });
      if (!c.signal.aborted && gen === generation.current)
        setState((s) => ({
          ...data,
          items: reset ? data.items : mergeMovies(s.items, data.items),
          loading: false,
        }));
    } catch (e) {
      if (!c.signal.aborted)
        setState((s) => ({ ...s, loading: false, errors: [e.message] }));
    }
  };
  useEffect(() => {
    load(true);
    return () => controller.current?.abort(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, source, genre, sort]);
  const more =
    (source !== "custom" && state.next.tmdb !== null) ||
    (source !== "tmdb" && state.next.custom !== null);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Discover movies</h1>
          <p className="muted">
            Big-screen favorites. Stories from the community.
          </p>
        </div>
        <Link className="button primary" to="/movies/new">
          <Plus size={18} /> Add movie
        </Link>
      </div>
      <div className="filters">
        <label className="search">
          <Search size={20} />
          <input
            aria-label="Search movies"
            maxLength={100}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search a title…"
          />
          {input && <button onClick={() => setInput("")}>Clear</button>}
        </label>
        <div className="filter-row">
          <div className="segmented">
            {[
              ["all", "All films"],
              ["tmdb", "TMDB"],
              ["custom", "Community"],
            ].map(([v, t]) => (
              <button
                key={v}
                aria-pressed={source === v}
                onClick={() => change("source", v)}
              >
                {t}
              </button>
            ))}
          </div>
          <label>
            Genre
            <select
              value={genre}
              onChange={(e) => change("genre", e.target.value)}
            >
              <option value="">All genres</option>
              {Object.entries(genres).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          {source !== "custom" && (
            <label>
              TMDB order
              <select
                value={sort}
                disabled={!!query || !!genre}
                onChange={(e) => change("sort", e.target.value)}
              >
                <option value="popular">Popular</option>
                <option value="top_rated">Top rated</option>
              </select>
            </label>
          )}
        </div>
      </div>
      <p className="muted">
        Community films are newest first; sources are combined page by page.
        {query && genre
          ? " Genre filtering applies to each loaded TMDB search page."
          : ""}
      </p>
      {state.stale && (
        <p className="message">
          Offline: showing previously saved community movies.
        </p>
      )}
      {state.errors.length > 0 && state.items.length > 0 ? (
        <div className="partial-warning" role="status">
          <span>⚠️ {state.errors.join(" · ")}</span>
          <button onClick={() => load(false)}>Retry</button>
        </div>
      ) : (
        state.errors.map((e) => (
          <ErrorState key={e} message={e} retry={() => load(false)} />
        ))
      )}
      {state.items.length > 0 && <MovieGrid items={state.items} />}{" "}
      {state.loading ? (
        <Loading />
      ) : !state.items.length && !state.errors.length ? (
        <Empty
          title="No movies found"
          text="Try another title or add a missing film."
          action={false}
        />
      ) : null}
      {!state.loading && more && (
        <button className="load-more" onClick={() => load(false)}>
          Load more
        </button>
      )}
    </>
  );
}
export function MovieDetail() {
  const { source, id } = useParams();
  const { uid, shelf } = useApp();
  const navigate = useNavigate();
  const [remove, setRemove] = useState(false);
  const result = useAsync(
    async (signal) => {
      if (!validReference(source, id)) throw Error("Invalid movie reference.");
      return source === "tmdb"
        ? normalizeTmdbMovie(await tmdb("detail", { id }, signal))
        : customDetail(id, signal);
    },
    [source, id],
  );
  if (result.loading) return <DetailSkeleton />;
  if (result.error) {
    const saved = shelf.find(
      (x) => x.movieKey === `${source}:${id}` && !x.deleted,
    );
    return (
      <>
        <ErrorState message={result.error} retry={result.retry} />
        {saved && (
          <div className="panel">
            <h1>{saved.snapshot?.title || `TMDB movie #${id}`}</h1>
            <p>This movie is unavailable. Your shelf entry is still safe.</p>
            <Link to="/shelf">Edit your shelf entry</Link>
          </div>
        )}
      </>
    );
  }
  const m = result.data;
  return (
    <>
      <Link className="back" to="/explore">
        <ArrowLeft size={18} /> Back to discovery
      </Link>
      <div
        className="detail"
        style={
          m.backdropUrl
            ? {
                backgroundImage: `linear-gradient(rgba(11,16,25,.75),#0b1019),url("${m.backdropUrl}")`,
              }
            : undefined
        }
      >
        <Poster movie={m} />
        <div>
          <Source movie={m} />
          <h1>{m.title}</h1>
          <p className="muted">
            {[m.year, m.runtime ? `${m.runtime} min` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {m.tmdbRating != null && (
            <p className="rating">
              ★ {m.tmdbRating.toFixed(1)} TMDB · {m.voteCount} votes
            </p>
          )}
          <div className="tags">
            {m.genreIds.map((g) => (
              <span className="badge" key={g}>
                {genres[g] || g}
              </span>
            ))}
          </div>
          <p className="synopsis">{m.synopsis || "No synopsis available."}</p>
          {m.stale && <p className="message">Saved content, viewed offline.</p>}
          <div className="actions">
            <AddShelf movie={m} className="detail-button" />
            {m.trailerUrl && (
              <a
                className="button detail-button"
                href={m.trailerUrl}
                target="_blank"
                rel="noreferrer"
              >
                Watch trailer on YouTube
              </a>
            )}
            {m.ownerId === uid && (
              <>
                <Link className="button detail-button" to={`/movies/custom/${id}/edit`}>
                  Edit movie
                </Link>
                <button className="button danger detail-button" onClick={() => setRemove(true)}>
                  Remove movie
                </button>
              </>
            )}
          </div>
          {m.director && (
            <p>
              <strong>Director</strong>
              <br />
              {m.director}
            </p>
          )}
          {m.cast.length > 0 && (
            <p>
              <strong>Cast</strong>
              <br />
              {m.cast.join(", ")}
            </p>
          )}
        </div>
      </div>
      {remove && (
        <Confirm
          title="Remove contribution?"
          text="Remove this movie from the community catalog? Existing shelf entries may keep a reference."
          onClose={() => setRemove(false)}
          onConfirm={async () => {
            await deleteCustom(uid, id);
            navigate("/contributions");
          }}
        />
      )}
    </>
  );
}
