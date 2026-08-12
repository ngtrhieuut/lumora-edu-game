// Local-first energy progression. This is a bounded signal, not currency,
// stamina, or a replacement for mastery/curriculum approval.

export const ENERGY_TYPES = Object.freeze({
  logic: Object.freeze({ id: "logic", label: "Logic Energy", labelVi: "Năng lượng Logic", icon: "◇" }),
  nature: Object.freeze({ id: "nature", label: "Nature Energy", labelVi: "Năng lượng Tự nhiên", icon: "✿" }),
  discovery: Object.freeze({ id: "discovery", label: "Discovery Energy", labelVi: "Năng lượng Khám phá", icon: "✦" }),
  mastery: Object.freeze({ id: "mastery", label: "Mastery Energy", labelVi: "Năng lượng Làm chủ", icon: "◈" }),
});

export const ENERGY_TYPE_IDS = Object.freeze(Object.keys(ENERGY_TYPES));

const ENERGY_SET = new Set(ENERGY_TYPE_IDS);
const MAX_ENERGY = 1_000_000_000;
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const clampInt = (value, min = 0, max = MAX_ENERGY) => Number.isFinite(value)
  ? Math.min(max, Math.max(min, Math.trunc(value)))
  : min;

export function createInitialEnergy() {
  return { logic: 0, nature: 0, discovery: 0, mastery: 0 };
}
export function normalizeEnergy(value) {
  const source = isRecord(value) ? value : {};
  const energy = createInitialEnergy();
  for (const id of ENERGY_TYPE_IDS) energy[id] = clampInt(source[id]);
  return Object.freeze(energy);
}

export function normalizeEnergyTypes(value) {
  const source = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  return [...new Set(source.filter((id) => typeof id === "string" && ENERGY_SET.has(id)))];
}

export function getEnergyReward({ energyTypes = [], mastery = 3, firstClear = true } = {}) {
  const reward = createInitialEnergy();
  if (!firstClear) return Object.freeze(reward);
  const types = normalizeEnergyTypes(energyTypes);
  const level = clampInt(mastery, 1, 3);
  for (const id of types) reward[id] = level === 3 ? 2 : 1;
  return Object.freeze(reward);
}

function cloneValue(value, seen = new WeakMap()) {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return seen.get(value);
  if (Array.isArray(value)) {
    const result = [];
    seen.set(value, result);
    for (const item of value) result.push(cloneValue(item, seen));
    return result;
  }
  const result = {};
  seen.set(value, result);
  for (const key of Object.keys(value)) result[key] = cloneValue(value[key], seen);
  return result;
}

function addEnergyValues(base, reward) {
  const current = normalizeEnergy(base);
  const delta = normalizeEnergy(reward);
  const next = createInitialEnergy();
  for (const id of ENERGY_TYPE_IDS) next[id] = clampInt(current[id] + delta[id]);
  return Object.freeze(next);
}

/**
 * Add a canonical reward to either an energy object or a progress object.
 * Progress objects are cloned and all unrelated fields are retained.
 */
export function addEnergy(value, reward = {}) {
  if (isRecord(value) && hasOwn(value, "energies")) {
    const next = cloneValue(value);
    next.energies = addEnergyValues(next.energies, reward);
    return next;
  }
  return addEnergyValues(value, reward);
}
