import assert from "node:assert/strict";
import test from "node:test";
import { createNubiFeedbackState, getNubiMood, MOODS, transitionNubiFeedback } from "./nubiFeedback.js";

test("Nubi feedback starts idle and exposes an immutable mood registry", () => {
  assert.deepEqual(createNubiFeedbackState(), { mood: MOODS.idle });
  assert.deepEqual(Object.values(MOODS), ["idle", "curious", "hint", "soft-fail", "phase-complete", "resonant"]);
  assert.equal(Object.isFrozen(MOODS), true);
  assert.equal(getNubiMood(null), MOODS.idle);
});

test("valid gameplay events move through the supported mood states", () => {
  let state = createNubiFeedbackState();
  state = transitionNubiFeedback(state, { type: "start" });
  assert.equal(getNubiMood(state), MOODS.curious);

  state = transitionNubiFeedback(state, { type: "hint" });
  assert.equal(getNubiMood(state), MOODS.hint);
  state = transitionNubiFeedback(state, { type: "retry" });
  assert.equal(getNubiMood(state), MOODS.curious);
  state = transitionNubiFeedback(state, { type: "soft-fail" });
  assert.equal(getNubiMood(state), MOODS.softFail);
  state = transitionNubiFeedback(state, { type: "phase-complete" });
  assert.equal(getNubiMood(state), MOODS.phaseComplete);
  state = transitionNubiFeedback(state, { type: "next-phase" });
  assert.equal(getNubiMood(state), MOODS.curious);
  state = transitionNubiFeedback(state, { type: "level-success" });
  assert.equal(getNubiMood(state), MOODS.resonant);
});

test("malformed state and unknown events fail closed", () => {
  for (const value of [null, undefined, "curious", [], {}, { mood: "unknown" }, { mood: "resonant", extra: true }]) {
    assert.equal(getNubiMood(value), value?.mood === MOODS.resonant ? MOODS.resonant : MOODS.idle);
  }

  const phaseComplete = transitionNubiFeedback({ mood: MOODS.curious }, { type: "phase-complete" });
  for (const event of [null, undefined, "reset", {}, { type: "unknown" }, { type: "timeout" }, { type: "start" }]) {
    const next = transitionNubiFeedback(phaseComplete, event);
    assert.equal(getNubiMood(next), MOODS.phaseComplete);
  }
});

test("transitions do not mutate the input state or retain unrelated fields", () => {
  const original = { mood: MOODS.curious, debug: { shouldBeDropped: true } };
  const snapshot = structuredClone(original);
  const next = transitionNubiFeedback(original, { type: "soft-fail" });

  assert.notStrictEqual(next, original);
  assert.deepEqual(original, snapshot);
  assert.deepEqual(next, { mood: MOODS.softFail });
  assert.equal(Object.isFrozen(next), true);
});

test("phase completion exits only through explicit events and reset returns to idle", () => {
  const phaseComplete = transitionNubiFeedback({ mood: MOODS.curious }, { type: "phase-complete" });
  assert.equal(getNubiMood(transitionNubiFeedback(phaseComplete, { type: "next-phase" })), MOODS.curious);
  assert.equal(getNubiMood(transitionNubiFeedback(phaseComplete, { type: "reset" })), MOODS.idle);

  const resonant = transitionNubiFeedback(phaseComplete, { type: "level-success" });
  assert.equal(getNubiMood(resonant), MOODS.resonant);
  assert.equal(getNubiMood(transitionNubiFeedback(resonant, { type: "reset" })), MOODS.idle);
});
