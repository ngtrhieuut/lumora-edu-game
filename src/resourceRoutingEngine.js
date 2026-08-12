export const RESOURCE_ROUTE_SCHEMA_VERSION = 1;

const MAX_ID_LENGTH = 96;
const MAX_TEXT_LENGTH = 240;
const MAX_COLLECTION_SIZE = 1000;
const MAX_COUNTER = Number.MAX_SAFE_INTEGER;
const RESERVED_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
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

function normalizeCounter(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(MAX_COUNTER, Math.max(0, Math.trunc(value)));
}

function normalizeCapacity(value) {
  if (!Number.isFinite(value)) return null;
  return Math.min(MAX_COLLECTION_SIZE, Math.max(0, Math.trunc(value)));
}

function normalizeTimestamp(value) {
  if (typeof value !== "string") return null;
  const timestamp = value.trim();
  if (!timestamp || timestamp.length > 96 || /[\u0000-\u001f\u007f]/.test(timestamp)) return null;
  return timestamp;
}

function normalizeSeed(value, fallback) {
  if (Number.isFinite(value)) return Math.trunc(value);
  const seed = normalizeText(value, 96);
  return seed ?? fallback;
}

function deriveSeed(activityId) {
  let hash = 2166136261;
  for (let index = 0; index < activityId.length; index += 1) {
    hash ^= activityId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function copyOptionalDisplayFields(raw, target) {
  for (const field of ["label", "icon"]) {
    if (!hasOwn(raw, field)) continue;
    const value = normalizeText(raw[field], field === "icon" ? 32 : MAX_TEXT_LENGTH);
    if (value !== null) target[field] = value;
  }
  return target;
}

function normalizeAccepts(value, role) {
  if (value === undefined && role === "source") return [];
  const values = Array.isArray(value) ? value : typeof value === "string" ? [value] : null;
  if (!values || values.length > MAX_COLLECTION_SIZE) return null;
  const accepts = [];
  const seen = new Set();
  for (const entry of values) {
    const kind = normalizeText(entry, 96);
    if (kind === null || seen.has(kind)) return null;
    seen.add(kind);
    accepts.push(kind);
  }
  if (role === "destination" && accepts.length === 0) return null;
  return accepts;
}

function normalizeConstraints(input) {
  if (input === undefined) return { present: false, value: null };
  if (!isRecord(input)) return { present: true, value: null };
  const constraints = {};
  for (const field of ["maxActions", "softTimeLimit"]) {
    if (!hasOwn(input, field)) continue;
    const value = normalizeCapacity(input[field]);
    if (value === null) return { present: true, value: null };
    constraints[field] = value;
  }
  return { present: true, value: constraints };
}

/** Normalize the route definition to the small, engine-owned data contract. */
export function normalizeResourceRouteConfig(input) {
  if (!isRecord(input)) return null;

  const rawId = hasOwn(input, "id") ? input.id : input.activityId;
  const id = normalizeId(rawId);
  const alternateId = hasOwn(input, "id") && hasOwn(input, "activityId")
    ? normalizeId(input.activityId)
    : id;
  if (id === null || alternateId === null || alternateId !== id) return null;

  const mode = input.mode === undefined ? "route" : normalizeText(input.mode, 48);
  const sourceNodeId = normalizeId(input.sourceNodeId);
  if (mode === null || sourceNodeId === null) return null;

  if (!Array.isArray(input.resources) || input.resources.length === 0 || input.resources.length > MAX_COLLECTION_SIZE) return null;
  const resourceIds = new Set();
  const resources = [];
  for (const rawResource of input.resources) {
    if (!isRecord(rawResource)) return null;
    const resourceId = normalizeId(rawResource.id);
    const kind = normalizeText(rawResource.kind, 96);
    if (resourceId === null || kind === null || resourceIds.has(resourceId)) return null;
    resourceIds.add(resourceId);
    resources.push(copyOptionalDisplayFields(rawResource, { id: resourceId, kind }));
  }

  if (!Array.isArray(input.nodes) || input.nodes.length < 2 || input.nodes.length > MAX_COLLECTION_SIZE) return null;
  const nodeIds = new Set();
  const nodes = [];
  for (const rawNode of input.nodes) {
    if (!isRecord(rawNode)) return null;
    const nodeId = normalizeId(rawNode.id);
    const role = typeof rawNode.role === "string" ? normalizeText(rawNode.role, 24)?.toLowerCase() : null;
    if (nodeId === null || role === null || !["source", "destination"].includes(role) || nodeIds.has(nodeId)) return null;
    const capacity = hasOwn(rawNode, "capacity")
      ? normalizeCapacity(rawNode.capacity)
      : role === "source" ? resources.length : null;
    const accepts = normalizeAccepts(rawNode.accepts, role);
    if (capacity === null || accepts === null) return null;
    nodeIds.add(nodeId);
    nodes.push(copyOptionalDisplayFields(rawNode, { id: nodeId, role, accepts, capacity }));
  }

  const sourceNodes = nodes.filter((node) => node.role === "source");
  if (sourceNodes.length !== 1 || sourceNodes[0].id !== sourceNodeId) return null;

  if (!Array.isArray(input.connections) || input.connections.length === 0 || input.connections.length > MAX_COLLECTION_SIZE) return null;
  const connectionKeys = new Set();
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const connections = [];
  for (const rawConnection of input.connections) {
    if (!isRecord(rawConnection)) return null;
    const from = normalizeId(rawConnection.from);
    const to = normalizeId(rawConnection.to);
    const destination = to === null ? null : nodeById.get(to);
    const key = from === null || to === null ? null : `${from}\u0000${to}`;
    if (
      from === null ||
      to === null ||
      key === null ||
      connectionKeys.has(key) ||
      from !== sourceNodeId ||
      to === sourceNodeId ||
      !destination ||
      destination.role !== "destination"
    ) return null;
    connectionKeys.add(key);
    connections.push({ from, to });
  }

  const constraints = normalizeConstraints(input.constraints);
  if (constraints.value === null) return null;

  const canonical = { id, mode, sourceNodeId, resources, nodes, connections };
  if (constraints.present) canonical.constraints = constraints.value;
  return deepFreeze(canonical);
}

function createInvalidConfigState(options = {}) {
  const safeOptions = isRecord(options) ? options : {};
  return deepFreeze({
    schemaVersion: RESOURCE_ROUTE_SCHEMA_VERSION,
    activityId: "",
    mode: "route",
    seed: normalizeSeed(safeOptions.seed, 0),
    phase: "active",
    placedResources: {},
    actions: 0,
    mistakes: 0,
    supportsUsed: 0,
    startedAt: normalizeTimestamp(safeOptions.startedAt),
    completedAt: null,
  });
}

function readPlacementEntries(value) {
  const entries = [];
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (!isRecord(entry)) continue;
      entries.push({
        resourceId: normalizeId(entry.resourceId ?? entry.id),
        targetNodeId: normalizeId(entry.targetNodeId ?? entry.nodeId ?? entry.target),
      });
    }
    return entries;
  }
  if (!isRecord(value)) return entries;
  for (const [resourceId, targetNodeId] of Object.entries(value)) {
    entries.push({ resourceId: normalizeId(resourceId), targetNodeId: normalizeId(targetNodeId) });
  }
  return entries;
}

