// Local-first mastery loop. It connects the same skill to several safe
// gameplay contexts without generating curriculum or sending child data away.

export const MASTERY_ARC_VERSION = 1;

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
const uniqueIds = (value) => [...new Set((Array.isArray(value) ? value : []).filter(isValidId).map((id) => id.trim()))];
const clampInt = (value, min, max) => Number.isFinite(value) ? Math.min(max, Math.max(min, Math.trunc(value))) : min;

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}

function getPlayableWorlds(worldDefinitions) {
  return (Array.isArray(worldDefinitions) ? worldDefinitions : [])
    .filter((world) => isRecord(world) && isValidId(world.id) && world.availability === "playable")
    .map((world) => ({ id: world.id.trim(), nodeIds: uniqueIds(world.nodeIds) }));
}

function getNodeOrder(node, fallback) {
  return Number.isFinite(node?.index) ? node.index : fallback;
}

function makeActivity({
  id,
  skillId,
  skillNameVi,
  objectiveVi,
  nodeId,
  sourceNodeId = nodeId,
  sourceId,
  sourceType,
  context,
  variantId,
  mechanic,
  worldId,
  order,
  prerequisiteIds = [],
}) {
  if (![id, skillId, nodeId, sourceId, sourceType, context, worldId].every(isValidId)) return null;
  return {
    id: id.trim(),
    skillId: skillId.trim(),
    skillNameVi: typeof skillNameVi === "string" ? skillNameVi : skillId.trim(),
    objectiveVi: typeof objectiveVi === "string" ? objectiveVi : "",
    nodeId: nodeId.trim(),
    sourceNodeId: isValidId(sourceNodeId) ? sourceNodeId.trim() : nodeId.trim(),
    sourceId: sourceId.trim(),
    sourceType: sourceType.trim(),
    context: context.trim(),
    variantId: isValidId(variantId) ? variantId.trim() : context.trim(),
    mechanic: isValidId(mechanic) ? mechanic.trim() : null,
    worldId: worldId.trim(),
    order: Number.isFinite(order) ? order : 0,
    prerequisiteIds: uniqueIds(prerequisiteIds),
  };
}

function getActivityArrays(registry) {
  if (!isRecord(registry) || !Array.isArray(registry.activities)) return [];
  return registry.activities.filter((activity) => isRecord(activity) && isValidId(activity.id));
}

function progressCompleted(progress) {
  return new Set(uniqueIds(progress?.completed));
}

function activityMetric(progress, activity) {
  const sources = [progress?.learningMetrics?.[activity.skillId], progress?.learningMetrics?.[activity.nodeId]];
  const metric = sources.find((entry) => isRecord(entry)) ?? {};
  return {
    bestMastery: clampInt(metric.bestMastery, 0, 3),
    totalAttempts: clampInt(metric.totalAttempts, 0, Number.MAX_SAFE_INTEGER),
    supportsUsed: clampInt(metric.supportsUsed, 0, Number.MAX_SAFE_INTEGER),
  };
}

function supportRate(evidence) {
  return evidence.attempts > 0 ? evidence.supportsUsed / evidence.attempts : 0;
}

function recordMatchesActivity(record, activity) {
  if (!isRecord(record) || !isRecord(activity)) return false;
  if (record.activityId === activity.id) {
    return (
      (!record.skillId || record.skillId === activity.skillId) &&
      (!record.nodeId || record.nodeId === activity.nodeId) &&
      (!record.activityContext || record.activityContext === activity.context)
    );
  }
  if (record.activityId || record.activityContext) return false;
  if (record.skillId && record.skillId !== activity.skillId) return false;
  if (record.nodeId !== activity.nodeId) return false;

  // These fallbacks keep the report useful for progress written before the
  // activity contract existed. Phase activities deliberately require an
  // explicit id so an aggregate boss result cannot fake phase transfer proof.
  if (activity.sourceType === "phase") return false;
  if (activity.sourceType === "daily") return record.mode === "practice";
  if (activity.sourceType === "quest") return record.mode === (activity.context === "secret" ? "secret-quest" : "side-quest");
  return record.mode === "adventure" || record.mode === undefined;
}

