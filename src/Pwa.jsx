import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { useLocation } from "react-router-dom";
export default function Pwa() {
  const [prompt, setPrompt] = useState(null);
  const [installed, setInstalled] = useState(
    () => matchMedia("(display-mode: standalone)").matches,
  );
  const [error, setError] = useState("");
  const location = useLocation();
  const {
    offlineReady: [ready],
    needRefresh: [update],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError: () =>
      setError("Offline setup failed. Reload online to retry."),
  });
  useEffect(() => {
    const before = (e) => {
      e.preventDefault();
      setPrompt(e);
    };
    const done = () => {
      setInstalled(true);
      setPrompt(null);
    };
    addEventListener("beforeinstallprompt", before);
    addEventListener("appinstalled", done);
    return () => {
      removeEventListener("beforeinstallprompt", before);
      removeEventListener("appinstalled", done);
    };
  }, []);
  const form = /\/new$|\/edit$/.test(location.pathname);
  return (
    <div className="pwa-status">
      {ready && <span>Ready for offline use</span>}
      {installed && <span>App installed</span>}
      {error && <span role="alert">{error}</span>}
      {prompt && !installed && (
        <button
          onClick={async () => {
            await prompt.prompt();
            await prompt.userChoice;
            setPrompt(null);
          }}
        >
          Install CineTrack
        </button>
      )}
      {update && (
        <div className="message">
          <p>
            {form
              ? "Update available. Finish saving your draft, then leave the form to update."
              : "A new version is ready. Your saved shelf and drafts will be retained."}
          </p>
          <button disabled={form} onClick={() => updateServiceWorker(true)}>
            Update app
          </button>
        </div>
      )}
    </div>
  );
}