function getRouteParts(config) {
  const nodeById = new Map(config.nodes.map((node) => [node.id, node]));
  const resourceById = new Map(config.resources.map((resource) => [resource.id, resource]));
  const connectedDestinationIds = new Set(config.connections.map((connection) => connection.to));
  return { nodeById, resourceById, connectedDestinationIds };
}

function isValidPlacement(config, parts, resource, targetNodeId, counts) {
  const target = parts.nodeById.get(targetNodeId);
  if (!target || target.role !== "destination" || !parts.connectedDestinationIds.has(targetNodeId)) return false;
  if (!target.accepts.includes(resource.kind)) return false;
  return (counts.get(targetNodeId) ?? 0) < target.capacity;
}

function normalizePlacedResources(value, config, parts) {
  const rawEntries = readPlacementEntries(value);
  const assignments = new Map();
  const duplicateResourceIds = new Set();
  for (const entry of rawEntries) {
    if (entry.resourceId === null || entry.targetNodeId === null) continue;
    if (assignments.has(entry.resourceId)) duplicateResourceIds.add(entry.resourceId);
    else assignments.set(entry.resourceId, entry.targetNodeId);
  }

  const placements = {};
  const counts = new Map();
  for (const resource of config.resources) {
    if (duplicateResourceIds.has(resource.id)) continue;
    const targetNodeId = assignments.get(resource.id);
    if (!targetNodeId || !isValidPlacement(config, parts, resource, targetNodeId, counts)) continue;
    placements[resource.id] = targetNodeId;
    counts.set(targetNodeId, (counts.get(targetNodeId) ?? 0) + 1);
  }
  return { placements, counts };
}

