import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Dices,
  RotateCcw,
  Star,
  Sparkles,
  Film,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { tmdbList } from "../services/tmdb.js";
import { customList } from "../services/custom.js";
import { genres, moviePath } from "../domain/movie.js";
import { AddShelf } from "../components.jsx";
import { useApp } from "../hooks.jsx";

const POPULAR_GENRES = [
  { id: "", name: "All Genres" },
  { id: "28", name: "Action" },
  { id: "35", name: "Comedy" },
  { id: "18", name: "Drama" },
  { id: "27", name: "Horror" },
  { id: "878", name: "Sci-Fi" },
  { id: "16", name: "Animation" },
  { id: "10749", name: "Romance" },
  { id: "53", name: "Thriller" },
  { id: "12", name: "Adventure" },
  { id: "14", name: "Fantasy" },
  { id: "9648", name: "Mystery" },
  { id: "80", name: "Crime" },
  { id: "10751", name: "Family" },
];

export function Roulette() {
  const { online, shelf } = useApp();
  const [selectedGenre, setSelectedGenre] = useState("");
  const [spinning, setSpinning] = useState(false);
  const [currentMovie, setCurrentMovie] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [previewTitle, setPreviewTitle] = useState("");
  const spinInterval = useRef(null);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (spinInterval.current) clearInterval(spinInterval.current);
    };
  }, []);

  const spin = async () => {
    if (spinning) return;
    setError(null);
    setSpinning(true);

    // Fast cycling placeholder titles while spinning
    const placeholderNames = [
      "Inception",
      "Interstellar",
      "Spirited Away",
      "Parasite",
      "The Dark Knight",
      "Pulp Fiction",
      "Whiplash",
      "Spider-Man",
      "Dune",
      "La La Land",
      "Alien",
      "Blade Runner",
    ];
    let cycleIdx = 0;
    spinInterval.current = setInterval(() => {
      cycleIdx = (cycleIdx + 1) % placeholderNames.length;
      setPreviewTitle(placeholderNames[cycleIdx]);
    }, 100);

    try {
      let pool = [];

      if (online) {
        // Fetch from TMDB using a random page (1 to 8) to get high variety
        const randomPage = Math.floor(Math.random() * 8) + 1;
        const endpoint = selectedGenre ? "discover" : "popular";
        const params = {
          page: randomPage,
          ...(selectedGenre ? { genre: selectedGenre } : {}),
        };

        const jobs = [tmdbList(endpoint, params).catch(() => null)];

        // Also fetch community picks matching genre
        jobs.push(
          customList({
            genre: selectedGenre,
            offset: 0,
          }).catch(() => null),
        );

        const results = await Promise.all(jobs);
        const tmdbData = results[0];
        const customData = results[1];

        if (tmdbData?.items?.length) {
          pool.push(...tmdbData.items);
        }
        if (customData?.items?.length) {
          pool.push(...customData.items);
        }
      }

      // If online fetch returned nothing or user is offline, fall back to shelf / local items
      if (!pool.length) {
        if (shelf?.length) {
          pool = shelf
            .filter((item) => {
              if (!selectedGenre) return true;
              return item.snapshot?.genreIds?.includes(Number(selectedGenre));
            })
            .map((item) => ({
              key: item.movieKey,
              source: item.source,
              sourceId: item.sourceId,
              title: item.snapshot?.title || "Saved film",
              year: item.snapshot?.year || null,
              synopsis: item.snapshot?.synopsis || "",
              genreIds: item.snapshot?.genreIds || [],
              posterUrl: item.snapshot?.posterUrl || null,
              backdropUrl: item.snapshot?.backdropUrl || null,
              tmdbRating: item.snapshot?.tmdbRating || null,
            }));
        }
      }

      if (!pool.length) {
        throw new Error(
          online
            ? "No movies found for this genre. Try picking 'All Genres' or another genre!"
            : "Offline mode: No matching movies found in your shelf. Please connect to discover more movies.",
        );
      }

      // Filter out invalid items
      const validPool = pool.filter((m) => m && m.title);
      const chosen = validPool[Math.floor(Math.random() * validPool.length)];

      // Wait a minimum of 1.2s for the thrill of the spin
      await new Promise((r) => setTimeout(r, 1200));

      if (spinInterval.current) {
        clearInterval(spinInterval.current);
        spinInterval.current = null;
      }

      setCurrentMovie(chosen);
      setHistory((prev) => [chosen, ...prev.filter((x) => x.key !== chosen.key)].slice(0, 6));
    } catch (err) {
      if (spinInterval.current) {
        clearInterval(spinInterval.current);
        spinInterval.current = null;
      }
      setError(err.message || "Failed to spin. Please try again.");
    } finally {
      setSpinning(false);
    }
  };

  return (
    <div className="roulette-page">
      <header className="roulette-header">
        <div className="roulette-badge">
          <Sparkles size={14} />
          <span>Cinema Randomizer</span>
        </div>
        <h1 className="roulette-title">Movie Roulette</h1>
        <p className="roulette-subtitle">
          Can’t decide what to watch tonight? Pick a genre, spin the reel, and let fate choose your next great film!
        </p>
      </header>

      {/* Genre Selector */}
      <section className="roulette-genre-section" aria-label="Genre selection">
        <div className="roulette-genre-label">
          <span>Choose a genre:</span>
          {selectedGenre && (
            <button
              type="button"
              className="roulette-reset-genre-btn"
              onClick={() => setSelectedGenre("")}
            >
              Reset to All
            </button>
          )}
        </div>
        <div className="roulette-genre-chips" role="radiogroup" aria-label="Genre filters">
          {POPULAR_GENRES.map((g) => {
            const isSelected = selectedGenre === g.id;
            return (
              <button
                key={g.id || "all"}
                type="button"
                className={`roulette-genre-chip ${isSelected ? "active" : ""}`}
                onClick={() => setSelectedGenre(g.id)}
                aria-pressed={isSelected}
              >
                {g.name}
              </button>
            );
          })}
        </div>
      </section>

      {/* Spin Button */}
      <div className="roulette-action-wrap">
        <button
          type="button"
          className={`roulette-spin-btn ${spinning ? "spinning" : ""}`}
          onClick={spin}
          disabled={spinning}
          aria-label="Spin the movie roulette"
        >
          <div className="roulette-spin-icon-wrap">
            <Dices size={28} className={spinning ? "dice-spin-anim" : ""} />
          </div>
          <div className="roulette-spin-text">
            <strong>{spinning ? "Spinning Reel…" : currentMovie ? "Spin Again" : "Spin Roulette"}</strong>
            <small>{spinning ? previewTitle || "Shuffling films…" : "Pick a random movie"}</small>
          </div>
        </button>
      </div>

      {error && (
        <div className="roulette-error-box" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Winner Showcase or Spinning State */}
      <div className="roulette-stage">
        {spinning ? (
          <div className="roulette-spinning-card">
            <div className="roulette-spinning-shimmer" />
            <div className="roulette-spinning-content">
              <Dices size={48} className="dice-spin-anim accent-icon" />
              <h3>Rolling the Reel…</h3>
              <p className="roulette-cycling-title">{previewTitle}</p>
              <div className="roulette-spinning-dots">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        ) : currentMovie ? (
          <article className="roulette-winner-card">
            {currentMovie.backdropUrl && (
              <div
                className="roulette-winner-backdrop"
                style={{ backgroundImage: `url(${currentMovie.backdropUrl})` }}
                aria-hidden="true"
              />
            )}
            <div className="roulette-winner-body">
              <div className="roulette-winner-poster-wrap">
                {currentMovie.posterUrl ? (
                  <img
                    src={currentMovie.posterUrl}
                    alt={currentMovie.title}
                    className="roulette-winner-poster"
                  />
                ) : (
                  <div className="roulette-winner-poster-placeholder">
                    <Film size={40} />
                  </div>
                )}
              </div>

              <div className="roulette-winner-info">
                <div className="roulette-winner-badge">
                  <Sparkles size={13} />
                  <span>Tonight’s Pick</span>
                </div>

                <div className="roulette-winner-title-row">
                  <h2 className="roulette-winner-title">
                    <Link to={moviePath(currentMovie)}>{currentMovie.title}</Link>
                  </h2>
                  {currentMovie.tmdbRating != null && (
                    <div className="roulette-winner-rating">
                      <Star size={16} fill="currentColor" />
                      <span>{currentMovie.tmdbRating.toFixed(1)} / 10</span>
                    </div>
                  )}
                </div>

                <div className="roulette-winner-meta">
                  {currentMovie.year && (
                    <span className="roulette-winner-year">{currentMovie.year}</span>
                  )}
                  {currentMovie.genreIds?.length > 0 && (
                    <div className="roulette-winner-genre-tags">
                      {currentMovie.genreIds.slice(0, 3).map((gid) => (
                        <span key={gid} className="badge">
                          {genres[gid] || "Film"}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <p className="roulette-winner-synopsis">
                  {currentMovie.synopsis || "No description provided for this movie."}
                </p>

                <div className="roulette-winner-actions">
                  <Link
                    to={moviePath(currentMovie)}
                    className="button primary roulette-view-btn"
                  >
                    <ExternalLink size={15} />
                    <span>View details</span>
                  </Link>
                  <AddShelf movie={currentMovie} className="roulette-add-shelf-btn" />
                  <button
                    type="button"
                    className="button secondary roulette-reroll-btn"
                    onClick={spin}
                  >
                    <RotateCcw size={15} />
                    <span>Spin again</span>
                  </button>
                </div>
              </div>
            </div>
          </article>
        ) : (
          <div className="roulette-empty-card">
            <div className="roulette-empty-icon-circle">
              <Dices size={40} />
            </div>
            <h3>Ready to Discover?</h3>
            <p>
              Select your favorite genre above, then hit <strong>Spin Roulette</strong> to let CineTrack find your next movie!
            </p>
          </div>
        )}
      </div>

      {/* History of spins in this session */}
      {history.length > 1 && (
        <section className="roulette-history-section">
          <h3>Recent Picks This Session</h3>
          <div className="roulette-history-list">
            {history.map((m) => {
              const isCurrent = m.key === currentMovie?.key;
              return (
                <div
                  key={m.key}
                  className={`roulette-history-item ${isCurrent ? "current" : ""}`}
                  onClick={() => setCurrentMovie(m)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setCurrentMovie(m);
                    }
                  }}
                >
                  {m.posterUrl ? (
                    <img src={m.posterUrl} alt="" className="roulette-history-poster" />
                  ) : (
                    <div className="roulette-history-poster placeholder">
                      <Film size={18} />
                    </div>
                  )}
                  <div className="roulette-history-item-info">
                    <strong>{m.title}</strong>
                    <span>{m.year || "Movie"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
export default Roulette;

