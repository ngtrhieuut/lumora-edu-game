export const SESSION_COMPASS_PREFERENCE_KEY = "lumora-session-compass-preferences-v1";
export const SESSION_COMPASS_STATE_KEY = "lumora-session-compass-tab-v1";
export const SESSION_LIMIT_OPTIONS = Object.freeze([10, 15, 20, 30]);
export const SAFE_BREAK_VIEWS = Object.freeze(["home", "map", "city", "creature", "league", "practice-intro", "practice-checkpoint", "practice-summary"]);

const DEFAULT_PREFERENCES = Object.freeze({ enabled: true, limitMinutes: 20 });
const MAX_ACTIVE_SECONDS = 12 * 60 * 60;

const clampInt = (value, min, max) => Number.isFinite(Number(value))
  ? Math.min(max, Math.max(min, Math.trunc(Number(value))))
  : min;

export function normalizeSessionPreferences(value) {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    enabled: typeof input.enabled === "boolean" ? input.enabled : DEFAULT_PREFERENCES.enabled,
    limitMinutes: SESSION_LIMIT_OPTIONS.includes(Number(input.limitMinutes)) ? Number(input.limitMinutes) : DEFAULT_PREFERENCES.limitMinutes,
  };
}

export function createSessionCompassState(value, preferences = DEFAULT_PREFERENCES) {
  const prefs = normalizeSessionPreferences(preferences);
  const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const activeSeconds = clampInt(input.activeSeconds, 0, MAX_ACTIVE_SECONDS);
  const status = input.status === "paused" ? "paused" : "active";
  const reminderCount = clampInt(input.reminderCount, 0, 1000);
  const threshold = prefs.limitMinutes * 60;
  return {
    activeSeconds,
    status,
    reminderPending: prefs.enabled && status === "active" && (Boolean(input.reminderPending) || activeSeconds >= threshold),
    reminderCount,
  };
}

export function advanceSessionCompass(state, seconds = 1, preferences = DEFAULT_PREFERENCES, isActive = true) {
  const prefs = normalizeSessionPreferences(preferences);
  const current = createSessionCompassState(state, prefs);
  if (!prefs.enabled) return { ...current, reminderPending: false };
  if (!isActive || current.status !== "active") return current;
  const increment = clampInt(seconds, 0, 5);
  const activeSeconds = Math.min(MAX_ACTIVE_SECONDS, current.activeSeconds + increment);
  return {
    ...current,
    activeSeconds,
    reminderPending: current.reminderPending || activeSeconds >= prefs.limitMinutes * 60,
  };
}

export function shouldPresentSessionBreak(state, view, preferences = DEFAULT_PREFERENCES) {
  const prefs = normalizeSessionPreferences(preferences);
  const current = createSessionCompassState(state, prefs);
  return prefs.enabled && (current.reminderPending || current.status === "paused") && SAFE_BREAK_VIEWS.includes(view);
}

export function pauseForSessionBreak(state, preferences = DEFAULT_PREFERENCES) {
  const current = createSessionCompassState(state, preferences);
  return {
    ...current,
    status: "paused",
    reminderPending: false,
    reminderCount: current.reminderCount + 1,
  };
}

export function continueForOneStage(state, preferences = DEFAULT_PREFERENCES) {
  const prefs = normalizeSessionPreferences(preferences);
  const current = createSessionCompassState(state, prefs);
  return {
    ...current,
    activeSeconds: Math.max(0, prefs.limitMinutes * 60 - 5 * 60),
    status: "active",
    reminderPending: false,
  };
}

export function startFreshSession(state, preferences = DEFAULT_PREFERENCES) {
  const current = createSessionCompassState(state, preferences);
  return { activeSeconds: 0, status: "active", reminderPending: false, reminderCount: current.reminderCount };
}

export function getSessionCompassDisplay(state, preferences = DEFAULT_PREFERENCES) {
  const prefs = normalizeSessionPreferences(preferences);
  const current = createSessionCompassState(state, prefs);
  if (!prefs.enabled) return { tone: "off", label: "Nhắc nghỉ đang tắt", percent: 0 };
  const percent = Math.min(100, Math.round((current.activeSeconds / (prefs.limitMinutes * 60)) * 100));
  if (current.status === "paused") return { tone: "pause", label: "Đang nghỉ một chút", percent };
  if (current.reminderPending || percent >= 85) return { tone: "soon", label: "Sắp đến nhịp nghỉ", percent };
  return { tone: "steady", label: "Phiên cân bằng", percent };
}

function createJsonStore({ storage, key, normalize, fallback }) {
  function load() {
    if (!storage || typeof storage.getItem !== "function") return { ok: false, status: "unavailable", data: fallback() };
    try {
      const raw = storage.getItem(key);
      if (raw == null) return { ok: true, status: "empty", data: fallback() };
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { ok: false, status: "corrupt", data: fallback() };
      return { ok: true, status: "loaded", data: normalize(parsed) };
    } catch {
      return { ok: false, status: "corrupt", data: fallback() };
    }
  }

  function save(value) {
    const data = normalize(value);
    if (!storage || typeof storage.setItem !== "function") return { ok: false, status: "unavailable", data };
    try {
      storage.setItem(key, JSON.stringify(data));
      return { ok: true, status: "saved", data };
    } catch {
      return { ok: false, status: "error", data };
    }
  }

  return Object.freeze({ load, save });
}

export function createSessionPreferenceStore({ storage, key = SESSION_COMPASS_PREFERENCE_KEY } = {}) {
  return createJsonStore({ storage, key, normalize: normalizeSessionPreferences, fallback: () => normalizeSessionPreferences() });
}

export function createSessionStateStore({ storage, preferences, key = SESSION_COMPASS_STATE_KEY } = {}) {
  const prefs = normalizeSessionPreferences(preferences);
  return createJsonStore({ storage, key, normalize: (value) => createSessionCompassState(value, prefs), fallback: () => createSessionCompassState(null, prefs) });
}
