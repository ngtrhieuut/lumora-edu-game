import assert from "node:assert/strict";
import test from "node:test";
import {
  FIRST_SESSION_PHASES,
  beginFirstSessionFlow,
  createFirstSessionFlow,
  transitionFirstSessionFlow,
} from "./firstSessionFlow.js";

const state = (phase, completed = false) => ({ phase, completed });

test("first-session flow starts idle and exposes the canonical phase registry", () => {
  assert.deepEqual(createFirstSessionFlow(), state(FIRST_SESSION_PHASES.idle));
  assert.deepEqual(Object.values(FIRST_SESSION_PHASES), ["idle", "oracle-intro", "numeral", "level-1", "map"]);
  assert.equal(Object.isFrozen(FIRST_SESSION_PHASES), true);
  assert.equal(Object.isFrozen(createFirstSessionFlow()), true);
});

test("supported events follow the first-session flow", () => {
  let flow = beginFirstSessionFlow();
  assert.deepEqual(flow, state(FIRST_SESSION_PHASES.oracleIntro));

  flow = transitionFirstSessionFlow(flow, { type: "oracle-continue" });
  assert.deepEqual(flow, state(FIRST_SESSION_PHASES.numeral));
  flow = transitionFirstSessionFlow(flow, { type: "numeral-complete" });
  assert.deepEqual(flow, state(FIRST_SESSION_PHASES.level1));
  assert.deepEqual(transitionFirstSessionFlow(flow, { type: "level-start" }), state(FIRST_SESSION_PHASES.level1));

  flow = transitionFirstSessionFlow(flow, { type: "level-complete" });
  assert.deepEqual(flow, state(FIRST_SESSION_PHASES.map, true));
  assert.deepEqual(transitionFirstSessionFlow(flow, { type: "reset" }), state(FIRST_SESSION_PHASES.idle));

  flow = transitionFirstSessionFlow(beginFirstSessionFlow(), { type: "oracle-skip" });
  flow = transitionFirstSessionFlow(flow, { type: "exit" });
  assert.deepEqual(flow, state(FIRST_SESSION_PHASES.map));
});

test("transitions are immutable and retain only canonical fields", () => {
  const input = {
    phase: FIRST_SESSION_PHASES.oracleIntro,
    completed: true,
    alias: "child-name",
    nested: { shouldBeDropped: true },
  };
  const event = { type: "oracle-continue", message: "private text" };
  const inputSnapshot = structuredClone(input);
  const eventSnapshot = structuredClone(event);
  const numeral = transitionFirstSessionFlow(input, event);
  const next = transitionFirstSessionFlow(numeral, { type: "numeral-complete" });

  assert.notStrictEqual(next, input);
  assert.deepEqual(input, inputSnapshot);
  assert.deepEqual(event, eventSnapshot);
  assert.deepEqual(numeral, state(FIRST_SESSION_PHASES.numeral));
  assert.deepEqual(next, state(FIRST_SESSION_PHASES.level1));
  assert.equal(Object.isFrozen(next), true);
});

test("malformed state fails closed to a small canonical state", () => {
  assert.deepEqual(
    createFirstSessionFlow({ phase: "unknown", completed: "yes", extra: true }),
    state(FIRST_SESSION_PHASES.idle),
  );
  assert.deepEqual(
    createFirstSessionFlow({ phase: FIRST_SESSION_PHASES.level1, completed: true, extra: true }),
    state(FIRST_SESSION_PHASES.level1),
  );
  assert.deepEqual(
    createFirstSessionFlow({ phase: FIRST_SESSION_PHASES.map, completed: "yes", extra: true }),
    state(FIRST_SESSION_PHASES.map),
  );

  for (const value of [null, undefined, "level-1", [], 7]) {
    assert.deepEqual(createFirstSessionFlow(value), state(FIRST_SESSION_PHASES.idle));
  }
});

test("malformed and unknown events are safe no-ops", () => {
  const flow = transitionFirstSessionFlow(
    transitionFirstSessionFlow(beginFirstSessionFlow(), { type: "oracle-continue" }),
    { type: "numeral-complete" },
  );
  const events = [
    null,
    undefined,
    [],
    "level-complete",
    {},
    { type: 7 },
    { type: "unknown" },
    { type: "begin" },
    { type: "continue" },
    { type: "skip" },
    { type: "cancel" },
  ];

  for (const event of events) {
    const next = transitionFirstSessionFlow(flow, event);
    assert.deepEqual(next, flow);
    assert.equal(Object.isFrozen(next), true);
  }
});
