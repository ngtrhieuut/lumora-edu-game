import test from "node:test";
import assert from "node:assert/strict";
import { createScenarioState, getNextScenarioPortion, normalizeScenarioState, serveScenarioPortion } from "./scenarioEngine.js";

test("scenario starts with five portions and a 2 plus 3 target", () => {
  const state = createScenarioState();
  assert.deepEqual(state, {
    portionIds: [0, 1, 2, 3, 4],
    groups: { miu: 2, ti: 3 },
    servedByFriend: { miu: [], ti: [] },
    complete: false,
  });
  assert.equal(getNextScenarioPortion(state, "miu"), 0);
});

test("serving two portions to Miu and three to Ti completes the simulation", () => {
  let state = createScenarioState();
  state = serveScenarioPortion(state, "miu", 0).state;
  state = serveScenarioPortion(state, "miu", 1).state;
  state = serveScenarioPortion(state, "ti", 2).state;
  state = serveScenarioPortion(state, "ti", 3).state;
  const result = serveScenarioPortion(state, "ti", 4);
  assert.equal(result.accepted, true);
  assert.equal(result.complete, true);
  assert.deepEqual(result.state.servedByFriend, { miu: [0, 1], ti: [2, 3, 4] });
  assert.equal(getNextScenarioPortion(result.state, "ti"), null);
});

test("scenario rejects invalid, duplicate, full and post-completion serves immutably", () => {
  const original = createScenarioState();
  const first = serveScenarioPortion(original, "miu", 0);
  const duplicate = serveScenarioPortion(first.state, "ti", 0);
  assert.equal(duplicate.reason, "already-served");
  assert.equal(serveScenarioPortion(first.state, "nope", 1).reason, "invalid-friend");
  const full = serveScenarioPortion(serveScenarioPortion(first.state, "miu", 1).state, "miu", 2);
  assert.equal(full.reason, "full");
  let complete = first.state;
  complete = serveScenarioPortion(complete, "miu", 1).state;
  complete = serveScenarioPortion(complete, "ti", 2).state;
  complete = serveScenarioPortion(complete, "ti", 3).state;
  complete = serveScenarioPortion(complete, "ti", 4).state;
  assert.equal(serveScenarioPortion(complete, "ti", 0).reason, "complete");
  assert.deepEqual(original.servedByFriend, { miu: [], ti: [] });
});

test("scenario normalization strips unknown and duplicate portions safely", () => {
  const state = normalizeScenarioState({
    portionIds: [0, 0, 1, "2"],
    servedByFriend: { miu: [0, 0, 8], ti: [0, 1, 2, 3, 4] },
  });
  assert.deepEqual(state.portionIds, [0, 1]);
  assert.deepEqual(state.servedByFriend, { miu: [0], ti: [1] });
  assert.equal(state.complete, false);
});

test("scenario treats null options as defaults", () => {
  assert.deepEqual(createScenarioState(null).groups, { miu: 2, ti: 3 });
  assert.deepEqual(normalizeScenarioState(null, null).portionIds, [0, 1, 2, 3, 4]);
});
