import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Dices,
  RotateCcw,
  Star,
  Sparkles,
  Film,
  AlertCircle,
  ExternalLink,
  Volume2,
  VolumeX,
  Flame,
  Award,
  Users,
} from "lucide-react";
import { tmdbList } from "../services/tmdb.js";
import { customList } from "../services/custom.js";
import { genres, moviePath } from "../domain/movie.js";
import { AddShelf } from "../components.jsx";
import { useApp } from "../hooks.jsx";
import { SAMPLE_COMMUNITY_MOVIES } from "../db/seedLocal.js";

const POPULAR_GENRES = [
  { id: "", name: "All", icon: "🍿" },
  { id: "28", name: "Action", icon: "💥" },
  { id: "35", name: "Comedy", icon: "😂" },
  { id: "18", name: "Drama", icon: "🎭" },
  { id: "27", name: "Horror", icon: "👻" },
  { id: "878", name: "Sci-Fi", icon: "🚀" },
  { id: "16", name: "Animation", icon: "🎨" },
  { id: "10749", name: "Romance", icon: "❤️" },
  { id: "53", name: "Thriller", icon: "🔪" },
  { id: "12", name: "Adventure", icon: "🗺️" },
  { id: "14", name: "Fantasy", icon: "🧙‍♂️" },
  { id: "9648", name: "Mystery", icon: "🔍" },
  { id: "80", name: "Crime", icon: "🚨" },
  { id: "10751", name: "Family", icon: "👨‍👩‍👧" },
];

const FILTER_MODES = [
  { id: "all", label: "All", icon: Flame },
  { id: "top_rated", label: "7.5+", icon: Award },
  { id: "community", label: "Community", icon: Users },
];

const CARD_WIDTH = 100;
const CARD_GAP = 12;
const CARD_STEP = CARD_WIDTH + CARD_GAP; // 112px
const INITIAL_SLOT_INDEX = 2;
const SPIN_ADVANCE_COUNT = 20;

// Helper to construct initial reel strip
function createInitialStrip(candidatePool) {
  if (!candidatePool || candidatePool.length === 0) return [];
  const strip = [];
  const poolLen = candidatePool.length;
  for (let i = 0; i < 16; i++) {
    const rand = candidatePool[Math.floor(Math.random() * poolLen)];
    strip.push({ ...rand, reelUid: `init-${i}-${rand.key || i}` });
  }
  return strip;
}

