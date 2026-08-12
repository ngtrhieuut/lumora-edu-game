import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createInitialCityState,
  equipCosmetic,
  getUnlockedBuildingIds,
  getUnlockedCosmeticIds,
  normalizeCityState,
  selectCityBuilding,
} from "./cityEngine.js";

const BUILDINGS = [
  { id: "logic", unlockAt: 2 },
  { id: "shapes", unlockAt: 3 },
  { id: "logic", unlockAt: 99 },
];

const COSMETICS = [
  { id: "logic-crown", unlock: { type: "building", buildingId: "logic" } },
  { id: "practice-aura", unlock: { type: "practice-sessions", count: 2 } },
  { id: "stage-halo", unlock: { type: "nubi-stage", stage: 2 } },
  { id: "quest-aura", unlock: { type: "quest", questId: "moon-rune" } },
  { id: "locked-shield", unlock: { type: "building", buildingId: "shapes" } },
  { id: "logic-crown", unlock: { type: "practice-sessions", count: 99 } },
  { id: "unknown", unlock: { type: "building", buildingId: "missing" } },
  { id: "invalid", unlock: { type: "unknown" } },
];

test("initial and malformed inputs are safe", () => {
  assert.deepEqual(createInitialCityState(), {
    selectedBuildingId: null,
    equippedCosmeticId: null,
  });
  assert.deepEqual(getUnlockedBuildingIds(null, null), []);
  assert.deepEqual(getUnlockedCosmeticIds({ completed: "bad" }, [null, { id: "", unlockAt: 0 }], [null]), []);
  assert.doesNotThrow(() => normalizeCityState(null, null, null, null));
  assert.deepEqual(normalizeCityState({ selectedBuildingId: "logic", equippedCosmeticId: "logic-crown" }, null, null, null), {
    selectedBuildingId: null,
    equippedCosmeticId: null,
  });
});

test("building unlocks use inclusive boundaries and valid unique ids", () => {
  assert.deepEqual(getUnlockedBuildingIds({ completed: [] }, [{ id: "base", unlockAt: 0 }, { id: "next", unlockAt: 1 }]), ["base"]);
  assert.deepEqual(getUnlockedBuildingIds({ completed: ["a"] }, [{ id: "base", unlockAt: 0 }, { id: "next", unlockAt: 1 }]), ["base", "next"]);

  const malformed = [
    { id: " ", unlockAt: 0 },
    { id: null, unlockAt: 0 },
    { id: "bad-number", unlockAt: "0" },
    { id: "bad-threshold", unlockAt: Number.NaN },
    { id: "logic", unlockAt: 0 },
    { id: "logic", unlockAt: 2 },
  ];
  assert.deepEqual(getUnlockedBuildingIds({ completed: [] }, malformed), ["logic"]);
});

test("mastery-gated buildings require completed nodes at the minimum mastery", () => {
  const buildings = [
    { id: "logic", unlockAt: 2, masteryRequirement: { nodeIds: ["a", "b"], minimum: 2 } },
    { id: "legacy", unlockAt: 2 },
  ];
  const low = {
    completed: ["a", "b"],
    learningMetrics: { a: { bestMastery: 2 }, b: { bestMastery: 1 } },
  };
  assert.deepEqual(getUnlockedBuildingIds(low, buildings), ["legacy"]);

  const ready = {
    ...low,
    learningMetrics: { a: { bestMastery: 2 }, b: { bestMastery: 2 } },
  };
  assert.deepEqual(getUnlockedBuildingIds(ready, buildings), ["logic", "legacy"]);

  const outcomeFallback = {
    completed: ["a", "b"],
    nodeOutcomes: { a: { mastery: 2 }, b: { mastery: 2 } },
  };
  assert.deepEqual(getUnlockedBuildingIds(outcomeFallback, buildings), ["logic", "legacy"]);
});

