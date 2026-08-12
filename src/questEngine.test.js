import assert from "node:assert/strict";
import { test } from "node:test";
import { createInitialQuestState, getQuestStatus, normalizeQuestState, recordQuestCompletion } from "./questEngine.js";

const IDS = ["side-one", "secret-one"];
const SIDE = { id: "side-one", kind: "side", prerequisites: ["match"], discoveryPrerequisites: [] };
const SECRET = { id: "secret-one", kind: "secret", prerequisites: ["rune"], discoveryPrerequisites: ["shape", "rune"] };

test("quest state normalization is defensive, canonical, and strips unknown ids", () => {
  assert.deepEqual(normalizeQuestState(null, IDS), createInitialQuestState());
  const normalized = normalizeQuestState({
    completedIds: ["side-one", "side-one", "unknown"],
    discoveredIds: ["secret-one", "unknown"],
    metrics: { "side-one": { completions: -2, totalAttempts: 3.8, supportsUsed: Infinity, bestMastery: 9 }, unknown: { completions: 4 } },
  }, IDS);
  assert.deepEqual(normalized.completedIds, ["side-one"]);
  assert.deepEqual(normalized.discoveredIds, ["secret-one", "side-one"]);
  assert.deepEqual(normalized.metrics["side-one"], { questId: "side-one", completions: 0, totalAttempts: 3, supportsUsed: 0, bestMastery: 3 });
  assert.equal("unknown" in normalized.metrics, false);
});

test("side quests are visible while secret quests require discovery prerequisites", () => {
  assert.equal(getQuestStatus(SIDE, { completed: [] }, null), "locked");
  assert.equal(getQuestStatus(SIDE, { completed: ["match"] }, null), "available");
  assert.equal(getQuestStatus(SECRET, { completed: ["rune"] }, null), "hidden");
  assert.equal(getQuestStatus(SECRET, { completed: ["shape", "rune"] }, null), "available");
  assert.equal(getQuestStatus(SECRET, { completed: ["shape", "rune"] }, { completedIds: ["secret-one"] }), "completed");
});

test("recording first completion and replay is immutable and mastery never decreases", () => {
  const initial = createInitialQuestState();
  const first = recordQuestCompletion(initial, SIDE, { attempts: 3, supportsUsed: 1, mastery: 3 });
  assert.deepEqual(initial, createInitialQuestState());
  assert.deepEqual(first.completedIds, ["side-one"]);
  assert.deepEqual(first.discoveredIds, ["side-one"]);
  assert.deepEqual(first.metrics["side-one"], { questId: "side-one", completions: 1, totalAttempts: 3, supportsUsed: 1, bestMastery: 3 });
  const replay = recordQuestCompletion(first, SIDE, { attempts: 2, supportsUsed: 2, mastery: 1 });
  assert.deepEqual(replay.metrics["side-one"], { questId: "side-one", completions: 2, totalAttempts: 5, supportsUsed: 3, bestMastery: 3 });
  assert.equal(first.metrics["side-one"].completions, 1);
});

test("recordQuestCompletion rejects invalid quests and clamps malformed result values", () => {
  assert.throws(() => recordQuestCompletion({}, null), TypeError);
  assert.throws(() => recordQuestCompletion({}, { id: "" }), TypeError);
  const state = recordQuestCompletion({}, SECRET, { attempts: -4, supportsUsed: -1, mastery: Number.NaN });
  assert.deepEqual(state.metrics["secret-one"], { questId: "secret-one", completions: 1, totalAttempts: 1, supportsUsed: 0, bestMastery: 0 });
});

test("completing another quest preserves all prior quest state in the registry", () => {
  const first = recordQuestCompletion({}, SIDE, { attempts: 1, mastery: 2 }, IDS);
  const second = recordQuestCompletion(first, SECRET, { attempts: 2, mastery: 3 }, IDS);
  assert.deepEqual(second.completedIds, ["side-one", "secret-one"]);
  assert.deepEqual(second.discoveredIds, ["side-one", "secret-one"]);
  assert.equal(second.metrics["side-one"].completions, 1);
  assert.equal(second.metrics["secret-one"].completions, 1);
});
