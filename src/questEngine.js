const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const clampInt = (value, min, max) => Number.isFinite(value) ? Math.min(max, Math.max(min, Math.trunc(value))) : min;

function uniqueValidIds(value, validIds) {
  const allowed = new Set(Array.isArray(validIds) ? validIds.filter((id) => typeof id === "string") : []);
  return Array.isArray(value) ? [...new Set(value.filter((id) => allowed.has(id)))] : [];
}

export function createInitialQuestState() {
  return { completedIds: [], discoveredIds: [], metrics: {} };
}

export function normalizeQuestState(value, validQuestIds = []) {
  if (!isRecord(value)) return createInitialQuestState();
  const completedIds = uniqueValidIds(value.completedIds, validQuestIds);
  const discoveredIds = uniqueValidIds([...(Array.isArray(value.discoveredIds) ? value.discoveredIds : []), ...completedIds], validQuestIds);
  const metrics = {};
  const sourceMetrics = isRecord(value.metrics) ? value.metrics : {};
  for (const questId of validQuestIds) {
    const metric = sourceMetrics[questId];
    if (!isRecord(metric)) continue;
    metrics[questId] = {
      questId,
      completions: clampInt(metric.completions, 0, Number.MAX_SAFE_INTEGER),
      totalAttempts: clampInt(metric.totalAttempts, 0, Number.MAX_SAFE_INTEGER),
      supportsUsed: clampInt(metric.supportsUsed, 0, Number.MAX_SAFE_INTEGER),
      bestMastery: clampInt(metric.bestMastery, 0, 3),
    };
  }
  return { completedIds, discoveredIds, metrics };
}

export function getQuestStatus(quest, progress, questState) {
  if (!isRecord(quest) || typeof quest.id !== "string" || !quest.id) return "hidden";
  const completedNodes = new Set(Array.isArray(progress?.completed) ? progress.completed : []);
  const state = normalizeQuestState(questState, [quest.id]);
  if (state.completedIds.includes(quest.id)) return "completed";
  const discovered = state.discoveredIds.includes(quest.id);
  const discoveryPrerequisites = Array.isArray(quest.discoveryPrerequisites) ? quest.discoveryPrerequisites : [];
  if (quest.kind === "secret" && !discovered && !discoveryPrerequisites.every((id) => completedNodes.has(id))) return "hidden";
  const prerequisites = Array.isArray(quest.prerequisites) ? quest.prerequisites : [];
  if (!prerequisites.every((id) => completedNodes.has(id))) return "locked";
  return "available";
}

export function recordQuestCompletion(questState, quest, result = {}, validQuestIds = [quest?.id]) {
  if (!isRecord(quest) || typeof quest.id !== "string" || !quest.id.trim()) {
    throw new TypeError("recordQuestCompletion requires a quest with a string id");
  }
  const questId = quest.id.trim();
  const registry = Array.isArray(validQuestIds) && validQuestIds.includes(questId) ? validQuestIds : [questId];
  const state = normalizeQuestState(questState, registry);
  if (!state.discoveredIds.includes(questId)) state.discoveredIds.push(questId);
  if (!state.completedIds.includes(questId)) state.completedIds.push(questId);
  const previous = state.metrics[questId] ?? { questId, completions: 0, totalAttempts: 0, supportsUsed: 0, bestMastery: 0 };
  state.metrics[questId] = {
    questId,
    completions: previous.completions + 1,
    totalAttempts: previous.totalAttempts + clampInt(result.attempts, 1, Number.MAX_SAFE_INTEGER),
    supportsUsed: previous.supportsUsed + clampInt(result.supportsUsed, 0, Number.MAX_SAFE_INTEGER),
    bestMastery: Math.max(previous.bestMastery, clampInt(result.mastery, 0, 3)),
  };
  return state;
}
