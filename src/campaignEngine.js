// Pure campaign/world progression helpers. No storage or UI dependencies.

const asArray = (value) => (Array.isArray(value) ? value : []);
const uniqueStrings = (value) => [...new Set(asArray(value).filter((item) => typeof item === "string" && item.length > 0))];
const isText = (value) => typeof value === "string" && value.trim().length > 0;
const OPTIONAL_QUEST_TYPES = new Set(["match", "restore", "route", "rune"]);
const OPTIONAL_QUEST_KINDS = new Set(["side", "secret"]);

function findById(collection, id) {
  return asArray(collection).find((entry) => entry?.id === id) ?? null;
}

function findByQuestId(collection, questId) {
  return asArray(collection).filter((entry) => entry?.questId === questId);
}

export function auditCampaignRegistry(worlds, nodes = [], optionalContext = null) {
  const errors = [];
  const registry = asArray(worlds);
  const nodeIds = new Set(asArray(nodes).map((node) => node?.id).filter((id) => typeof id === "string"));
  const worldIds = new Set();
  const claimedNodeIds = new Set();

  if (registry.length === 0) errors.push("Campaign registry must contain at least one world.");

  for (const world of registry) {
    if (!world || typeof world !== "object" || typeof world.id !== "string" || world.id.length === 0) {
      errors.push("Every world must have a non-empty string id.");
      continue;
    }
    if (worldIds.has(world.id)) errors.push(`Duplicate world id: ${world.id}.`);
    worldIds.add(world.id);

    const ids = uniqueStrings(world.nodeIds);
    if (ids.length !== asArray(world.nodeIds).length) errors.push(`World ${world.id} has invalid or duplicate node ids.`);
    for (const nodeId of ids) {
      if (claimedNodeIds.has(nodeId)) errors.push(`Node ${nodeId} belongs to more than one world.`);
      claimedNodeIds.add(nodeId);
      if (nodeIds.size > 0 && !nodeIds.has(nodeId)) errors.push(`World ${world.id} references unknown node ${nodeId}.`);
    }

    if (world.availability === "playable") {
      if (ids.length === 0) errors.push(`Playable world ${world.id} must contain nodes.`);
      if (typeof world.bossNodeId !== "string" || !ids.includes(world.bossNodeId)) {
        errors.push(`Playable world ${world.id} must have a boss inside its node boundary.`);
      }
    } else if (world.bossNodeId != null && !ids.includes(world.bossNodeId)) {
      errors.push(`World ${world.id} has a boss outside its node boundary.`);
    }
  }

  for (const world of registry) {
    if (!world || typeof world.id !== "string") continue;
    if (world.prerequisiteWorldId != null && !worldIds.has(world.prerequisiteWorldId)) {
      errors.push(`World ${world.id} references unknown prerequisite ${world.prerequisiteWorldId}.`);
    }
    if (world.prerequisiteWorldId === world.id) errors.push(`World ${world.id} cannot require itself.`);
  }

  for (const world of registry) {
    const visited = new Set();
    let cursor = world;
    while (cursor?.prerequisiteWorldId != null) {
      if (visited.has(cursor.id)) {
        errors.push(`Campaign prerequisite cycle includes world ${cursor.id}.`);
        break;
      }
      visited.add(cursor.id);
      cursor = getWorldById(registry, cursor.prerequisiteWorldId);
    }
  }

  if (optionalContext && typeof optionalContext === "object") {
    const optionalAudit = auditOptionalQuestRegistry(registry, optionalContext.optionalQuests, {
      ...optionalContext,
      nodes,
    });
    errors.push(...optionalAudit.errors);
  }

  return { ok: errors.length === 0, errors };
}

