// Lumora progression engine — pure functions, no storage/UI.
// Skills 1-3: 1 = guided, 2 = supported (self-directed), 3 = independent.
import { addEnergy, createInitialEnergy, getEnergyReward, normalizeEnergy } from "./energyEngine.js";

export function createInitialProgress() {
  return {
    completed: [],
    shards: 0,
    xp: 0,
    energies: createInitialEnergy(),
    nubiStage: 1,
    lastPlayedAt: null,
    learningMetrics: {},
    nodeOutcomes: {},
    gameplayMetrics: { sessionsCompleted: 0, replays: 0, totalActions: 0 },
    practiceMetrics: {
      sessionsCompleted: 0,
      challengesCompleted: 0,
      discoveryActivitiesCompleted: 0,
      independentChallenges: 0,
      supportedChallenges: 0,
      totalSeconds: 0,
      lastCompletedAt: null,
    },
    activityHistory: [],
    cityState: { selectedBuildingId: null, equippedCosmeticId: null },
  };
}

const clampInt = (v, min, max) =>
  Number.isFinite(v) ? Math.min(max, Math.max(min, Math.trunc(v))) : min;

const normalizeIsoDate = (value) => {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return null;
  return value;
};

const normalizeActivityMode = (value) => ["practice", "side-quest", "secret-quest"].includes(value) ? value : "adventure";

function normalizeActivityRecord(value) {
  if (!value || typeof value !== "object" || typeof value.nodeId !== "string") return null;
  const record = {
    nodeId: value.nodeId,
    skillId: typeof value.skillId === "string" ? value.skillId : value.nodeId,
    mastery: clampInt(value.mastery, 1, 3),
    attempts: clampInt(value.attempts, 1, Infinity),
    supportsUsed: clampInt(value.supportsUsed, 0, Infinity),
    guided: Boolean(value.guided),
    actions: clampInt(value.actions, 0, Infinity),
    durationSeconds: clampInt(value.durationSeconds, 0, 4 * 60 * 60),
    firstClear: Boolean(value.firstClear),
    mode: normalizeActivityMode(value.mode),
    completedAt: normalizeIsoDate(value.completedAt),
  };
  if (typeof value.activityId === "string" && value.activityId.trim()) record.activityId = value.activityId.trim();
  if (typeof value.activityContext === "string" && value.activityContext.trim()) record.activityContext = value.activityContext.trim();
  if (typeof value.variantId === "string" && value.variantId.trim()) record.variantId = value.variantId.trim();
  return record;
}

function makeSkillEntry(skillId, seed = {}) {
  return {
    skillId,
    completions: clampInt(seed.completions, 0, Infinity),
    totalAttempts: clampInt(seed.totalAttempts, 0, Infinity),
    supportsUsed: clampInt(seed.supportsUsed, 0, Infinity),
    guidedCompletions: clampInt(seed.guidedCompletions, 0, Infinity),
    bestMastery: clampInt(seed.bestMastery, 0, 3),
  };
}

function ensureSkill(learningMetrics, skillId) {
  learningMetrics[skillId] ??= makeSkillEntry(skillId);
  return learningMetrics[skillId];
}

function normalizeCompletedIds(value, validNodeIds) {
  const unique = Array.isArray(value) ? [...new Set(value.filter((id) => typeof id === "string"))] : [];
  if (!Array.isArray(validNodeIds)) return unique;
  const selected = new Set(unique);
  const prefix = [];
  for (const id of validNodeIds) {
    if (!selected.has(id)) break;
    prefix.push(id);
  }
  return prefix;
}

