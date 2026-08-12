import { grade1Levels } from "./grade1.js";
import { grade2Levels } from "./grade2.js";
import { grade3Levels } from "./grade3.js";
import { grade4Levels } from "./grade4.js";
import { grade5Levels } from "./grade5.js";

export { LEVEL_CATALOG_VERSION, LEVEL_TYPES, DIFFICULTY_TIERS, isBossLevel, isGrandBoss } from "./schema.js";
export { MECHANIC_REGISTRY, getMechanicDefinition } from "./mechanicRegistry.js";
export { validateLevelCatalog, assertValidLevelCatalog } from "./validate.js";
export { grade1Levels, grade2Levels, grade3Levels, grade4Levels, grade5Levels };

export const LEVELS_BY_GRADE = Object.freeze({
  1: grade1Levels, 2: grade2Levels, 3: grade3Levels, 4: grade4Levels, 5: grade5Levels,
});

export const ALL_LEVELS = Object.freeze([
  ...grade1Levels, ...grade2Levels, ...grade3Levels, ...grade4Levels, ...grade5Levels,
]);

const LEVEL_BY_ID = new Map(ALL_LEVELS.map((level) => [level.id, level]));

export function getLevelById(levelId) { return LEVEL_BY_ID.get(levelId) ?? null; }
export function getGradeLevels(grade) { return LEVELS_BY_GRADE[grade] ?? []; }
export function getChapterLevels(grade, chapter) {
  return getGradeLevels(grade).filter((level) => level.chapter === chapter);
}
export function getChapterBoss(grade, chapter) {
  return getChapterLevels(grade, chapter).find((level) => level.type !== "standard") ?? null;
}
export function getGrandBoss(grade) {
  return getGradeLevels(grade).find((level) => level.type === "grand-boss") ?? null;
}
