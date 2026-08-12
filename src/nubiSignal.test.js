import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  NUBI_SIGNAL_STATES,
  createNubiSignalState,
  getNubiSignal,
  transitionNubiSignal,
} from "./nubiSignal.js";

const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

test("Nubi signal exposes the canonical registry and safe initial state", () => {
  assert.deepEqual(Object.values(NUBI_SIGNAL_STATES), [
    "ambient",
    "attention",
    "responding",
    "resonant",
    "recovering",
  ]);
  assert.equal(Object.isFrozen(NUBI_SIGNAL_STATES), true);
  assert.deepEqual(createNubiSignalState(), { state: NUBI_SIGNAL_STATES.ambient, intensity: 0 });
  assert.equal(Object.isFrozen(createNubiSignalState()), true);
});

test("supported events follow the complete gameplay signal flow", () => {
  let state = createNubiSignalState();

  state = transitionNubiSignal(state, { type: "level-open" });
  assert.deepEqual(state, { state: NUBI_SIGNAL_STATES.ambient, intensity: 0 });
  state = transitionNubiSignal(state, { type: "player-action" });
  assert.deepEqual(state, { state: NUBI_SIGNAL_STATES.responding, intensity: 2 });
  state = transitionNubiSignal(state, { type: "soft-fail" });
  assert.deepEqual(state, { state: NUBI_SIGNAL_STATES.attention, intensity: 1 });
  state = transitionNubiSignal(state, { type: "hint-requested" });
  assert.deepEqual(state, { state: NUBI_SIGNAL_STATES.responding, intensity: 2 });
  state = transitionNubiSignal(state, { type: "phase-complete" });
  assert.deepEqual(state, { state: NUBI_SIGNAL_STATES.resonant, intensity: 3 });
  state = transitionNubiSignal(state, { type: "level-success" });
  assert.deepEqual(state, { state: NUBI_SIGNAL_STATES.resonant, intensity: 3 });
  state = transitionNubiSignal(state, { type: "recovery" });
  assert.deepEqual(state, { state: NUBI_SIGNAL_STATES.recovering, intensity: 1 });
  state = transitionNubiSignal(state, { type: "cooldown" });
  assert.deepEqual(state, { state: NUBI_SIGNAL_STATES.ambient, intensity: 0 });
  assert.equal(transitionNubiSignal(state, { type: "reset" }).state, NUBI_SIGNAL_STATES.ambient);
});

test("malformed states and unknown events fail closed", () => {
  for (const value of [null, undefined, "resonant", [], {}, { state: "unknown" }, { state: "resonant", note: "private" }]) {
    const state = createNubiSignalState(value);
    assert.equal(NUBI_SIGNAL_STATES[state.state] === state.state, true);
    assert.ok(state.intensity >= 0 && state.intensity <= 3);
    assert.equal(Object.isFrozen(state), true);
  }

  const current = createNubiSignalState({ state: NUBI_SIGNAL_STATES.responding, intensity: 2 });
  for (const event of [null, undefined, [], "level-success", {}, { type: 7 }, { type: "unknown" }, { type: "toString" }, { type: "__proto__" }]) {
    const next = transitionNubiSignal(current, event);
    assert.deepEqual(next, current);
    assert.equal(Object.isFrozen(next), true);
  }
});

test("intensity is finite, truncated, and clamped to 0..3", () => {
  assert.equal(createNubiSignalState({ state: "responding", intensity: -8 }).intensity, 0);
  assert.equal(createNubiSignalState({ state: "responding", intensity: 2.9 }).intensity, 2);
  assert.equal(createNubiSignalState({ state: "responding", intensity: 99 }).intensity, 3);
  assert.equal(createNubiSignalState({ state: "responding", intensity: Number.POSITIVE_INFINITY }).intensity, 2);

  const snapshot = getNubiSignal({ state: "resonant", intensity: 99 });
  assert.equal(snapshot.intensity, 3);
});

test("transitions are immutable and discard unrelated or free-text fields", () => {
  const original = {
    state: NUBI_SIGNAL_STATES.attention,
    intensity: 1,
    alias: "child-name",
    metadata: { private: true },
  };
  const event = { type: "hint-requested", message: "private free text", pii: { name: "child" } };
  const originalSnapshot = structuredClone(original);
  const eventSnapshot = structuredClone(event);
  const next = transitionNubiSignal(original, event);

  assert.deepEqual(original, originalSnapshot);
  assert.deepEqual(event, eventSnapshot);
  assert.notStrictEqual(next, original);
  assert.deepEqual(next, { state: NUBI_SIGNAL_STATES.responding, intensity: 2 });
  assert.equal(Object.isFrozen(next), true);
  assert.equal("alias" in next, false);
  assert.equal("message" in next, false);
});

test("snapshot flags are explicit, bounded, frozen, and CSS-safe", () => {
  const expected = {
    ambient: { intensity: 0, visibleCore: false, visibleBeam: false, showBurst: false },
    attention: { intensity: 1, visibleCore: true, visibleBeam: true, showBurst: false },
    responding: { intensity: 2, visibleCore: true, visibleBeam: true, showBurst: true },
    resonant: { intensity: 3, visibleCore: true, visibleBeam: true, showBurst: true },
    recovering: { intensity: 1, visibleCore: true, visibleBeam: false, showBurst: false },
  };

  for (const state of Object.values(NUBI_SIGNAL_STATES)) {
    const snapshot = getNubiSignal({ state, intensity: 99, extra: "ignored" });
    assert.deepEqual({
      intensity: snapshot.intensity,
      visibleCore: snapshot.visibleCore,
      visibleBeam: snapshot.visibleBeam,
      showBurst: snapshot.showBurst,
    }, { ...expected[state], intensity: 3 });
    assert.equal(snapshot.state, state);
    assert.equal(snapshot.dataState, state);
    assert.equal(snapshot.animationKey, `nubi-signal-${state}`);
    assert.match(snapshot.animationKey, /^nubi-signal-(ambient|attention|responding|resonant|recovering)$/);
    assert.equal(Object.isFrozen(snapshot), true);
  }
});

test("CSS consumes the bounded signal states and visibility flags", () => {
  assert.match(styles, /\.nubi-figure\[data-nubi-signal="attention"\][^\n]*\.nubi-signal-beam/);
  assert.match(styles, /\.nubi-figure\[data-nubi-signal="responding"\][^\n]*\.nubi-signal-burst/);
  assert.match(styles, /\.nubi-figure\[data-nubi-signal="resonant"\][^\n]*\.nubi-signal-beam/);
  assert.match(styles, /\.nubi-figure\[data-nubi-beam="hidden"\][^\n]*\.nubi-signal-beam/);
  assert.match(styles, /\.nubi-figure\[data-nubi-core="ambient"\][^\n]*\.nubi-core-flare/);
});