/** Create a deterministic, local-only route state. */
export function createResourceRouteState(config, options = {}) {
  const canonicalConfig = normalizeResourceRouteConfig(config);
  if (!canonicalConfig) return createInvalidConfigState(options);
  const safeOptions = isRecord(options) ? options : {};
  const state = {
    schemaVersion: RESOURCE_ROUTE_SCHEMA_VERSION,
    activityId: canonicalConfig.id,
    mode: canonicalConfig.mode,
    seed: normalizeSeed(safeOptions.seed, deriveSeed(canonicalConfig.id)),
    phase: "active",
    placedResources: {},
    actions: normalizeCounter(safeOptions.actions),
    mistakes: Math.min(normalizeCounter(safeOptions.mistakes), normalizeCounter(safeOptions.actions)),
    supportsUsed: normalizeCounter(safeOptions.supportsUsed),
    startedAt: normalizeTimestamp(safeOptions.startedAt),
    completedAt: null,
  };
  return deepFreeze(state);
}

/** Normalize persisted or caller-supplied state without trusting extra fields. */
export function normalizeResourceRouteState(state, config) {
  const canonicalConfig = normalizeResourceRouteConfig(config);
  if (!canonicalConfig) return createInvalidConfigState(state);
  const safeState = isRecord(state) ? state : {};
  const parts = getRouteParts(canonicalConfig);
  const { placements } = normalizePlacedResources(safeState.placedResources, canonicalConfig, parts);
  const placedCount = Object.keys(placements).length;
  const complete = placedCount === canonicalConfig.resources.length;
  const rawActions = normalizeCounter(safeState.actions);
  const actions = Math.max(rawActions, placedCount);
  const mistakes = Math.min(normalizeCounter(safeState.mistakes), actions);
  return deepFreeze({
    schemaVersion: RESOURCE_ROUTE_SCHEMA_VERSION,
    activityId: canonicalConfig.id,
    mode: canonicalConfig.mode,
    seed: normalizeSeed(safeState.seed, deriveSeed(canonicalConfig.id)),
    phase: complete ? "complete" : "active",
    placedResources: placements,
    actions,
    mistakes,
    supportsUsed: normalizeCounter(safeState.supportsUsed),
    startedAt: normalizeTimestamp(safeState.startedAt),
    completedAt: complete ? normalizeTimestamp(safeState.completedAt) : null,
  });
}

/** Return connected, accepting destinations that still have capacity. */
export function getResourceRouteTargetIds(config, resourceId, state) {
  const canonicalConfig = normalizeResourceRouteConfig(config);
  if (!canonicalConfig) return [];
  const normalizedState = normalizeResourceRouteState(state, canonicalConfig);
  if (normalizedState.phase === "complete") return [];
  const normalizedResourceId = normalizeId(resourceId);
  const parts = getRouteParts(canonicalConfig);
  const resource = normalizedResourceId === null ? null : parts.resourceById.get(normalizedResourceId);
  if (!resource || hasOwn(normalizedState.placedResources, resource.id)) return [];

  const counts = new Map();
  for (const targetNodeId of Object.values(normalizedState.placedResources)) {
    counts.set(targetNodeId, (counts.get(targetNodeId) ?? 0) + 1);
  }
  return canonicalConfig.connections
    .map((connection) => connection.to)
    .filter((targetNodeId, index, ids) => ids.indexOf(targetNodeId) === index)
    .filter((targetNodeId) => isValidPlacement(canonicalConfig, parts, resource, targetNodeId, counts));
}

function incrementCounter(value) {
  return value >= MAX_COUNTER ? MAX_COUNTER : value + 1;
}

