// Pure, local-first and fail-closed state contract for Environmental Restoration.
// The engine owns only the finite simulation data; presentation and persistence
// stay outside this module.

export const ENVIRONMENT_RESTORATION_SCHEMA_VERSION = 1;

const MAX_ID_LENGTH = 96;
const MAX_TEXT_LENGTH = 240;
const MAX_ICON_LENGTH = 32;
const MAX_COLLECTION_SIZE = 1000;
const MAX_COUNTER = Number.MAX_SAFE_INTEGER;
const RESERVED_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const DEFAULT_INVALID_MODE = "environment-restoration";

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return value;
}

function normalizeId(value) {
  if (typeof value !== "string") return null;
  const id = value.trim();
  if (!id || id.length > MAX_ID_LENGTH || /[\u0000-\u001f\u007f]/.test(id)) return null;
  if (RESERVED_KEYS.has(id.toLowerCase())) return null;
  return id;
}

function normalizeText(value, maxLength = MAX_TEXT_LENGTH) {
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/\s+/g, " ");
  if (!text || text.length > maxLength || /[\u0000-\u001f\u007f]/.test(text)) return null;
  return text;
}

function normalizeOptionalText(input, field, maxLength) {
  if (!hasOwn(input, field)) return { valid: true, value: undefined };
  const value = normalizeText(input[field], maxLength);
  return value === null ? { valid: false, value: null } : { valid: true, value };
}

function normalizeFiniteNumber(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Object.is(value, -0) ? 0 : value;
}

function normalizeCounter(value, maximum = MAX_COUNTER) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(maximum, Math.max(0, Math.trunc(value)));
}

function normalizeConfigCounter(value, minimum, maximum) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const counter = Math.trunc(value);
  if (counter < minimum || counter > maximum) return null;
  return counter;
}

function clampValue(value, variable) {
  const numeric = normalizeFiniteNumber(value);
  const safeValue = numeric === null ? variable.initial : numeric;
  return Math.min(variable.max, Math.max(variable.min, safeValue));
}

function normalizeTimestamp(value) {
  if (typeof value !== "string") return null;
  const timestamp = value.trim();
  if (!timestamp || timestamp.length > 96 || /[\u0000-\u001f\u007f]/.test(timestamp)) return null;
  // A timestamp field is canonical state, but an obvious email is not a
  // timestamp and must not be allowed to persist through this boundary.
  if (timestamp.includes("@")) return null;
  return timestamp;
}

function normalizeSeed(value, fallback) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string") {
    const seed = value.trim();
    if (/^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}$/.test(seed)) return seed;
  }
  return fallback;
}

