// Pure, local-first state for the Daily Adventure "Dệt Mạch Năng Lượng" puzzle.
// The engine keeps the answer implicit: a token is matched by energyType, and
// persisted state contains only safe token/lane ids and bounded counters.

export const DAILY_WEAVE_SCHEMA_VERSION = 1;

const MAX_ID_LENGTH = 96;
const MAX_TEXT_LENGTH = 240;
const MAX_COLLECTION_SIZE = 1000;
const MAX_COUNTER = Number.MAX_SAFE_INTEGER;
const MAX_QUEUE_SIZE = 3;
const RESERVED_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
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

function normalizeCounter(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(MAX_COUNTER, Math.max(0, Math.trunc(value)));
}

function normalizeCapacity(value) {
  if (!Number.isFinite(value)) return null;
  return Math.min(MAX_COLLECTION_SIZE, Math.max(0, Math.trunc(value)));
}

function incrementCounter(value) {
  return value >= MAX_COUNTER ? MAX_COUNTER : value + 1;
}

function getOptionalText(raw, key, maxLength = MAX_TEXT_LENGTH) {
  if (!hasOwn(raw, key)) return null;
  return normalizeText(raw[key], maxLength);
}

function copyDisplayFields(raw, target) {
  const label = getOptionalText(raw, "label");
  const icon = getOptionalText(raw, "icon", 32);
  if (label !== null) target.label = label;
  if (icon !== null) target.icon = icon;
  return target;
}

function normalizeDailyWeaveConfigUnsafe(input) {
  if (!isRecord(input)) return null;

  const rawId = hasOwn(input, "id") ? input.id : input.challengeId;
  const alternateId = hasOwn(input, "id") && hasOwn(input, "challengeId")
    ? normalizeId(input.challengeId)
    : rawId;
  const id = normalizeId(rawId);
  if (id === null || alternateId === null || alternateId !== id) return null;

  if (!Array.isArray(input.tokens) || input.tokens.length === 0 || input.tokens.length > MAX_COLLECTION_SIZE) return null;
  const tokenIds = new Set();
  const tokens = [];
  for (const rawToken of input.tokens) {
    if (!isRecord(rawToken)) return null;
    const tokenId = normalizeId(hasOwn(rawToken, "id") ? rawToken.id : rawToken.tokenId);
    const energyType = normalizeId(rawToken.energyType);
    if (tokenId === null || energyType === null || tokenIds.has(tokenId)) return null;

    const token = { id: tokenId, energyType };
    const sourceNodeId = normalizeId(rawToken.sourceNodeId ?? rawToken.nodeId);
    if (sourceNodeId !== null) token.sourceNodeId = sourceNodeId;
    copyDisplayFields(rawToken, token);
    tokenIds.add(tokenId);
    tokens.push(token);
  }

  if (!Array.isArray(input.lanes) || input.lanes.length === 0 || input.lanes.length > MAX_COLLECTION_SIZE) return null;
  const laneIds = new Set();
  const lanes = [];
  for (const rawLane of input.lanes) {
    if (!isRecord(rawLane)) return null;
    const laneId = normalizeId(hasOwn(rawLane, "id") ? rawLane.id : rawLane.laneId);
    const energyType = normalizeId(rawLane.energyType);
    const capacity = hasOwn(rawLane, "capacity") ? normalizeCapacity(rawLane.capacity) : null;
    if (laneId === null || energyType === null || capacity === null || laneIds.has(laneId)) return null;

    const lane = { id: laneId, energyType, capacity };
    copyDisplayFields(rawLane, lane);
    laneIds.add(laneId);
    lanes.push(lane);
  }

  const rawMaxActions = hasOwn(input, "maxActions") ? input.maxActions : tokens.length + 2;
  const maxActions = normalizeCapacity(rawMaxActions);
  if (maxActions === null || maxActions < tokens.length) return null;
  const canonical = { id, tokens, lanes, maxActions };
  const title = getOptionalText(input, "title");
  const prompt = getOptionalText(input, "prompt");
  if (title !== null) canonical.title = title;
  if (prompt !== null) canonical.prompt = prompt;
  return deepFreeze(canonical);
}

/** Normalize only the engine-owned challenge contract. Unknown fields are dropped. */
export function normalizeDailyWeaveConfig(input) {
  try {
    return normalizeDailyWeaveConfigUnsafe(input);
  } catch {
    return null;
  }
}

