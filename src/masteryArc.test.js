import test from "node:test";
import assert from "node:assert/strict";
import { getMultiStageConfig } from "./gameplayPhases.js";
import { nodes, optionalQuests, worlds } from "./gameData.js";
import {
  createMasteryArcRegistry,
  findMasteryActivity,
  getMasteryArcReport,
  selectFirstSessionContinuationTarget,
  selectMasteryActivities,
} from "./masteryArc.js";

const registry = createMasteryArcRegistry({
  nodeDefinitions: nodes,
  questDefinitions: optionalQuests,
  worldDefinitions: worlds,
  phaseResolver: getMultiStageConfig,
});

test("mastery registry links one skill across main, daily, quest and challenge contexts", () => {
  const matchArc = registry.arcs.find((arc) => arc.skillId === "MATH_G1_MATCH_NUMERAL_QUANTITY");
  assert.ok(matchArc);
  assert.deepEqual(matchArc.activities.map((activity) => activity.context).sort(), ["challenge", "daily", "main", "side"]);
  assert.equal(findMasteryActivity(registry, { activityId: "quest:firefly-pairs" })?.skillId, matchArc.skillId);
  assert.equal(findMasteryActivity(registry, { sourceType: "phase", sourceId: "challenge" })?.context, "challenge");
});

test("registry omits unknown source and preview-world data instead of guessing", () => {
  const isolated = createMasteryArcRegistry({
    nodeDefinitions: [
      { id: "known", index: 0, type: "match", skillId: "SKILL_KNOWN", prerequisites: [] },
      { id: "orphan", index: 1, type: "rune", skillId: "SKILL_ORPHAN", prerequisites: ["known"] },
    ],
    questDefinitions: [{ id: "bad-quest", kind: "side", skillId: "SKILL_BAD", sourceNodeId: "missing" }],
    worldDefinitions: [
      { id: "world-1", availability: "playable", nodeIds: ["known"] },
      { id: "world-2", availability: "preview", nodeIds: ["orphan"] },
    ],
  });
  assert.deepEqual(isolated.activities.map((activity) => activity.nodeId), ["known", "known"]);
  assert.equal(isolated.activities.some((activity) => activity.skillId === "SKILL_ORPHAN"), false);
  assert.equal(Object.isFrozen(isolated), true);

  const duplicate = createMasteryArcRegistry({
    nodeDefinitions: [{ id: "shared", index: 0, type: "match", skillId: "SKILL_SHARED", prerequisites: [] }],
    worldDefinitions: [
      { id: "world-a", availability: "playable", nodeIds: ["shared"] },
      { id: "world-b", availability: "playable", nodeIds: ["shared"] },
    ],
  });
  assert.equal(duplicate.activities.length, 0);
});

test("first-session continuation target is selected from ordered registry data", () => {
  assert.equal(selectFirstSessionContinuationTarget(registry, { worldId: "forest-awakening", progress: { completed: [] } }), null);
  const target = selectFirstSessionContinuationTarget(registry, {
    worldId: "forest-awakening",
    progress: { completed: ["collect"] },
  });
  assert.equal(target?.nodeId, "match");
  assert.equal(selectFirstSessionContinuationTarget(registry, {
    worldId: "forest-awakening",
    progress: { completed: ["collect", "match"] },
  }), null);
});

test("daily selection is deterministic, weak-skill first, and world-isolated", () => {
  const progress = {
    completed: ["collect", "match", "bridge"],
    learningMetrics: {
      MATH_G1_COUNT_10: { bestMastery: 1, totalAttempts: 2, supportsUsed: 1 },
      MATH_G1_MATCH_NUMERAL_QUANTITY: { bestMastery: 3, totalAttempts: 4, supportsUsed: 0 },
      MATH_G1_ADD_VISUAL: { bestMastery: 2, totalAttempts: 3, supportsUsed: 1 },
    },
  };
  const first = selectMasteryActivities(registry, progress, { context: "daily", worldId: "forest-awakening", limit: 3 });
  const second = selectMasteryActivities(registry, progress, { context: "daily", worldId: "forest-awakening", limit: 3 });
  assert.deepEqual(first.map((activity) => activity.id), second.map((activity) => activity.id));
  assert.equal(first[0]?.nodeId, "collect");
  assert.equal(first.every((activity) => activity.worldId === "forest-awakening"), true);
  assert.equal(selectMasteryActivities(registry, progress, { context: "daily", worldId: "missing-world" }).length, 0);
});

test("arc report records transfer evidence without calling it a diagnosis", () => {
  const progress = {
    learningMetrics: { MATH_G1_MATCH_NUMERAL_QUANTITY: { bestMastery: 2, totalAttempts: 2, supportsUsed: 1 } },
    activityHistory: [
      { nodeId: "match", skillId: "MATH_G1_MATCH_NUMERAL_QUANTITY", activityId: "main:match", mastery: 2, attempts: 1, supportsUsed: 1, mode: "adventure" },
      { nodeId: "match", skillId: "MATH_G1_MATCH_NUMERAL_QUANTITY", activityId: "daily:match", mastery: 3, attempts: 1, supportsUsed: 0, mode: "practice" },
    ],
  };
  const report = getMasteryArcReport(registry, progress, { worldId: "forest-awakening" });
  const match = report.arcs.find((arc) => arc.skillId === "MATH_G1_MATCH_NUMERAL_QUANTITY");
  assert.deepEqual(match.observedContexts.sort(), ["daily", "main"]);
  assert.equal(match.transferReady, true);
  assert.equal(match.bestMastery, 3);
  assert.equal(match.attempts, 2);
});

test("malformed activity identity cannot manufacture transfer evidence", () => {
  const report = getMasteryArcReport(registry, {
    activityHistory: [
      { nodeId: "hacker", skillId: "MATH_G1_MATCH_NUMERAL_QUANTITY", activityId: "main:match", activityContext: "main", mastery: 3, attempts: 1 },
      { nodeId: "match", skillId: "MATH_G1_MATCH_NUMERAL_QUANTITY", activityId: "daily:match", activityContext: "side", mastery: 3, attempts: 1 },
    ],
  }, { worldId: "forest-awakening" });
  const match = report.arcs.find((arc) => arc.skillId === "MATH_G1_MATCH_NUMERAL_QUANTITY");
  assert.deepEqual(match.observedContexts, []);
  assert.equal(match.transferReady, false);
});
