import { Component, useEffect, useState } from "react";
import { NavLink, Link, Routes, Route, useLocation, Navigate } from "react-router-dom";
import {
  House,
  Dices,
  Library,
  UserRound,
  Search,
  WifiOff,
  AlertCircle,
} from "lucide-react";
import { AppProvider, useApp } from "./hooks.jsx";
import { Home, Explore, MovieDetail } from "./pages/Discovery.jsx";
import { Shelf, Profile, Contributions } from "./pages/Personal.jsx";
import { MovieForm } from "./pages/MovieForm.jsx";
import { Roulette } from "./pages/Roulette.jsx";
import { SearchModal } from "./components.jsx";
import Pwa from "./Pwa.jsx";
const links = [
  ["/", "Home", House],
  ["/roulette", "Roulette", Dices],
  ["/shelf", "My shelf", Library],
  ["/profile", "Profile", UserRound],
];
class Boundary extends Component {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <main>
        <h1>Something interrupted CineTrack</h1>
        <p>
          Your saved device data has not been cleared. Reload to retry. Check
          that browser storage is enabled.
        </p>
        <button onClick={() => window.location.reload()}>Reload</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
function Shell() {
  const { online, authError, retryAuth, notice } = useApp();
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    document.title = `${links.find((x) => x[0] === location.pathname)?.[1] || "Movie"} · CineTrack`;
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <a
        className="skip"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main").focus();
        }}
      >
        Skip to content
      </a>
      <header className="capsule-topbar">
        <div className="capsule-navbar">
          <Link className="capsule-brand" to="/">
            <img src="/icons/logo.svg" alt="" />
            <span>CineTrack</span>
          </Link>
          <nav className="capsule-nav" aria-label="Main navigation">
            {links.map(([to, name, Icon]) => (
              <NavLink key={to} end={to === "/"} to={to} className="capsule-nav-link">
                <Icon size={17} />
                <span>{name}</span>
              </NavLink>
            ))}
          </nav>
          <button
            type="button"
            className="capsule-search-btn"
            onClick={() => setSearchOpen(true)}
            aria-label="Search movies"
          >
            <Search size={16} />
            <span className="capsule-search-text">Search movies, genres…</span>
          </button>
        </div>
      </header>
      <div className="app-content">
        {!online && (
          <div className="network-banner" role="status">
            <WifiOff size={18} /> You’re offline. Your shelf and saved drafts
            are available.
          </div>
        )}
        {authError && (
          <div className="setup-banner" role="alert">
            <div className="setup-banner-header">
              <AlertCircle size={18} />
              <strong>Cloud setup / guest session needs attention</strong>
            </div>
            <p>{authError}</p>
            <div className="actions">
              <button className="button" onClick={retryAuth}>Retry guest session</button>
            </div>
          </div>
        )}
        <main id="main" tabIndex={-1}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/explore" element={<Navigate to="/" replace />} />
            <Route path="/roulette" element={<Roulette />} />
            <Route path="/shelf" element={<Shelf />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/contributions" element={<Contributions />} />
            <Route path="/movies/new" element={<MovieForm key="new" />} />
            <Route path="/movies/custom/:id/edit" element={<MovieForm />} />
            <Route path="/movies/:source/:id" element={<MovieDetail />} />
            <Route
              path="*"
              element={
                <>
                  <h1>This scene is missing</h1>
                  <Link to="/">Return home</Link>
                </>
              }
            />
          </Routes>
          <div className="global-pwa">
            <Pwa />
          </div>
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        <NavLink end to="/">
          <House size={22} />
          <span>Home</span>
        </NavLink>
        <NavLink to="/roulette">
          <Dices size={22} />
          <span>Roulette</span>
        </NavLink>
        <button
          type="button"
          className="mobile-search-nav-btn"
          onClick={() => setSearchOpen(true)}
          aria-label="Search movies"
        >
          <div className="mobile-search-circle">
            <Search size={22} />
          </div>
          <span>Search</span>
        </button>
        <NavLink to="/shelf">
          <Library size={22} />
          <span>My shelf</span>
        </NavLink>
        <NavLink to="/profile">
          <UserRound size={22} />
          <span>Profile</span>
        </NavLink>
      </nav>
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
    </>
  );
}
export default function App() {
  return (
    <Boundary>
      <AppProvider>
        <Shell />
      </AppProvider>
    </Boundary>
  );
}