export function Roulette() {
  const { online, shelf } = useApp();
  const [selectedGenre, setSelectedGenre] = useState("");
  const [filterMode, setFilterMode] = useState("all");
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      return localStorage.getItem("cinetrack_roulette_sound") !== "false";
    } catch {
      return true;
    }
  });

  const [spinning, setSpinning] = useState(false);
  const [useTransition, setUseTransition] = useState(false);
  const [reelMovies, setReelMovies] = useState([]);
  const [currentMovie, setCurrentMovie] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [reelOffset, setReelOffset] = useState(0);

  const slotIndexRef = useRef(INITIAL_SLOT_INDEX);
  const poolRef = useRef([]);
  const reelViewportRef = useRef(null);
  const audioCtxRef = useRef(null);

  // Toggle sound
  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("cinetrack_roulette_sound", String(next));
      } catch {
        /* storage disabled */
      }
      return next;
    });
  };

  // Web Audio Synthesizer tick
  const playTickSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(540 + Math.random() * 80, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {
      /* audio unsupported */
    }
  }, [soundEnabled]);

  // Web Audio Synthesizer fanfare
  const playFanfare = useCallback(() => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.07);
        gain.gain.setValueAtTime(0.07, ctx.currentTime + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.07 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.07);
        osc.stop(ctx.currentTime + i * 0.07 + 0.4);
      });
    } catch {
      /* audio unsupported */
    }
  }, [soundEnabled]);

  // Center an index inside the viewport
  const getCenterOffset = useCallback((index) => {
    const vpWidth = reelViewportRef.current?.clientWidth || window.innerWidth || 360;
    return index * CARD_STEP + CARD_WIDTH / 2 - vpWidth / 2;
  }, []);

  // Fetch / assemble candidates pool
  // CRITICAL: DO NOT include currentMovie here so refreshPool never triggers on spin completion!
  const refreshPool = useCallback(async () => {
    try {
      let pool = [];

      // 1. Fetch community movies
      if (filterMode === "community" || filterMode === "all") {
        try {
          const res = await customList({ genre: selectedGenre, offset: 0 });
          if (res?.items?.length) pool.push(...res.items);
        } catch {
          /* community unavailable */
        }
      }

      // 2. Fetch TMDB movies if online
      if (online && filterMode !== "community") {
        try {
          const randomPage = Math.floor(Math.random() * 4) + 1;
          const endpoint = selectedGenre
            ? "discover"
            : filterMode === "top_rated"
              ? "top_rated"
              : "popular";
          const res = await tmdbList(endpoint, {
            page: randomPage,
            ...(selectedGenre ? { genre: selectedGenre } : {}),
          });
          if (res?.items?.length) {
            let items = res.items;
            if (filterMode === "top_rated") {
              items = items.filter((m) => (m.tmdbRating || 0) >= 7.5);
            }
            pool.push(...items);
          }
        } catch {
          /* TMDB unavailable */
        }
      }

      // 3. Fallback to local community sample movies & shelf
      if (pool.length < 15) {
        let fallback = [...SAMPLE_COMMUNITY_MOVIES];
        if (shelf?.length) {
          const shelfMovies = shelf.map((s) => ({
            key: s.movieKey,
            source: s.source,
            sourceId: s.sourceId,
            title: s.snapshot?.title || "Film",
            year: s.snapshot?.year || 2024,
            synopsis: s.snapshot?.synopsis || "",
            genreIds: s.snapshot?.genreIds || [],
            posterUrl: s.snapshot?.posterUrl || null,
            backdropUrl: s.snapshot?.backdropUrl || null,
            tmdbRating: s.snapshot?.tmdbRating || 8.0,
          }));
          fallback.push(...shelfMovies);
        }
        if (selectedGenre) {
          fallback = fallback.filter((m) =>
            m.genreIds?.includes(Number(selectedGenre)),
          );
        }
        pool.push(...fallback);
      }

      // Deduplicate
      const seen = new Set();
      const unique = [];
      for (const m of pool) {
        if (m && m.title && !seen.has(m.key || m.title)) {
          seen.add(m.key || m.title);
          unique.push(m);
        }
      }

      poolRef.current = unique;

      // Initialize reel strip
      slotIndexRef.current = INITIAL_SLOT_INDEX;
      const initialStrip = createInitialStrip(unique);
      setReelMovies(initialStrip);
      setUseTransition(false);
      setReelOffset(getCenterOffset(INITIAL_SLOT_INDEX));
    } catch (err) {
      setError(err.message);
    }
  }, [online, selectedGenre, filterMode, shelf, getCenterOffset]);

  useEffect(() => {
    refreshPool();
  }, [refreshPool]);

  // Recalculate center on window resize
  useEffect(() => {
    const onResize = () => {
      if (!spinning) {
        setUseTransition(false);
        setReelOffset(getCenterOffset(slotIndexRef.current));
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [getCenterOffset, spinning]);

  // Continuous Forward Reel Spin Function (Works 100% seamlessly on Spin 1, 2, 3...)
  const spin = async () => {
    if (spinning) return;
    const pool = poolRef.current;
    if (!pool || pool.length === 0) return;

    setError(null);
    setSpinning(true);

    try {
      // 1. Pick a random winner from the candidate pool
      const winner = pool[Math.floor(Math.random() * pool.length)];

      // 2. Calculate target slot index (advances forward by SPIN_ADVANCE_COUNT)
      const currentSlot = slotIndexRef.current;
      const targetSlot = currentSlot + SPIN_ADVANCE_COUNT;

      // 3. Generate new cards to append to the strip, with winner placed at targetSlot
      const poolLen = pool.length;
      const newCards = [];
      const now = Date.now();
      for (let i = 1; i <= SPIN_ADVANCE_COUNT + 6; i++) {
        const slot = currentSlot + i;
        if (slot === targetSlot) {
          newCards.push({ ...winner, reelUid: `slot-${slot}-${now}-${winner.key}` });
        } else {
          const rand = pool[Math.floor(Math.random() * poolLen)];
          newCards.push({ ...rand, reelUid: `slot-${slot}-${now}-${rand.key || slot}` });
        }
      }

      // 4. Append new cards to reel track
      setReelMovies((prev) => [...prev, ...newCards]);

      // 5. Wait for browser paint so new cards are in the DOM
      await new Promise((r) => requestAnimationFrame(r));

      // 6. Animate FORWARD smoothly to targetSlot
      setUseTransition(true);
      setReelOffset(getCenterOffset(targetSlot));

      // 7. Sound effects ticking with deceleration
      const totalDuration = 2700;
      const startTime = performance.now();
      let lastTick = 0;

      const tickTimer = setInterval(() => {
        const elapsed = performance.now() - startTime;
        if (elapsed >= totalDuration) {
          clearInterval(tickTimer);
          return;
        }
        const p = elapsed / totalDuration;
        const interval = 50 + Math.pow(p, 2.5) * 260;
        if (elapsed - lastTick > interval) {
          playTickSound();
          lastTick = elapsed;
        }
      }, 30);

      // Wait for spin animation to finish
      await new Promise((r) => setTimeout(r, totalDuration + 120));
      clearInterval(tickTimer);

      // 8. Landed on winner!
      playFanfare();
      slotIndexRef.current = targetSlot;
      setCurrentMovie(winner);
      setHistory((prev) => [winner, ...prev.filter((x) => x.key !== winner.key)].slice(0, 6));
    } catch (err) {
      setError(err.message || "Failed to spin. Please try again.");
    } finally {
      setSpinning(false);
    }
  };

  return (
    <div className="roulette-page-single">
      {/* 1. COMPACT HEADER BAR */}
      <header className="roulette-compact-header">
        <div className="roulette-compact-title-wrap">
          <div className="roulette-title-badge-group">
            <div className="roulette-compact-badge">
              <Sparkles size={12} />
              <span>Cinema Reel</span>
            </div>
            <h1 className="roulette-compact-title">Movie Roulette</h1>
          </div>

          <button
            type="button"
            className={`roulette-sound-btn-compact ${soundEnabled ? "on" : "off"}`}
            onClick={toggleSound}
            aria-label={soundEnabled ? "Mute audio" : "Enable audio"}
            title={soundEnabled ? "Sound ON" : "Sound Muted"}
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
        </div>

        <div className="roulette-compact-actions">
          <div className="roulette-mode-pills-compact">
            {FILTER_MODES.map((mode) => {
              const Icon = mode.icon;
              const isSelected = filterMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  className={`roulette-mode-pill-compact ${isSelected ? "active" : ""}`}
                  onClick={() => setFilterMode(mode.id)}
                  disabled={spinning}
                  aria-pressed={isSelected}
                >
                  <Icon size={12} />
                  <span>{mode.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* 2. HORIZONTAL SCROLLABLE GENRE STRIP */}
      <div className="roulette-genre-strip" role="radiogroup" aria-label="Genre filters">
        <div className="roulette-genre-scroller">
          {POPULAR_GENRES.map((g) => {
            const isSelected = selectedGenre === g.id;
            return (
              <button
                key={g.id || "all"}
                type="button"
                className={`roulette-genre-chip-compact ${isSelected ? "active" : ""}`}
                onClick={() => setSelectedGenre(g.id)}
                disabled={spinning}
                aria-pressed={isSelected}
              >
                <span className="genre-emoji" aria-hidden="true">{g.icon}</span>
                <span>{g.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. CINEMA 35MM REEL SLOT PROJECTOR */}
      <section className="roulette-reel-wrapper-compact" aria-label="Film strip slot machine">
        {/* Sprocket holes top */}
        <div className="roulette-sprocket-holes" aria-hidden="true">
          {Array.from({ length: 28 }).map((_, i) => (
            <span key={i} className="sprocket-square" />
          ))}
        </div>

        {/* Center Pointer / Viewfinder Crosshair */}
        <div className="roulette-viewfinder-compact" aria-hidden="true">
          <div className="viewfinder-arrow top">▼</div>
          <div className="viewfinder-reticle" />
          <div className="viewfinder-arrow bottom">▲</div>
        </div>

        {/* Film Viewport */}
        <div className="roulette-viewport-compact" ref={reelViewportRef}>
          <div
            className="roulette-strip-compact"
            style={{
              transform: `translate3d(-${reelOffset}px, 0, 0)`,
              transition: useTransition
                ? "transform 2.7s cubic-bezier(0.12, 0.82, 0.22, 1)"
                : "none",
            }}
          >
            {reelMovies.map((movie, idx) => {
              const isSelected = currentMovie && currentMovie.key === movie.key && !spinning;
              return (
                <article
                  key={movie.reelUid || idx}
                  className={`roulette-card-compact ${isSelected ? "is-selected" : ""}`}
                  onClick={() => {
                    if (!spinning) setCurrentMovie(movie);
                  }}
                >
                  <div className="roulette-card-poster-wrap">
                    {movie.posterUrl ? (
                      <img
                        src={movie.posterUrl}
                        alt=""
                        loading="lazy"
                        className="roulette-card-img"
                      />
                    ) : (
                      <div className="roulette-card-placeholder">
                        <Film size={22} />
                      </div>
                    )}
                    {movie.tmdbRating != null && (
                      <div className="roulette-card-rating">
                        <Star size={10} fill="currentColor" />
                        <span>{movie.tmdbRating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  <h4 className="roulette-card-title">{movie.title}</h4>
                </article>
              );
            })}
          </div>
        </div>

        {/* Sprocket holes bottom */}
        <div className="roulette-sprocket-holes" aria-hidden="true">
          {Array.from({ length: 28 }).map((_, i) => (
            <span key={i} className="sprocket-square" />
          ))}
        </div>
      </section>

      {/* 4. SPIN ACTION BUTTON (HIGH CONTRAST & READABLE) */}
      <div className="roulette-action-bar">
        <button
          type="button"
          className={`roulette-spin-btn-high-contrast ${spinning ? "spinning" : ""}`}
          onClick={spin}
          disabled={spinning}
          aria-label="Spin roulette reel"
        >
          <div className="spin-btn-icon">
            <Dices size={24} className={spinning ? "dice-spin-anim" : ""} />
          </div>
          <div className="spin-btn-labels">
            <span className="spin-btn-main">
              {spinning ? "Spinning Reel…" : currentMovie ? "Spin Again" : "Spin Roulette"}
            </span>
            <span className="spin-btn-sub">
              {spinning ? "Decelerating on pick…" : "Roll random film from reel"}
            </span>
          </div>
        </button>
      </div>

      {error && (
        <div className="roulette-error-box-compact" role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* 5. COMPACT WINNER SPOTLIGHT (NO SCROLLING NEEDED) */}
      <div className="roulette-result-zone">
        {currentMovie ? (
          <article className="roulette-winner-compact">
            {currentMovie.backdropUrl && (
              <div
                className="roulette-winner-compact-backdrop"
                style={{ backgroundImage: `url(${currentMovie.backdropUrl})` }}
                aria-hidden="true"
              />
            )}
            <div className="roulette-winner-compact-poster">
              {currentMovie.posterUrl ? (
                <img
                  src={currentMovie.posterUrl}
                  alt={currentMovie.title}
                  className="winner-poster-img"
                />
              ) : (
                <div className="winner-poster-placeholder">
                  <Film size={26} />
                </div>
              )}
            </div>

            <div className="roulette-winner-compact-content">
              <div className="winner-top-row">
                <div className="winner-title-group">
                  <span className="winner-feature-badge">
                    <Sparkles size={11} />
                    <span>Tonight’s Pick</span>
                  </span>
                  <h3 className="winner-title-text">
                    <Link to={moviePath(currentMovie)}>{currentMovie.title}</Link>
                  </h3>
                </div>

                <div className="winner-meta-inline">
                  {currentMovie.tmdbRating != null && (
                    <span className="winner-rating-tag">
                      <Star size={13} fill="currentColor" />
                      {currentMovie.tmdbRating.toFixed(1)}
                    </span>
                  )}
                  {currentMovie.year && (
                    <span className="winner-year-tag">{currentMovie.year}</span>
                  )}
                  {currentMovie.genreIds?.length > 0 && (
                    <span className="badge">
                      {genres[currentMovie.genreIds[0]] || "Film"}
                    </span>
                  )}
                </div>
              </div>

              <p className="winner-synopsis-compact">
                {currentMovie.synopsis || "No description available for this film."}
              </p>

              <div className="winner-actions-compact">
                <Link
                  to={moviePath(currentMovie)}
                  className="button primary compact-btn"
                >
                  <ExternalLink size={13} />
                  <span>View details</span>
                </Link>
                <AddShelf movie={currentMovie} />
                <button
                  type="button"
                  className="button secondary compact-btn"
                  onClick={spin}
                  disabled={spinning}
                >
                  <RotateCcw size={13} />
                  <span>Spin again</span>
                </button>
              </div>
            </div>
          </article>
        ) : (
          <div className="roulette-idle-compact">
            <Sparkles size={16} className="text-accent" />
            <span>Select a genre above and click <strong>Spin Roulette</strong> to roll the reel!</span>
          </div>
        )}
      </div>

      {/* 6. COMPACT RECENT PICKS HISTORY BAR */}
      {history.length > 1 && (
        <footer className="roulette-history-bar-compact">
          <span className="history-label">Recent:</span>
          <div className="history-chips-scroller">
            {history.map((m) => {
              const isCurrent = m.key === currentMovie?.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  className={`history-chip ${isCurrent ? "current" : ""}`}
                  onClick={() => setCurrentMovie(m)}
                  title={`${m.title} (${m.year || "Movie"})`}
                >
                  {m.posterUrl && (
                    <img src={m.posterUrl} alt="" className="history-chip-img" />
                  )}
                  <span className="history-chip-title">{m.title}</span>
                </button>
              );
            })}
          </div>
        </footer>
      )}
    </div>
  );
}

export default Roulette;
