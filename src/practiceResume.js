import {
  advancePracticeSession,
  createPracticeSession,
  isPracticeSessionComplete,
} from "./practiceEngine.js";

export const PRACTICE_RESUME_VERSION = 1;
export const PRACTICE_RESUME_SCHEMA = "practice-resume";
export const PRACTICE_RESUME_STORAGE_KEY = "lumora-practice-resume-v1";
export const PRACTICE_RESUME_PHASES = Object.freeze([
  "practice-intro",
  "practice-play",
  "practice-checkpoint",
  "practice-puzzle",
  "practice-discovery",
]);

/** Provider descriptor: local, offline, and deliberately not cloud-synced. */
export const LOCAL_PRACTICE_RESUME_PROVIDER = Object.freeze({
  id: "local-practice-resume",
  kind: "storage",
  name: "Local Daily Adventure resume store",
  local: true,
  offline: true,
  remote: false,
  syncsToCloud: false,
  syncsToFirebase: false,
  provider: "localStorage",
  note: "Daily Adventure resume stays on this browser and is not a progression or cloud record.",
});

const DIRECT_MECHANIC_TYPES = new Set([
  "collect",
  "match",
  "bridge",
  "path",
  "subtract",
  "sort",
  "shape",
  "rune",
  "scenario",
]);

const DEFAULT_PHASE = PRACTICE_RESUME_PHASES[0];

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const isValidId = (value) => typeof value === "string" && value.trim().length > 0;

function normalizeDateKey(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null;
}

function normalizePhase(value) {
  return PRACTICE_RESUME_PHASES.includes(value) ? value : DEFAULT_PHASE;
}

function freezeDeep(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  Object.values(value).forEach((child) => freezeDeep(child, seen));
  return Object.freeze(value);
}

function getDirectNodeIds(nodeDefinitions) {
  if (!Array.isArray(nodeDefinitions)) return null;

  const ids = new Set();
  for (const node of nodeDefinitions) {
    if (!isRecord(node) || !isValidId(node.id) || !DIRECT_MECHANIC_TYPES.has(node.type)) continue;
    ids.add(node.id.trim());
  }
  return ids;
}

function normalizeQueue(value, directNodeIds = null) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 3) return null;

  const queue = [];
  for (const rawId of value) {
    if (!isValidId(rawId)) return null;
    const id = rawId.trim();
    if (directNodeIds && !directNodeIds.has(id)) return null;
    queue.push(id);
  }
  return queue;
}

function hasCompatibleVersion(value) {
  if (value.version !== PRACTICE_RESUME_VERSION) return false;
  if (hasOwn(value, "schema") && value.schema !== PRACTICE_RESUME_SCHEMA) return false;
  if (
    hasOwn(value, "schemaVersion") &&
    value.schemaVersion !== PRACTICE_RESUME_VERSION &&
    value.schemaVersion !== String(PRACTICE_RESUME_VERSION)
  ) {
    return false;
  }
  return true;
}

function normalizeSession(value, directNodeIds = null) {
  if (!isRecord(value) || !Array.isArray(value.completed)) return null;

  const queue = normalizeQueue(value.queue, directNodeIds);
  if (!queue || !Number.isInteger(value.currentIndex) || value.currentIndex < 0) return null;
  if (value.currentIndex >= queue.length || value.completed.length !== value.currentIndex) return null;

  let session = createPracticeSession(queue, { startedAt: value.startedAt });
  if (!session) return null;

  for (let index = 0; index < value.completed.length; index += 1) {
    const result = value.completed[index];
    if (!isRecord(result) || result.nodeId !== queue[index]) return null;

    const next = advancePracticeSession(session, result);
    if (next.currentIndex !== index + 1 || next.completed.length !== index + 1) return null;
    session = next;
  }

  if (session.currentIndex !== value.currentIndex || isPracticeSessionComplete(session)) return null;
  return session;
}

function normalizeExpectedDate(value, options) {
  const dateKey = normalizeDateKey(value);
  if (!dateKey) return null;
  if (options === undefined) return dateKey;
  if (!isRecord(options)) return null;
  if (hasOwn(options, "dateKey")) {
    const expectedDateKey = normalizeDateKey(options.dateKey);
    if (!expectedDateKey || expectedDateKey !== dateKey) return null;
  }
  return dateKey;
}

function makePracticeResume(session, phase, dateKey) {
  return freezeDeep({
    version: PRACTICE_RESUME_VERSION,
    dateKey,
    phase: normalizePhase(phase),
    session,
  });
}

/**
 * Validate and canonicalize a persisted Daily Adventure resume.
 * Storage is intentionally kept separate: callers pass parsed storage data here.
 */
export function normalizePracticeResume(value, nodeDefinitions, options = {}) {
  try {
    if (!isRecord(value) || !hasCompatibleVersion(value)) return null;

    const dateKey = normalizeExpectedDate(value.dateKey, options);
    const directNodeIds = getDirectNodeIds(nodeDefinitions);
    if (!dateKey || !directNodeIds || directNodeIds.size === 0) return null;

    const session = normalizeSession(value.session, directNodeIds);
    return session ? makePracticeResume(session, value.phase, dateKey) : null;
  } catch {
    return null;
  }
}

/** Create an immutable, canonical local resume before it is written to storage. */
export function createPracticeResume(input = {}) {
  try {
    if (!isRecord(input)) return null;

    const dateKey = normalizeExpectedDate(input.dateKey);
    const session = normalizeSession(input.session);
    return dateKey && session ? makePracticeResume(session, input.phase, dateKey) : null;
  } catch {
    return null;
  }
}

function hasStorageMethod(storage, method) {
  try {
    return !!storage && typeof storage[method] === "function";
  } catch {
    return false;
  }
}

function unavailableResult() {
  return { status: "error", ok: false, data: null, message: "storage unavailable" };
}

/**
 * A JSON-only localStorage boundary. It never normalizes payloads; callers
 * must pass loaded data through normalizePracticeResume with current nodes/date.
 */
export function createPracticeResumeStore(input = {}) {
  const options = isRecord(input) ? input : {};
  const storage = options.storage;
  const key = isValidId(options.key) ? options.key : PRACTICE_RESUME_STORAGE_KEY;

  function load() {
    if (!hasStorageMethod(storage, "getItem")) return unavailableResult();
    try {
      const raw = storage.getItem(key);
      if (raw == null) return { status: "empty", ok: false, data: null };
      return { status: "ok", ok: true, data: JSON.parse(raw) };
    } catch (error) {
      return { status: "error", ok: false, data: null, message: "corrupt JSON", error };
    }
  }

  function save(value) {
    if (!hasStorageMethod(storage, "setItem")) return unavailableResult();
    try {
      const serialized = JSON.stringify(value);
      if (serialized === undefined) return { status: "error", ok: false, data: null, message: "invalid value" };
      storage.setItem(key, serialized);
      return { status: "ok", ok: true, data: value };
    } catch (error) {
      return { status: "error", ok: false, data: null, message: "storage.setItem failed", error };
    }
  }

  function clear() {
    if (!hasStorageMethod(storage, "removeItem")) return unavailableResult();
    try {
      storage.removeItem(key);
      return { status: "ok", ok: true };
    } catch (error) {
      return { status: "error", ok: false, message: "storage.removeItem failed", error };
    }
  }

  return Object.freeze({ descriptor: LOCAL_PRACTICE_RESUME_PROVIDER, load, save, clear });
}
