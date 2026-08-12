import test from "node:test";
import assert from "node:assert/strict";
import { createBridgeState, getNextBridgeCrystal, normalizeBridgeState, placeBridgeCrystal } from "./bridgeEngine.js";

test("bridge state starts with four lit steps and three available crystals", () => {
  const state = createBridgeState();
  assert.deepEqual(state, {
    startSteps: 4,
    targetSteps: 7,
    crystalIds: [0, 1, 2],
    steps: 4,
    placedCrystalIds: [],
    complete: false,
  });
  assert.equal(getNextBridgeCrystal(state), 0);
});

test("placing each crystal grows the bridge and completes at seven steps", () => {
  const first = placeBridgeCrystal(createBridgeState(), 0);
  const second = placeBridgeCrystal(first.state, 1);
  const third = placeBridgeCrystal(second.state, 2);
  assert.equal(first.state.steps, 5);
  assert.equal(second.state.steps, 6);
  assert.equal(third.state.steps, 7);
  assert.equal(third.complete, true);
  assert.equal(getNextBridgeCrystal(third.state), null);
});

test("bridge rejects duplicate, invalid and post-completion placement without mutation", () => {
  const original = createBridgeState();
  const placed = placeBridgeCrystal(original, 0);
  const duplicate = placeBridgeCrystal(placed.state, 0);
  const invalid = placeBridgeCrystal(placed.state, 99);
  assert.equal(duplicate.accepted, false);
  assert.equal(duplicate.reason, "already-placed");
  assert.equal(invalid.accepted, false);
  assert.equal(invalid.reason, "invalid-crystal");
  assert.deepEqual(original.placedCrystalIds, []);
  const complete = placeBridgeCrystal(placeBridgeCrystal(placed.state, 1).state, 2);
  const after = placeBridgeCrystal(complete.state, 2);
  assert.equal(after.reason, "complete");
  assert.deepEqual(after.state.placedCrystalIds, [0, 1, 2]);
});

test("bridge normalization fails closed for malformed state", () => {
  const state = normalizeBridgeState({ startSteps: "bad", targetSteps: 8, crystalIds: [0, 0, "1"], placedCrystalIds: [0, 0, 9] });
  assert.deepEqual(state.crystalIds, [0]);
  assert.deepEqual(state.placedCrystalIds, [0]);
  assert.equal(state.steps, 5);
  assert.equal(state.complete, false);
});