// Validates the cross-file contract for optional quests without touching
// progress, rewards, curriculum approval, or storage. Optional quests are
// allowed to reinforce a Main skill, but must still have one clear World,
// source node, interaction scenario, City projection, and cosmetic reward.
export function auditOptionalQuestRegistry(worlds, optionalQuests, {
  nodes = [],
  resourceRouteScenarios = [],
  environmentRestorationScenarios = [],
  cityRestorationFeatures = [],
  cityCosmetics = [],
} = {}) {
  const errors = [];
  const worldsRegistry = asArray(worlds);
  const quests = asArray(optionalQuests);
  const nodeIds = new Set(asArray(nodes).map((node) => node?.id).filter(isText));
  const worldByQuestId = new Map();
  const questById = new Map();
  const claimedQuestIds = new Set();

  if (!Array.isArray(optionalQuests)) errors.push("Optional quest registry must be an array.");

  for (const world of worldsRegistry) {
    if (!world || !isText(world.id)) continue;
    const rawQuestIds = world.optionalQuestIds;
    if (!Array.isArray(rawQuestIds)) {
      errors.push(`World ${world.id} must define optionalQuestIds as an array.`);
      continue;
    }
    const ids = uniqueStrings(rawQuestIds);
    if (ids.length !== rawQuestIds.length) errors.push(`World ${world.id} has invalid or duplicate optional quest ids.`);
    for (const questId of ids) {
      if (claimedQuestIds.has(questId)) errors.push(`Optional quest ${questId} belongs to more than one world.`);
      claimedQuestIds.add(questId);
      worldByQuestId.set(questId, world);
      if (!quests.some((quest) => quest?.id === questId)) errors.push(`World ${world.id} references unknown optional quest ${questId}.`);
    }
  }

  for (const quest of quests) {
    const questId = isText(quest?.id) ? quest.id.trim() : null;
    if (!questId) {
      errors.push("Every optional quest must have a non-empty string id.");
      continue;
    }
    if (questById.has(questId)) errors.push(`Duplicate optional quest id: ${questId}.`);
    else questById.set(questId, quest);

    if (!OPTIONAL_QUEST_KINDS.has(quest.kind)) errors.push(`Optional quest ${questId} has an unsupported kind.`);
    if (!OPTIONAL_QUEST_TYPES.has(quest.type)) errors.push(`Optional quest ${questId} has an unsupported type.`);
    if (!isText(quest.skillId) || !isText(quest.skillNameVi) || !isText(quest.objectiveVi)) {
      errors.push(`Optional quest ${questId} must define skillId, skillNameVi, and objectiveVi.`);
    }
    if (!Array.isArray(quest.prerequisites) || quest.prerequisites.some((id) => !isText(id))) {
      errors.push(`Optional quest ${questId} must define non-empty prerequisite node ids.`);
    }
    if (!isText(quest.sourceNodeId)) errors.push(`Optional quest ${questId} must define sourceNodeId.`);
    if (!isText(quest.rewardCosmeticId)) errors.push(`Optional quest ${questId} must define rewardCosmeticId.`);

    const owner = worldByQuestId.get(questId);
    if (!owner) {
      errors.push(`Optional quest ${questId} is not assigned to a World.`);
    } else {
      const ownerNodeIds = new Set(uniqueStrings(owner.nodeIds));
      if (!ownerNodeIds.has(quest.sourceNodeId)) errors.push(`Optional quest ${questId} sourceNodeId must be inside World ${owner.id}.`);
      for (const prerequisite of asArray(quest.prerequisites)) {
        if (isText(prerequisite) && !ownerNodeIds.has(prerequisite)) {
          errors.push(`Optional quest ${questId} references prerequisite ${prerequisite} outside World ${owner.id}.`);
        }
      }
    }
    if (nodeIds.size > 0 && !nodeIds.has(quest.sourceNodeId)) errors.push(`Optional quest ${questId} references unknown source node ${quest.sourceNodeId}.`);

    const routeScenarioId = isText(quest.routeScenarioId) ? quest.routeScenarioId.trim() : null;
    const restorationScenarioId = isText(quest.restorationScenarioId) ? quest.restorationScenarioId.trim() : null;
    if (quest.type === "route") {
      if (!routeScenarioId || restorationScenarioId) errors.push(`Route quest ${questId} must reference only routeScenarioId.`);
      const scenario = findById(resourceRouteScenarios, routeScenarioId);
      if (!scenario) errors.push(`Route quest ${questId} references missing scenario ${routeScenarioId ?? "(empty)"}.`);
      else {
        if (scenario.questId !== questId) errors.push(`Route scenario ${scenario.id} must point back to quest ${questId}.`);
        if (owner && scenario.worldId !== owner.id) errors.push(`Route scenario ${scenario.id} must stay inside World ${owner.id}.`);
      }
    } else if (quest.type === "restore") {
      if (!restorationScenarioId || routeScenarioId) errors.push(`Restore quest ${questId} must reference only restorationScenarioId.`);
      const scenario = findById(environmentRestorationScenarios, restorationScenarioId);
      if (!scenario) errors.push(`Restore quest ${questId} references missing scenario ${restorationScenarioId ?? "(empty)"}.`);
      else {
        if (scenario.questId !== questId) errors.push(`Restoration scenario ${scenario.id} must point back to quest ${questId}.`);
        if (owner && scenario.worldId !== owner.id) errors.push(`Restoration scenario ${scenario.id} must stay inside World ${owner.id}.`);
        if (scenario.cityFeatureId && !findById(cityRestorationFeatures, scenario.cityFeatureId)) {
          errors.push(`Restoration scenario ${scenario.id} references missing City feature ${scenario.cityFeatureId}.`);
        }
      }
    } else if (routeScenarioId || restorationScenarioId) {
      errors.push(`Quest ${questId} cannot attach a route or restoration scenario to type ${quest.type}.`);
    }

    const cityFeatures = findByQuestId(cityRestorationFeatures, questId);
    if ((quest.type === "route" || quest.type === "restore") && cityFeatures.length !== 1) {
      errors.push(`Quest ${questId} must have exactly one City restoration feature.`);
    }
    if (cityFeatures.some((feature) => !isText(feature.id))) errors.push(`City restoration feature for quest ${questId} must have an id.`);

    const cosmetic = findById(cityCosmetics, quest.rewardCosmeticId);
    if (!cosmetic) errors.push(`Optional quest ${questId} references missing cosmetic ${quest.rewardCosmeticId ?? "(empty)"}.`);
    else if (cosmetic.unlock?.type !== "quest" || cosmetic.unlock?.questId !== questId) {
      errors.push(`Cosmetic ${cosmetic.id} must unlock from optional quest ${questId}.`);
    }
  }

  for (const scenario of [...asArray(resourceRouteScenarios), ...asArray(environmentRestorationScenarios)]) {
    if (!isText(scenario?.questId)) continue;
    const quest = questById.get(scenario.questId);
    if (!quest) errors.push(`Scenario ${scenario.id ?? "(unknown)"} references unknown optional quest ${scenario.questId}.`);
    else if ((scenario.mode === "side" && !["route", "restore"].includes(quest.type))) {
      errors.push(`Scenario ${scenario.id ?? "(unknown)"} has side mode incompatible with quest ${quest.id}.`);
    }
  }

  for (const feature of asArray(cityRestorationFeatures)) {
    if (!isText(feature?.questId)) continue;
    if (!questById.has(feature.questId)) errors.push(`City restoration feature ${feature.id ?? "(unknown)"} references unknown optional quest ${feature.questId}.`);
  }

  for (const quest of quests) {
    if (isText(quest?.id) && !claimedQuestIds.has(quest.id.trim())) {
      errors.push(`Optional quest ${quest.id} is not listed by any World.`);
    }
  }

  return { ok: errors.length === 0, errors };
}

