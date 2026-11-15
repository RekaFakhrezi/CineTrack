import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { initializeAuth } from "./services/supabase.js";
import { db } from "./db/local.js";
import { bootstrapPublicCache } from "./db/seedLocal.js";
import { flushShelf } from "./db/sync.js";
import { mutateShelf } from "./repositories/shelf.js";
const Context = createContext(null);
export const useApp = () => useContext(Context);
export function AppProvider({ children }) {
  const [uid, setUid] = useState(() => localStorage.getItem("cinetrack-uid"));
  const [online, setOnline] = useState(navigator.onLine);
  const [authError, setAuthError] = useState("");
  const [notice, setNotice] = useState("");
  const [syncError, setSyncError] = useState("");
  const shelf = useLiveQuery(
    () => (uid ? db.shelf.where("uid").equals(uid).toArray() : []),
    [uid],
    [],
  );
  const queue = useLiveQuery(
    () => (uid ? db.outbox.where("uid").equals(uid).toArray() : []),
    [uid],
    [],
  );
  const init = useCallback(async () => {
    bootstrapPublicCache();
    try {
      setUid(await initializeAuth());
      setAuthError("");
    } catch (e) {
      setAuthError(e.message);
    }
  }, []);
  useEffect(() => {
    init();
    const update = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) init();
    };
    addEventListener("online", update);
    addEventListener("offline", update);
    return () => {
      removeEventListener("online", update);
      removeEventListener("offline", update);
    };
  }, [init]);
  const sync = useCallback(
    async (force = false) => {
      try {
        await flushShelf(uid, { force });
        setSyncError("");
      } catch (e) {
        setSyncError(e.message);
      }
    },
    [uid],
  );
  useEffect(() => {
    if (!uid || !online) return;
    sync();
    const timer = setInterval(() => sync(), 10000);
    const visible = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [uid, online, sync]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5500);
    return () => clearTimeout(timer);
  }, [notice]);
  const save = async (movie, values, remove) => {
    const item = await mutateShelf(uid, movie, values, remove);
    setNotice(
      remove
        ? "Removed on this device. Pending sync."
        : "Saved on device. Pending sync.",
    );
    sync();
    return item;
  };
  return (
    <Context.Provider
      value={{
        uid,
        online,
        authError,
        retryAuth: init,
        notice,
        notify: setNotice,
        shelf,
        queue,
        sync,
        syncError,
        save,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAsync(loader, deps) {
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true, data: null, error: "" });
    Promise.resolve()
      .then(() => loader(controller.signal))
      .then((data) => {
        if (!controller.signal.aborted)
          setState({ loading: false, data, error: "" });
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setState({ loading: false, data: null, error: e.message });
      });
    return () => controller.abort();
    // Callers supply the values defining the request; stale completions are aborted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, retry]);
  return { ...state, retry: () => setRetry((x) => x + 1) };
}
