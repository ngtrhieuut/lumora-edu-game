// Lumora 500-level catalog schema v1.
// Data-only contracts. No React/UI/storage dependency.

export const LEVEL_CATALOG_VERSION = "1.0.0";

export const LEVEL_TYPES = Object.freeze(["standard", "chapter-boss", "grand-boss"]);
export const DIFFICULTY_TIERS = Object.freeze(["guided", "supported", "independent", "boss"]);

export const LEVEL_REQUIRED_FIELDS = Object.freeze([
  "id", "grade", "worldId", "chapter", "order", "type", "titleVi",
  "skillId", "learningObjectiveVi", "mechanicId", "difficulty",
  "oracle", "mastery", "rewards", "restoration", "prerequisites", "curriculum",
]);

export function isBossLevel(level) {
  return level?.type === "chapter-boss" || level?.type === "grand-boss";
}

export function isGrandBoss(level) {
  return level?.type === "grand-boss";
}
