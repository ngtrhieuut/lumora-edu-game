import { ALL_LEVELS, LEVEL_CATALOG_VERSION, getLevelById } from "../levelCatalog/index.js";
import { getRuntimePhaseIds, normalizeLevelResult } from "./levelRuntimeEngine.js";

export const CATALOG_PROGRESS_SCHEMA_VERSION = 1;

const clampInt = (value, min, max) => Number.isFinite(value) ? Math.min(max, Math.max(min, Math.trunc(value))) : min;
const safeText = (value, fallback = null) => typeof value === "string" && value.trim() ? value.trim() : fallback;

function getOrderedLevels(levels = ALL_LEVELS) {
  return [...(Array.isArray(levels) ? levels : [])].sort((a, b) => a.grade - b.grade || a.order - b.order);
}

function emptyOutcome() {
  return {
    completions: 0,
    replays: 0,
    bestMastery: 0,
    bestAccuracy: 0,
    totalAttempts: 0,
    supportsUsed: 0,
    firstClearAt: null,
    lastCompletedAt: null,
    firstClear: false,
    lastResult: null,
  };
}

function normalizeOutcome(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    ...emptyOutcome(),
    completions: clampInt(source.completions, 0, 9999),
    replays: clampInt(source.replays, 0, 9999),
    bestMastery: clampInt(source.bestMastery, 0, 3),
    bestAccuracy: Number.isFinite(source.bestAccuracy) ? Math.min(1, Math.max(0, source.bestAccuracy)) : 0,
    totalAttempts: clampInt(source.totalAttempts, 0, 999999),
    supportsUsed: clampInt(source.supportsUsed, 0, 999999),
    firstClearAt: safeText(source.firstClearAt),
    lastCompletedAt: safeText(source.lastCompletedAt),
    firstClear: source.firstClear === true,
    lastResult: source.lastResult && typeof source.lastResult === "object" ? source.lastResult : null,
  };
}

function deriveCompletedPrefix(rawCompleted, levels) {
  const completedSet = new Set(Array.isArray(rawCompleted) ? rawCompleted.filter((id) => typeof id === "string") : []);
  const accepted = [];
  const acceptedSet = new Set();
  for (const level of levels) {
    if (!completedSet.has(level.id)) break;
    if (!(level.prerequisites ?? []).every((id) => acceptedSet.has(id))) break;
    accepted.push(level.id);
    acceptedSet.add(level.id);
  }
  return accepted;
}

function deriveActiveLevelId(levels, completedSet) {
  return levels.find((level) => !(completedSet.has(level.id)) && (level.prerequisites ?? []).every((id) => completedSet.has(id)))?.id
    ?? levels.find((level) => !completedSet.has(level.id))?.id
    ?? levels.at(-1)?.id
    ?? null;
}

function deriveRestoration(levels, completedSet) {
  const restoredLevelIds = levels.filter((level) => completedSet.has(level.id) && level.restoration?.enabled).map((level) => level.id);
  const restoredChapterIds = levels.filter((level) => completedSet.has(level.id) && level.type !== "standard")
    .map((level) => `g${level.grade}-c${String(level.chapter).padStart(2, "0")}`);
  const restoredWorldIds = levels.filter((level) => completedSet.has(level.id) && level.type === "grand-boss").map((level) => level.worldId);
  return {
    restoredLevelIds: [...new Set(restoredLevelIds)],
    restoredChapterIds: [...new Set(restoredChapterIds)],
    restoredWorldIds: [...new Set(restoredWorldIds)],
  };
}

function normalizeRuntimeCheckpoints(value, levels) {
  const result = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return result;
  for (const level of levels) {
    if (level.type === "standard") continue;
    const phaseIds = getRuntimePhaseIds(level);
    const raw = value[level.id];
    const completedPhaseIds = [];
    for (const phaseId of Array.isArray(raw?.completedPhaseIds) ? raw.completedPhaseIds : []) {
      if (phaseId !== phaseIds[completedPhaseIds.length]) break;
      completedPhaseIds.push(phaseId);
    }
    if (completedPhaseIds.length > 0 && completedPhaseIds.length < phaseIds.length) {
      result[level.id] = { phaseIndex: completedPhaseIds.length, completedPhaseIds };
    }
  }
  return result;
}

