// Lumora child profile storage. Local-first and deliberately minimal:
// only a short display alias and age band are kept on this browser.

export const LOCAL_PROFILE_PROVIDER = Object.freeze({
  id: "local-child-profile",
  kind: "profile",
  name: "Local child profile store",
  local: true,
  offline: true,
  remote: false,
  syncsToFirebase: false,
  personalDataFields: Object.freeze(["alias", "ageBand"]),
  note: "Profile stays on this browser. Firebase Auth/profile sync is not simulated.",
});

const isStorageLike = (storage) =>
  !!storage &&
  typeof storage.getItem === "function" &&
  typeof storage.setItem === "function" &&
  typeof storage.removeItem === "function";

export function normalizeChildProfile(value) {
  if (!value || typeof value !== "object") return null;
  const alias = typeof value.alias === "string"
    ? value.alias.trim().replace(/\s+/g, " ").slice(0, 16)
    : "";
  if (alias.length < 2) return null;
  return {
    alias,
    ageBand: value.ageBand === "7-8" ? "7-8" : "5-6",
  };
}

export function createLocalProfileStore({ storage, key = "lumora.child-profile.v1" } = {}) {
  function load() {
    if (!isStorageLike(storage)) return { status: "error", ok: false, data: null, message: "storage unavailable" };
    let raw;
    try {
      raw = storage.getItem(key);
    } catch (error) {
      return { status: "error", ok: false, data: null, message: "storage.getItem failed", error };
    }
    if (raw == null) return { status: "empty", ok: false, data: null };
    try {
      const data = normalizeChildProfile(JSON.parse(raw));
      return data
        ? { status: "ok", ok: true, data }
        : { status: "error", ok: false, data: null, message: "invalid profile" };
    } catch (error) {
      return { status: "error", ok: false, data: null, message: "corrupt JSON", error };
    }
  }

  function save(value) {
    if (!isStorageLike(storage)) return { status: "error", ok: false, message: "storage unavailable" };
    const data = normalizeChildProfile(value);
    if (!data) return { status: "error", ok: false, message: "invalid profile" };
    try {
      storage.setItem(key, JSON.stringify(data));
      return { status: "ok", ok: true, data };
    } catch (error) {
      return { status: "error", ok: false, message: "storage.setItem failed", error };
    }
  }

  function clear() {
    if (!isStorageLike(storage)) return { status: "error", ok: false, message: "storage unavailable" };
    try {
      storage.removeItem(key);
      return { status: "ok", ok: true };
    } catch (error) {
      return { status: "error", ok: false, message: "storage.removeItem failed", error };
    }
  }

  return Object.freeze({ descriptor: LOCAL_PROFILE_PROVIDER, load, save, clear });
}
