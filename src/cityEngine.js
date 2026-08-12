const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

function read(value, key) {
  try {
    return value?.[key];
  } catch {
    return undefined;
  }
}

function normalizeId(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function validThreshold(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function completedCount(progress) {
  const completed = read(progress, "completed");
  return Array.isArray(completed) ? completed.length : 0;
}

function practiceSessionCount(progress) {
  const metrics = read(progress, "practiceMetrics");
  const count = read(metrics, "sessionsCompleted");
  return typeof count === "number" && Number.isFinite(count) && count >= 0 ? count : 0;
}

function nubiStage(progress) {
  const stage = read(progress, "nubiStage");
  return typeof stage === "number" && Number.isFinite(stage) && stage >= 0 ? stage : 0;
}

function completedQuestIds(progress) {
  const questState = read(progress, "questState");
  const ids = read(questState, "completedIds");
  return new Set(Array.isArray(ids) ? ids.filter((id) => typeof id === "string") : []);
}

function normalizeMasteryRequirement(value) {
  if (!isRecord(value)) return null;
  const nodeIds = Array.isArray(read(value, "nodeIds"))
    ? [...new Set(read(value, "nodeIds").map(normalizeId).filter(Boolean))]
    : [];
  const minimum = validThreshold(read(value, "minimum"));
  if (nodeIds.length === 0 || minimum === null || minimum < 1 || minimum > 3) return null;
  return { nodeIds, minimum: Math.trunc(minimum) };
}

function bestMasteryFor(progress, nodeId) {
  const learningMetrics = read(progress, "learningMetrics");
  const nodeOutcomes = read(progress, "nodeOutcomes");
  const outcome = isRecord(nodeOutcomes) && isRecord(read(nodeOutcomes, nodeId)) ? read(nodeOutcomes, nodeId) : null;
  const metricByNode = isRecord(learningMetrics) && isRecord(read(learningMetrics, nodeId)) ? read(learningMetrics, nodeId) : null;
  const metricBySkill = outcome && typeof read(outcome, "skillId") === "string" && isRecord(learningMetrics) && isRecord(read(learningMetrics, read(outcome, "skillId")))
    ? read(learningMetrics, read(outcome, "skillId"))
    : null;
  const candidates = [
    validThreshold(read(metricByNode, "bestMastery")),
    validThreshold(read(metricBySkill, "bestMastery")),
    validThreshold(read(outcome, "mastery")),
  ].filter((value) => value !== null);
  return candidates.length > 0 ? Math.max(...candidates) : 0;
}

function satisfiesMasteryRequirement(progress, building) {
  const rawRequirement = read(building, "masteryRequirement");
  if (rawRequirement === undefined) return true;
  const requirement = normalizeMasteryRequirement(rawRequirement);
  if (!requirement) return false;
  const completed = new Set(Array.isArray(read(progress, "completed")) ? read(progress, "completed").filter((id) => typeof id === "string") : []);
  return requirement.nodeIds.every((nodeId) => completed.has(nodeId) && bestMasteryFor(progress, nodeId) >= requirement.minimum);
}

export function createInitialCityState() {
  return { selectedBuildingId: null, equippedCosmeticId: null };
}

export function getUnlockedBuildingIds(progress, buildings) {
  try {
    const count = completedCount(progress);
    const unlocked = [];
    const seen = new Set();

    if (!Array.isArray(buildings)) return unlocked;
    for (const building of buildings) {
      if (!isRecord(building)) continue;
      const id = normalizeId(read(building, "id"));
      const unlockAt = validThreshold(read(building, "unlockAt"));
      if (!id || unlockAt === null || count < unlockAt || !satisfiesMasteryRequirement(progress, building) || seen.has(id)) continue;
      seen.add(id);
      unlocked.push(id);
    }
    return unlocked;
  } catch {
    return [];
  }
}

export function getUnlockedCosmeticIds(progress, buildings, cosmetics) {
  try {
    const unlockedBuildings = new Set(getUnlockedBuildingIds(progress, buildings));
    const sessions = practiceSessionCount(progress);
    const stage = nubiStage(progress);
    const quests = completedQuestIds(progress);
    const unlocked = [];
    const seen = new Set();

    if (!Array.isArray(cosmetics)) return unlocked;
    for (const cosmetic of cosmetics) {
      if (!isRecord(cosmetic)) continue;
      const id = normalizeId(read(cosmetic, "id"));
      const unlock = read(cosmetic, "unlock");
      const type = read(unlock, "type");
      let isUnlocked = false;

      if (type === "building") {
        isUnlocked = unlockedBuildings.has(normalizeId(read(unlock, "buildingId")));
      } else if (type === "practice-sessions") {
        const count = validThreshold(read(unlock, "count"));
        isUnlocked = count !== null && sessions >= count;
      } else if (type === "nubi-stage") {
        const requiredStage = validThreshold(read(unlock, "stage"));
        isUnlocked = requiredStage !== null && stage >= requiredStage;
      } else if (type === "quest") {
        isUnlocked = quests.has(normalizeId(read(unlock, "questId")));
      }

      if (!id || !isUnlocked || seen.has(id)) continue;
      seen.add(id);
      unlocked.push(id);
    }
    return unlocked;
  } catch {
    return [];
  }
}

export function normalizeCityState(value, progress, buildings, cosmetics) {
  try {
    const state = isRecord(value) ? value : {};
    const selectedBuildingId = normalizeId(read(state, "selectedBuildingId"));
    const equippedCosmeticId = normalizeId(read(state, "equippedCosmeticId"));
    const unlockedBuildings = new Set(getUnlockedBuildingIds(progress, buildings));
    const unlockedCosmetics = new Set(getUnlockedCosmeticIds(progress, buildings, cosmetics));

    return {
      selectedBuildingId:
        selectedBuildingId && unlockedBuildings.has(selectedBuildingId) ? selectedBuildingId : null,
      equippedCosmeticId:
        equippedCosmeticId && unlockedCosmetics.has(equippedCosmeticId) ? equippedCosmeticId : null,
    };
  } catch {
    return createInitialCityState();
  }
}

function cloneValue(value, seen = new WeakMap()) {
  if (value === null || typeof value !== "object") return value;
  if (value instanceof Date) return new Date(value.getTime());
  if (value instanceof RegExp) return new RegExp(value.source, value.flags);
  if (seen.has(value)) return seen.get(value);

  if (Array.isArray(value)) {
    const clone = [];
    seen.set(value, clone);
    for (const item of value) clone.push(cloneValue(item, seen));
    return clone;
  }

  const clone = Object.create(Object.getPrototypeOf(value) === null ? null : Object.prototype);
  seen.set(value, clone);
  for (const key of Object.keys(value)) clone[key] = cloneValue(value[key], seen);
  return clone;
}

function cloneProgress(progress) {
  if (!isRecord(progress)) return {};
  try {
    if (typeof structuredClone === "function") return structuredClone(progress);
  } catch {
    // Fall back for non-cloneable fields such as functions.
  }
  try {
    return cloneValue(progress);
  } catch {
    return {};
  }
}

export function selectCityBuilding(progress, buildingId, buildings, cosmetics) {
  const next = cloneProgress(progress);
  const cityState = normalizeCityState(read(next, "cityState"), next, buildings, cosmetics);
  const id = normalizeId(buildingId);
  if (id && getUnlockedBuildingIds(next, buildings).includes(id)) cityState.selectedBuildingId = id;
  next.cityState = cityState;
  return next;
}

export function equipCosmetic(progress, cosmeticId, buildings, cosmetics) {
  const next = cloneProgress(progress);
  const cityState = normalizeCityState(read(next, "cityState"), next, buildings, cosmetics);

  if (cosmeticId === null) {
    cityState.equippedCosmeticId = null;
  } else {
    const id = normalizeId(cosmeticId);
    if (id && getUnlockedCosmeticIds(next, buildings, cosmetics).includes(id)) {
      cityState.equippedCosmeticId = id;
    }
  }

  next.cityState = cityState;
  return next;
}
