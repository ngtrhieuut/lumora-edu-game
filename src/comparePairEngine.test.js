import test from "node:test";
import assert from "node:assert/strict";
import {
  answerComparePair,
  createComparePairState,
  getComparePairObjectSize,
  getComparePairProgress,
  getCurrentComparePair,
  getExpectedComparePairObjectId,
  normalizeComparePairState,
} from "./comparePairEngine.js";

test("comparison prototype exposes alternating pair targets", () => {
  const state = createComparePairState();
  assert.deepEqual(getCurrentComparePair(state), { id: "round-1", left: "small", right: "large", target: "larger" });
  assert.equal(getExpectedComparePairObjectId(state), "right");
  assert.equal(getComparePairObjectSize(state, "left"), "small");
  assert.equal(getComparePairObjectSize(state, "right"), "large");
  assert.deepEqual(getComparePairProgress(state), { completed: 0, total: 3, mistakes: 0, complete: false });
});
test("wrong pairwise answer soft-fails without losing a completed round", () => {
  const start = createComparePairState();
  const wrong = answerComparePair(start, "left", "larger");
  assert.equal(wrong.accepted, false);
  assert.equal(wrong.reason, "compare-mismatch");
  assert.equal(wrong.state.roundIndex, 0);
  assert.equal(wrong.state.mistakes, 1);
  assert.equal(wrong.state.selectedObjectId, "left");
});

test("correct comparison advances through all bounded rounds", () => {
  let state = createComparePairState();
  let result = answerComparePair(state, "right", "larger");
  assert.equal(result.accepted, true);
  state = result.state;
  assert.equal(getCurrentComparePair(state).target, "smaller");

  result = answerComparePair(state, "right", "smaller");
  assert.equal(result.accepted, true);
  state = result.state;
  assert.equal(getExpectedComparePairObjectId(state), "right");

  result = answerComparePair(state, "right", "larger");
  assert.equal(result.accepted, true);
  assert.equal(result.complete, true);
  assert.equal(result.state.answers.length, 3);
  assert.deepEqual(getComparePairProgress(result.state), { completed: 3, total: 3, mistakes: 0, complete: true });
});

test("normalization keeps malformed comparison state bounded", () => {
  const state = normalizeComparePairState({
    roundIndex: 99,
    selectedObjectId: "hacker",
    mistakes: -1,
    answers: [{ roundId: "unknown", objectId: "left", zoneId: "larger" }],
  });
  assert.equal(state.roundIndex, 3);
  assert.equal(state.selectedObjectId, null);
  assert.equal(state.mistakes, 0);
  assert.deepEqual(state.answers, []);
  assert.equal(state.complete, true);
});
