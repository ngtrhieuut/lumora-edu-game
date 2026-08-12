import assert from "node:assert/strict";
import test from "node:test";
import {
  ENERGY_TYPE_IDS,
  ENERGY_TYPES,
  addEnergy,
  createInitialEnergy,
  getEnergyReward,
  normalizeEnergy,
  normalizeEnergyTypes,
} from "./energyEngine.js";

test("energy registry is immutable and exposes the four design categories", () => {
  assert.deepEqual(ENERGY_TYPE_IDS, ["logic", "nature", "discovery", "mastery"]);
  assert.equal(Object.isFrozen(ENERGY_TYPES), true);
  assert.deepEqual(createInitialEnergy(), { logic: 0, nature: 0, discovery: 0, mastery: 0 });
});
test("energy normalization clamps counters and fails closed for unknown fields", () => {
  assert.deepEqual(normalizeEnergy({ logic: -2, nature: 1.9, discovery: Infinity, mastery: 4, email: 99 }), {
    logic: 0,
    nature: 1,
    discovery: 0,
    mastery: 4,
  });
  assert.deepEqual(normalizeEnergy(null), createInitialEnergy());
  assert.deepEqual(normalizeEnergyTypes(["logic", "logic", "unknown", "mastery", 4]), ["logic", "mastery"]);
  assert.deepEqual(normalizeEnergyTypes("discovery"), ["discovery"]);
  assert.deepEqual(normalizeEnergyTypes(null), []);
});

test("first-clear energy reward is bounded by category and mastery", () => {
  assert.deepEqual(getEnergyReward({ energyTypes: ["logic", "logic", "nature", "bad"], mastery: 1 }), {
    logic: 1,
    nature: 1,
    discovery: 0,
    mastery: 0,
  });
  assert.deepEqual(getEnergyReward({ energyTypes: ["logic", "discovery"], mastery: 2 }), {
    logic: 1,
    nature: 0,
    discovery: 1,
    mastery: 0,
  });
  assert.deepEqual(getEnergyReward({ energyTypes: ["logic", "mastery"], mastery: 3 }), {
    logic: 2,
    nature: 0,
    discovery: 0,
    mastery: 2,
  });
  assert.deepEqual(getEnergyReward({ energyTypes: ["logic"], mastery: 3, firstClear: false }), createInitialEnergy());
});

test("addEnergy supports canonical energy and immutable progress objects", () => {
  const before = { logic: 1, nature: 0, discovery: 2, mastery: 0 };
  const next = addEnergy(before, { logic: 2, mastery: 4, unknown: 99 });
  assert.deepEqual(next, { logic: 3, nature: 0, discovery: 2, mastery: 4 });
  assert.deepEqual(before, { logic: 1, nature: 0, discovery: 2, mastery: 0 });

  const progress = { energies: { logic: 2 }, completed: ["collect"], nested: { keep: true } };
  const updated = addEnergy(progress, { discovery: 1 });
  assert.notStrictEqual(updated, progress);
  assert.notStrictEqual(updated.energies, progress.energies);
  assert.deepEqual(updated.energies, { logic: 2, nature: 0, discovery: 1, mastery: 0 });
  assert.deepEqual(updated.completed, ["collect"]);
  assert.deepEqual(updated.nested, { keep: true });
  assert.deepEqual(progress, { energies: { logic: 2 }, completed: ["collect"], nested: { keep: true } });
});