export function createCatalogProgress() {
  return {
    schemaVersion: CATALOG_PROGRESS_SCHEMA_VERSION,
    catalogVersion: LEVEL_CATALOG_VERSION,
    activeGrade: 1,
    activeWorldId: "forest-awakening",
    activeLevelId: "g1-l001",
    completedLevelIds: [],
    chapterProgress: {},
    outcomes: {},
    rewardLedger: [],
    knowledgeEnergy: 0,
    knowledgeShards: 0,
    xp: 0,
    restoration: { restoredLevelIds: [], restoredChapterIds: [], restoredWorldIds: [] },
    runtimeCheckpoints: {},
    lastPlayedAt: null,
  };
}

export function normalizeCatalogProgress(value, levels = ALL_LEVELS) {
  const fallback = createCatalogProgress();
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const orderedLevels = getOrderedLevels(levels);
  if (orderedLevels.length === 0) return fallback;
  const completedLevelIds = deriveCompletedPrefix(value.completedLevelIds ?? value.completed, orderedLevels);
  const completedSet = new Set(completedLevelIds);
  const validIds = new Set(orderedLevels.map((level) => level.id));
  const outcomes = {};
  for (const [levelId, outcome] of Object.entries(value.outcomes ?? {})) {
    if (validIds.has(levelId)) outcomes[levelId] = normalizeOutcome(outcome);
  }
  const rewardLedger = [...new Set((Array.isArray(value.rewardLedger) ? value.rewardLedger : completedLevelIds).filter((id) => completedSet.has(id)))];
  const activeLevelId = validIds.has(value.activeLevelId) && isLevelUnlocked(value.activeLevelId, { completedLevelIds }, orderedLevels)
    ? value.activeLevelId
    : deriveActiveLevelId(orderedLevels, completedSet);
  const activeLevel = getLevelByIdFromLevels(activeLevelId, orderedLevels);
  const restoration = deriveRestoration(orderedLevels, completedSet);
  const runtimeCheckpoints = normalizeRuntimeCheckpoints(value.runtimeCheckpoints, orderedLevels);
  return {
    ...fallback,
    schemaVersion: CATALOG_PROGRESS_SCHEMA_VERSION,
    catalogVersion: safeText(value.catalogVersion, LEVEL_CATALOG_VERSION),
    activeGrade: activeLevel?.grade ?? clampInt(value.activeGrade, 1, 5),
    activeWorldId: activeLevel?.worldId ?? safeText(value.activeWorldId, "forest-awakening"),
    activeLevelId,
    completedLevelIds,
    outcomes,
    rewardLedger,
    knowledgeEnergy: clampInt(value.knowledgeEnergy, 0, 999999),
    knowledgeShards: clampInt(value.knowledgeShards, 0, 999999),
    xp: clampInt(value.xp, 0, 999999),
    restoration,
    runtimeCheckpoints,
    lastPlayedAt: safeText(value.lastPlayedAt),
  };
}

function getLevelByIdFromLevels(levelId, levels) {
  return levels.find((level) => level.id === levelId) ?? null;
}

export function isLevelUnlocked(levelId, progress, levels = ALL_LEVELS) {
  const level = getLevelByIdFromLevels(levelId, levels);
  if (!level) return false;
  const completed = new Set(Array.isArray(progress?.completedLevelIds) ? progress.completedLevelIds : []);
  return (level.prerequisites ?? []).every((id) => completed.has(id));
}

export function getNextPlayableLevel(progress, levels = ALL_LEVELS, { maxOrder = Infinity, grade = null } = {}) {
  const orderedLevels = getOrderedLevels(levels);
  return orderedLevels.find((level) => level.order <= maxOrder && (grade === null || level.grade === grade) && !progress?.completedLevelIds?.includes(level.id) && isLevelUnlocked(level.id, progress, orderedLevels)) ?? null;
}

export function getChapterProgress(progress, grade, chapter, levels = ALL_LEVELS) {
  const chapterLevels = getOrderedLevels(levels).filter((level) => level.grade === grade && level.chapter === chapter);
  const completed = new Set(Array.isArray(progress?.completedLevelIds) ? progress.completedLevelIds : []);
  const completedCount = chapterLevels.filter((level) => completed.has(level.id)).length;
  const boss = chapterLevels.find((level) => level.type !== "standard") ?? null;
  return {
    grade,
    chapter,
    chapterTitleVi: chapterLevels[0]?.chapterTitleVi ?? null,
    completedCount,
    totalCount: chapterLevels.length,
    percent: chapterLevels.length ? Math.round((completedCount / chapterLevels.length) * 100) : 0,
    bossId: boss?.id ?? null,
    bossCompleted: Boolean(boss && completed.has(boss.id)),
    complete: chapterLevels.length > 0 && completedCount === chapterLevels.length,
  };
}