function readEnergyRegistry(energyRegistry) {
  let entries;
  if (Array.isArray(energyRegistry)) {
    entries = energyRegistry.map((entry) => [null, entry]);
  } else if (isRecord(energyRegistry)) {
    entries = Object.entries(energyRegistry);
  } else {
    return [];
  }

  const seen = new Set();
  const normalized = [];
  for (const [key, rawEntry] of entries) {
    const fallbackId = normalizeId(key);
    const rawId = isRecord(rawEntry) ? rawEntry.id : fallbackId;
    const id = normalizeId(rawId ?? (typeof rawEntry === "string" ? rawEntry : null));
    if (id === null || seen.has(id)) continue;

    const entry = { id };
    if (isRecord(rawEntry)) {
      const label = normalizeText(rawEntry.labelVi ?? rawEntry.label ?? rawEntry.name);
      const icon = normalizeText(rawEntry.icon, 32);
      if (label !== null) entry.label = label;
      if (icon !== null) entry.icon = icon;
    } else if (typeof rawEntry === "string") {
      const label = normalizeText(rawEntry);
      if (label !== null) entry.label = label;
    }
    seen.add(id);
    normalized.push(entry);
  }
  return normalized;
}

function chooseNodeEnergyType(node, registryIds) {
  const candidates = [];
  if (hasOwn(node, "energyType")) candidates.push(node.energyType);
  if (Array.isArray(node.energyTypes)) candidates.push(...node.energyTypes);
  else if (typeof node.energyTypes === "string") candidates.push(node.energyTypes);

  for (const candidate of candidates) {
    const energyType = normalizeId(candidate);
    if (energyType !== null && registryIds.has(energyType)) return energyType;
  }
  return null;
}

function buildDailyWeaveChallengeUnsafe(queue, nodeDefinitions, energyRegistry) {
  if (!Array.isArray(queue) || !Array.isArray(nodeDefinitions)) return null;

  const registryEntries = readEnergyRegistry(energyRegistry);
  if (registryEntries.length === 0) return null;
  const registryIds = new Set(registryEntries.map((entry) => entry.id));

  const nodesById = new Map();
  for (const rawNode of nodeDefinitions) {
    if (!isRecord(rawNode)) continue;
    const id = normalizeId(rawNode.id);
    if (id !== null && !nodesById.has(id)) nodesById.set(id, rawNode);
  }

  const selected = [];
  const seenNodeIds = new Set();
  for (const rawNodeId of queue) {
    const nodeId = normalizeId(rawNodeId);
    if (nodeId === null || seenNodeIds.has(nodeId)) continue;
    seenNodeIds.add(nodeId);
    const node = nodesById.get(nodeId);
    if (!node) continue;
    const energyType = chooseNodeEnergyType(node, registryIds);
    if (energyType === null) continue;
    selected.push({ nodeId, node, energyType });
    if (selected.length >= MAX_QUEUE_SIZE) break;
  }
  if (selected.length === 0) return null;

  const tokens = [];
  const capacityByEnergyType = new Map();
  for (const item of selected) {
    const tokenId = normalizeId(`token-${item.nodeId}`);
    if (tokenId === null || tokens.some((token) => token.id === tokenId)) return null;

    const label = normalizeText(item.node.shortTitle ?? item.node.title) ?? item.nodeId;
    const token = {
      id: tokenId,
      sourceNodeId: item.nodeId,
      energyType: item.energyType,
      label,
    };
    const icon = normalizeText(item.node.icon, 32);
    if (icon !== null) token.icon = icon;
    tokens.push(token);
    capacityByEnergyType.set(item.energyType, (capacityByEnergyType.get(item.energyType) ?? 0) + 1);
  }

  const lanes = [];
  for (const entry of registryEntries) {
    const capacity = capacityByEnergyType.get(entry.id);
    if (!capacity) continue;
    const laneId = normalizeId(`lane-${entry.id}`);
    if (laneId === null) return null;
    const lane = { id: laneId, energyType: entry.id, capacity };
    if (entry.label !== undefined) lane.label = entry.label;
    if (entry.icon !== undefined) lane.icon = entry.icon;
    lanes.push(lane);
  }
  if (lanes.length === 0) return null;

  const challengeId = normalizeId(`daily-weave-${selected.map((item) => item.nodeId).join("-")}`);
  if (challengeId === null) return null;
  return normalizeDailyWeaveConfigUnsafe({
    id: challengeId,
    title: "Dệt Mạch Năng Lượng",
    prompt: "Đặt mỗi token vào làn năng lượng cùng mạch để nối sáng Daily Adventure.",
    maxActions: selected.length + 2,
    tokens,
    lanes,
  });
}

