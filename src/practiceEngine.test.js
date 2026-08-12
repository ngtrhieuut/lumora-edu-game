import assert from "node:assert/strict";
import { test } from "node:test";
import {
  advancePracticeSession,
  buildPracticeQueue,
  createPracticeSession,
  isPracticeSessionComplete,
  summarizePracticeSession,
} from "./practiceEngine.js";

const NODES = [
  { id: "collect", index: 1, type: "collect", skillId: "count" },
  { id: "match", index: 2, type: "match", skillId: "count" },
  { id: "bridge", index: 3, type: "bridge", skillId: "addition" },
  { id: "path", index: 4, type: "path", skillId: "path-addition" },
  { id: "mixed", index: 5, type: "mixed", skillId: "mixed" },
  { id: "challenge", index: 6, type: "challenge", skillId: "challenge" },
  { id: "boss", index: 7, type: "boss", skillId: "boss" },
];

test("practice queue returns no candidates when nothing eligible is completed", () => {
  assert.deepEqual(buildPracticeQueue({ completed: [] }, NODES, { dateKey: "2026-08-10" }), []);
  assert.deepEqual(
    buildPracticeQueue({ completed: ["mixed", "challenge", "boss"] }, NODES, { dateKey: "2026-08-10" }),
    [],
  );
  assert.deepEqual(buildPracticeQueue(null, null), []);
});

test("practice queue puts the weakest skill first and uses all ranking tie-breakers", () => {
  const progress = {
    completed: ["collect", "match", "bridge", "path"],
    learningMetrics: {
      count: { bestMastery: 3, supportsUsed: 0, totalAttempts: 1 },
      addition: { bestMastery: 1, supportsUsed: 2, totalAttempts: 2 },
      "path-addition": { bestMastery: 1, supportsUsed: 1, totalAttempts: 4 },
    },
  };

  const queue = buildPracticeQueue(progress, NODES, { dateKey: "2026-08-10" });
  assert.equal(queue.length, 3);
  assert.equal(queue[0], "bridge", "lower mastery wins before support rate");

  const tieProgress = {
    completed: ["collect", "match", "bridge"],
    learningMetrics: {
      count: { bestMastery: 1, supportsUsed: 1, totalAttempts: 2 },
      addition: { bestMastery: 1, supportsUsed: 1, totalAttempts: 2 },
    },
  };
  assert.equal(
    buildPracticeQueue(tieProgress, NODES, { dateKey: "2026-08-10" })[0],
    "collect",
    "node index resolves equal mastery, support rate, and attempts",
  );
});

test("practice queue date rotation is deterministic and avoids duplicates before cycling", () => {
  const progress = {
    completed: ["collect", "match", "bridge", "path"],
    learningMetrics: {
      count: { bestMastery: 1, supportsUsed: 0, totalAttempts: 1 },
      addition: { bestMastery: 2, supportsUsed: 0, totalAttempts: 1 },
      "path-addition": { bestMastery: 3, supportsUsed: 0, totalAttempts: 1 },
    },
  };
  const progressBefore = structuredClone(progress);
  const nodesBefore = structuredClone(NODES);

  const first = buildPracticeQueue(progress, NODES, { dateKey: "2026-08-10" });
  assert.deepEqual(buildPracticeQueue(progress, NODES, { dateKey: "2026-08-10" }), first);
  assert.notDeepEqual(
    buildPracticeQueue(progress, NODES, { dateKey: "2026-08-12" }),
    first,
    "a different date rotates the remaining picks",
  );
  assert.deepEqual(progress, progressBefore, "queue building does not mutate progress");
  assert.deepEqual(NODES, nodesBefore, "queue building does not mutate node definitions");

  const one = buildPracticeQueue({ completed: ["collect"] }, NODES, { dateKey: "2026-08-10" });
  assert.deepEqual(one, ["collect", "collect", "collect"]);

  const two = buildPracticeQueue({ completed: ["collect", "match"] }, NODES, { dateKey: "2026-08-10" });
  assert.equal(two.length, 3);
  assert.equal(new Set(two.slice(0, 2)).size, 2, "both candidates are used before repetition");
  assert.equal(two[2], two[0], "cycling resumes at the first selected candidate");
});

test("practice session lifecycle normalizes results and preserves inputs", () => {
  const queue = ["collect", "match", "bridge"];
  const session = createPracticeSession(queue, { startedAt: "2026-08-10T12:34:56Z" });
  assert.deepEqual(queue, ["collect", "match", "bridge"]);
  assert.deepEqual(session.queue, queue);
  assert.equal(session.startedAt, "2026-08-10T12:34:56.000Z");
  assert.equal(session.id, createPracticeSession(queue, { startedAt: "2026-08-10T12:34:56Z" }).id);
  assert.equal(isPracticeSessionComplete(session), false);

  const first = advancePracticeSession(session, {
    nodeId: "collect",
    skillId: "count",
    mastery: 99,
    supportsUsed: -2,
    attempts: 0,
    durationSeconds: -5,
    ignored: "field",
  });
  assert.notStrictEqual(first, session);
  assert.deepEqual(first.completed, [
    { nodeId: "collect", skillId: "count", mastery: 3, supportsUsed: 0, attempts: 1, durationSeconds: 0 },
  ]);
  assert.equal(first.currentIndex, 1);
  assert.deepEqual(session.completed, [], "advancing does not mutate the prior session");

  const mismatch = advancePracticeSession(first, { nodeId: "bridge", mastery: 2 });
  assert.notStrictEqual(mismatch, first);
  assert.deepEqual(mismatch, first);

  const second = advancePracticeSession(first, {
    nodeId: "match",
    skillId: "count",
    mastery: 2,
    supportsUsed: 1,
    attempts: 2,
    durationSeconds: 10.5,
  });
  const third = advancePracticeSession(second, {
    nodeId: "bridge",
    skillId: "addition",
    mastery: 1,
    supportsUsed: 0,
    attempts: 1,
    durationSeconds: 7,
  });
  assert.equal(isPracticeSessionComplete(third), true);
  assert.deepEqual(summarizePracticeSession(third), {
    challengesCompleted: 3,
    uniqueSkillsPracticed: 2,
    independentChallenges: 2,
    supportedChallenges: 1,
    totalSeconds: 17.5,
    averageMastery: 2,
  });
});

test("practice helpers safely handle malformed values", () => {
  assert.equal(createPracticeSession([null, 7, "", "  "]), null);
  assert.deepEqual(createPracticeSession(["collect", 7, "match", "bridge", "extra"]), {
    id: "practice-unscheduled",
    queue: ["collect", "match", "bridge"],
    currentIndex: 0,
    completed: [],
    startedAt: null,
  });
  assert.equal(isPracticeSessionComplete(null), false);
  assert.deepEqual(summarizePracticeSession({ completed: [null, 7, {}] }), {
    challengesCompleted: 0,
    uniqueSkillsPracticed: 0,
    independentChallenges: 0,
    supportedChallenges: 0,
    totalSeconds: 0,
    averageMastery: 0,
  });
});