export function getGradeProgress(progress, grade, levels = ALL_LEVELS) {
  const gradeLevels = getOrderedLevels(levels).filter((level) => level.grade === grade);
  const completed = new Set(Array.isArray(progress?.completedLevelIds) ? progress.completedLevelIds : []);
  const completedCount = gradeLevels.filter((level) => completed.has(level.id)).length;
  return {
    grade,
    completedCount,
    totalCount: gradeLevels.length,
    percent: gradeLevels.length ? Math.round((completedCount / gradeLevels.length) * 100) : 0,
    complete: gradeLevels.length > 0 && completedCount === gradeLevels.length,
  };
}

export function recordCatalogLevelResult(progress, level, result, { completedAt = null, levels = ALL_LEVELS } = {}) {
  if (!level || typeof level.id !== "string") throw new TypeError("A catalog level is required.");
  const current = normalizeCatalogProgress(progress, levels);
  const normalizedResult = normalizeLevelResult(level, { ...result, completedAt: result?.completedAt ?? completedAt });
  if (!current.completedLevelIds.includes(level.id) && !isLevelUnlocked(level.id, current, levels)) {
    const blockedResult = normalizeLevelResult(level, { ...normalizedResult, completed: false });
    return { progress: current, result: blockedResult, firstClear: false, earnedRewards: { knowledgeEnergy: 0, knowledgeShards: 0 }, nextLevel: getNextPlayableLevel(current, levels) };
  }
  if (!normalizedResult.completed) return { progress: current, result: normalizedResult, firstClear: false, earnedRewards: { knowledgeEnergy: 0, knowledgeShards: 0 }, nextLevel: getNextPlayableLevel(current, levels) };

  const firstClear = !current.completedLevelIds.includes(level.id);
  const previous = normalizeOutcome(current.outcomes[level.id]);
  const completedLevelIds = firstClear ? [...current.completedLevelIds, level.id] : [...current.completedLevelIds];
  const completedSet = new Set(completedLevelIds);
  const outcome = {
    ...previous,
    completions: previous.completions + 1,
    replays: previous.replays + (firstClear ? 0 : 1),
    bestMastery: Math.max(previous.bestMastery, normalizedResult.mastery),
    bestAccuracy: Math.max(previous.bestAccuracy, normalizedResult.accuracy),
    totalAttempts: previous.totalAttempts + normalizedResult.attempts,
    supportsUsed: previous.supportsUsed + normalizedResult.supportsUsed,
    firstClearAt: previous.firstClearAt ?? (firstClear ? normalizedResult.completedAt : null),
    lastCompletedAt: normalizedResult.completedAt,
    firstClear: previous.firstClear || firstClear,
    lastResult: normalizedResult,
  };
  const rewardAlreadyRecorded = current.rewardLedger.includes(level.id);
  const rewardable = firstClear && !rewardAlreadyRecorded;
  const earnedRewards = {
    knowledgeEnergy: rewardable ? clampInt(level.rewards?.knowledgeEnergy, 0, 9999) : 0,
    knowledgeShards: rewardable ? clampInt(level.rewards?.knowledgeShards, 0, 9999) : 0,
  };
  const rewardLedger = rewardable ? [...current.rewardLedger, level.id] : [...current.rewardLedger];
  const restoration = deriveRestoration(levels, completedSet);
  const nextBase = {
    ...current,
    activeGrade: level.grade,
    activeWorldId: level.worldId,
    activeLevelId: deriveActiveLevelId(getOrderedLevels(levels), completedSet),
    completedLevelIds,
    outcomes: { ...current.outcomes, [level.id]: outcome },
    rewardLedger,
    knowledgeEnergy: current.knowledgeEnergy + earnedRewards.knowledgeEnergy,
    knowledgeShards: current.knowledgeShards + earnedRewards.knowledgeShards,
    restoration,
    runtimeCheckpoints: Object.fromEntries(Object.entries(current.runtimeCheckpoints ?? {}).filter(([levelId]) => levelId !== level.id)),
    lastPlayedAt: normalizedResult.completedAt,
  };
  const normalized = normalizeCatalogProgress(nextBase, levels);
  return {
    progress: normalized,
    result: normalizedResult,
    firstClear,
    earnedRewards,
    nextLevel: getNextPlayableLevel(normalized, levels),
  };
}