/** Build a deterministic, local challenge from the selected node queue. */
export function buildDailyWeaveChallenge(queue, nodeDefinitions, energyRegistry) {
  try {
    return buildDailyWeaveChallengeUnsafe(queue, nodeDefinitions, energyRegistry);
  } catch {
    return null;
  }
}

function createInvalidDailyWeaveState(options) {
  const safeOptions = isRecord(options) ? options : {};
  const actions = normalizeCounter(safeOptions.actions);
  const mistakes = Math.min(normalizeCounter(safeOptions.mistakes), actions);
  return deepFreeze({
    schemaVersion: DAILY_WEAVE_SCHEMA_VERSION,
    challengeId: "",
    placedTokens: {},
    actions,
    mistakes,
    phase: "active",
  });
}

function readPlacedTokenEntries(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => {
      if (!isRecord(entry)) return null;
      return {
        tokenId: normalizeId(entry.tokenId ?? entry.id),
        laneId: normalizeId(entry.laneId ?? entry.targetLaneId ?? entry.target),
      };
    }).filter(Boolean);
  }
  if (!isRecord(value)) return [];
  return Object.entries(value).map(([tokenId, laneId]) => ({
    tokenId: normalizeId(tokenId),
    laneId: normalizeId(laneId),
  }));
}

function normalizePlacedTokens(value, config) {
  const tokenById = new Map(config.tokens.map((token) => [token.id, token]));
  const laneById = new Map(config.lanes.map((lane) => [lane.id, lane]));
  const assignments = new Map();
  const duplicateTokenIds = new Set();

  for (const entry of readPlacedTokenEntries(value)) {
    if (entry.tokenId === null || entry.laneId === null) continue;
    if (assignments.has(entry.tokenId)) duplicateTokenIds.add(entry.tokenId);
    else assignments.set(entry.tokenId, entry.laneId);
  }

  const placedTokens = {};
  const counts = new Map();
  for (const token of config.tokens) {
    if (duplicateTokenIds.has(token.id)) continue;
    const laneId = assignments.get(token.id);
    if (!laneId) continue;
    const lane = laneById.get(laneId);
    if (!lane || lane.energyType !== token.energyType) continue;
    const count = counts.get(lane.id) ?? 0;
    if (count >= lane.capacity) continue;
    placedTokens[token.id] = lane.id;
    counts.set(lane.id, count + 1);
  }
  return placedTokens;
}

/** Create an immutable, empty local puzzle state. */
export function createDailyWeaveState(config, options = {}) {
  try {
    const canonicalConfig = normalizeDailyWeaveConfigUnsafe(config);
    if (!canonicalConfig) return createInvalidDailyWeaveState(options);
    const safeOptions = isRecord(options) ? options : {};
    return normalizeDailyWeaveState({
      actions: safeOptions.actions,
      mistakes: safeOptions.mistakes,
    }, canonicalConfig);
  } catch {
    return createInvalidDailyWeaveState(options);
  }
}

/** Normalize persisted state against the canonical challenge and drop unknown data. */
export function normalizeDailyWeaveState(state, config) {
  try {
    const canonicalConfig = normalizeDailyWeaveConfigUnsafe(config);
    if (!canonicalConfig) return createInvalidDailyWeaveState(state);

    const safeState = isRecord(state) ? state : {};
    const placedTokens = normalizePlacedTokens(safeState.placedTokens, canonicalConfig);
    const placedCount = Object.keys(placedTokens).length;
    const actions = Math.min(canonicalConfig.maxActions, Math.max(normalizeCounter(safeState.actions), placedCount));
    const mistakes = Math.min(normalizeCounter(safeState.mistakes), actions);
    const complete = placedCount === canonicalConfig.tokens.length;

    return deepFreeze({
      schemaVersion: DAILY_WEAVE_SCHEMA_VERSION,
      challengeId: canonicalConfig.id,
      placedTokens,
      actions,
      mistakes,
      phase: complete ? "complete" : "active",
    });
  } catch {
    return createInvalidDailyWeaveState();
  }
}

function getLaneCounts(config, state) {
  const counts = new Map(config.lanes.map((lane) => [lane.id, 0]));
  for (const laneId of Object.values(state.placedTokens)) {
    if (counts.has(laneId)) counts.set(laneId, counts.get(laneId) + 1);
  }
  return counts;
}

