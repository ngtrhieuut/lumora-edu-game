// Lumora local progress storage.
// Wraps a localStorage-like {getItem, setItem, removeItem} object so that
// gameplay never breaks on storage failure. Explicitly local/offline only —
// Firebase sync is a later integration and is deliberately NOT simulated.

/** Provider descriptor: local, offline, not Firebase. */
export const LOCAL_PROGRESS_PROVIDER = Object.freeze({
  id: "local-progress",
  kind: "storage",
  name: "Local progress store (browser localStorage)",
  local: true,
  offline: true,
  remote: false,
  syncsToFirebase: false,
  provider: "localStorage",
  note: "Local-first prototype store. Firebase is a later integration, not simulated.",
});

const isStorageLike = (storage) =>
  !!storage &&
  typeof storage.getItem === "function" &&
  typeof storage.setItem === "function" &&
  typeof storage.removeItem === "function";

/** @param {object} opts @param {object} [opts.storage] localStorage-like object
 *  @param {string} [opts.key] storage key */
export function createLocalProgressStore({ storage, key = "lumora.progress.v1" } = {}) {
  /** Load and JSON-parse progress. Never throws.
   *  Returns {status:"ok"|"empty"|"error", data, message?, error?}. */
  function load() {
    if (!isStorageLike(storage)) {
      return { status: "error", ok: false, data: null, message: "storage unavailable" };
    }
    let raw;
    try {
      raw = storage.getItem(key);
    } catch (error) {
      return { status: "error", ok: false, data: null, message: "storage.getItem failed", error };
    }
    if (raw == null) return { status: "empty", ok: false, data: null };
    try {
      return { status: "ok", ok: true, data: JSON.parse(raw) };
    } catch (error) {
      return { status: "error", ok: false, data: null, message: "corrupt JSON", error };
    }
  }

  /** Serialize and persist progress. Never throws. Returns {status:"ok"|"error"}. */
  function save(value) {
    if (!isStorageLike(storage)) {
      return { status: "error", ok: false, message: "storage unavailable" };
    }
    try {
      storage.setItem(key, JSON.stringify(value));
      return { status: "ok", ok: true };
    } catch (error) {
      return { status: "error", ok: false, message: "storage.setItem failed", error };
    }
  }

  /** Remove persisted progress. Never throws. Returns {status:"ok"|"error"}. */
  function clear() {
    if (!isStorageLike(storage)) {
      return { status: "error", ok: false, message: "storage unavailable" };
    }
    try {
      storage.removeItem(key);
      return { status: "ok", ok: true };
    } catch (error) {
      return { status: "error", ok: false, message: "storage.removeItem failed", error };
    }
  }

  return Object.freeze({ descriptor: LOCAL_PROGRESS_PROVIDER, load, save, clear });
}