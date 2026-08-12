// Pure, local-only active-play draft helpers.
// The draft is intentionally smaller than gameplay state so it is safe to
// persist locally and easy for App integration to validate at the boundary.

export const PLAY_SESSION_DRAFT_VERSION = 1;
export const PLAY_SESSION_DRAFT_STORAGE_KEY = "lumora-play-session-draft-v1";

/** Provider descriptor: local, offline, and deliberately not cloud-synced. */
export const LOCAL_PLAY_SESSION_DRAFT_PROVIDER = Object.freeze({
  id: "local-play-session-draft",
  kind: "storage",
  name: "Local active-play draft store",
  local: true,
  localOnly: true,
  offline: true,
  remote: false,
  cloud: false,
  notCloud: true,
  syncsToCloud: false,
  syncsToFirebase: false,
  provider: "localStorage",
  note: "Active-play drafts stay on this browser and are not a cloud or progression record.",
});

const MODES = new Set(["main", "quest"]);
const MIN_PHASE_COUNT = 1;
const MAX_PHASE_COUNT = 3;

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

function cleanId(value) {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return id.length > 0 ? id : null;
}

function makeIdSet(value) {
  const source = Array.isArray(value)
    ? value
    : value instanceof Set
      ? [...value]
      : [];
  return new Set(source.map(cleanId).filter(Boolean));
}

function pickId(value, allowedIds) {
  const id = cleanId(value);
  return id && (!allowedIds || allowedIds.has(id)) ? id : null;
}

function clampPhaseCount(value, fallback = MIN_PHASE_COUNT) {
  const safeFallback = Number.isFinite(fallback)
    ? Math.min(MAX_PHASE_COUNT, Math.max(MIN_PHASE_COUNT, Math.trunc(fallback)))
    : MIN_PHASE_COUNT;
  if (!Number.isFinite(value)) return safeFallback;
  return Math.min(MAX_PHASE_COUNT, Math.max(MIN_PHASE_COUNT, Math.trunc(value)));
}

function clampPhaseIndex(value, phaseCount, fallback = 0) {
  const maxIndex = Math.max(0, phaseCount - 1);
  const safeFallback = Number.isFinite(fallback)
    ? Math.min(maxIndex, Math.max(0, Math.trunc(fallback)))
    : 0;
  if (!Number.isFinite(value)) return safeFallback;
  return Math.min(maxIndex, Math.max(0, Math.trunc(value)));
}