// v1 stored { completed, shards, xp, mastery: {nodeId: 1-3}, attempts, hints, nubiStage, lastPlayedAt }.
function migrateV1(value, validNodeIds) {
  const base = createInitialProgress();
  const completed = normalizeCompletedIds(value.completed, validNodeIds);
  const progress = {
    ...base,
    completed,
    shards: clampInt(value.shards, 0, Infinity),
    xp: clampInt(value.xp, 0, Infinity),
    energies: normalizeEnergy(value.energies ?? value.energy),
    nubiStage: clampInt(value.nubiStage, 1, 2) || 1,
    lastPlayedAt: typeof value.lastPlayedAt === "string" ? value.lastPlayedAt : null,
  };
  const mastery = value.mastery;
  if (mastery && typeof mastery === "object") {
    for (const [id, stars] of Object.entries(mastery)) {
      if (!validNodeIds.includes(id)) continue;
      progress.learningMetrics[id] = makeSkillEntry(id, {
        completions: completed.includes(id) ? 1 : 0,
        bestMastery: clampInt(stars, 0, 3),
      });
      if (completed.includes(id)) {
        progress.nodeOutcomes[id] = {
          nodeId: id,
          skillId: id,
          mastery: clampInt(stars, 1, 3),
          attempts: 1,
          supportsUsed: 0,
          guided: clampInt(stars, 0, 3) === 1,
          completedAt: progress.lastPlayedAt,
        };
      }
    }
  }
  return progress;
}

/**
 * Coerce arbitrary persisted data into a canonical progress object. Never throws.
 * - strips completed ids not in validNodeIds (only when a list is provided; without one
 *   the ids are trusted as-is so that recordLevelResult never wipes completed state)
 * - clamps counters to nonnegative integers
 * - migrates the v1 shape (flat mastery map) when detected
 */
export function normalizeProgress(value, validNodeIds) {
  const ids = Array.isArray(validNodeIds) ? validNodeIds : null;
  if (!value || typeof value !== "object") return createInitialProgress();

  const isV1 =
    "mastery" in value ||
    !("learningMetrics" in value) ||
    !("gameplayMetrics" in value);

  if (isV1) return migrateV1(value, ids ?? []);

  const base = createInitialProgress();
  const completed = normalizeCompletedIds(value.completed, ids);
  const learningMetrics = {};
  if (value.learningMetrics && typeof value.learningMetrics === "object") {
    for (const [skillId, entry] of Object.entries(value.learningMetrics)) {
      if (!entry || typeof entry !== "object") {
        learningMetrics[skillId] = makeSkillEntry(skillId);
      } else {
        learningMetrics[skillId] = makeSkillEntry(skillId, entry);
      }
    }
  }
  const gm = value.gameplayMetrics ?? {};
  const pm = value.practiceMetrics ?? {};
  const nodeOutcomes = {};
  if (value.nodeOutcomes && typeof value.nodeOutcomes === "object") {
    for (const [nodeId, outcome] of Object.entries(value.nodeOutcomes)) {
      if (!completed.includes(nodeId) || !outcome || typeof outcome !== "object") continue;
      nodeOutcomes[nodeId] = {
        nodeId,
        skillId: typeof outcome.skillId === "string" ? outcome.skillId : nodeId,
        mastery: clampInt(outcome.mastery, 1, 3),
        attempts: clampInt(outcome.attempts, 1, Infinity),
        supportsUsed: clampInt(outcome.supportsUsed, 0, Infinity),
        guided: Boolean(outcome.guided),
        completedAt: typeof outcome.completedAt === "string" ? outcome.completedAt : null,
      };
      if (typeof outcome.activityId === "string" && outcome.activityId.trim()) nodeOutcomes[nodeId].activityId = outcome.activityId.trim();
      if (typeof outcome.activityContext === "string" && outcome.activityContext.trim()) nodeOutcomes[nodeId].activityContext = outcome.activityContext.trim();
      if (typeof outcome.variantId === "string" && outcome.variantId.trim()) nodeOutcomes[nodeId].variantId = outcome.variantId.trim();
    }
  }
  const activityHistory = Array.isArray(value.activityHistory)
    ? value.activityHistory.map(normalizeActivityRecord).filter(Boolean).slice(-90)
    : [];
  const cityState = value.cityState && typeof value.cityState === "object" ? value.cityState : {};
  return {
    completed,
    shards: clampInt(value.shards, 0, Infinity),
    xp: clampInt(value.xp, 0, Infinity),
    energies: normalizeEnergy(value.energies ?? value.energy),
    nubiStage: clampInt(value.nubiStage, 1, 2) || 1,
    lastPlayedAt: typeof value.lastPlayedAt === "string" ? value.lastPlayedAt : null,
    learningMetrics,
    nodeOutcomes,
    gameplayMetrics: {
      sessionsCompleted: clampInt(gm.sessionsCompleted, 0, Infinity),
      replays: clampInt(gm.replays, 0, Infinity),
      totalActions: clampInt(gm.totalActions, 0, Infinity),
    },
    practiceMetrics: {
      sessionsCompleted: clampInt(pm.sessionsCompleted, 0, Infinity),
      challengesCompleted: clampInt(pm.challengesCompleted, 0, Infinity),
      discoveryActivitiesCompleted: clampInt(pm.discoveryActivitiesCompleted, 0, Infinity),
      independentChallenges: clampInt(pm.independentChallenges, 0, Infinity),
      supportedChallenges: clampInt(pm.supportedChallenges, 0, Infinity),
      totalSeconds: clampInt(pm.totalSeconds, 0, Infinity),
      lastCompletedAt: normalizeIsoDate(pm.lastCompletedAt),
    },
    activityHistory,
    cityState: {
      selectedBuildingId: typeof cityState.selectedBuildingId === "string" ? cityState.selectedBuildingId : null,
      equippedCosmeticId: typeof cityState.equippedCosmeticId === "string" ? cityState.equippedCosmeticId : null,
    },
  };
}

