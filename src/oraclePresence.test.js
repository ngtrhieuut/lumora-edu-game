import assert from "node:assert/strict";
import test from "node:test";
import {
  ORACLE_PRESENCE_STATES,
  createOraclePresenceState,
  getOraclePresence,
  transitionOraclePresence,
} from "./oraclePresence.js";

test("Oracle presence starts dormant with a frozen canonical registry", () => {
  const state = createOraclePresenceState();

  assert.deepEqual(state, { state: ORACLE_PRESENCE_STATES.dormant, hintLevel: 0 });
  assert.deepEqual(Object.values(ORACLE_PRESENCE_STATES), [
    "dormant",
    "materializing",
    "teaching",
    "guiding",
    "celebrating",
    "dissolving",
  ]);
  assert.equal(Object.isFrozen(ORACLE_PRESENCE_STATES), true);
  assert.equal(Object.isFrozen(state), true);
});

test("supported events follow the manifestation flow", () => {
  let state = createOraclePresenceState();

  state = transitionOraclePresence(state, { type: "auto-hint" });
  assert.equal(state.state, ORACLE_PRESENCE_STATES.materializing);
  assert.equal(state.hintLevel, 1);

  state = transitionOraclePresence(state, { type: "player-action" });
  assert.equal(state.state, ORACLE_PRESENCE_STATES.teaching);
  state = transitionOraclePresence(state, { type: "guidance-started" });
  assert.equal(state.state, ORACLE_PRESENCE_STATES.guiding);
  state = transitionOraclePresence(state, { type: "level-success" });
  assert.equal(state.state, ORACLE_PRESENCE_STATES.celebrating);
  state = transitionOraclePresence(state, { type: "dismiss" });
  assert.equal(state.state, ORACLE_PRESENCE_STATES.dissolving);
  assert.equal(transitionOraclePresence(state, { type: "reset" }).state, ORACLE_PRESENCE_STATES.dormant);
  assert.equal(transitionOraclePresence(state, { type: "level-open" }).state, ORACLE_PRESENCE_STATES.dormant);
});

test("soft-fail materializes Mạch before an optional hint escalates it", () => {
  let state = createOraclePresenceState();

  state = transitionOraclePresence(state, { type: "soft-fail" });
  assert.deepEqual(state, { state: ORACLE_PRESENCE_STATES.materializing, hintLevel: 0 });

  state = transitionOraclePresence(state, { type: "auto-hint", hintLevel: 1 });
  assert.deepEqual(state, { state: ORACLE_PRESENCE_STATES.teaching, hintLevel: 1 });

  const afterCelebration = transitionOraclePresence(
    createOraclePresenceState({ state: ORACLE_PRESENCE_STATES.celebrating, hintLevel: 2 }),
    { type: "soft-fail" },
  );
  assert.deepEqual(afterCelebration, { state: ORACLE_PRESENCE_STATES.materializing, hintLevel: 2 });
});

test("hintLevel is truncated and clamped to the safe 0..3 signal", () => {
  assert.equal(createOraclePresenceState({ state: "teaching", hintLevel: 99 }).hintLevel, 3);
  assert.equal(createOraclePresenceState({ state: "teaching", hintLevel: -2 }).hintLevel, 0);
  assert.equal(createOraclePresenceState({ state: "teaching", hintLevel: 2.9 }).hintLevel, 2);

  const state = transitionOraclePresence(createOraclePresenceState(), {
    type: "hint-requested",
    hintLevel: 7,
  });
  assert.equal(state.state, ORACLE_PRESENCE_STATES.materializing);
  assert.equal(state.hintLevel, 3);
});

test("unknown and malformed events fail closed as no-ops", () => {
  const state = createOraclePresenceState({ state: ORACLE_PRESENCE_STATES.teaching, hintLevel: 2 });
  const events = [
    null,
    undefined,
    [],
    "level-success",
    {},
    { type: "unknown" },
    { type: 7 },
    { type: "hint-requested", hintLevel: "free text" },
  ];

  for (const event of events) {
    const next = transitionOraclePresence(state, event);
    assert.deepEqual(next, state);
    assert.equal(Object.isFrozen(next), true);
  }
});

test("state transitions do not mutate or retain caller data", () => {
  const input = {
    state: ORACLE_PRESENCE_STATES.materializing,
    hintLevel: 1,
    alias: "child-name",
    nested: { shouldBeDropped: true },
  };
  const event = { type: "guidance-started", hintLevel: 4, message: "private text" };
  const inputSnapshot = structuredClone(input);
  const eventSnapshot = structuredClone(event);
  const next = transitionOraclePresence(input, event);

  assert.deepEqual(input, inputSnapshot);
  assert.deepEqual(event, eventSnapshot);
  assert.notStrictEqual(next, input);
  assert.deepEqual(next, { state: ORACLE_PRESENCE_STATES.guiding, hintLevel: 3 });
  assert.equal(Object.isFrozen(next), true);
});

test("UI snapshot exposes bounded intensity and state-specific flags", () => {
  const expected = {
    dormant: { intensity: 0, visible: false, teaching: false, guiding: false, celebration: false },
    materializing: { intensity: 1, visible: true, teaching: false, guiding: false, celebration: false },
    teaching: { intensity: 2, visible: true, teaching: true, guiding: false, celebration: false },
    guiding: { intensity: 2, visible: true, teaching: false, guiding: true, celebration: false },
    celebrating: { intensity: 2, visible: true, teaching: false, guiding: false, celebration: true },
    dissolving: { intensity: 1, visible: true, teaching: false, guiding: false, celebration: false },
  };

  for (const stateName of Object.values(ORACLE_PRESENCE_STATES)) {
    const snapshot = getOraclePresence({ state: stateName, hintLevel: 8 });
    assert.deepEqual({
      intensity: snapshot.intensity,
      visible: snapshot.visible,
      teaching: snapshot.teaching,
      guiding: snapshot.guiding,
      celebration: snapshot.celebration,
    }, expected[stateName]);
    assert.equal(snapshot.state, stateName);
    assert.equal(snapshot.dataState, stateName);
    assert.equal(snapshot.animationKey, `oracle-${stateName}`);
    assert.equal(snapshot.hintLevel, 3);
    assert.ok(snapshot.intensity >= 0 && snapshot.intensity <= 2);
    assert.equal(Object.isFrozen(snapshot), true);
  }
});
