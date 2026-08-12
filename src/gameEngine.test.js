import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createInitialProgress,
  normalizeProgress,
  isNodeUnlocked,
  recordLevelResult,
  recordPracticeSessionCompletion,
  getNodeOutcome,
  getXpReward,
} from "./gameEngine.js";

const NODES = ["collect", "match", "bridge", "path", "subtract", "sort", "shape", "rune", "scenario", "mixed", "challenge", "boss"];

const result = (overrides = {}) => ({
  nodeId: "collect",
  skillId: "collect",
  reward: 3,
  attempts: 1,
  supportsUsed: 0,
  guided: false,
  actions: 5,
  completedAt: "2026-08-10T00:00:00.000Z",
  isBoss: false,
  ...overrides,
});

// Invariant 1: first clear grants reward exactly once; replay grants 0 and increments replays.
test("first clear grants reward exactly once, replay grants 0 shards and increments replays", () => {
  const p0 = createInitialProgress();
  const p1 = recordLevelResult(p0, result());
  assert.equal(p1.shards, 3);
  assert.deepEqual(p1.completed, ["collect"]);
  assert.equal(p1.gameplayMetrics.replays, 0);

  const p2 = recordLevelResult(p1, result({ reward: 99, supportsUsed: 2 }));
  assert.equal(p2.shards, 3, "replay must not add reward");
  assert.deepEqual(p2.completed, ["collect"], "completed list unchanged on replay");
  assert.equal(p2.gameplayMetrics.replays, 1);
  assert.equal(p2.shards, 3, "even inflated reward on replay must be ignored");
});

test("XP is granted once on first clear and scales with mastery without replacing shards", () => {
  const independent = recordLevelResult(createInitialProgress(), result());
  const guided = recordLevelResult(createInitialProgress(), result({ guided: true, supportsUsed: 2 }));
  assert.equal(independent.xp, 45, "reward 3 gives 30 base XP plus mastery 3 bonus");
  assert.equal(guided.xp, 35, "guided completion keeps base XP and receives the bounded mastery 1 bonus");
  const replay = recordLevelResult(independent, result({ reward: 99, supportsUsed: 0 }));
  assert.equal(replay.xp, independent.xp, "replay must not farm XP");
  assert.equal(getXpReward({ reward: 12, mastery: 3 }), 135);
  assert.equal(getXpReward({ reward: 12, mastery: 3, firstClear: false }), 0);
});

test("energy follows node categories on first clear and never farms on replay", () => {
  const independent = recordLevelResult(createInitialProgress(), result({ energyTypes: ["logic", "mastery"] }));
  assert.deepEqual(independent.energies, { logic: 2, nature: 0, discovery: 0, mastery: 2 });

  const replay = recordLevelResult(independent, result({ reward: 99, energyTypes: ["logic", "discovery", "nature"] }));
  assert.deepEqual(replay.energies, independent.energies, "replay must not farm energy");

  const supported = recordLevelResult(createInitialProgress(), result({ supportsUsed: 1, energyTypes: ["logic", "mastery"] }));
  assert.deepEqual(supported.energies, { logic: 1, nature: 0, discovery: 0, mastery: 1 });
});

// Invariant 2: asking for support never reduces shard reward.
test("support never reduces the shard reward", () => {
  const pHelp = recordLevelResult(createInitialProgress(), result({ supportsUsed: 3, guided: false }));
  const pNoHelp = recordLevelResult(createInitialProgress(), result({ supportsUsed: 0 }));
  assert.equal(pHelp.shards, 3);
  assert.equal(pNoHelp.shards, 3);
  assert.equal(pHelp.shards, pNoHelp.shards);
});

// Invariant 3: guided -> mastery 1, supported non-guided -> 2, independent -> 3.
test("mastery: guided=1, supported non-guided=2, independent=3", () => {
  const pGuided = recordLevelResult(createInitialProgress(), result({ guided: true, supportsUsed: 4 }));
  assert.equal(pGuided.learningMetrics.collect.bestMastery, 1);
  assert.equal(pGuided.learningMetrics.collect.guidedCompletions, 1);

  const pSupported = recordLevelResult(createInitialProgress(), result({ supportsUsed: 1 }));
  assert.equal(pSupported.learningMetrics.collect.bestMastery, 2);

  const pIndependent = recordLevelResult(createInitialProgress(), result({ supportsUsed: 0 }));
  assert.equal(pIndependent.learningMetrics.collect.bestMastery, 3);
});