function getActivityEvidence(progress, activity) {
  const records = Array.isArray(progress?.activityHistory) ? progress.activityHistory : [];
  const matched = records.filter((record) => recordMatchesActivity(record, activity));
  const metric = activityMetric(progress, activity);
  return {
    attempts: matched.reduce((sum, record) => sum + clampInt(record.attempts, 1, Number.MAX_SAFE_INTEGER), 0) || metric.totalAttempts,
    supportsUsed: matched.reduce((sum, record) => sum + clampInt(record.supportsUsed, 0, Number.MAX_SAFE_INTEGER), 0) || metric.supportsUsed,
    bestMastery: Math.max(metric.bestMastery, ...matched.map((record) => clampInt(record.mastery, 0, 3))),
    records: matched,
  };
}

function allPrerequisitesMet(activity, completed) {
  return activity.prerequisiteIds.every((id) => completed.has(id));
}

function compareCandidate(left, right) {
  if (left.evidence.bestMastery !== right.evidence.bestMastery) return left.evidence.bestMastery - right.evidence.bestMastery;
  const leftSupport = supportRate(left.evidence);
  const rightSupport = supportRate(right.evidence);
  if (leftSupport !== rightSupport) return rightSupport - leftSupport;
  if (left.evidence.attempts !== right.evidence.attempts) return right.evidence.attempts - left.evidence.attempts;
  if (left.activity.order !== right.activity.order) return left.activity.order - right.activity.order;
  return left.activity.id.localeCompare(right.activity.id);
}

/**
 * Build a frozen registry from approved data boundaries supplied by the app.
 * Prototype content is intentionally still visible in demo mode, but an
 * unknown node, skill, world, quest or phase is omitted rather than guessed.
 */