export function getWorldById(worlds, worldId) {
  if (typeof worldId !== "string") return null;
  return asArray(worlds).find((world) => world?.id === worldId) ?? null;
}

export function getWorldNodes(world, nodes = []) {
  if (!world) return [];
  const byId = new Map(asArray(nodes).map((node) => [node?.id, node]));
  return uniqueStrings(world.nodeIds).map((id) => byId.get(id)).filter(Boolean);
}

export function isWorldComplete(world, progress) {
  if (!world || world.availability !== "playable" || typeof world.bossNodeId !== "string") return false;
  const requiredIds = uniqueStrings(world.nodeIds);
  if (requiredIds.length === 0 || !requiredIds.includes(world.bossNodeId)) return false;
  const completed = new Set(uniqueStrings(progress?.completed));
  return requiredIds.every((nodeId) => completed.has(nodeId));
}

export function isWorldUnlocked(world, progress, worlds) {
  if (!world) return false;
  if (world.prerequisiteWorldId == null) return true;
  const prerequisite = getWorldById(worlds, world.prerequisiteWorldId);
  return isWorldComplete(prerequisite, progress);
}

export function isWorldPlayable(world, progress, worlds) {
  return Boolean(world && world.availability === "playable" && uniqueStrings(world.nodeIds).length > 0 && isWorldUnlocked(world, progress, worlds));
}

