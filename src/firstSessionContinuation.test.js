import assert from "node:assert/strict";
import test from "node:test";
import {
  FIRST_SESSION_CONTINUATION_PHASES,
  createFirstSessionContinuation,
  transitionFirstSessionContinuation,
} from "./firstSessionContinuation.js";

const phase = FIRST_SESSION_CONTINUATION_PHASES;

test("continuation starts as a frozen idle state", () => {
  const state = createFirstSessionContinuation();
  assert.deepEqual(state, {
    phase: phase.idle,
    level1Completed: false,
    mechanicIntroSeen: false,
    level2Completed: false,
    bossTeaseSeen: false,
  });
  assert.equal(Object.isFrozen(state), true);
  assert.deepEqual(Object.values(phase), ["idle", "map", "mechanic-intro", "level-2", "boss-tease", "complete"]);
  assert.equal(Object.isFrozen(phase), true);
});

test("first-session continuation follows Level 1, mechanic 2, then boss tease", () => {
  let state = transitionFirstSessionContinuation(createFirstSessionContinuation(), { type: "level1-complete" });
  assert.equal(state.phase, phase.map);
  assert.equal(state.level1Completed, true);

  state = transitionFirstSessionContinuation(state, { type: "mechanic-intro" });
  assert.equal(state.phase, phase.mechanicIntro);
  state = transitionFirstSessionContinuation(state, { type: "mechanic-intro-start" });
  assert.equal(state.phase, phase.level2);
  assert.equal(state.mechanicIntroSeen, true);

  state = transitionFirstSessionContinuation(state, { type: "level2-complete" });
  assert.equal(state.phase, phase.bossTease);
  assert.equal(state.level2Completed, true);
  state = transitionFirstSessionContinuation(state, { type: "boss-tease-dismiss" });
  assert.deepEqual(state, {
    phase: phase.complete,
    level1Completed: true,
    mechanicIntroSeen: true,
    level2Completed: true,
    bossTeaseSeen: true,
  });
});

test("skip and exit preserve a safe resume point without repeating mechanic intro", () => {
  let state = transitionFirstSessionContinuation(createFirstSessionContinuation(), { type: "level1-complete" });
  state = transitionFirstSessionContinuation(state, { type: "mechanic-intro" });
  state = transitionFirstSessionContinuation(state, { type: "mechanic-intro-skip" });
  state = transitionFirstSessionContinuation(state, { type: "exit" });
  assert.deepEqual(state, {
    phase: phase.map,
    level1Completed: true,
    mechanicIntroSeen: true,
    level2Completed: false,
    bossTeaseSeen: false,
  });
  assert.equal(transitionFirstSessionContinuation(state, { type: "level2-resume" }).phase, phase.level2);
});

test("invalid states and bypass events fail closed", () => {
  assert.deepEqual(createFirstSessionContinuation({ phase: "unknown", level1Completed: true }), {
    phase: phase.idle,
    level1Completed: false,
    mechanicIntroSeen: false,
    level2Completed: false,
    bossTeaseSeen: false,
  });
  const idle = createFirstSessionContinuation();
  for (const event of [
    null,
    undefined,
    {},
    { type: "level2-complete" },
    { type: "boss-tease-dismiss" },
    { type: "mechanic-intro-start" },
    { type: "unknown", freeText: "drop" },
  ]) {
    const next = transitionFirstSessionContinuation(idle, event);
    assert.deepEqual(next, idle);
    assert.equal(Object.isFrozen(next), true);
  }
});

test("transitions do not mutate state or event payloads", () => {
  const input = { phase: phase.map, level1Completed: true, privateField: "discard" };
  const event = { type: "mechanic-intro-start", privateField: "discard" };
  const inputSnapshot = structuredClone(input);
  const eventSnapshot = structuredClone(event);
  const next = transitionFirstSessionContinuation(
    transitionFirstSessionContinuation(input, { type: "mechanic-intro" }),
    event,
  );
  assert.deepEqual(input, inputSnapshot);
  assert.deepEqual(event, eventSnapshot);
  assert.equal(next.phase, phase.level2);
  assert.equal("privateField" in next, false);
});
