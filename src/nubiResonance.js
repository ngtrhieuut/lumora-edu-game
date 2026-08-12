// Pure, data-driven resonance state for Nubi's energy feedback.
// No React, browser APIs, storage, timers, or external dependencies.

export const NUBI_ENERGY_IDS = Object.freeze([
  "logic",
  "nature",
  "discovery",
  "mastery",
]);

// Keep the existing energy naming convention available to consumers of this module.
export const ENERGY_IDS = NUBI_ENERGY_IDS;
export const ENERGY_TYPE_IDS = NUBI_ENERGY_IDS;

const NONE_TYPE = "none";
const ENERGY_SET = new Set(NUBI_ENERGY_IDS);
const REWARD_PHASES = new Set([
  "reward",
  "rewards",
  "first-clear",
  "firstclear",
  "complete",
  "completed",
  "phase-complete",
  "level-success",
  "success",
  "victory",
  "earned",
]);

const RESONANCE_PROFILES = Object.freeze({
  logic: Object.freeze({
    key: "nubi-resonance-logic",
    labelVi: "Năng lượng Logic",
    shortLabel: "Logic",
    colorToken: "nubi-energy-logic",
  }),
  nature: Object.freeze({
    key: "nubi-resonance-nature",
    labelVi: "Năng lượng Tự nhiên",
    shortLabel: "Tự nhiên",
    colorToken: "nubi-energy-nature",
  }),
  discovery: Object.freeze({
    key: "nubi-resonance-discovery",
    labelVi: "Năng lượng Khám phá",
    shortLabel: "Khám phá",
    colorToken: "nubi-energy-discovery",
  }),
  mastery: Object.freeze({
    key: "nubi-resonance-mastery",
    labelVi: "Năng lượng Làm chủ",
    shortLabel: "Làm chủ",
    colorToken: "nubi-energy-mastery",
  }),
  [NONE_TYPE]: Object.freeze({
    key: "nubi-resonance-none",
    labelVi: "Bình yên",
    shortLabel: "Yên",
    colorToken: "nubi-energy-calm",
  }),
});

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isPositiveNumber = (value) => typeof value === "number" && Number.isFinite(value) && value > 0;

function normalizeEnergyTypes(value) {
  const source = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  const requested = new Set(source.filter((type) => typeof type === "string" && ENERGY_SET.has(type)));
  return NUBI_ENERGY_IDS.filter((type) => requested.has(type));
}

function readEarnedEnergy(input) {
  const sources = [input.earnedEnergy];
  if (isRecord(input.reward)) {
    sources.push(input.reward.earnedEnergy, input.reward.energy, input.reward);
  }

  const earned = {};
  for (const type of NUBI_ENERGY_IDS) {
    let amount = 0;
    for (const source of sources) {
      if (isRecord(source) && isPositiveNumber(source[type])) amount = Math.max(amount, source[type]);
    }
    if (amount > 0) earned[type] = amount;
  }
  return earned;
}

function normalizeContextToken(value) {
  return typeof value === "string"
    ? value.trim().toLowerCase().replace(/[\s_]+/g, "-")
    : "";
}

function isRewardDescriptor(value) {
  if (value === true || isPositiveNumber(value)) return true;
  if (typeof value === "string") return REWARD_PHASES.has(normalizeContextToken(value));
  if (!isRecord(value)) return false;

  if (value.firstClear === true || value.awarded === true || value.granted === true || value.isReward === true) {
    return true;
  }
  if (["amount", "value", "shards", "xp", "energy"].some((key) => isPositiveNumber(value[key]))) return true;
  return [value.phase, value.type, value.status].some((token) => REWARD_PHASES.has(normalizeContextToken(token)));
}

function hasRewardSignal(input, earnedEnergy) {
  if (Object.keys(earnedEnergy).length > 0) return true;
  if (input.firstClear === true || input.awarded === true || input.granted === true) return true;
  return isRewardDescriptor(input.reward) || isRewardDescriptor(input.phase) || isRewardDescriptor(input.mode);
}

function choosePrimaryType(activeTypes, earnedEnergy) {
  let primaryType = activeTypes[0] ?? null;
  let highestEarned = 0;

  for (const type of activeTypes) {
    const amount = earnedEnergy[type] ?? 0;
    if (amount > highestEarned) {
      highestEarned = amount;
      primaryType = type;
    }
  }

  return primaryType;
}

/**
 * Derive a stable UI-ready resonance snapshot from gameplay context.
 * Ambient valid types have intensity 1; first-clear/reward context has 2.
 * Invalid input is ignored and produces the calm/none snapshot.
 */
export function getNubiResonance(input = {}) {
  const safeInput = isRecord(input) ? input : {};
  const earnedEnergy = readEarnedEnergy(safeInput);
  const requestedTypes = normalizeEnergyTypes(safeInput.energyTypes);
  const activeSet = new Set(requestedTypes);

  for (const type of NUBI_ENERGY_IDS) {
    if (earnedEnergy[type] > 0) activeSet.add(type);
  }

  const activeTypes = NUBI_ENERGY_IDS.filter((type) => activeSet.has(type));
  const primaryType = choosePrimaryType(activeTypes, earnedEnergy);
  const mode = activeTypes.length === 0 ? "calm" : hasRewardSignal(safeInput, earnedEnergy) ? "reward" : "ambient";
  const intensity = mode === "calm" ? 0 : mode === "reward" ? 2 : 1;
  const profile = RESONANCE_PROFILES[primaryType ?? NONE_TYPE];

  return Object.freeze({
    key: profile.key,
    primaryType,
    activeTypes: Object.freeze(activeTypes),
    intensity,
    labelVi: profile.labelVi,
    shortLabel: profile.shortLabel,
    colorToken: profile.colorToken,
    mode,
  });
}