test("malformed mastery gates fail closed while legacy buildings remain count-based", () => {
  const buildings = [
    { id: "bad-list", unlockAt: 0, masteryRequirement: { nodeIds: "a", minimum: 2 } },
    { id: "bad-minimum", unlockAt: 0, masteryRequirement: { nodeIds: ["a"], minimum: 4 } },
    { id: "legacy", unlockAt: 0 },
  ];
  assert.deepEqual(getUnlockedBuildingIds({ completed: ["a"], learningMetrics: { a: { bestMastery: 3 } } }, buildings), ["legacy"]);
});

test("cosmetics support building, practice-session, Nubi-stage, and optional quest unlocks", () => {
  const before = { completed: ["lesson"], nubiStage: 1, practiceMetrics: { sessionsCompleted: 1 } };
  assert.deepEqual(getUnlockedCosmeticIds(before, BUILDINGS, COSMETICS), []);

  const ready = { completed: ["a", "b"], nubiStage: 2, practiceMetrics: { sessionsCompleted: 2 }, questState: { completedIds: ["moon-rune"] } };
  assert.deepEqual(getUnlockedCosmeticIds(ready, BUILDINGS, COSMETICS), ["logic-crown", "practice-aura", "stage-halo", "quest-aura"]);
});

test("city state normalization keeps only unlocked selections and equipment", () => {
  const progress = { completed: ["a", "b"], nubiStage: 2, practiceMetrics: { sessionsCompleted: 2 } };
  const state = { selectedBuildingId: "shapes", equippedCosmeticId: "locked-shield" };
  const before = structuredClone(state);

  assert.deepEqual(normalizeCityState(state, progress, BUILDINGS, COSMETICS), {
    selectedBuildingId: null,
    equippedCosmeticId: null,
  });
  assert.deepEqual(state, before);
  assert.deepEqual(
    normalizeCityState({ selectedBuildingId: "logic", equippedCosmeticId: "practice-aura" }, progress, BUILDINGS, COSMETICS),
    { selectedBuildingId: "logic", equippedCosmeticId: "practice-aura" },
  );
});

test("selection, equip, unequip, rejection, and cloning are immutable", () => {
  const progress = {
    completed: ["a", "b"],
    nubiStage: 2,
    practiceMetrics: { sessionsCompleted: 2 },
    cityState: { selectedBuildingId: "logic", equippedCosmeticId: null },
    extra: { nested: ["kept"] },
    shards: 61,
    learningMetrics: { count: { bestMastery: 3 } },
  };
  const before = structuredClone(progress);

  const selected = selectCityBuilding(progress, "shapes", BUILDINGS, COSMETICS);
  assert.equal(selected.cityState.selectedBuildingId, "logic", "locked building leaves the current selection unchanged");
  assert.notStrictEqual(selected, progress);
  assert.notStrictEqual(selected.extra, progress.extra);
  assert.notStrictEqual(selected.completed, progress.completed);
  assert.deepEqual(progress, before);

  const equipped = equipCosmetic(progress, "practice-aura", BUILDINGS, COSMETICS);
  assert.equal(equipped.cityState.equippedCosmeticId, "practice-aura");
  assert.equal(equipped.shards, 61, "cosmetics never spend learning rewards");
  assert.deepEqual(equipped.learningMetrics, progress.learningMetrics, "cosmetics never change mastery");
  assert.deepEqual(equipCosmetic(equipped, "locked-shield", BUILDINGS, COSMETICS).cityState, {
    selectedBuildingId: "logic",
    equippedCosmeticId: "practice-aura",
  });
  assert.deepEqual(equipCosmetic(equipped, "missing", BUILDINGS, COSMETICS).cityState, {
    selectedBuildingId: "logic",
    equippedCosmeticId: "practice-aura",
  });
  assert.equal(equipCosmetic(equipped, null, BUILDINGS, COSMETICS).cityState.equippedCosmeticId, null);
  assert.deepEqual(progress, before);
});