export function createMasteryArcRegistry({
  nodeDefinitions = [],
  questDefinitions = [],
  worldDefinitions = [],
  phaseResolver,
} = {}) {
  const worlds = getPlayableWorlds(worldDefinitions);
  const worldByNodeId = new Map();
  const ambiguousNodeIds = new Set();
  const worldById = new Map(worlds.map((world) => [world.id, world]));
  worlds.forEach((world) => world.nodeIds.forEach((nodeId) => {
    if (worldByNodeId.has(nodeId) && worldByNodeId.get(nodeId) !== world.id) {
      ambiguousNodeIds.add(nodeId);
      return;
    }
    if (!worldByNodeId.has(nodeId)) worldByNodeId.set(nodeId, world.id);
  }));

  const nodes = (Array.isArray(nodeDefinitions) ? nodeDefinitions : [])
    .map((node, sourceIndex) => ({ node, sourceIndex }))
    .filter(({ node }) => isRecord(node) && isValidId(node.id) && isValidId(node.skillId) && worldByNodeId.has(node.id) && !ambiguousNodeIds.has(node.id))
    .sort((left, right) => getNodeOrder(left.node, left.sourceIndex) - getNodeOrder(right.node, right.sourceIndex));
  const nodeById = new Map(nodes.map(({ node }) => [node.id, node]));
  const activities = [];

  for (const { node, sourceIndex } of nodes) {
    const worldId = worldByNodeId.get(node.id);
    const nodeOrder = getNodeOrder(node, sourceIndex);
    const mainActivity = makeActivity({
      id: `main:${node.id}`,
      skillId: node.skillId,
      skillNameVi: node.skillNameVi,
      objectiveVi: node.objectiveVi,
      nodeId: node.id,
      sourceId: node.id,
      sourceType: "main",
      context: node.type === "boss" ? "boss" : "main",
      variantId: node.type,
      mechanic: node.type,
      worldId,
      order: nodeOrder,
      prerequisiteIds: node.prerequisites,
    });
    if (mainActivity) activities.push(mainActivity);

    if (typeof phaseResolver === "function") {
      const phases = phaseResolver(node.type);
      if (Array.isArray(phases)) phases.forEach((phase, phaseIndex) => {
        const source = nodeById.get(phase?.sourceNodeId);
        if (!source || worldByNodeId.get(source.id) !== worldId || getNodeOrder(source, sourceIndex) >= nodeOrder) return;
        const phaseActivity = makeActivity({
          id: `phase:${node.id}:${phase.id}`,
          skillId: source.skillId,
          skillNameVi: source.skillNameVi,
          objectiveVi: source.objectiveVi,
          nodeId: node.id,
          sourceNodeId: source.id,
          sourceId: node.id,
          sourceType: "phase",
          context: node.type,
          variantId: phase.mechanic,
          mechanic: phase.mechanic,
          worldId,
          order: nodeOrder + (phaseIndex + 1) / 100,
          prerequisiteIds: [...(Array.isArray(node.prerequisites) ? node.prerequisites : []), source.id],
        });
        if (phaseActivity) activities.push(phaseActivity);
      });
    }

    if (DIRECT_MECHANIC_TYPES.has(node.type)) {
      const dailyActivity = makeActivity({
        id: `daily:${node.id}`,
        skillId: node.skillId,
        skillNameVi: node.skillNameVi,
        objectiveVi: node.objectiveVi,
        nodeId: node.id,
        sourceId: node.id,
        sourceType: "daily",
        context: "daily",
        variantId: `${node.type}-retrieval`,
        mechanic: node.type,
        worldId,
        order: nodeOrder,
        prerequisiteIds: [node.id],
      });
      if (dailyActivity) activities.push(dailyActivity);
    }
  }

  const validNodeIds = new Set(nodes.map(({ node }) => node.id));
  for (const quest of Array.isArray(questDefinitions) ? questDefinitions : []) {
    if (!isRecord(quest) || !isValidId(quest.id) || !isValidId(quest.skillId) || !validNodeIds.has(quest.sourceNodeId)) continue;
    const worldId = worldByNodeId.get(quest.sourceNodeId);
    if (!worldById.has(worldId)) continue;
    const context = quest.kind === "secret" ? "secret" : quest.kind === "side" ? "side" : null;
    if (!context) continue;
    const activity = makeActivity({
      id: `quest:${quest.id}`,
      skillId: quest.skillId,
      skillNameVi: quest.skillNameVi,
      objectiveVi: quest.objectiveVi,
      nodeId: quest.sourceNodeId,
      sourceId: quest.id,
      sourceType: "quest",
      context,
      variantId: quest.type,
      mechanic: quest.type,
      worldId,
      order: getNodeOrder(nodeById.get(quest.sourceNodeId), 0) + 0.5,
      prerequisiteIds: [...uniqueIds(quest.prerequisites), ...uniqueIds(quest.discoveryPrerequisites)],
    });
    if (activity) activities.push(activity);
  }

  activities.sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
  const byId = Object.fromEntries(activities.map((activity) => [activity.id, activity]));
  const arcMap = new Map();
  activities.forEach((activity) => {
    if (!arcMap.has(activity.skillId)) {
      arcMap.set(activity.skillId, {
        skillId: activity.skillId,
        skillNameVi: activity.skillNameVi,
        objectiveVi: activity.objectiveVi,
        worldIds: [],
        activities: [],
      });
    }
    const arc = arcMap.get(activity.skillId);
    arc.activities.push(activity);
    if (!arc.worldIds.includes(activity.worldId)) arc.worldIds.push(activity.worldId);
  });

  const registry = {
    version: MASTERY_ARC_VERSION,
    worlds: worlds.map((world) => ({ ...world, nodeIds: world.nodeIds.slice() })),
    activities,
    activityById: byId,
    arcs: [...arcMap.values()],
  };
  return deepFreeze(registry);
}

export function findMasteryActivity(registry, query = {}) {
  const activities = getActivityArrays(registry);
  if (isValidId(query.activityId)) return activities.find((activity) => activity.id === query.activityId) ?? null;
  return activities.find((activity) => (
    (!query.sourceType || activity.sourceType === query.sourceType) &&
    (!query.sourceId || activity.sourceId === query.sourceId) &&
    (!query.nodeId || activity.nodeId === query.nodeId) &&
    (!query.context || activity.context === query.context)
  )) ?? null;
}

/** Return the second ordered main activity for the first-session bridge. */
export function selectFirstSessionContinuationTarget(registry, { worldId, progress } = {}) {
  const activities = getActivityArrays(registry)
    .filter((activity) => activity.sourceType === "main" && activity.context === "main" && (!worldId || activity.worldId === worldId))
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
  if (activities.length < 2) return null;
  const completed = progressCompleted(progress);
  const first = activities[0];
  const second = activities[1];
  if (!completed.has(first.nodeId) || completed.has(second.nodeId) || !allPrerequisitesMet(second, completed)) return null;
  return second;
}