// Invariant 4: best mastery never decreases on replay.
test("best mastery never decreases on replay", () => {
  let p = recordLevelResult(createInitialProgress(), result({ guided: true })); // 1
  p = recordLevelResult(p, result({ supportsUsed: 0 })); // 3, replays
  assert.equal(p.learningMetrics.collect.bestMastery, 3);
  p = recordLevelResult(p, result({ guided: true })); // would be 1, but best is 3
  assert.equal(p.learningMetrics.collect.bestMastery, 3, "guided replay must not drop mastery");
  assert.equal(p.gameplayMetrics.replays, 2);
});

// Invariant 5: boss first clear sets nubiStage = 2.
test("boss first clear sets nubiStage = 2", () => {
  let p = createInitialProgress();
  for (const id of NODES) {
    if (id === "boss") continue;
    p = recordLevelResult(p, result({ nodeId: id, skillId: id, reward: 4, isBoss: false }));
  }
  assert.equal(p.nubiStage, 1, "nubiStage unchanged before boss");
  p = recordLevelResult(p, result({ nodeId: "boss", skillId: "boss", reward: 12, isBoss: true }));
  assert.equal(p.nubiStage, 2);
  p = recordLevelResult(p, result({ nodeId: "boss", skillId: "boss", reward: 12, isBoss: true }));
  assert.equal(p.nubiStage, 2, "stays 2 on boss replay");
});

// Invariant 6: sequential unlock + tolerates corrupted/missing data.
test("sequential unlock: nothing open at start, next node opens after completion", () => {
  const p = createInitialProgress();
  assert.equal(isNodeUnlocked("collect", NODES, p), true, "first node starts unlocked");
  assert.equal(isNodeUnlocked("match", NODES, p), false);
  assert.equal(isNodeUnlocked("boss", NODES, p), false);
  assert.equal(isNodeUnlocked("unknown", NODES, p), false, "unknown node never unlocks");

  const p1 = recordLevelResult(p, result());
  assert.equal(isNodeUnlocked("match", NODES, p1), true);
  assert.equal(isNodeUnlocked("bridge", NODES, p1), false);
  assert.equal(isNodeUnlocked("collect", NODES, p1), true, "completed node stays replayable");
});

test("unlock tolerates corrupt/missing progress", () => {
  assert.equal(isNodeUnlocked("match", NODES, null), false);
  assert.equal(isNodeUnlocked("match", NODES, "garbage"), false);
  assert.equal(isNodeUnlocked("collect", NODES, "garbage"), true, "first node unlocked even on corrupt data");
  assert.equal(isNodeUnlocked("match", NODES, { completed: "not-an-array" }), false);
  assert.equal(isNodeUnlocked("match", NODES, { completed: ["collect"] }), true);
  assert.equal(isNodeUnlocked("match", NODES), false, "missing progress argument");
});

// Invariant 7: normalizeProgress strips unknown ids, clamps counters, migrates v1.
test("normalizeProgress strips unknown completed ids", () => {
  const p = normalizeProgress({ completed: ["collect", "collect", "hacker-level", "boss"], shards: 5 }, NODES);
  assert.deepEqual(p.completed, ["collect"], "non-contiguous completion is reduced to a valid prefix");
});

test("normalizeProgress never unlocks a skipped persisted node", () => {
  const p = normalizeProgress({ completed: ["boss"], learningMetrics: {}, gameplayMetrics: {} }, NODES);
  assert.deepEqual(p.completed, []);
  assert.equal(isNodeUnlocked("boss", NODES, p), false);
});

test("normalizeProgress clamps negative/non-finite counters", () => {
  const p = normalizeProgress(
    {
      completed: [],
      shards: -50,
      xp: -500,
      nubiStage: -3,
      learningMetrics: {
        collect: { completions: -1, totalAttempts: -2, supportsUsed: 1.5, guidedCompletions: -9, bestMastery: 99 },
      },
      gameplayMetrics: { sessionsCompleted: -1, replays: -4, totalActions: -7 },
    },
    NODES,
  );
  assert.equal(p.shards, 0);
  assert.equal(p.xp, 0);
  assert.equal(p.nubiStage, 1);
  const m = p.learningMetrics.collect;
  assert.equal(m.completions, 0);
  assert.equal(m.totalAttempts, 0);
  assert.equal(m.supportsUsed, 1, "1.5 truncates to 1");
  assert.equal(m.guidedCompletions, 0);
  assert.equal(m.bestMastery, 3, "99 clamps to 3");
  assert.deepEqual(p.gameplayMetrics, { sessionsCompleted: 0, replays: 0, totalActions: 0 });
});

