// Pure, local-first projection for Knowledge City restoration visuals.
// It derives a safe view from completed quest ids and allowlisted feature metadata.
// It never persists, reads raw answers, or accepts free-form runtime payloads.

export const RESTORATION_PROJECTION_SCHEMA_VERSION = 1;
export const RESTORATION_VISUAL_CUES = Object.freeze([
  "firefly-grove",
  "river-bank",
]);
export const RESTORATION_ENERGY_TYPES = Object.freeze([
  "logic",
  "nature",
  "discovery",
  "mastery",
]);

const VISUAL_CUE_SET = new Set(RESTORATION_VISUAL_CUES);
const ENERGY_TYPE_SET = new Set(RESTORATION_ENERGY_TYPES);
const FALLBACK_VISUAL_CUE = "quiet-grove";

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

function safeText(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeCompletedQuestIds(questState) {
  if (!isRecord(questState) || !Array.isArray(questState.completedIds)) return new Set();
  return new Set(
    questState.completedIds
      .filter((id) => typeof id === "string")
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

function normalizeEnergyTypes(value) {
  const source = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  const requested = new Set(source.filter((type) => typeof type === "string" && ENERGY_TYPE_SET.has(type)));
  return RESTORATION_ENERGY_TYPES.filter((type) => requested.has(type));
}

function normalizeFeature(feature, completedQuestIds) {
  if (!isRecord(feature)) return null;

  const id = safeText(feature.id);
  const questId = safeText(feature.questId);
  if (!id || !questId) return null;

  const metadata = isRecord(feature.projection) ? feature.projection : {};
  const visualCue = VISUAL_CUE_SET.has(metadata.visualCue) ? metadata.visualCue : FALLBACK_VISUAL_CUE;
  const energyTypes = normalizeEnergyTypes(metadata.energyTypes);
  const restored = completedQuestIds.has(questId);

  return {
    id,
    questId,
    title: safeText(feature.title, id),
    description: safeText(feature.description),
    icon: safeText(feature.icon, "✦"),
    visualCue,
    energyTypes,
    dormantDescription: safeText(metadata.dormantDescription, "Hoàn thành nhiệm vụ phụ để vùng này thức dậy."),
    restoredDescription: safeText(metadata.restoredDescription, safeText(feature.description)),
    state: restored ? "restored" : "dormant",
    restored,
  };
}

/**
 * Build the bounded City projection from local quest completion state.
 * Only feature ids present in the supplied allowlist can become restored.
 */
export function buildRestorationProjection({ questState, features } = {}) {
  const completedQuestIds = normalizeCompletedQuestIds(questState);
  const sourceFeatures = Array.isArray(features) ? features : [];
  const seenIds = new Set();
  const normalizedFeatures = [];

  for (const feature of sourceFeatures) {
    const normalized = normalizeFeature(feature, completedQuestIds);
    if (!normalized || seenIds.has(normalized.id)) continue;
    seenIds.add(normalized.id);
    normalizedFeatures.push(normalized);
  }

  const restoredFeatures = normalizedFeatures.filter((feature) => feature.restored);
  const restoredFeatureIds = restoredFeatures.map((feature) => feature.id);
  const nubiEnergySet = new Set(restoredFeatures.flatMap((feature) => feature.energyTypes));
  const nubiEnergyTypes = RESTORATION_ENERGY_TYPES.filter((type) => nubiEnergySet.has(type));

  return deepFreeze({
    schemaVersion: RESTORATION_PROJECTION_SCHEMA_VERSION,
    features: normalizedFeatures,
    featureStates: normalizedFeatures.map(({ id, state }) => ({ id, state })),
    restoredFeatureIds,
    restoredCount: restoredFeatureIds.length,
    hasRestoredFeatures: restoredFeatureIds.length > 0,
    nubiEnergyTypes,
  });
}

export function getRestoredFeatureIds(projection) {
  return Array.isArray(projection?.restoredFeatureIds) ? [...projection.restoredFeatureIds] : [];
}

export function getRestorationFeatureState(projection, featureId) {
  if (typeof featureId !== "string" || !Array.isArray(projection?.features)) return "dormant";
  return projection.features.find((feature) => feature.id === featureId)?.state ?? "dormant";
}