/**
 * Select deterministic activities for a context. Daily is intentionally a
 * retrieval context over already-completed direct mechanics; it never unlocks
 * a node and never creates a reward-bearing first clear.
 */
export function selectMasteryActivities(registry, progress, {
  context = "daily",
  worldId,
  limit = 3,
  skillId,
  allowedNodeIds,
} = {}) {
  const completed = progressCompleted(progress);
  const completedQuests = new Set(uniqueIds(progress?.questState?.completedIds));
  const allowedNodes = Array.isArray(allowedNodeIds) ? new Set(uniqueIds(allowedNodeIds)) : null;
  const candidates = getActivityArrays(registry)
    .filter((activity) => activity.context === context)
    .filter((activity) => !worldId || activity.worldId === worldId)
    .filter((activity) => !skillId || activity.skillId === skillId)
    .filter((activity) => !allowedNodes || allowedNodes.has(activity.nodeId))
    .filter((activity) => {
      if (context === "daily") return completed.has(activity.nodeId);
      if (context === "main") return !completed.has(activity.nodeId) && allPrerequisitesMet(activity, completed);
      if (activity.sourceType === "quest") return !completedQuests.has(activity.sourceId) && allPrerequisitesMet(activity, completed);
      return allPrerequisitesMet(activity, completed);
    })
    .map((activity) => ({ activity, evidence: getActivityEvidence(progress, activity) }))
    .sort(compareCandidate);

  const selected = [];
  const selectedSkills = new Set();
  const max = clampInt(limit, 0, 12);
  for (const candidate of candidates) {
    if (selected.length >= max) break;
    // One activity per skill keeps a Daily Adventure varied and prevents a
    // duplicated skill from crowding out transfer contexts.
    if (context === "daily" && selectedSkills.has(candidate.activity.skillId)) continue;
    selected.push(candidate.activity);
    selectedSkills.add(candidate.activity.skillId);
  }
  return selected;
}

function arcEvidence(progress, activities) {
  const evidence = {
    attempts: 0,
    supportsUsed: 0,
    bestMastery: 0,
    observedContexts: new Set(),
    observedActivityIds: new Set(),
  };
  activities.forEach((activity) => {
    const activityEvidence = getActivityEvidence(progress, activity);
    if (activityEvidence.records.length === 0) return;
    evidence.attempts += activityEvidence.attempts;
    evidence.supportsUsed += activityEvidence.supportsUsed;
    evidence.bestMastery = Math.max(evidence.bestMastery, activityEvidence.bestMastery);
    evidence.observedContexts.add(activity.context);
    evidence.observedActivityIds.add(activity.id);
  });
  return evidence;
}

export function getMasteryArcReport(registry, progress, { worldId, limit = 12 } = {}) {
  if (!isRecord(registry) || !Array.isArray(registry.arcs)) return { version: MASTERY_ARC_VERSION, worldId: worldId ?? null, arcs: [] };
  const arcs = registry.arcs
    .filter((arc) => !worldId || arc.worldIds?.includes(worldId))
    .map((arc) => {
      const activities = arc.activities.filter((activity) => !worldId || activity.worldId === worldId);
      const evidence = arcEvidence(progress, activities);
      const availableContexts = [...new Set(activities.map((activity) => activity.context))];
      const nextCandidates = selectMasteryActivities(registry, progress, { context: "daily", worldId, skillId: arc.skillId, limit: 1 });
      return {
        skillId: arc.skillId,
        skillNameVi: arc.skillNameVi,
        objectiveVi: arc.objectiveVi,
        availableContexts,
        observedContexts: [...evidence.observedContexts],
        contextCount: evidence.observedContexts.size,
        transferReady: evidence.observedContexts.has("main") && evidence.observedContexts.size >= 2,
        bestMastery: evidence.bestMastery,
        attempts: evidence.attempts,
        supportsUsed: evidence.supportsUsed,
        nextActivity: nextCandidates[0] ?? null,
      };
    })
    .sort((left, right) => left.bestMastery - right.bestMastery || right.attempts - left.attempts || left.skillId.localeCompare(right.skillId))
    .slice(0, clampInt(limit, 0, 50));
  return { version: MASTERY_ARC_VERSION, worldId: worldId ?? null, arcs };
}