test("normalizeProgress preserves XP and v1 migration reads legacy XP safely", () => {
  assert.equal(normalizeProgress({ completed: [], shards: 2, xp: 77, learningMetrics: {}, gameplayMetrics: {} }, NODES).xp, 77);
  assert.equal(normalizeProgress({ completed: [], shards: 2, xp: 33, mastery: {} }, NODES).xp, 33);
  assert.equal(normalizeProgress({ completed: [], xp: "child@example.com", mastery: {} }, NODES).xp, 0);
});

test("normalizeProgress preserves bounded energy and accepts the legacy singular alias", () => {
  const canonical = normalizeProgress({ completed: [], learningMetrics: {}, gameplayMetrics: {}, energies: { logic: 4.9, mastery: -2, unknown: 99 } }, NODES);
  assert.deepEqual(canonical.energies, { logic: 4, nature: 0, discovery: 0, mastery: 0 });
  const legacy = normalizeProgress({ completed: [], learningMetrics: {}, gameplayMetrics: {}, energy: { discovery: 3 } }, NODES);
  assert.deepEqual(legacy.energies, { logic: 0, nature: 0, discovery: 3, mastery: 0 });
});

test("normalizeProgress migrates the v1 shape", () => {
  const v1 = {
    completed: ["collect", "match", "bogus"],
    shards: 7,
    xp: 100,
    mastery: { collect: 3, match: 1, bogus: 3 },
    attempts: 4,
    hints: 2,
    nubiStage: 2,
    lastPlayedAt: "2026-01-01T00:00:00.000Z",
  };
  const p = normalizeProgress(v1, NODES);
  assert.deepEqual(p.completed, ["collect", "match"]);
  assert.equal(p.shards, 7);
  assert.equal(p.nubiStage, 2);
  assert.equal(p.lastPlayedAt, "2026-01-01T00:00:00.000Z");
  assert.equal(p.learningMetrics.collect.bestMastery, 3);
  assert.equal(p.learningMetrics.collect.completions, 1);
  assert.equal(p.learningMetrics.match.bestMastery, 1);
  assert.equal(p.learningMetrics.bogus, undefined, "unknown mastery dropped");
});

test("normalizeProgress returns clean defaults for garbage input", () => {
  for (const junk of [null, undefined, 42, "text", [], [1, 2]]) {
    const p = normalizeProgress(junk, NODES);
    assert.deepEqual(p, createInitialProgress(), `junk input ${JSON.stringify(junk)}`);
  }
});

// getNodeOutcome
test("getNodeOutcome returns the node outcome even when skillId differs from nodeId", () => {
  assert.equal(getNodeOutcome(createInitialProgress(), "collect"), null);
  const p = recordLevelResult(createInitialProgress(), result({ skillId: "MATH_G1_COUNT_10", supportsUsed: 1 }));
  const outcome = getNodeOutcome(p, "collect");
  assert.equal(outcome.skillId, "MATH_G1_COUNT_10");
  assert.equal(outcome.nodeId, "collect");
  assert.equal(outcome.mastery, 2);
  assert.equal(outcome.attempts, 1);
});

// recordLevelResult input validation
test("recordLevelResult throws on missing/invalid nodeId", () => {
  assert.throws(() => recordLevelResult(createInitialProgress(), {}), TypeError);
  assert.throws(() => recordLevelResult(createInitialProgress(), null), TypeError);
  assert.throws(() => recordLevelResult(createInitialProgress(), { nodeId: 7 }), TypeError);
});

test("recordLevelResult defaults missing result fields safely", () => {
  const p = recordLevelResult(createInitialProgress(), { nodeId: "collect" });
  assert.equal(p.shards, 0, "missing reward defaults to 0");
  assert.equal(p.gameplayMetrics.totalActions, 0);
  assert.equal(p.learningMetrics.collect.totalAttempts, 1);
  assert.equal(p.learningMetrics.collect.bestMastery, 3, "independent by default");
  assert.equal(p.nubiStage, 1, "not a boss by default");
});

