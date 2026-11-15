import { createClient } from "@supabase/supabase-js";
import axios from "axios";
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const validUrl = (() => {
  try {
    const url = new URL(supabaseUrl);
    return (
      url.protocol === "https:" &&
      !!url.hostname &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
})();
export const configured = !!(validUrl && key);
export const supabase = configured ? createClient(supabaseUrl, key) : null;
export const posterUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("/")) {
    return path;
  }
  return configured
    ? supabase.storage.from("movie-posters").getPublicUrl(path).data.publicUrl
    : null;
};
let initializing;
export function initializeAuth() {
  if (initializing) return initializing;
  initializing = (async () => {
    if (!supabase)
      throw Error(
        "Cloud setup needed: set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.",
      );
    const last = localStorage.getItem("cinetrack-uid");
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    let session = data.session;
    if (!session && last)
      throw Error(
        "Reconnect to restore this guest session. Existing changes remain on this device; a new identity will not replace it.",
      );
    if (!session) {
      if (!navigator.onLine)
        throw Error("Connect once to initialize your private shelf.");
      const r = await supabase.auth.signInAnonymously();
      if (r.error) {
        if (r.error.code === "anonymous_provider_disabled") {
          throw Error(
            "Supabase Anonymous Sign-In is disabled. In your Supabase dashboard, go to Authentication > Providers > Anonymous Sign-In, turn it ON, then click Save and Retry.",
          );
        }
        if (
          r.error.code === "captcha_failed" ||
          r.error.message?.toLowerCase().includes("captcha")
        ) {
          throw Error(
            "Supabase Captcha Protection is enabled. In Supabase Dashboard, go to Authentication > Attack Protection, turn OFF 'Enable Captcha protection', then click Save changes and Retry.",
          );
        }
        throw Error(
          `Guest sign-in failed: ${r.error.message || "Enable anonymous sign-ins in Supabase, then retry."}`,
        );
      }
      session = r.data.session;
    }
    if (last && last !== session.user.id)
      throw Error(
        "Guest identity changed. Your previous shelf is preserved and will not be uploaded to this account.",
      );
    localStorage.setItem("cinetrack-uid", session.user.id);
    return session.user.id;
  })().finally(() => {
    initializing = null;
  });
  return initializing;
}
export async function currentSession(uid, refresh = false) {
  if (!supabase) throw Error("Configure Supabase to sync.");
  const result = refresh
    ? await supabase.auth.refreshSession()
    : await supabase.auth.getSession();
  if (
    result.error ||
    !result.data.session ||
    result.data.session.user.id !== uid
  ) {
    const e = Error(
      "Your session needs attention. Changes are safe on this device.",
    );
    e.status = 401;
    throw e;
  }
  return result.data.session;
}
export async function rest(
  table,
  { method = "GET", params = {}, data, uid, signal } = {},
  refreshed = false,
) {
  if (!supabase)
    throw Error(
      "Community catalog is not configured. Set the Supabase URL and publishable key.",
    );
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
  if (uid)
    headers.Authorization = `Bearer ${(await currentSession(uid)).access_token}`;
  try {
    const response = await axios({
      baseURL: `${supabaseUrl}/rest/v1`,
      url: `/${table}`,
      method,
      params,
      data,
      headers,
      signal,
      timeout: 12000,
    });
    if (["POST", "PATCH"].includes(method) && !response.data?.length)
      throw Error(
        "No row was saved. It may have been removed or permission was denied.",
      );
    return response.data;
  } catch (e) {
    if (e.response?.status === 401 && uid && !refreshed) {
      await currentSession(uid, true);
      return rest(table, { method, params, data, uid, signal }, true);
    }
    if (axios.isCancel(e)) throw e;
    const isTableMissing =
      e.response?.data?.code === "PGRST205" ||
      e.response?.status === 404 ||
      (typeof e.response?.data?.message === "string" &&
        e.response.data.message.includes("schema cache"));
    const err = Error(
      e.response?.data?.code === "23505"
        ? "This movie already exists in your collection."
        : e.response?.status === 403
          ? "Permission denied. Check your session and database policies."
          : isTableMissing
            ? `Table '${table}' not found in database. Run 'supabase/migrations/0001_init.sql' in your Supabase SQL Editor.`
            : e.response
              ? "The database could not save or load this item. Check the migration and try again."
              : e.message || "Network unavailable. Try again.",
    );
    err.status = e.response?.status || e.status;
    err.code = e.response?.data?.code;
    err.retryAfter = Number(e.response?.headers?.["retry-after"]) || 0;
    throw err;
  }
}
