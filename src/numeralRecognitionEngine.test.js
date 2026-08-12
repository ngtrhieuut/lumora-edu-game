import assert from "node:assert/strict";
import test from "node:test";
import {
  chooseNumeral,
  createNumeralRecognitionState,
  getCurrentNumeralRound,
  getNumeralProgress,
  normalizeNumeralRecognitionState,
} from "./numeralRecognitionEngine.js";

test("numeral recognition starts with three bounded quantity rounds", () => {
  const state = createNumeralRecognitionState();
  const round = getCurrentNumeralRound(state);

  assert.deepEqual(getNumeralProgress(state), { completed: 0, total: 3, mistakes: 0, complete: false });
  assert.deepEqual(round, { id: "round-1", quantity: 3, target: 3, options: [2, 3, 4] });
});

test("wrong numeral soft-fails without advancing the round", () => {
  const result = chooseNumeral(createNumeralRecognitionState(), 2);

  assert.equal(result.accepted, false);
  assert.equal(result.reason, "wrong-numeral");
  assert.equal(result.state.roundIndex, 0);
  assert.equal(result.state.selectedNumeral, 2);
  assert.equal(result.state.mistakes, 1);
  assert.equal(result.complete, false);
});

test("correct numerals advance and complete the bounded prototype", () => {
  let state = createNumeralRecognitionState();

  const first = chooseNumeral(state, 3);
  assert.equal(first.accepted, true);
  assert.equal(first.reason, "recognized");
  assert.deepEqual(first.state.answers, [{ roundId: "round-1", numeral: 3 }]);
  state = first.state;

  state = chooseNumeral(state, 5).state;
  const final = chooseNumeral(state, 7);

  assert.equal(final.accepted, true);
  assert.equal(final.complete, true);
  assert.equal(final.state.roundIndex, 3);
  assert.equal(getCurrentNumeralRound(final.state), null);
  assert.deepEqual(getNumeralProgress(final.state), { completed: 3, total: 3, mistakes: 0, complete: true });
});

test("invalid zone and malformed state fail closed", () => {
  const wrongZone = chooseNumeral(createNumeralRecognitionState(), 3, "other-zone");
  assert.equal(wrongZone.accepted, false);
  assert.equal(wrongZone.reason, "wrong-numeral");

  const normalized = normalizeNumeralRecognitionState({
    rounds: [{ id: "bad", quantity: 4, target: 5, options: [5] }],
    roundIndex: 99,
    mistakes: -2,
    answers: [{ roundId: "bad", numeral: 5 }],
  });
  assert.equal(normalized.rounds.length, 3);
  assert.equal(normalized.roundIndex, 3);
  assert.equal(normalized.mistakes, 0);
  assert.equal(normalized.complete, true);
  assert.deepEqual(normalized.answers, []);
});
