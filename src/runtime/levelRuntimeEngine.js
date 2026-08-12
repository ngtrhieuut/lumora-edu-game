// Pure runtime contract for catalog levels.
// This module deliberately has no React, storage, network, or curriculum policy.

export const LEVEL_RUNTIME_SCHEMA_VERSION = 1;

const MAX_ERROR_CODES = 12;

const clampInt = (value, min, max) => {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
};

const clampRatio = (value, fallback = 0) => {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0, value));
};

const safeText = (value, fallback = "") => typeof value === "string" && value.trim() ? value.trim() : fallback;

const uniqueStrings = (values, limit = MAX_ERROR_CODES) => {
  if (!Array.isArray(values)) return [];
  const result = [];
  for (const value of values) {
    if (typeof value !== "string" || !value.trim()) continue;
    const normalized = value.trim();
    if (!result.includes(normalized)) result.push(normalized);
    if (result.length >= limit) break;
  }
  return result;
};

export function getRuntimePhaseIds(level) {
  const phaseCount = Number.isInteger(level?.boss?.phaseCount) && level.boss.phaseCount > 0
    ? level.boss.phaseCount
    : 0;
  return Object.freeze(Array.from({ length: phaseCount }, (_, index) => `${level.id}:phase-${index + 1}`));
}

export function deriveRuntimeMastery({ guided = false, supportsUsed = 0, accuracy = 1 } = {}) {
  if (guided) return 1;
  if (clampInt(supportsUsed, 0, 999) > 0) return 2;
  return clampRatio(accuracy, 1) >= 0.8 ? 3 : 2;
}

export function createLevelRuntimeState(level, { startedAt = null, phaseIds = getRuntimePhaseIds(level) } = {}) {
  if (!level || typeof level.id !== "string" || !level.id.trim()) {
    throw new TypeError("A catalog level with a stable id is required.");
  }
  const safePhaseIds = Array.isArray(phaseIds) ? phaseIds.filter((id) => typeof id === "string" && id.trim()) : [];
  const isBoss = safePhaseIds.length > 0;
  return {
    schemaVersion: LEVEL_RUNTIME_SCHEMA_VERSION,
    levelId: level.id,
    status: "ready",
    phaseIds: [...safePhaseIds],
    completedPhaseIds: [],
    phaseIndex: 0,
    attempts: 0,
    correctAttempts: 0,
    supportsUsed: 0,
    hintLevel: 0,
    guided: false,
    actions: 0,
    errorCodes: [],
    recoveryMeter: isBoss ? 100 : null,
    checkpoint: isBoss ? { phaseIndex: 0, completedPhaseIds: [] } : null,
    startedAt: safeText(startedAt, null),
    lastErrorCode: null,
  };
}

export function normalizeLevelRuntimeState(value, level, { phaseIds = getRuntimePhaseIds(level) } = {}) {
  const fallback = createLevelRuntimeState(level, { phaseIds });
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;

  const expectedPhaseIds = Array.isArray(phaseIds) ? phaseIds.filter((id) => typeof id === "string" && id.trim()) : [];
  const phaseSet = new Set(expectedPhaseIds);
  const completedPhaseIds = [];
  for (const phaseId of Array.isArray(value.completedPhaseIds) ? value.completedPhaseIds : []) {
    if (!phaseSet.has(phaseId)) break;
    if (completedPhaseIds.includes(phaseId)) break;
    if (phaseId !== expectedPhaseIds[completedPhaseIds.length]) break;
    completedPhaseIds.push(phaseId);
  }
  const phaseIndex = completedPhaseIds.length;
  const isBoss = expectedPhaseIds.length > 0;
  const attempts = clampInt(value.attempts, 0, 9999);
  const correctAttempts = Math.min(attempts, clampInt(value.correctAttempts, 0, 9999));
  const supportsUsed = clampInt(value.supportsUsed, 0, 9999);
  const status = value.status === "completed" ? "completed" : value.status === "playing" ? "playing" : "ready";
  return {
    ...fallback,
    status: isBoss && phaseIndex >= expectedPhaseIds.length ? "completed" : status,
    phaseIds: [...expectedPhaseIds],
    completedPhaseIds,
    phaseIndex,
    attempts,
    correctAttempts,
    supportsUsed,
    hintLevel: clampInt(value.hintLevel, 0, 3),
    guided: value.guided === true,
    actions: clampInt(value.actions, 0, 99999),
    errorCodes: uniqueStrings(value.errorCodes),
    recoveryMeter: isBoss ? clampInt(value.recoveryMeter, 0, 100) : null,
    checkpoint: isBoss ? {
      phaseIndex,
      completedPhaseIds: [...completedPhaseIds],
    } : null,
    startedAt: safeText(value.startedAt, null),
    lastErrorCode: safeText(value.lastErrorCode, null),
  };
}

export function startLevelRuntime(state) {
  if (!state || typeof state !== "object") return state;
  if (state.status === "completed") return state;
  return { ...state, status: "playing" };
}

export function recordRuntimeAction(state) {
  if (!state || typeof state !== "object") return state;
  return { ...state, actions: clampInt(state.actions, 0, 99999) + 1, status: state.status === "ready" ? "playing" : state.status };
}