test("recordLevelResult appends a bounded, privacy-safe activity record", () => {
  let p = recordLevelResult(createInitialProgress(), result({
    skillId: "MATH_G1_COUNT_10",
    durationSeconds: 83.9,
    mode: "practice",
    supportsUsed: 1,
  }));
  assert.deepEqual(p.activityHistory[0], {
    nodeId: "collect",
    skillId: "MATH_G1_COUNT_10",
    mastery: 2,
    attempts: 1,
    supportsUsed: 1,
    guided: false,
    actions: 5,
    durationSeconds: 83,
    firstClear: true,
    mode: "practice",
    completedAt: "2026-08-10T00:00:00.000Z",
  });

  for (let index = 0; index < 95; index += 1) {
    p = recordLevelResult(p, result({ completedAt: `2026-08-10T00:${String(index % 60).padStart(2, "0")}:00.000Z` }));
  }
  assert.equal(p.activityHistory.length, 90);
});

test("optional quest activity modes remain distinct from main adventure and practice", () => {
  const side = recordLevelResult(createInitialProgress(), result({ mode: "side-quest" }));
  assert.equal(side.activityHistory.at(-1).mode, "side-quest");
  const secret = recordLevelResult(createInitialProgress(), result({ mode: "secret-quest" }));
  assert.equal(secret.activityHistory.at(-1).mode, "secret-quest");
  const malformed = normalizeProgress({ ...createInitialProgress(), activityHistory: [{ nodeId: "collect", mode: "private-mode", completedAt: null }] });
  assert.equal(malformed.activityHistory.at(-1).mode, "adventure");
});

test("daily and optional contexts do not overwrite the canonical node outcome", () => {
  const main = recordLevelResult(createInitialProgress(), result({ activityId: "main:collect", activityContext: "main" }));
  const side = recordLevelResult(main, result({ mode: "side-quest", activityId: "quest:side", activityContext: "side", supportsUsed: 2 }));
  const daily = recordLevelResult(side, result({ mode: "practice", activityId: "daily:collect", activityContext: "daily", supportsUsed: 1 }));

  assert.equal(side.nodeOutcomes.collect.activityId, "main:collect");
  assert.equal(side.nodeOutcomes.collect.activityContext, "main");
  assert.equal(daily.nodeOutcomes.collect.activityId, "main:collect");
  assert.deepEqual(daily.activityHistory.slice(-2).map((entry) => entry.activityContext), ["side", "daily"]);
});

test("normalizeProgress repairs activity and practice metrics", () => {
  const p = normalizeProgress({
    ...createInitialProgress(),
    practiceMetrics: { sessionsCompleted: -2, challengesCompleted: 4.8, totalSeconds: Infinity, lastCompletedAt: "bad" },
    activityHistory: [null, { nodeId: "collect", mastery: 99, attempts: -2, durationSeconds: 999999, completedAt: "bad" }],
    cityState: { selectedBuildingId: 42, equippedCosmeticId: "number-crown" },
  }, NODES);
  assert.equal(p.practiceMetrics.sessionsCompleted, 0);
  assert.equal(p.practiceMetrics.challengesCompleted, 4);
  assert.equal(p.practiceMetrics.totalSeconds, 0);
  assert.equal(p.practiceMetrics.lastCompletedAt, null);
  assert.equal(p.activityHistory.length, 1);
  assert.equal(p.activityHistory[0].mastery, 3);
  assert.equal(p.activityHistory[0].attempts, 1);
  assert.equal(p.activityHistory[0].durationSeconds, 4 * 60 * 60);
  assert.equal(p.activityHistory[0].completedAt, null);
  assert.deepEqual(p.cityState, { selectedBuildingId: null, equippedCosmeticId: "number-crown" });
});

test("recordPracticeSessionCompletion updates summary without adding shards", () => {
  const p = recordPracticeSessionCompletion(createInitialProgress(), {
    challengesCompleted: 3,
    independentChallenges: 2,
    supportedChallenges: 1,
    discoveryCompleted: true,
    totalSeconds: 245,
  }, "2026-08-10T12:00:00.000Z");
  assert.equal(p.practiceMetrics.sessionsCompleted, 1);
  assert.equal(p.practiceMetrics.challengesCompleted, 3);
  assert.equal(p.practiceMetrics.independentChallenges, 2);
  assert.equal(p.practiceMetrics.supportedChallenges, 1);
  assert.equal(p.practiceMetrics.discoveryActivitiesCompleted, 1);
  assert.equal(p.practiceMetrics.totalSeconds, 245);
  assert.equal(p.practiceMetrics.lastCompletedAt, "2026-08-10T12:00:00.000Z");
  assert.equal(p.shards, 0);
});