export function getWorldStatus(world, progress, worlds) {
  if (!world) return "missing";
  if (!isWorldUnlocked(world, progress, worlds)) return "locked";
  if (world.availability !== "playable") return "preview";
  if (isWorldComplete(world, progress)) return "completed";
  return progress?.campaignState?.activeWorldId === world.id ? "active" : "available";
}

export function getWorldProgress(world, progress) {
  const nodeIds = uniqueStrings(world?.nodeIds);
  const completed = new Set(uniqueStrings(progress?.completed));
  const completedCount = nodeIds.filter((nodeId) => completed.has(nodeId)).length;
  return {
    completedCount,
    totalCount: nodeIds.length,
    percent: nodeIds.length > 0 ? Math.round((completedCount / nodeIds.length) * 100) : 0,
  };
}

function getFallbackWorld(worlds, progress) {
  const registry = asArray(worlds);
  return registry.find((world) => isWorldPlayable(world, progress, registry)) ?? null;
}

export function normalizeCampaignProgress(progress, worlds, nodes = []) {
  const safeProgress = progress && typeof progress === "object" && !Array.isArray(progress) ? progress : {};
  const registry = asArray(worlds);
  const completedWorldIds = registry.filter((world) => isWorldComplete(world, safeProgress)).map((world) => world.id);
  const requestedWorld = getWorldById(registry, safeProgress.campaignState?.activeWorldId);
  const fallbackWorld = getFallbackWorld(registry, safeProgress);
  const activeWorld = isWorldPlayable(requestedWorld, safeProgress, registry) ? requestedWorld : fallbackWorld;

  return {
    ...safeProgress,
    campaignState: {
      activeWorldId: activeWorld?.id ?? null,
      completedWorldIds,
    },
  };
}

export function getActiveWorld(progress, worlds) {
  const world = getWorldById(worlds, progress?.campaignState?.activeWorldId);
  return isWorldPlayable(world, progress, worlds) ? world : null;
}

export function selectActiveWorld(progress, worldId, worlds, nodes = []) {
  const normalized = normalizeCampaignProgress(progress, worlds, nodes);
  const requested = getWorldById(worlds, worldId);
  if (!isWorldPlayable(requested, normalized, worlds)) return normalized;
  return {
    ...normalized,
    campaignState: { ...normalized.campaignState, activeWorldId: requested.id },
  };
}

export function getNextWorld(world, worlds) {
  const registry = asArray(worlds);
  const index = registry.findIndex((item) => item?.id === world?.id);
  return index >= 0 ? registry[index + 1] ?? null : null;
}

export function getNextWorldNode(world, progress, nodes = []) {
  const worldNodes = getWorldNodes(world, nodes);
  const completed = new Set(uniqueStrings(progress?.completed));
  return worldNodes.find((node) => !completed.has(node.id)) ?? worldNodes.at(-1) ?? null;
}
