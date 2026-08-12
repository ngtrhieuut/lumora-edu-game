import assert from "node:assert/strict";
import test from "node:test";
import { ENERGY_IDS, ENERGY_TYPE_IDS, NUBI_ENERGY_IDS, getNubiResonance } from "./nubiResonance.js";

test("Nubi resonance exposes exactly the canonical energy IDs", () => {
  const expected = ["logic", "nature", "discovery", "mastery"];

  assert.deepEqual(NUBI_ENERGY_IDS, expected);
  assert.deepEqual(ENERGY_IDS, expected);
  assert.deepEqual(ENERGY_TYPE_IDS, expected);
  assert.equal(Object.isFrozen(NUBI_ENERGY_IDS), true);
});

test("valid types produce a stable, UI-ready ambient resonance", () => {
  const resonance = getNubiResonance({ energyTypes: ["mastery", "logic", "unknown", "logic"] });

  assert.deepEqual(resonance.activeTypes, ["logic", "mastery"]);
  assert.equal(resonance.primaryType, "logic");
  assert.equal(resonance.intensity, 1);
  assert.equal(resonance.key, "nubi-resonance-logic");
  assert.equal(resonance.labelVi, "Năng lượng Logic");
  assert.equal(resonance.shortLabel, "Logic");
  assert.equal(resonance.colorToken, "nubi-energy-logic");
  assert.equal(resonance.mode, "ambient");
  assert.equal(Object.isFrozen(resonance), true);
  assert.equal(Object.isFrozen(resonance.activeTypes), true);
});

test("invalid or malformed types fail closed to calm/none", () => {
  for (const input of [
    null,
    undefined,
    {},
    { energyTypes: ["unknown", 7, null, {}, ""] },
    { energyTypes: ["unknown"], earnedEnergy: { unknown: 99 } },
  ]) {
    const resonance = getNubiResonance(input);
    assert.equal(resonance.primaryType, null);
    assert.equal(resonance.intensity, 0);
    assert.equal(resonance.key, "nubi-resonance-none");
    assert.equal(resonance.labelVi, "Bình yên");
    assert.equal(resonance.colorToken, "nubi-energy-calm");
    assert.equal(resonance.mode, "calm");
    assert.deepEqual(resonance.activeTypes, []);
  }
});

test("active type ordering and primary selection do not depend on input order", () => {
  const first = getNubiResonance({
    energyTypes: ["mastery", "nature", "logic", "discovery"],
    earnedEnergy: { mastery: 2, logic: 2 },
  });
  const second = getNubiResonance({
    energyTypes: ["discovery", "logic", "nature", "mastery"],
    earnedEnergy: { logic: 2, mastery: 2 },
  });

  assert.deepEqual(first, second);
  assert.deepEqual(first.activeTypes, NUBI_ENERGY_IDS);
  assert.equal(first.primaryType, "logic", "canonical order breaks equal earned-energy ties");
});

test("reward resonance is stronger than ambient context and stays capped at two", () => {
  const ambient = getNubiResonance({ energyTypes: ["discovery"] });
  const reward = getNubiResonance({
    energyTypes: ["discovery"],
    earnedEnergy: { discovery: 999999 },
    reward: { firstClear: true, amount: 999999 },
    phase: "reward",
  });

  assert.equal(ambient.intensity, 1);
  assert.equal(reward.intensity, 2);
  assert.equal(reward.primaryType, "discovery");
  assert.equal(ambient.mode, "ambient");
  assert.equal(reward.mode, "reward");
  assert.ok(reward.intensity >= 0 && reward.intensity <= 2);
});

test("resonance does not mutate caller data", () => {
  const input = {
    energyTypes: ["mastery", "logic", "invalid"],
    earnedEnergy: { mastery: 1, invalid: 50 },
    reward: { firstClear: true },
    nested: { keep: true },
  };
  const snapshot = structuredClone(input);
  const resonance = getNubiResonance(input);

  assert.deepEqual(input, snapshot);
  assert.notStrictEqual(resonance.activeTypes, input.energyTypes);
  assert.equal(Object.isFrozen(resonance), true);
  assert.equal(Object.isFrozen(resonance.activeTypes), true);
});