function canonicalizeTimestamp(value) {
  let date;
  if (value instanceof Date) {
    date = new Date(value.getTime());
  } else if (typeof value === "number" && Number.isFinite(value)) {
    date = new Date(value);
  } else if (typeof value === "string" && value.trim()) {
    date = new Date(value.trim());
  } else {
    return null;
  }

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function resolveNow(value) {
  let candidate = value;
  if (typeof candidate === "function") {
    try {
      candidate = candidate();
    } catch {
      candidate = null;
    }
  }
  return canonicalizeTimestamp(candidate) ?? new Date().toISOString();
}

function freezeDraft(draft) {
  return Object.freeze(draft);
}

function buildDraft(value, {
  allowedNodeIds = null,
  allowedQuestIds = null,
  allowUnlistedIds = false,
  now,
  requireVersion = false,
} = {}) {
  if (!isRecord(value)) return null;
  if (requireVersion && value.version !== PLAY_SESSION_DRAFT_VERSION) return null;

  const mode = value.mode === undefined ? "main" : value.mode;
  if (!MODES.has(mode)) return null;

  const nodeId = pickId(value.nodeId, allowUnlistedIds ? null : allowedNodeIds);
  if (!nodeId) return null;

  let questId = null;
  if (mode === "quest") {
    questId = pickId(value.questId, allowUnlistedIds ? null : allowedQuestIds);
    if (!questId) return null;
  }

  const phaseCount = clampPhaseCount(value.phaseCount);
  const phaseIndex = clampPhaseIndex(value.phaseIndex, phaseCount);
  const fallbackNow = resolveNow(now);
  const startedAt = canonicalizeTimestamp(value.startedAt) ?? fallbackNow;
  const updatedAt = canonicalizeTimestamp(value.updatedAt) ?? fallbackNow;
  const draft = {
    version: PLAY_SESSION_DRAFT_VERSION,
    mode,
    nodeId,
  };

  if (mode === "quest") draft.questId = questId;
  draft.phaseIndex = phaseIndex;
  draft.phaseCount = phaseCount;
  draft.startedAt = startedAt;
  draft.updatedAt = updatedAt;
  return freezeDraft(draft);
}

/** Create a canonical active-play draft. IDs are structurally validated here. */
export function createPlaySessionDraft(input = {}) {
  try {
    if (!isRecord(input)) return null;

    const hasNodeAllowlist = hasOwn(input, "validNodeIds");
    const hasQuestAllowlist = hasOwn(input, "validQuestIds");
    const hasAnyAllowlist = hasNodeAllowlist || hasQuestAllowlist;

    return buildDraft(input, {
      allowedNodeIds: hasNodeAllowlist ? makeIdSet(input.validNodeIds) : hasAnyAllowlist ? new Set() : null,
      allowedQuestIds: hasQuestAllowlist ? makeIdSet(input.validQuestIds) : hasAnyAllowlist ? new Set() : null,
      allowUnlistedIds: !hasAnyAllowlist,
      now: input.now,
    });
  } catch {
    return null;
  }
}

/**
 * Validate and canonicalize a draft at the current content boundary.
 * Missing allowlists are empty by design: persisted IDs are never trusted
 * without the caller's current node and quest registries.
 */
export function normalizePlaySessionDraft(value, options = {}) {
  try {
    if (!isRecord(value) || value.version !== PLAY_SESSION_DRAFT_VERSION) return null;
    const safeOptions = isRecord(options) ? options : {};
    return buildDraft(value, {
      allowedNodeIds: makeIdSet(safeOptions.validNodeIds),
      allowedQuestIds: makeIdSet(safeOptions.validQuestIds),
      allowUnlistedIds: false,
      now: safeOptions.now,
      requireVersion: true,
    });
  } catch {
    return null;
  }
}

/** Advance one immutable draft, applying only bounded phase/timestamp fields. */
export function advancePlaySessionDraft(draft, patch = {}) {
  try {
    if (!isRecord(draft)) return null;
    if (patch !== undefined && !isRecord(patch)) return null;

    const safePatch = patch ?? {};
    const base = buildDraft(draft, {
      allowUnlistedIds: true,
      now: safePatch.now,
      requireVersion: true,
    });
    if (!base) return null;

    const hasPhaseCount = hasOwn(safePatch, "phaseCount");
    const phaseCount = hasPhaseCount
      ? clampPhaseCount(safePatch.phaseCount, base.phaseCount)
      : base.phaseCount;

    let phaseIndex;
    if (hasOwn(safePatch, "phaseIndex")) {
      phaseIndex = clampPhaseIndex(safePatch.phaseIndex, phaseCount, base.phaseIndex);
    } else if (hasPhaseCount) {
      phaseIndex = clampPhaseIndex(base.phaseIndex, phaseCount, base.phaseIndex);
    } else {
      const rawStep = hasOwn(safePatch, "advanceBy")
        ? safePatch.advanceBy
        : hasOwn(safePatch, "phaseDelta")
          ? safePatch.phaseDelta
          : 1;
      const step = Number.isFinite(rawStep) ? Math.trunc(rawStep) : 1;
      phaseIndex = clampPhaseIndex(base.phaseIndex + step, phaseCount, base.phaseIndex);
    }

    const updatedAt = canonicalizeTimestamp(safePatch.updatedAt)
      ?? resolveNow(safePatch.now);
    return freezeDraft({
      ...base,
      phaseIndex,
      phaseCount,
      updatedAt,
    });
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

/** JSON-only local storage boundary. Content allowlists remain the caller's responsibility. */
export function createPlaySessionDraftStore(input = {}) {
  const options = isRecord(input) ? input : {};
  const storage = options.storage;
  const key = typeof options.key === "string" && options.key.trim()
    ? options.key
    : PLAY_SESSION_DRAFT_STORAGE_KEY;

  function load() {
    if (!hasStorageMethod(storage, "getItem")) return unavailableResult();
    try {
      const raw = storage.getItem(key);
      if (raw == null) return { status: "empty", ok: false, data: null };
      const parsed = JSON.parse(raw);
      const data = createPlaySessionDraft(parsed);
      return data
        ? { status: "ok", ok: true, data }
        : { status: "error", ok: false, data: null, message: "invalid draft" };
    } catch (error) {
      return { status: "error", ok: false, data: null, message: "corrupt JSON", error };
    }
  }

  function save(value) {
    if (!hasStorageMethod(storage, "setItem")) return unavailableResult();
    const data = createPlaySessionDraft(value);
    if (!data) return { status: "error", ok: false, data: null, message: "invalid draft" };
    try {
      storage.setItem(key, JSON.stringify(data));
      return { status: "ok", ok: true, data };
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

  return Object.freeze({ descriptor: LOCAL_PLAY_SESSION_DRAFT_PROVIDER, load, save, clear });
}