function deriveSeed(activityId) {
  let hash = 2166136261;
  for (let index = 0; index < activityId.length; index += 1) {
    hash ^= activityId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function incrementCounter(value) {
  return value >= MAX_COUNTER ? MAX_COUNTER : value + 1;
}

function normalizeVariable(rawVariable) {
  if (!isRecord(rawVariable)) return null;
  const id = normalizeId(rawVariable.id);
  const min = normalizeFiniteNumber(rawVariable.min);
  const max = normalizeFiniteNumber(rawVariable.max);
  const initial = normalizeFiniteNumber(rawVariable.initial);
  const target = normalizeFiniteNumber(rawVariable.target);
  if (
    id === null ||
    min === null ||
    max === null ||
    initial === null ||
    target === null ||
    min > max ||
    initial < min ||
    initial > max ||
    target < min ||
    target > max
  ) return null;

  const label = normalizeOptionalText(rawVariable, "label", MAX_TEXT_LENGTH);
  const icon = normalizeOptionalText(rawVariable, "icon", MAX_ICON_LENGTH);
  if (!label.valid || !icon.valid) return null;

  const variable = { id, min, max, initial, target };
  if (label.value !== undefined) variable.label = label.value;
  if (icon.value !== undefined) variable.icon = icon.value;
  return variable;
}

function normalizeAction(rawAction, variableIds) {
  if (!isRecord(rawAction)) return null;
  const id = normalizeId(rawAction.id);
  const variableId = normalizeId(rawAction.variableId);
  const delta = normalizeFiniteNumber(rawAction.delta);
  const maxUses = normalizeConfigCounter(rawAction.maxUses, 1, MAX_COUNTER);
  if (id === null || variableId === null || delta === null || delta === 0 || maxUses === null || !variableIds.has(variableId)) return null;

  const label = normalizeOptionalText(rawAction, "label", MAX_TEXT_LENGTH);
  const icon = normalizeOptionalText(rawAction, "icon", MAX_ICON_LENGTH);
  if (!label.valid || !icon.valid) return null;

  const action = { id, variableId, delta, maxUses };
  if (label.value !== undefined) action.label = label.value;
  if (icon.value !== undefined) action.icon = icon.value;
  return action;
}

function normalizeConstraints(input) {
  if (!isRecord(input)) return null;
  const maxActions = normalizeConfigCounter(input.maxActions, 0, MAX_COUNTER);
  const softTimeLimit = normalizeConfigCounter(input.softTimeLimit, 0, MAX_COUNTER);
  if (maxActions === null || softTimeLimit === null) return null;
  return { maxActions, softTimeLimit };
}

/** Normalize only the engine-owned Environmental Restoration config contract. */
export function normalizeEnvironmentRestorationConfig(input) {
  if (!isRecord(input)) return null;

  const id = normalizeId(input.id);
  const mode = normalizeText(input.mode, 48);
  const sourceNodeId = normalizeId(input.sourceNodeId);
  const cityFeatureId = normalizeId(input.cityFeatureId);
  if (id === null || mode === null || sourceNodeId === null || cityFeatureId === null) return null;

  if (!Array.isArray(input.variables) || input.variables.length === 0 || input.variables.length > MAX_COLLECTION_SIZE) return null;
  const variableIds = new Set();
  const variables = [];
  for (const rawVariable of input.variables) {
    const variable = normalizeVariable(rawVariable);
    if (!variable || variableIds.has(variable.id)) return null;
    variableIds.add(variable.id);
    variables.push(variable);
  }

  if (!Array.isArray(input.actions) || input.actions.length === 0 || input.actions.length > MAX_COLLECTION_SIZE) return null;
  const actionIds = new Set();
  const actions = [];
  for (const rawAction of input.actions) {
    const action = normalizeAction(rawAction, variableIds);
    if (!action || actionIds.has(action.id)) return null;
    actionIds.add(action.id);
    actions.push(action);
  }

  const constraints = normalizeConstraints(input.constraints);
  if (!constraints) return null;

  return deepFreeze({ id, mode, sourceNodeId, variables, actions, constraints, cityFeatureId });
}

function createInvalidState(input = {}) {
  const safeInput = isRecord(input) ? input : {};
  return deepFreeze({
    schemaVersion: ENVIRONMENT_RESTORATION_SCHEMA_VERSION,
    activityId: "",
    mode: DEFAULT_INVALID_MODE,
    seed: normalizeSeed(safeInput.seed, 0),
    phase: "active",
    values: {},
    usedActions: {},
    actions: 0,
    mistakes: 0,
    supportsUsed: 0,
    startedAt: normalizeTimestamp(safeInput.startedAt),
    completedAt: null,
  });
}

function isCompleteValues(values, config) {
  return config.variables.every((variable) => values[variable.id] === variable.target);
}

function normalizeUsedActions(value, config) {
  const usedActions = {};
  if (!isRecord(value)) return usedActions;
  for (const action of config.actions) {
    const count = normalizeCounter(value[action.id], action.maxUses);
    if (count > 0) usedActions[action.id] = count;
  }
  return usedActions;
}

function sumUsedActions(usedActions, config) {
  let total = 0;
  for (const action of config.actions) {
    total = Math.min(MAX_COUNTER, total + (usedActions[action.id] ?? 0));
  }
  return total;
}

/** Create a deterministic local state; options outside the state allowlist are ignored. */
export function createEnvironmentRestorationState(config, options = {}) {
  const canonicalConfig = normalizeEnvironmentRestorationConfig(config);
  if (!canonicalConfig) return createInvalidState(options);
  const safeOptions = isRecord(options) ? options : {};
  const values = {};
  for (const variable of canonicalConfig.variables) values[variable.id] = variable.initial;

  return normalizeEnvironmentRestorationState({
    schemaVersion: ENVIRONMENT_RESTORATION_SCHEMA_VERSION,
    activityId: canonicalConfig.id,
    mode: canonicalConfig.mode,
    seed: normalizeSeed(safeOptions.seed, deriveSeed(canonicalConfig.id)),
    phase: "active",
    values,
    usedActions: {},
    actions: normalizeCounter(safeOptions.actions, canonicalConfig.constraints.maxActions),
    mistakes: normalizeCounter(safeOptions.mistakes),
    supportsUsed: normalizeCounter(safeOptions.supportsUsed),
    startedAt: normalizeTimestamp(safeOptions.startedAt),
    completedAt: normalizeTimestamp(safeOptions.completedAt),
  }, canonicalConfig);
}

/** Normalize persisted/caller state against the canonical config without trusting extra fields. */
export function normalizeEnvironmentRestorationState(state, config) {
  const canonicalConfig = normalizeEnvironmentRestorationConfig(config);
  if (!canonicalConfig) return createInvalidState(state);
  const safeState = isRecord(state) ? state : {};
  const rawValues = isRecord(safeState.values) ? safeState.values : {};
  const values = {};
  for (const variable of canonicalConfig.variables) {
    values[variable.id] = clampValue(hasOwn(rawValues, variable.id) ? rawValues[variable.id] : variable.initial, variable);
  }

  const usedActions = normalizeUsedActions(safeState.usedActions, canonicalConfig);
  const usedCount = sumUsedActions(usedActions, canonicalConfig);
  const rawActions = normalizeCounter(safeState.actions, canonicalConfig.constraints.maxActions);
  const actions = Math.min(canonicalConfig.constraints.maxActions, Math.max(rawActions, usedCount));
  const mistakes = Math.min(normalizeCounter(safeState.mistakes), actions);
  const complete = isCompleteValues(values, canonicalConfig);

  return deepFreeze({
    schemaVersion: ENVIRONMENT_RESTORATION_SCHEMA_VERSION,
    activityId: canonicalConfig.id,
    mode: canonicalConfig.mode,
    seed: normalizeSeed(safeState.seed, deriveSeed(canonicalConfig.id)),
    phase: complete ? "complete" : "active",
    values,
    usedActions,
    actions,
    mistakes,
    supportsUsed: normalizeCounter(safeState.supportsUsed),
    startedAt: normalizeTimestamp(safeState.startedAt),
    completedAt: complete ? normalizeTimestamp(safeState.completedAt) : null,
  });
}

/** Return the single variable target for an available action, or an empty allowlist. */
export function getEnvironmentRestorationTargetIds(config, actionId, state) {
  const canonicalConfig = normalizeEnvironmentRestorationConfig(config);
  if (!canonicalConfig) return [];
  const normalizedState = normalizeEnvironmentRestorationState(state, canonicalConfig);
  if (normalizedState.phase !== "active") return [];

  const normalizedActionId = normalizeId(actionId);
  const action = normalizedActionId === null
    ? null
    : canonicalConfig.actions.find((candidate) => candidate.id === normalizedActionId) ?? null;
  if (!action || normalizedState.actions >= canonicalConfig.constraints.maxActions) return [];
  if ((normalizedState.usedActions[action.id] ?? 0) >= action.maxUses) return [];
  return [action.variableId];
}

function getCompletionTimestamp(options) {
  if (!isRecord(options)) return null;
  return normalizeTimestamp(options.completedAt ?? options.completionTimestamp);
}

function totalDistanceFromTarget(values, config) {
  let total = 0;
  for (const variable of config.variables) {
    const distance = Math.abs(values[variable.id] - variable.target);
    if (!Number.isFinite(distance)) return Number.MAX_VALUE;
    total = Math.min(Number.MAX_VALUE, total + distance);
  }
  return total;
}

/** Apply one valid action without mutating the input state. */
export function applyRestorationAction(state, config, actionId, options = {}) {
  const canonicalConfig = normalizeEnvironmentRestorationConfig(config);
  if (!canonicalConfig) {
    return { accepted: false, complete: false, reason: "invalid-config", state: createInvalidState(state) };
  }

  const normalizedState = normalizeEnvironmentRestorationState(state, canonicalConfig);
  if (normalizedState.phase === "complete") {
    return { accepted: false, complete: true, reason: "complete", state: normalizedState };
  }

  const normalizedActionId = normalizeId(actionId);
  const action = normalizedActionId === null
    ? null
    : canonicalConfig.actions.find((candidate) => candidate.id === normalizedActionId) ?? null;
  if (!action) {
    return { accepted: false, complete: false, reason: "invalid-action", state: normalizedState };
  }
  if (normalizedState.actions >= canonicalConfig.constraints.maxActions) {
    return { accepted: false, complete: false, reason: "max-actions", state: normalizedState };
  }

  const usedCount = normalizedState.usedActions[action.id] ?? 0;
  if (usedCount >= action.maxUses) {
    return { accepted: false, complete: false, reason: "max-uses", state: normalizedState };
  }

  const variable = canonicalConfig.variables.find((candidate) => candidate.id === action.variableId);
  // normalizeEnvironmentRestorationConfig guarantees this relation. Keep the
  // guard so a future config change cannot turn a malformed action into a write.
  if (!variable) {
    return { accepted: false, complete: false, reason: "invalid-action", state: normalizedState };
  }

  const beforeDistance = totalDistanceFromTarget(normalizedState.values, canonicalConfig);
  const currentValue = normalizedState.values[variable.id];
  const candidateValue = currentValue + action.delta;
  const nextValue = Number.isFinite(candidateValue)
    ? clampValue(candidateValue, variable)
    : action.delta > 0 ? variable.max : variable.min;
  const nextValues = { ...normalizedState.values, [variable.id]: nextValue };
  const afterDistance = totalDistanceFromTarget(nextValues, canonicalConfig);
  const complete = isCompleteValues(nextValues, canonicalConfig);
  const drift = afterDistance > beforeDistance;
  const nextUsedActions = { ...normalizedState.usedActions, [action.id]: incrementCounter(usedCount) };
  const nextActions = incrementCounter(normalizedState.actions);
  const nextState = normalizeEnvironmentRestorationState({
    ...normalizedState,
    values: nextValues,
    usedActions: nextUsedActions,
    actions: nextActions,
    mistakes: drift ? incrementCounter(normalizedState.mistakes) : normalizedState.mistakes,
    completedAt: complete ? getCompletionTimestamp(options) : null,
  }, canonicalConfig);

  return {
    accepted: true,
    complete: nextState.phase === "complete",
    reason: nextState.phase === "complete" ? "complete" : drift ? "drift" : "adjusted",
    state: nextState,
  };
}

/** Return current values, target values and bounded proximity health. */
export function getEnvironmentRestorationProgress(state, config) {
  const canonicalConfig = normalizeEnvironmentRestorationConfig(config);
  if (!canonicalConfig) {
    return deepFreeze({ values: {}, target: {}, health: {}, overallHealth: 0, complete: false });
  }

  const normalizedState = normalizeEnvironmentRestorationState(state, canonicalConfig);
  const values = {};
  const target = {};
  const health = {};
  let healthTotal = 0;

  for (const variable of canonicalConfig.variables) {
    const value = normalizedState.values[variable.id];
    const span = variable.max - variable.min;
    const distance = Math.abs(value - variable.target);
    const variableHealth = span === 0 || !Number.isFinite(distance)
      ? value === variable.target ? 100 : 0
      : Math.max(0, Math.min(100, Math.round((1 - (distance / span)) * 100)));
    values[variable.id] = value;
    target[variable.id] = variable.target;
    health[variable.id] = variableHealth;
    healthTotal += variableHealth;
  }

  return deepFreeze({
    values,
    target,
    health,
    overallHealth: Math.max(0, Math.min(100, Math.round(healthTotal / canonicalConfig.variables.length))),
    complete: normalizedState.phase === "complete",
  });
}