/**
 * Sequential unlock: a node is unlocked when it is already completed or when
 * every node before it in orderedNodeIds is completed. Corrupt progress is
 * normalized first, so this never crashes and never grants skips.
 */
export function isNodeUnlocked(nodeId, orderedNodeIds = [], progress) {
  const nodes = Array.isArray(orderedNodeIds) ? orderedNodeIds : [];
  const normalized = normalizeProgress(progress, nodes);
  const index = nodes.indexOf(nodeId);
  if (index === -1) return false;
  if (normalized.completed.includes(nodeId)) return true;
  return nodes.slice(0, index).every((id) => normalized.completed.includes(id));
}

const masteryFor = (supportsUsed, guided) => {
  if (guided) return 1;
  return supportsUsed > 0 ? 2 : 3;
};

/**
 * XP is a first-clear progression signal, separate from shards and learning mastery.
 * Help never removes the base reward; independent completion adds a small mastery bonus.
 */
export function getXpReward({ reward = 0, mastery = 0, firstClear = true } = {}) {
  if (!firstClear) return 0;
  const base = clampInt(reward, 0, Infinity) * 10;
  const masteryBonus = { 1: 5, 2: 10, 3: 15 }[clampInt(mastery, 1, 3)] ?? 0;
  return base + masteryBonus;
}

/**
 * Record one completed level.
 * result: { nodeId, skillId, reward, attempts, supportsUsed, guided, actions, durationSeconds, mode, completedAt, isBoss }
 * - first clear: grants reward once, records completion
 * - replay: 0 shards, increments gameplayMetrics.replays
 * - support never reduces the shard reward
 * - bestMastery is max(before, mastery of this attempt), so it never decreases
 * - boss first clear sets nubiStage = 2
 */
