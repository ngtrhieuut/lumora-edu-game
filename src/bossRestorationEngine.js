// Pure, immutable state contract for Boss Restoration.
// Follows shapeWorkshopEngine conventions: every transition normalizes first,
// fails closed on malformed input, and returns { accepted, reason, state, complete }.
// No React, no storage, no UI imports.

// Canonical boss phases reuse their mechanic ids (gameplayPhases MULTI_STAGE_CONFIG.boss),
// in the single valid order [collect -> add -> pattern].
export const BOSS_PHASE_IDS = Object.freeze(["collect", "add", "pattern"]);

const FINAL_PHASE_INDEX = BOSS_PHASE_IDS.length - 1;

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// Accept only the exact canonical phase list (mechanic order, no dupes, no unknown
// ids, no missing phases). Any deviation falls back to the canonical list: a boss
// always has exactly three phases, so a malformed list can never shorten or reorder it.
function normalizePhaseIds(value) {
  if (!Array.isArray(value) || value.length !== BOSS_PHASE_IDS.length) return [...BOSS_PHASE_IDS];
  for (let i = 0; i < value.length; i += 1) {
    if (value[i] !== BOSS_PHASE_IDS[i]) return [...BOSS_PHASE_IDS];
  }
  return [...value];
}

// Keep only the contiguous completion prefix in the submitted order. Duplicated,
// unknown, skipped or out-of-order completions stop normalization so later phases
// never unlock early.
function normalizeCompletedPhaseIds(canonicalIds, completedValue) {
  if (!Array.isArray(completedValue)) return [];
  const completed = [];
  for (const id of completedValue) {
    if (id !== canonicalIds[completed.length]) break;
    completed.push(id);
  }
  return completed;
}

// Coherent canonical shape: phaseIndex is the next phase to complete (completed
// count), clamped to the final index once every phase is done.
function toState(phaseIds, completedPhaseIds) {
  const complete = completedPhaseIds.length === phaseIds.length;
  return {
    phaseIds,
    completedPhaseIds,
    phaseIndex: Math.min(completedPhaseIds.length, FINAL_PHASE_INDEX),
    complete,
  };
}

export function createBossRestorationState(options = {}) {
  const safe = isPlainObject(options) ? options : {};
  return toState(normalizePhaseIds(safe.phaseIds), []);
}

export function normalizeBossRestorationState(value, options = {}) {
  const safeValue = isPlainObject(value) ? value : {};
  const safeOptions = isPlainObject(options) ? options : {};
  const phaseIds = normalizePhaseIds(
    Array.isArray(safeValue.phaseIds) ? safeValue.phaseIds : safeOptions.phaseIds,
  );
  const completedPhaseIds = normalizeCompletedPhaseIds(phaseIds, safeValue.completedPhaseIds);
  return toState(phaseIds, completedPhaseIds);
}

/** Id of the phase the player must complete next, or null when the boss is restored. */
export function getActiveBossPhase(state) {
  const normalized = normalizeBossRestorationState(state);
  if (normalized.complete) return null;
  return normalized.phaseIds[normalized.phaseIndex] ?? null;
}

export function completeBossPhase(state, phaseId) {
  const normalized = normalizeBossRestorationState(state);
  if (normalized.complete) {
    return { accepted: false, reason: "complete", state: normalized, complete: true };
  }
  if (typeof phaseId !== "string" || !normalized.phaseIds.includes(phaseId)) {
    return { accepted: false, reason: "invalid-phase", state: normalized, complete: false };
  }
  if (phaseId !== normalized.phaseIds[normalized.phaseIndex]) {
    const reason = normalized.completedPhaseIds.includes(phaseId)
      ? "already-completed"
      : "out-of-order";
    return { accepted: false, reason, state: normalized, complete: false };
  }
  const next = toState(normalized.phaseIds, [...normalized.completedPhaseIds, phaseId]);
  return { accepted: true, reason: "completed", state: next, complete: next.complete };
}

export function isBossRestorationComplete(state) {
  return normalizeBossRestorationState(state).complete;
}
