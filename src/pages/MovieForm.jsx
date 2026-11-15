import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useApp } from "../hooks.jsx";
import { db } from "../db/local.js";
import { customDetail, saveCustom } from "../services/custom.js";
import { posterUrl } from "../services/supabase.js";
import { queryCatalog } from "../repositories/catalog.js";
import {
  genres,
  titleKey,
  validateMovie,
  validateImage,
  moviePath,
  uuid,
} from "../domain/movie.js";
import { ErrorState, Loading, Dialog } from "../components.jsx";
const blank = {
  title: "",
  release_year: new Date().getFullYear(),
  genre_ids: [],
  synopsis: "",
  runtime: "",
  director: "",
  cast_names: "",
  trailer_url: "",
  poster_path: null,
};
export function MovieForm() {
  const { id } = useParams();
  const editing = !!id;
  const { uid, online, notify } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState(blank);
  const [movieId, setMovieId] = useState(id || crypto.randomUUID());
  const [file, setFile] = useState(null);
  const [rights, setRights] = useState(false);
  const [preview, setPreview] = useState("");
  const [ready, setReady] = useState(false);
  const [restore, setRestore] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});
  const [duplicates, setDuplicates] = useState(null);
  const [draftStatus, setDraftStatus] = useState("");
  const dirty = useRef(false);
  const saving = useRef(Promise.resolve());
  const draftId = id || "new";
  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError("");
    dirty.current = false;
    setForm(blank);
    setFile(null);
    setDuplicates(null);
    (async () => {
      if (editing && !uuid(id)) throw Error("Invalid movie reference.");
      const draft = uid ? await db.customDrafts.get([uid, draftId]) : null;
      if (cancelled) return;
      if (draft) {
        setRestore(draft);
        return;
      }
      if (editing) {
        const movie = await customDetail(id);
        if (movie.ownerId !== uid)
          throw Error("Only the owner can edit this contribution.");
        if (cancelled) return;
        setForm({
          title: movie.title,
          release_year: movie.year,
          genre_ids: movie.genreIds,
          synopsis: movie.synopsis,
          runtime: movie.runtime || "",
          director: movie.director || "",
          cast_names: movie.cast.join(", "),
          trailer_url: movie.trailerUrl || "",
          poster_path: movie.posterPath,
        });
      }
      if (!cancelled) setReady(true);
    })().catch((e) => {
      if (!cancelled) {
        setError(e.message);
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id, editing, uid, draftId]);
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    if (!ready || !uid || !dirty.current) return;
    setDraftStatus("Saving draft…");
    const record = {
      uid,
      draftId,
      movieId,
      fields: form,
      file,
      rights,
      updatedAt: Date.now(),
    };
    saving.current = saving.current
      .catch(() => {})
      .then(() => db.customDrafts.put(record))
      .then(() => setDraftStatus("Draft saved on this device."))
      .catch((e) => {
        setDraftStatus("Draft could not be saved. Keep this page open.");
        setError(e.message);
      });
  }, [form, file, rights, ready, uid, draftId, movieId]);
  useEffect(() => {
    const unload = (e) => {
      if (dirty.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const navigateAway = (e) => {
      const link = e.target.closest("a");
      if (
        dirty.current &&
        link?.getAttribute("href")?.startsWith("#/") &&
        !window.confirm(
          "Leave this form? Your saved draft will remain on this device.",
        )
      )
        e.preventDefault();
    };
    addEventListener("beforeunload", unload);
    document.addEventListener("click", navigateAway, true);
    return () => {
      removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigateAway, true);
    };
  }, []);
  const change = (key, value) => {
    dirty.current = true;
    const next = { ...form, [key]: value };
    setForm(next);
    setErrors(validateMovie(next));
    setDuplicates(null);
  };
  const publish = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await saving.current;
      await saveCustom(uid, movieId, form, file, editing);
      await db.customDrafts.delete([uid, draftId]);
      dirty.current = false;
      notify("Movie published to the community catalog.");
      navigate(`/movies/custom/${movieId}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      setDuplicates(null);
    }
  };
  const submit = async (e) => {
    e.preventDefault();
    const problems = validateMovie(form);
    if (file && !rights)
      problems.poster = "Confirm permission to publish this image.";
    setErrors(problems);
    if (Object.keys(problems).length) return;
    setBusy(true);
    setError("");
    try {
      const check = await queryCatalog({ query: form.title });
      const matches = check.items.filter(
        (m) =>
          m.sourceId !== movieId &&
          titleKey(m.title) === titleKey(form.title) &&
          m.year === Number(form.release_year),
      );
      const incomplete =
        check.errors.length > 0 ||
        check.next.tmdb !== null ||
        check.next.custom !== null;
      if (matches.length || incomplete) {
        setDuplicates({ matches, incomplete });
        setBusy(false);
        return;
      }
    } catch {
      setDuplicates({ matches: [], incomplete: true });
      setBusy(false);
      return;
    }
    setBusy(false);
    await publish();
  };
  const field = (name, label, type = "text", maxLength) => (
    <label>
      {label}
      <input
        type={type}
        value={form[name]}
        maxLength={maxLength}
        required={["title", "release_year"].includes(name)}
        min={
          name === "release_year" ? 1888 : name === "runtime" ? 1 : undefined
        }
        max={
          name === "release_year" ? 2031 : name === "runtime" ? 600 : undefined
        }
        onChange={(e) => change(name, e.target.value)}
        aria-invalid={!!errors[name]}
      />
      {errors[name] && <small className="error-text">{errors[name]}</small>}
    </label>
  );
  return (
    <>
      <Link className="back" to="/explore">
        Back to discovery
      </Link>
      <div className="page-heading">
        <div>
          <h1>{editing ? "Edit your movie" : "Bring a story to the shelf"}</h1>
          <p className="muted">
            Contribute a film. Give someone their next great watch.
          </p>
        </div>
      </div>
      {!uid && (
        <ErrorState message="Connect and configure Supabase to initialize your guest identity before creating a draft." />
      )}
      {error && <ErrorState message={error} />}{" "}
      {!online && (
        <p className="message">
          Drafts stay on this device. Connect to publish or upload.
        </p>
      )}
      {!ready && !restore ? (
        <Loading />
      ) : (
        ready && (
          <form
            className="movie-form panel"
            onSubmit={submit}
            aria-busy={busy}
            inert={busy ? true : undefined}
          >
            <div className="form-main">
              {field("title", "Movie title", "text", 150)}
              <div className="two-col">
                {field("release_year", "Release year", "number")}
                {field("runtime", "Runtime in minutes (optional)", "number")}
              </div>
              <fieldset>
                <legend>Genres</legend>
                <div className="genre-options">
                  {Object.entries(genres).map(([g, name]) => (
                    <label key={g}>
                      <input
                        type="checkbox"
                        checked={form.genre_ids.includes(Number(g))}
                        onChange={(e) =>
                          change(
                            "genre_ids",
                            e.target.checked
                              ? [...form.genre_ids, Number(g)]
                              : form.genre_ids.filter((x) => x !== Number(g)),
                          )
                        }
                      />
                      {name}
                    </label>
                  ))}
                </div>
                {errors.genre_ids && (
                  <small className="error-text">{errors.genre_ids}</small>
                )}
              </fieldset>
              <label>
                Synopsis
                <textarea
                  required
                  minLength={10}
                  maxLength={2000}
                  rows={6}
                  value={form.synopsis}
                  onChange={(e) => change("synopsis", e.target.value)}
                  aria-invalid={!!errors.synopsis}
                />
                <small>
                  {errors.synopsis || `${form.synopsis.length}/2000`}
                </small>
              </label>
              {field("director", "Director (optional)", "text", 150)}
              {field(
                "cast_names",
                "Cast names, separated by commas (optional)",
                "text",
                1010,
              )}
              {field(
                "trailer_url",
                "YouTube trailer URL (optional)",
                "url",
                500,
              )}
            </div>
            <div className="form-side">
              <h2>Movie poster</h2>
              <img
                className="upload-preview"
                src={
                  preview || posterUrl(form.poster_path) || "/images/poster.svg"
                }
                alt={preview ? "Selected poster preview" : "Poster placeholder"}
              />
              <label>
                Choose poster
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    try {
                      const f = e.target.files[0];
                      validateImage(f);
                      dirty.current = true;
                      setFile(f || null);
                      setRights(false);
                      setError("");
                    } catch (err) {
                      setError(err.message);
                      e.target.value = "";
                    }
                  }}
                />
              </label>
              <p className="muted">
                JPEG, PNG or WebP. Up to 5 MiB. Uploaded images are publicly
                visible.
              </p>
              {(file || form.poster_path) && (
                <button
                  type="button"
                  onClick={() => {
                    dirty.current = true;
                    setFile(null);
                    change("poster_path", null);
                  }}
                >
                  Clear poster
                </button>
              )}
              {file && (
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={rights}
                    onChange={(e) => {
                      dirty.current = true;
                      setRights(e.target.checked);
                    }}
                  />
                  I have the right to publish this image.
                </label>
              )}
              {errors.poster && <p className="error-text">{errors.poster}</p>}
              <p className="muted">
                Only add content you have permission to share. Your contribution
                will be public.
              </p>
            </div>
            <div className="form-footer">
              <p role="status">{draftStatus}</p>
              <button
                className="primary"
                disabled={
                  busy ||
                  !online ||
                  !uid ||
                  Object.keys(validateMovie(form)).length > 0 ||
                  (!!file && !rights)
                }
              >
                {busy
                  ? "Checking and saving…"
                  : editing
                    ? "Save changes"
                    : "Publish movie"}
              </button>
            </div>
          </form>
        )
      )}
      {restore && (
        <Dialog
          title="Restore saved draft?"
          onClose={() => navigate("/explore")}
        >
          <p>A draft and any selected poster were saved on this device.</p>
          <div className="actions">
            <button
              onClick={async () => {
                await db.customDrafts.delete([uid, draftId]);
                setRestore(null);
                window.location.reload();
              }}
            >
              Discard draft
            </button>
            <button
              className="primary"
              onClick={() => {
                setForm(restore.fields);
                setFile(restore.file);
                setRights(restore.rights);
                setMovieId(restore.movieId);
                setRestore(null);
                setReady(true);
                dirty.current = true;
              }}
            >
              Restore draft
            </button>
          </div>
        </Dialog>
      )}
      {duplicates && (
        <Dialog
          title="Check for an existing movie"
          onClose={() => setDuplicates(null)}
        >
          {duplicates.incomplete && (
            <p className="message">
              The duplicate check is incomplete. Some results or sources could
              not be checked. Review the matches before continuing.
            </p>
          )}
          {duplicates.matches.map((m) => (
            <p key={m.key}>
              <Link to={moviePath(m)}>
                {m.title} ({m.year}) — {m.source}
              </Link>
            </p>
          ))}
          <div className="actions">
            <button onClick={() => setDuplicates(null)}>Go back</button>
            <button disabled={busy} className="primary" onClick={publish}>
              Continue anyway
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