export function recordRuntimeAttempt(state, { correct = false, errorCode = null } = {}) {
  if (!state || typeof state !== "object") return state;
  const nextErrorCode = safeText(errorCode, null);
  return {
    ...state,
    status: state.status === "ready" ? "playing" : state.status,
    attempts: clampInt(state.attempts, 0, 9999) + 1,
    correctAttempts: Math.min(9999, clampInt(state.correctAttempts, 0, 9999) + (correct ? 1 : 0)),
    errorCodes: nextErrorCode ? uniqueStrings([...(state.errorCodes ?? []), nextErrorCode]) : uniqueStrings(state.errorCodes),
    lastErrorCode: nextErrorCode ?? state.lastErrorCode ?? null,
    recoveryMeter: Array.isArray(state.phaseIds) && state.phaseIds.length > 0
      ? clampInt(state.recoveryMeter, 0, 100) - (correct ? 0 : 5) < 0
        ? 0
        : clampInt(state.recoveryMeter, 0, 100) - (correct ? 0 : 5)
      : null,
  };
}

export function recordRuntimeSupport(state, { hintLevel = 1, guided = false } = {}) {
  if (!state || typeof state !== "object") return state;
  return {
    ...state,
    supportsUsed: clampInt(state.supportsUsed, 0, 9999) + 1,
    hintLevel: Math.max(clampInt(state.hintLevel, 0, 3), clampInt(hintLevel, 0, 3)),
    guided: Boolean(state.guided || guided),
    status: state.status === "ready" ? "playing" : state.status,
  };
}

export function completeRuntimePhase(state, phaseId) {
  if (!state || !Array.isArray(state.phaseIds) || state.phaseIds.length === 0) {
    return { accepted: false, reason: "not-a-boss", state };
  }
  if (state.status === "completed" || state.phaseIndex >= state.phaseIds.length) {
    return { accepted: false, reason: "complete", state };
  }
  if (typeof phaseId !== "string" || !state.phaseIds.includes(phaseId)) {
    return { accepted: false, reason: "invalid-phase", state };
  }
  const expected = state.phaseIds[state.phaseIndex];
  if (phaseId !== expected) {
    return { accepted: false, reason: state.completedPhaseIds.includes(phaseId) ? "already-completed" : "out-of-order", state };
  }
  const completedPhaseIds = [...state.completedPhaseIds, phaseId];
  const complete = completedPhaseIds.length === state.phaseIds.length;
  const nextState = {
    ...state,
    status: complete ? "completed" : "playing",
    completedPhaseIds,
    phaseIndex: completedPhaseIds.length,
    checkpoint: { phaseIndex: completedPhaseIds.length, completedPhaseIds: [...completedPhaseIds] },
    recoveryMeter: 100,
  };
  return { accepted: true, reason: "completed", complete, state: nextState };
}

export function getActiveRuntimePhaseId(state) {
  if (!state || !Array.isArray(state.phaseIds) || state.phaseIndex >= state.phaseIds.length) return null;
  return state.phaseIds[state.phaseIndex] ?? null;
}

export function normalizeLevelResult(level, input = {}) {
  if (!level || typeof level.id !== "string" || !level.id.trim()) {
    throw new TypeError("A catalog level with a stable id is required.");
  }
  const attempts = Math.max(1, clampInt(input.attempts, 1, 9999));
  const supportsUsed = clampInt(input.supportsUsed, 0, 9999);
  const correctAttempts = clampInt(input.correctAttempts, 0, attempts);
  const accuracy = clampRatio(input.accuracy, correctAttempts > 0 ? correctAttempts / attempts : 1);
  const completed = input.completed !== false;
  const phaseIds = getRuntimePhaseIds(level);
  const phaseCount = phaseIds.length;
  const completedPhaseCount = input.completedPhaseCount === undefined
    ? phaseCount
    : clampInt(input.completedPhaseCount, 0, phaseCount);
  const errorCodes = uniqueStrings(input.errorCodes);
  const completedAt = safeText(input.completedAt, new Date().toISOString());
  return Object.freeze({
    levelId: level.id,
    skillId: safeText(input.skillId, level.skillId),
    mechanicId: safeText(input.mechanicId, level.mechanicId),
    completed,
    attempts,
    supportsUsed,
    guided: input.guided === true,
    actions: clampInt(input.actions, 0, 99999),
    durationSeconds: clampInt(input.durationSeconds, 0, 4 * 60 * 60),
    accuracy,
    errorCodes,
    mastery: clampInt(input.mastery, deriveRuntimeMastery({ guided: input.guided === true, supportsUsed, accuracy }), 3),
    completedPhaseCount,
    completedAt,
  });
}

export function finishLevelRuntime(state, level, { durationSeconds = 0, completedAt = null } = {}) {
  const normalized = normalizeLevelRuntimeState(state, level);
  const phaseCount = normalized.phaseIds.length;
  const bossComplete = phaseCount === 0 || normalized.phaseIndex >= phaseCount;
  const accuracy = normalized.attempts > 0 ? normalized.correctAttempts / normalized.attempts : 1;
  return normalizeLevelResult(level, {
    completed: bossComplete,
    attempts: normalized.attempts,
    correctAttempts: normalized.correctAttempts,
    supportsUsed: normalized.supportsUsed,
    guided: normalized.guided,
    actions: normalized.actions,
    durationSeconds,
    accuracy,
    errorCodes: normalized.errorCodes,
    completedPhaseCount: normalized.phaseIndex,
    completedAt,
  });
}
