import { selectMasteryActivities } from "./masteryArc.js";

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

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

const isValidId = (value) => typeof value === "string" && value.trim().length > 0;

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function clampInt(value, min, max) {
  const number = finiteNumber(value);
  if (number === null) return min;
  return Math.min(max, Math.max(min, Math.trunc(number)));
}

function nonNegativeNumber(value) {
  const number = finiteNumber(value);
  return number === null ? 0 : Math.max(0, number);
}

function getRecordAt(record, key) {
  if (!isRecord(record) || !isValidId(key)) return null;
  return isRecord(record[key]) ? record[key] : null;
}

function firstMetricNumber(entries, keys) {
  for (const entry of entries) {
    for (const key of keys) {
      const value = finiteNumber(entry?.[key]);
      if (value !== null) return value;
    }
  }
  return null;
}

function firstLegacyMastery(progress, node) {
  const mastery = isRecord(progress?.mastery) ? progress.mastery : null;
  for (const key of [node.skillId, node.id]) {
    const value = finiteNumber(mastery?.[key]);
    if (value !== null) return value;
  }
  return null;
}

function getPracticeMetrics(progress, node) {
  const sources = [
    isRecord(progress?.learningMetrics) ? progress.learningMetrics : null,
    isRecord(progress?.skills) ? progress.skills : null,
  ].filter(Boolean);

  const entries = [];
  for (const source of sources) {
    for (const key of [node.skillId, node.id]) {
      const entry = getRecordAt(source, key);
      if (entry && !entries.includes(entry)) entries.push(entry);
    }
  }

  const outcome = getRecordAt(progress?.nodeOutcomes, node.id);
  if (outcome) entries.push(outcome);

  const bestMastery = clampInt(
    firstMetricNumber(entries, ["bestMastery", "mastery"]) ?? firstLegacyMastery(progress, node) ?? 0,
    0,
    3,
  );
  const totalAttempts = clampInt(firstMetricNumber(entries, ["totalAttempts", "attempts"]) ?? 0, 0, Infinity);
  const supportsUsed = clampInt(firstMetricNumber(entries, ["supportsUsed", "supports"]) ?? 0, 0, Infinity);
  const explicitSupportRate = firstMetricNumber(entries, ["supportRate", "support_rate"]);
  const supportRate =
    explicitSupportRate === null
      ? totalAttempts > 0
        ? supportsUsed / totalAttempts
        : 0
      : Math.max(0, explicitSupportRate);

  return { bestMastery, supportRate, totalAttempts };
}

function getNodeIndex(node, sourceIndex) {
  const index = finiteNumber(node.index);
  return index === null ? sourceIndex : index;
}

function compareWeakness(left, right) {
  if (left.bestMastery !== right.bestMastery) return left.bestMastery - right.bestMastery;
  if (left.supportRate !== right.supportRate) return right.supportRate - left.supportRate;
  if (left.totalAttempts !== right.totalAttempts) return right.totalAttempts - left.totalAttempts;
  if (left.index !== right.index) return left.index - right.index;
  return left.sourceIndex - right.sourceIndex;
}

