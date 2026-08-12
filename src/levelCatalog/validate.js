import { DIFFICULTY_TIERS, LEVEL_REQUIRED_FIELDS, LEVEL_TYPES } from "./schema.js";
import { MECHANIC_REGISTRY } from "./mechanicRegistry.js";

const isText = (v) => typeof v === "string" && v.trim().length > 0;

export function validateLevelCatalog(levels) {
  const errors = [];
  if (!Array.isArray(levels)) return { valid: false, errors: ["Catalog must be an array."], count: 0 };
  const ids = new Set();
  for (const [index, level] of levels.entries()) {
    const where = level?.id ?? `index:${index}`;
    for (const field of LEVEL_REQUIRED_FIELDS) if (!(field in (level ?? {}))) errors.push(`${where}: missing ${field}`);
    if (!isText(level?.id)) errors.push(`${where}: invalid id`);
    else if (ids.has(level.id)) errors.push(`${where}: duplicate id`); else ids.add(level.id);
    if (!Number.isInteger(level?.grade) || level.grade < 1 || level.grade > 5) errors.push(`${where}: grade must be 1..5`);
    if (!Number.isInteger(level?.chapter) || level.chapter < 1 || level.chapter > 10) errors.push(`${where}: chapter must be 1..10`);
    if (!Number.isInteger(level?.order) || level.order < 1 || level.order > 100) errors.push(`${where}: order must be 1..100`);
    if (!LEVEL_TYPES.includes(level?.type)) errors.push(`${where}: invalid level type`);
    if (!MECHANIC_REGISTRY[level?.mechanicId]) errors.push(`${where}: unknown mechanic ${level?.mechanicId}`);
    if (!DIFFICULTY_TIERS.includes(level?.difficulty?.tier)) errors.push(`${where}: invalid difficulty tier`);
    if (!Array.isArray(level?.prerequisites)) errors.push(`${where}: prerequisites must be an array`);
    if (level?.curriculum?.approved !== false && level?.curriculum?.approved !== true) errors.push(`${where}: curriculum.approved must be boolean`);
    const shouldBoss = level?.order % 10 === 0;
    if (shouldBoss && level?.type === "standard") errors.push(`${where}: every 10th level must be a boss`);
    if (!shouldBoss && level?.type !== "standard") errors.push(`${where}: non-10th level cannot be boss`);
    if (level?.order === 100 && level?.type !== "grand-boss") errors.push(`${where}: level 100 must be grand-boss`);
    if (level?.type !== "standard" && !level?.boss) errors.push(`${where}: boss config missing`);
  }
  for (const grade of [1,2,3,4,5]) {
    const gradeLevels = levels.filter((l) => l.grade === grade);
    if (gradeLevels.length !== 100) errors.push(`grade ${grade}: expected 100 levels, got ${gradeLevels.length}`);
    for (let order=1; order<=100; order++) if (!gradeLevels.some((l) => l.order === order)) errors.push(`grade ${grade}: missing level ${order}`);
    const bosses = gradeLevels.filter((l) => l.type !== "standard");
    if (bosses.length !== 10) errors.push(`grade ${grade}: expected 10 bosses, got ${bosses.length}`);
  }
  for (const level of levels) for (const prerequisite of level.prerequisites ?? []) if (!ids.has(prerequisite)) errors.push(`${level.id}: unknown prerequisite ${prerequisite}`);
  return { valid: errors.length === 0, errors, count: levels.length };
}

export function assertValidLevelCatalog(levels) {
  const result = validateLevelCatalog(levels);
  if (!result.valid) throw new Error(`Invalid Lumora level catalog:\n${result.errors.join("\n")}`);
  return result;
}