function getCompletionOption(options) {
  if (!isRecord(options)) return null;
  return normalizeTimestamp(options.completedAt ?? options.completionTimestamp);
}

/** Apply one resource placement while preserving the prior immutable state. */
export function placeResource(state, config, resourceId, targetNodeId, options = {}) {
  const canonicalConfig = normalizeResourceRouteConfig(config);
  if (!canonicalConfig) {
    const invalidState = normalizeResourceRouteState(state, null);
    return { accepted: false, complete: false, reason: "invalid-config", state: invalidState };
  }

  const normalizedState = normalizeResourceRouteState(state, canonicalConfig);
  const complete = normalizedState.phase === "complete";
  const normalizedResourceId = normalizeId(resourceId);
  const normalizedTargetNodeId = normalizeId(targetNodeId);
  const parts = getRouteParts(canonicalConfig);

  if (complete) return { accepted: false, complete: true, reason: "complete", state: normalizedState };
  if (normalizedResourceId === null || !parts.resourceById.has(normalizedResourceId)) {
    return { accepted: false, complete: false, reason: "invalid-resource", state: normalizedState };
  }
  if (normalizedTargetNodeId === null || !parts.nodeById.has(normalizedTargetNodeId)) {
    return { accepted: false, complete: false, reason: "invalid-target", state: normalizedState };
  }
  if (hasOwn(normalizedState.placedResources, normalizedResourceId)) {
    return { accepted: false, complete: false, reason: "already-placed", state: normalizedState };
  }

  const resource = parts.resourceById.get(normalizedResourceId);
  const counts = new Map();
  for (const placedTargetNodeId of Object.values(normalizedState.placedResources)) {
    counts.set(placedTargetNodeId, (counts.get(placedTargetNodeId) ?? 0) + 1);
  }
  const targetNode = parts.nodeById.get(normalizedTargetNodeId);
  const connectedAndAccepting = targetNode?.role === "destination"
    && parts.connectedDestinationIds.has(normalizedTargetNodeId)
    && targetNode.accepts.includes(resource.kind);
  if (connectedAndAccepting && (counts.get(normalizedTargetNodeId) ?? 0) >= targetNode.capacity) {
    return { accepted: false, complete: false, reason: "full", state: normalizedState };
  }
  if (!connectedAndAccepting) {
    const nextWrongState = normalizeResourceRouteState({
      ...normalizedState,
      actions: incrementCounter(normalizedState.actions),
      mistakes: incrementCounter(normalizedState.mistakes),
    }, canonicalConfig);
    return { accepted: false, complete: false, reason: "wrong-route", state: nextWrongState };
  }

  const nextPlacedResources = { ...normalizedState.placedResources, [normalizedResourceId]: normalizedTargetNodeId };
  const nextState = normalizeResourceRouteState({
    ...normalizedState,
    placedResources: nextPlacedResources,
    actions: incrementCounter(normalizedState.actions),
    completedAt: getCompletionOption(options),
  }, canonicalConfig);
  return { accepted: true, complete: nextState.phase === "complete", reason: "placed", state: nextState };
}

/** Summarize placement count and destination capacity usage. */
export function getResourceRouteProgress(state, config) {
  const canonicalConfig = normalizeResourceRouteConfig(config);
  if (!canonicalConfig) {
    return deepFreeze({ placedCount: 0, total: 0, remaining: 0, percent: 0, complete: false, byNode: {} });
  }
  const normalizedState = normalizeResourceRouteState(state, canonicalConfig);
  const byNode = Object.fromEntries(
    canonicalConfig.nodes
      .filter((node) => node.role === "destination")
      .map((node) => [node.id, 0]),
  );
  for (const targetNodeId of Object.values(normalizedState.placedResources)) {
    if (hasOwn(byNode, targetNodeId)) byNode[targetNodeId] += 1;
  }
  const total = canonicalConfig.resources.length;
  const placedCount = Object.keys(normalizedState.placedResources).length;
  const complete = total > 0 && placedCount === total;
  return deepFreeze({
    placedCount,
    total,
    remaining: Math.max(0, total - placedCount),
    percent: total > 0 ? Math.round((placedCount / total) * 100) : 0,
    complete,
    byNode,
  });
}
