import test from "node:test";
import assert from "node:assert/strict";
import {
  BOSS_PHASE_IDS,
  completeBossPhase,
  createBossRestorationState,
  getActiveBossPhase,
  isBossRestorationComplete,
  normalizeBossRestorationState,
} from "./bossRestorationEngine.js";

test("boss restoration defaults to three phases in mechanic order, incomplete", () => {
  const state = createBossRestorationState();
  assert.deepEqual(state, {
    phaseIds: ["collect", "add", "pattern"],
    completedPhaseIds: [],
    phaseIndex: 0,
    complete: false,
  });
  assert.equal(getActiveBossPhase(state), "collect");
  assert.equal(isBossRestorationComplete(state), false);
});

test("completing each phase in order advances progress immutably", () => {
  const initial = createBossRestorationState();
  const first = completeBossPhase(initial, "collect");
  const second = completeBossPhase(first.state, "add");
  const third = completeBossPhase(second.state, "pattern");

  assert.equal(first.accepted, true);
  assert.equal(first.reason, "completed");
  assert.equal(first.state.phaseIndex, 1);
  assert.deepEqual(first.state.completedPhaseIds, ["collect"]);
  assert.equal(getActiveBossPhase(first.state), "add");

  assert.equal(second.state.phaseIndex, 2);
  assert.deepEqual(second.state.completedPhaseIds, ["collect", "add"]);
  assert.equal(getActiveBossPhase(second.state), "pattern");

  assert.equal(third.accepted, true);
  assert.equal(third.complete, true);
  assert.equal(third.state.phaseIndex, 2);
  assert.deepEqual(third.state.completedPhaseIds, ["collect", "add", "pattern"]);
  assert.equal(isBossRestorationComplete(third.state), true);
  assert.equal(getActiveBossPhase(third.state), null);

  // Input state was never mutated.
  assert.deepEqual(initial.completedPhaseIds, []);
  assert.equal(initial.phaseIndex, 0);
});

test("completeBossPhase rejects duplicate, unknown, out-of-order, invalid and post-completion ids", () => {
  const original = createBossRestorationState();
  const duplicate = completeBossPhase(completeBossPhase(original, "collect").state, "collect");
  const unknown = completeBossPhase(original, "shape");
  const outOfOrder = completeBossPhase(original, "add");
  const malformed = completeBossPhase(original, 42);
  assert.equal(duplicate.accepted, false);
  assert.equal(duplicate.reason, "already-completed");
  assert.equal(unknown.accepted, false);
  assert.equal(unknown.reason, "invalid-phase");
  assert.equal(outOfOrder.accepted, false);
  assert.equal(outOfOrder.reason, "out-of-order");
  assert.equal(malformed.accepted, false);
  assert.equal(malformed.reason, "invalid-phase");

  const complete = completeBossPhase(completeBossPhase(completeBossPhase(original, "collect").state, "add").state, "pattern");
  const afterDone = completeBossPhase(complete.state, "collect");
  assert.equal(afterDone.accepted, false);
  assert.equal(afterDone.reason, "complete");
  assert.deepEqual(afterDone.state, complete.state);

  // None of the rejected calls mutated the starting state.
  assert.deepEqual(original.completedPhaseIds, []);
});

test("normalization fails closed on null, primitive and array input", () => {
  for (const input of [null, undefined, "collect", 42, true, ["collect", "add", "pattern"]]) {
    const state = normalizeBossRestorationState(input);
    assert.deepEqual(state.phaseIds, BOSS_PHASE_IDS);
    assert.deepEqual(state.completedPhaseIds, []);
    assert.equal(state.phaseIndex, 0);
    assert.equal(state.complete, false);
  }
});

test("normalization fails closed on malformed phase lists", () => {
  const unknown = normalizeBossRestorationState({ phaseIds: ["collect", "add", "shape"] });
  const duplicate = normalizeBossRestorationState({ phaseIds: ["collect", "collect", "pattern"] });
  const reordered = normalizeBossRestorationState({ phaseIds: ["pattern", "add", "collect"] });
  const subset = normalizeBossRestorationState({ phaseIds: ["collect", "add"] });
  for (const state of [unknown, duplicate, reordered, subset]) {
    assert.deepEqual(state.phaseIds, BOSS_PHASE_IDS);
  }
});

test("normalization drops skipped, duplicated and out-of-order completions so later phases stay locked", () => {
  const skipped = normalizeBossRestorationState({
    phaseIds: ["collect", "add", "pattern"],
    completedPhaseIds: ["collect", "pattern"],
  });
  assert.deepEqual(skipped.completedPhaseIds, ["collect"]);
  assert.equal(skipped.phaseIndex, 1);
  assert.equal(getActiveBossPhase(skipped), "add");

  const outOfOrder = normalizeBossRestorationState({
    phaseIds: ["collect", "add", "pattern"],
    completedPhaseIds: ["pattern", "add"],
  });
  // add done without collect = no valid prefix, so nothing counts; boss restarts at collect.
  assert.deepEqual(outOfOrder.completedPhaseIds, []);
  assert.equal(outOfOrder.phaseIndex, 0);
  assert.equal(getActiveBossPhase(outOfOrder), "collect");

  const duplicated = normalizeBossRestorationState({
    phaseIds: ["collect", "add", "pattern"],
    completedPhaseIds: ["collect", "collect", "add"],
  });
  assert.deepEqual(duplicated.completedPhaseIds, ["collect"]);
  assert.equal(duplicated.phaseIndex, 1);

  const reordered = normalizeBossRestorationState({
    phaseIds: ["collect", "add", "pattern"],
    completedPhaseIds: ["collect", "pattern", "add"],
  });
  assert.deepEqual(reordered.completedPhaseIds, ["collect"]);
  assert.equal(reordered.phaseIndex, 1);

  const malformedData = normalizeBossRestorationState({
    completedPhaseIds: ["collect", 7, "add", "pattern"],
  });
  assert.deepEqual(malformedData.completedPhaseIds, ["collect"]);
  assert.equal(malformedData.phaseIndex, 1);
});

test("normalization ignores invalid phaseIndex and derives it from valid completions", () => {
  const tooHigh = normalizeBossRestorationState({ phaseIndex: 2, completedPhaseIds: [] });
  assert.equal(tooHigh.phaseIndex, 0);

  const negative = normalizeBossRestorationState({ phaseIndex: -5, completedPhaseIds: [] });
  assert.equal(negative.phaseIndex, 0);

  const garbage = normalizeBossRestorationState({ phaseIndex: "pattern", completedPhaseIds: ["collect", "add"] });
  assert.equal(garbage.phaseIndex, 2);
});

test("normalizing a fully completed state keeps the final index and complete flag", () => {
  const state = normalizeBossRestorationState({
    completedPhaseIds: ["collect", "add", "pattern"],
  });
  assert.equal(state.complete, true);
  assert.equal(state.phaseIndex, 2);
  assert.equal(isBossRestorationComplete(state), true);
});

test("callers cannot alter shared default phase data through returned state", () => {
  const first = createBossRestorationState();
  first.phaseIds.push("hacked");
  first.completedPhaseIds.push("collect");
  const second = createBossRestorationState();
  assert.deepEqual(second.phaseIds, BOSS_PHASE_IDS);
  assert.deepEqual(second.completedPhaseIds, []);
  assert.equal(BOSS_PHASE_IDS.length, 3);
});