/** Return matching, non-full lane ids for a token. */
export function getDailyWeaveTargetIds(config, tokenId, state) {
  try {
    const canonicalConfig = normalizeDailyWeaveConfigUnsafe(config);
    if (!canonicalConfig) return [];
    const normalizedState = normalizeDailyWeaveState(state, canonicalConfig);
    if (normalizedState.phase === "complete" || normalizedState.actions >= canonicalConfig.maxActions) return [];

    const normalizedTokenId = normalizeId(tokenId);
    const token = normalizedTokenId === null
      ? null
      : canonicalConfig.tokens.find((candidate) => candidate.id === normalizedTokenId);
    if (!token || hasOwn(normalizedState.placedTokens, token.id)) return [];

    const counts = getLaneCounts(canonicalConfig, normalizedState);
    return canonicalConfig.lanes
      .filter((lane) => lane.energyType === token.energyType && (counts.get(lane.id) ?? 0) < lane.capacity)
      .map((lane) => lane.id);
  } catch {
    return [];
  }
}

/** Apply one token placement without mutating the previous state. */
export function placeDailyWeaveToken(state, config, tokenId, laneId) {
  try {
    const canonicalConfig = normalizeDailyWeaveConfigUnsafe(config);
    if (!canonicalConfig) {
      return { accepted: false, complete: false, reason: "invalid-config", state: normalizeDailyWeaveState(state, null) };
    }

    const normalizedState = normalizeDailyWeaveState(state, canonicalConfig);
    if (normalizedState.phase === "complete") {
      return { accepted: false, complete: true, reason: "complete", state: normalizedState };
    }

    const normalizedTokenId = normalizeId(tokenId);
    const normalizedLaneId = normalizeId(laneId);
    const token = normalizedTokenId === null
      ? null
      : canonicalConfig.tokens.find((candidate) => candidate.id === normalizedTokenId);
    const lane = normalizedLaneId === null
      ? null
      : canonicalConfig.lanes.find((candidate) => candidate.id === normalizedLaneId);

    if (!token) return { accepted: false, complete: false, reason: "invalid-token", state: normalizedState };
    if (!lane) return { accepted: false, complete: false, reason: "invalid-lane", state: normalizedState };
    if (normalizedState.actions >= canonicalConfig.maxActions) {
      return { accepted: false, complete: false, reason: "max-actions", state: normalizedState };
    }
    if (hasOwn(normalizedState.placedTokens, token.id)) {
      return { accepted: false, complete: false, reason: "already-placed", state: normalizedState };
    }

    const counts = getLaneCounts(canonicalConfig, normalizedState);
    if (lane.energyType !== token.energyType) {
      const nextState = normalizeDailyWeaveState({
        ...normalizedState,
        actions: incrementCounter(normalizedState.actions),
        mistakes: incrementCounter(normalizedState.mistakes),
      }, canonicalConfig);
      return { accepted: false, complete: false, reason: "wrong-lane", state: nextState };
    }
    if ((counts.get(lane.id) ?? 0) >= lane.capacity) {
      return { accepted: false, complete: false, reason: "full", state: normalizedState };
    }

    const nextState = normalizeDailyWeaveState({
      ...normalizedState,
      placedTokens: { ...normalizedState.placedTokens, [token.id]: lane.id },
      actions: incrementCounter(normalizedState.actions),
    }, canonicalConfig);
    return {
      accepted: true,
      complete: nextState.phase === "complete",
      reason: nextState.phase === "complete" ? "complete" : "placed",
      state: nextState,
    };
  } catch {
    return { accepted: false, complete: false, reason: "invalid-config", state: createInvalidDailyWeaveState() };
  }
}

/** Summarize safe placement progress for the Daily Adventure UI. */
export function getDailyWeaveProgress(state, config) {
  try {
    const canonicalConfig = normalizeDailyWeaveConfigUnsafe(config);
    if (!canonicalConfig) return deepFreeze({ placedCount: 0, total: 0, remaining: 0, complete: false, lanes: [] });

    const normalizedState = normalizeDailyWeaveState(state, canonicalConfig);
    const counts = getLaneCounts(canonicalConfig, normalizedState);
    const total = canonicalConfig.tokens.length;
    const placedCount = Object.keys(normalizedState.placedTokens).length;
    const complete = total > 0 && placedCount === total;
    return deepFreeze({
      placedCount,
      total,
      remaining: Math.max(0, total - placedCount),
      complete,
      lanes: canonicalConfig.lanes.map((lane) => ({
        id: lane.id,
        count: counts.get(lane.id) ?? 0,
        capacity: lane.capacity,
      })),
    });
  } catch {
    return deepFreeze({ placedCount: 0, total: 0, remaining: 0, complete: false, lanes: [] });
  }
}