function dateRotationOffset(dateKey, length) {
  if (length === 0 || typeof dateKey !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return 0;

  const date = new Date(`${dateKey}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateKey) return 0;

  const dayNumber = Math.floor(date.getTime() / 86400000);
  return ((dayNumber % length) + length) % length;
}

function appendRotatedIds(orderedNodes, weakest, dateKey) {
  const length = orderedNodes.length;
  const offset = dateRotationOffset(dateKey, length);
  const rotated = orderedNodes.slice(offset).concat(orderedNodes.slice(0, offset));
  const queue = [weakest.id];
  const selected = new Set(queue);
  let cursor = 0;

  while (queue.length < 3) {
    const canAvoidDuplicates = selected.size < length;
    let candidate = null;

    for (let attempts = 0; attempts < length; attempts += 1) {
      const next = rotated[cursor % length];
      cursor += 1;
      if (canAvoidDuplicates && selected.has(next.id)) continue;
      candidate = next;
      break;
    }

    if (!candidate) break;
    queue.push(candidate.id);
    selected.add(candidate.id);
  }

  return queue;
}

/**
 * Select up to three completed, direct-mechanic nodes for a deterministic
 * local practice replay. The weakest node is always first; the rest rotate
 * by date while preserving unique picks until every candidate is used.
 */
export function buildPracticeQueue(progress, nodeDefinitions, options = {}) {
  if (isRecord(options) && options.masteryRegistry) {
    const masteryActivities = selectMasteryActivities(options.masteryRegistry, progress, {
      context: "daily",
      worldId: options.worldId,
      limit: 3,
    });
    if (masteryActivities.length > 0) return masteryActivities.map((activity) => activity.nodeId);
  }

  const completed = new Set(
    Array.isArray(progress?.completed)
      ? progress.completed.filter((id) => isValidId(id)).map((id) => id.trim())
      : [],
  );
  if (!Array.isArray(nodeDefinitions) || completed.size === 0) return [];

  const eligible = [];
  const seenIds = new Set();
  nodeDefinitions.forEach((node, sourceIndex) => {
    if (!isRecord(node) || !isValidId(node.id) || !DIRECT_MECHANIC_TYPES.has(node.type)) return;
    const id = node.id.trim();
    if (!completed.has(id) || seenIds.has(id)) return;

    seenIds.add(id);
    const metrics = getPracticeMetrics(progress, node);
    eligible.push({
      id,
      ...metrics,
      index: getNodeIndex(node, sourceIndex),
      sourceIndex,
    });
  });

  if (eligible.length === 0) return [];

  const weakest = eligible.slice().sort(compareWeakness)[0];
  const orderedForRotation = eligible.slice().sort((left, right) => {
    if (left.index !== right.index) return left.index - right.index;
    return left.sourceIndex - right.sourceIndex;
  });

  const dateKey = isRecord(options) ? options.dateKey : undefined;
  return appendRotatedIds(orderedForRotation, weakest, dateKey);
}

function normalizeQueue(queue) {
  if (!Array.isArray(queue)) return [];
  return queue.filter(isValidId).map((id) => id.trim()).slice(0, 3);
}

function normalizeStartedAt(value) {
  let date;
  if (value instanceof Date) {
    date = new Date(value.getTime());
  } else if (typeof value === "string" && value.trim()) {
    date = new Date(value);
  } else {
    return null;
  }

  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
}

function sessionId(startedAt) {
  return `practice-${startedAt ?? "unscheduled"}`;
}

/** Create a canonical local practice session, or null when no valid queue exists. */
export function createPracticeSession(queue, options = {}) {
  const normalizedQueue = normalizeQueue(queue);
  if (normalizedQueue.length === 0) return null;

  const startedAt = normalizeStartedAt(isRecord(options) ? options.startedAt : undefined);
  return {
    id: sessionId(startedAt),
    queue: normalizedQueue,
    currentIndex: 0,
    completed: [],
    startedAt,
  };
}

function cloneCompletedValue(value) {
  return isRecord(value) ? { ...value } : value;
}

function cloneSession(session) {
  if (!isRecord(session)) return session;
  return {
    ...session,
    queue: Array.isArray(session.queue) ? session.queue.slice() : session.queue,
    completed: Array.isArray(session.completed) ? session.completed.map(cloneCompletedValue) : session.completed,
  };
}

function isUsableSession(session) {
  return (
    isRecord(session) &&
    Array.isArray(session.queue) &&
    session.queue.every(isValidId) &&
    Array.isArray(session.completed) &&
    Number.isInteger(session.currentIndex) &&
    session.currentIndex >= 0
  );
}

function normalizeSessionResult(result, fallbackNodeId) {
  if (!isRecord(result)) return null;
  const rawNodeId = isValidId(result.nodeId) ? result.nodeId.trim() : fallbackNodeId;
  if (!isValidId(rawNodeId)) return null;

  const normalized = {
    nodeId: rawNodeId,
    mastery: clampInt(result.mastery, 1, 3),
    supportsUsed: clampInt(result.supportsUsed, 0, Infinity),
    attempts: clampInt(result.attempts, 1, Infinity),
    durationSeconds: nonNegativeNumber(result.durationSeconds),
  };

  if (isValidId(result.skillId)) normalized.skillId = result.skillId.trim();
  return normalized;
}

/**
 * Append a result only for the next expected node. All result counters are
 * normalized, and every return value owns its queue and completed arrays.
 */
export function advancePracticeSession(session, result) {
  const unchanged = cloneSession(session);
  if (!isUsableSession(session)) return unchanged;

  const expectedNodeId = session.queue[session.currentIndex];
  if (!expectedNodeId || !isRecord(result) || result.nodeId !== expectedNodeId) return unchanged;

  const normalized = normalizeSessionResult(result, expectedNodeId);
  if (!normalized) return unchanged;

  const next = cloneSession(session);
  next.completed.push(normalized);
  next.currentIndex += 1;
  return next;
}

export function isPracticeSessionComplete(session) {
  return (
    isRecord(session) &&
    Array.isArray(session.queue) &&
    Number.isInteger(session.currentIndex) &&
    session.currentIndex >= 0 &&
    session.currentIndex >= session.queue.length
  );
}

const EMPTY_SUMMARY = {
  challengesCompleted: 0,
  uniqueSkillsPracticed: 0,
  independentChallenges: 0,
  supportedChallenges: 0,
  totalSeconds: 0,
  averageMastery: 0,
};

export function summarizePracticeSession(session) {
  if (!isRecord(session) || !Array.isArray(session.completed)) return { ...EMPTY_SUMMARY };

  const skills = new Set();
  let challengesCompleted = 0;
  let independentChallenges = 0;
  let supportedChallenges = 0;
  let totalSeconds = 0;
  let totalMastery = 0;

  for (const result of session.completed) {
    const normalized = normalizeSessionResult(result);
    if (!normalized) continue;

    challengesCompleted += 1;
    skills.add(normalized.skillId ?? normalized.nodeId);
    totalMastery += normalized.mastery;
    totalSeconds += normalized.durationSeconds;
    if (normalized.supportsUsed > 0) supportedChallenges += 1;
    else independentChallenges += 1;
  }

  return {
    challengesCompleted,
    uniqueSkillsPracticed: skills.size,
    independentChallenges,
    supportedChallenges,
    totalSeconds,
    averageMastery: challengesCompleted > 0 ? totalMastery / challengesCompleted : 0,
  };
}