export function recordLevelResult(progress, result) {
  if (!result || typeof result !== "object" || typeof result.nodeId !== "string") {
    throw new TypeError("recordLevelResult requires a result with a string nodeId");
  }
  const p = normalizeProgress(progress);
  const {
    nodeId,
    skillId = nodeId,
    reward = 0,
    attempts = 1,
    supportsUsed = 0,
    guided = false,
    actions = 0,
    durationSeconds = 0,
    mode = "adventure",
    activityId,
    activityContext,
    variantId,
    energyTypes = [],
    completedAt,
    isBoss = nodeId === "boss",
  } = result;

  const firstClear = !p.completed.includes(nodeId);
  const metric = ensureSkill(p.learningMetrics, skillId);
  const thisMastery = masteryFor(supportsUsed, guided);
  const normalizedMode = normalizeActivityMode(mode);

  // Metrics update on every completed attempt.
  metric.totalAttempts += clampInt(attempts, 1, Infinity);
  metric.supportsUsed += clampInt(supportsUsed, 0, Infinity);
  metric.bestMastery = Math.max(metric.bestMastery, thisMastery);
  metric.skillId = skillId;
  // Keep the node-level outcome as the canonical Main Quest result. Daily and
  // Side/Secret contexts live in activityHistory; otherwise a replayed branch
  // would overwrite the source node's outcome and distort city/league gates.
  if (normalizedMode === "adventure") {
    p.nodeOutcomes[nodeId] = {
      nodeId,
      skillId,
      mastery: thisMastery,
      attempts: clampInt(attempts, 1, Infinity),
      supportsUsed: clampInt(supportsUsed, 0, Infinity),
      guided: Boolean(guided),
      completedAt: typeof completedAt === "string" ? completedAt : null,
    };
    if (typeof activityId === "string" && activityId.trim()) p.nodeOutcomes[nodeId].activityId = activityId.trim();
    if (typeof activityContext === "string" && activityContext.trim()) p.nodeOutcomes[nodeId].activityContext = activityContext.trim();
    if (typeof variantId === "string" && variantId.trim()) p.nodeOutcomes[nodeId].variantId = variantId.trim();
  }

  p.gameplayMetrics.sessionsCompleted += 1;
  p.gameplayMetrics.totalActions += clampInt(actions, 0, Infinity);
  const activityRecord = {
    nodeId,
    skillId,
    mastery: thisMastery,
    attempts: clampInt(attempts, 1, Infinity),
    supportsUsed: clampInt(supportsUsed, 0, Infinity),
    guided: Boolean(guided),
    actions: clampInt(actions, 0, Infinity),
    durationSeconds: clampInt(durationSeconds, 0, 4 * 60 * 60),
    firstClear,
    mode: normalizedMode,
    completedAt: normalizeIsoDate(completedAt),
  };
  if (typeof activityId === "string" && activityId.trim()) activityRecord.activityId = activityId.trim();
  if (typeof activityContext === "string" && activityContext.trim()) activityRecord.activityContext = activityContext.trim();
  if (typeof variantId === "string" && variantId.trim()) activityRecord.variantId = variantId.trim();
  p.activityHistory.push(activityRecord);
  p.activityHistory = p.activityHistory.slice(-90);

  if (firstClear) {
    p.completed.push(nodeId);
    p.shards += clampInt(reward, 0, Infinity); // support does not reduce the reward
    p.xp += getXpReward({ reward, mastery: thisMastery, firstClear });
    p.energies = addEnergy(p.energies, getEnergyReward({ energyTypes, mastery: thisMastery, firstClear }));
    metric.completions += 1;
    if (guided) metric.guidedCompletions += 1;
    if (isBoss) p.nubiStage = 2;
  } else {
    p.gameplayMetrics.replays += 1;
  }

  if (completedAt !== undefined) p.lastPlayedAt = completedAt;

  return p;
}

/** Record one completed Daily Adventure session without adding shards. */
export function recordPracticeSessionCompletion(progress, summary = {}, completedAt) {
  const p = normalizeProgress(progress);
  const challengesCompleted = clampInt(summary.challengesCompleted, 0, 3);
  if (challengesCompleted === 0) return p;
  p.practiceMetrics.sessionsCompleted += 1;
  p.practiceMetrics.challengesCompleted += challengesCompleted;
  if (summary.discoveryCompleted === true) p.practiceMetrics.discoveryActivitiesCompleted += 1;
  p.practiceMetrics.independentChallenges += clampInt(summary.independentChallenges, 0, challengesCompleted);
  p.practiceMetrics.supportedChallenges += clampInt(summary.supportedChallenges, 0, challengesCompleted);
  p.practiceMetrics.totalSeconds += clampInt(summary.totalSeconds, 0, 12 * 60 * 60);
  p.practiceMetrics.lastCompletedAt = normalizeIsoDate(completedAt);
  return p;
}

/** Outcome of the most recent completion of nodeId, or null if never completed. */
export function getNodeOutcome(progress, nodeId) {
  const p = normalizeProgress(progress);
  if (!p.completed.includes(nodeId)) return null;
  const outcome = p.nodeOutcomes[nodeId];
  return outcome ? { ...outcome } : null;
}
