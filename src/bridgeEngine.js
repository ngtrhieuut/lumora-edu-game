const DEFAULT_START_STEPS = 4;
const DEFAULT_TARGET_STEPS = 7;
const DEFAULT_CRYSTAL_IDS = [0, 1, 2];

function asFiniteInt(value, fallback) {
  return Number.isFinite(value) ? Math.trunc(value) : fallback;
}
function normalizeCrystalIds(value) {
  if (!Array.isArray(value)) return [...DEFAULT_CRYSTAL_IDS];
  const ids = [...new Set(value.filter((id) => Number.isInteger(id) && id >= 0))];
  return ids.length ? ids : [...DEFAULT_CRYSTAL_IDS];
}

export function createBridgeState(options = {}) {
  const startSteps = Math.max(0, asFiniteInt(options.startSteps, DEFAULT_START_STEPS));
  const targetSteps = Math.max(startSteps, asFiniteInt(options.targetSteps, DEFAULT_TARGET_STEPS));
  const crystalIds = normalizeCrystalIds(options.crystalIds);
  return {
    startSteps,
    targetSteps,
    crystalIds,
    steps: startSteps,
    placedCrystalIds: [],
    complete: startSteps >= targetSteps,
  };
}

export function normalizeBridgeState(value, options = {}) {
  const base = createBridgeState({
    startSteps: value?.startSteps ?? options.startSteps,
    targetSteps: value?.targetSteps ?? options.targetSteps,
    crystalIds: value?.crystalIds ?? options.crystalIds,
  });
  const validIds = new Set(base.crystalIds);
  const placedCrystalIds = Array.isArray(value?.placedCrystalIds)
    ? [...new Set(value.placedCrystalIds.filter((id) => validIds.has(id)))]
    : [];
  const steps = Math.min(base.targetSteps, Math.max(base.startSteps, base.startSteps + placedCrystalIds.length));
  return {
    ...base,
    steps,
    placedCrystalIds,
    complete: steps >= base.targetSteps,
  };
}

export function getNextBridgeCrystal(state) {
  const normalized = normalizeBridgeState(state);
  return normalized.crystalIds.find((id) => !normalized.placedCrystalIds.includes(id)) ?? null;
}

export function placeBridgeCrystal(state, crystalId) {
  const normalized = normalizeBridgeState(state);
  if (!normalized.crystalIds.includes(crystalId)) {
    return { accepted: false, reason: "invalid-crystal", state: normalized, complete: normalized.complete };
  }
  if (normalized.complete) {
    return { accepted: false, reason: "complete", state: normalized, complete: true };
  }
  if (normalized.placedCrystalIds.includes(crystalId)) {
    return { accepted: false, reason: "already-placed", state: normalized, complete: false };
  }
  const next = normalizeBridgeState({
    ...normalized,
    placedCrystalIds: [...normalized.placedCrystalIds, crystalId],
  });
  return { accepted: true, reason: "placed", state: next, complete: next.complete };
}
