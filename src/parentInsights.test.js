import assert from "node:assert/strict";
import { test } from "node:test";
import { getActivityWindow, getLatestLearningProof, getMasteryTrend, rankSkillInsights, summarizeLearningActivity } from "./parentInsights.js";

const NOW = "2026-08-10T12:00:00.000Z";

test("activity window is inclusive, sorted, immutable, and ignores malformed/future dates", () => {
  const progress = { activityHistory: [
    { nodeId: "b", skillId: "b", completedAt: NOW, durationSeconds: 60 },
    { nodeId: "old", completedAt: "2026-08-03T11:59:59.999Z" },
    { nodeId: "a", skillId: "a", completedAt: "2026-08-03T12:00:00.000Z", durationSeconds: 30 },
    { nodeId: "bad", completedAt: "bad" },
    { nodeId: "future", completedAt: "2026-08-11T00:00:00.000Z" },
  ] };
  const before = structuredClone(progress);
  const records = getActivityWindow(progress, { now: NOW, days: 7 });
  assert.deepEqual(records.map((item) => item.nodeId), ["a", "b"]);
  records[0].nodeId = "changed";
  assert.deepEqual(progress, before);
});

test("learning summary clamps malformed values and separates supported sessions", () => {
  const summary = summarizeLearningActivity({ activityHistory: [
    { skillId: "count", completedAt: NOW, durationSeconds: 61, supportsUsed: 0, firstClear: true },
    { skillId: "count", completedAt: NOW, durationSeconds: -8, supportsUsed: 1 },
    { skillId: "shape", completedAt: NOW, durationSeconds: Infinity, guided: true },
  ] }, { now: NOW });
  assert.deepEqual(summary, { totalSeconds: 61, totalMinutesRounded: 1, sessions: 3, uniqueSkills: 2, independentSessions: 1, supportedSessions: 2, firstClears: 1 });
});

test("latest learning proof joins a local outcome to the canonical node objective", () => {
  const progress = {
    activityHistory: [
      { nodeId: "unknown", skillId: "unknown", mastery: 3, completedAt: NOW },
      { nodeId: "collect", skillId: "count", mastery: 2, attempts: 3, supportsUsed: 1, durationSeconds: 83, firstClear: true, mode: "adventure", completedAt: NOW },
    ],
    nodeOutcomes: { collect: { mastery: 2, attempts: 3, supportsUsed: 1, completedAt: NOW } },
  };
  const nodes = [{ id: "collect", icon: "✦", title: "Bãi Hạt Sáng", skillId: "count", skillNameVi: "Đếm số lượng", objectiveVi: "Nhận biết và đếm đúng số lượng hạt." }];
  const proof = getLatestLearningProof(progress, nodes, { now: NOW });

  assert.deepEqual(proof, {
    nodeId: "collect",
    icon: "✦",
    title: "Bãi Hạt Sáng",
    skillId: "count",
    skillNameVi: "Đếm số lượng",
    objectiveVi: "Nhận biết và đếm đúng số lượng hạt.",
    mastery: 2,
    attempts: 3,
    supportsUsed: 1,
    durationSeconds: 83,
    firstClear: true,
    mode: "adventure",
    completedAt: NOW,
  });
});

test("latest learning proof fails closed for missing, malformed, future and unknown records", () => {
  const nodes = [{ id: "collect", title: "Bãi Hạt Sáng", objectiveVi: "Đếm." }];
  assert.equal(getLatestLearningProof({}, nodes, { now: NOW }), null);
  assert.equal(getLatestLearningProof({ activityHistory: [null, { nodeId: "unknown", completedAt: NOW }, { nodeId: "collect", completedAt: "future" }] }, nodes, { now: NOW }), null);
});

test("skill ranking deduplicates skill ids and applies mastery/support ordering", () => {
  const nodes = [
    { id: "collect", skillId: "count", title: "A", skillNameVi: "Đếm" },
    { id: "match", skillId: "count", title: "B", skillNameVi: "Đếm lại" },
    { id: "shape", skillId: "shape", title: "C", skillNameVi: "Hình" },
  ];
  const ranked = rankSkillInsights({ learningMetrics: {
    count: { bestMastery: 1, totalAttempts: 4, supportsUsed: 3 },
    shape: { bestMastery: 3, totalAttempts: 2, supportsUsed: 0 },
  } }, nodes);
  assert.equal(ranked.strongest.skillId, "shape");
  assert.equal(ranked.practice.skillId, "count");
  assert.equal(ranked.practice.nodeId, "collect");
});

test("skill ranking does not recommend the same skill as both strength and practice when alternatives exist", () => {
  const nodes = [
    { id: "collect", skillId: "count", title: "A", skillNameVi: "Đếm" },
    { id: "shape", skillId: "shape", title: "B", skillNameVi: "Hình" },
  ];
  const ranked = rankSkillInsights({ learningMetrics: {
    count: { bestMastery: 3, totalAttempts: 3, supportsUsed: 0 },
    shape: { bestMastery: 3, totalAttempts: 1, supportsUsed: 0 },
  } }, nodes);
  assert.equal(ranked.strongest.skillId, "count");
  assert.equal(ranked.practice.skillId, "shape");
});

test("mastery trend reports none, new, up, down, and steady", () => {
  assert.equal(getMasteryTrend({}, "count", { now: NOW }).direction, "none");
  assert.equal(getMasteryTrend({ activityHistory: [{ skillId: "count", mastery: 2, completedAt: NOW }] }, "count", { now: NOW }).direction, "new");
  const up = getMasteryTrend({ activityHistory: [
    { skillId: "count", mastery: 1, completedAt: "2026-08-08T00:00:00Z" },
    { skillId: "count", mastery: 3, completedAt: NOW },
  ] }, "count", { now: NOW });
  assert.equal(up.direction, "up");
  assert.equal(up.delta, 2);
  const down = getMasteryTrend({ activityHistory: [
    { skillId: "count", mastery: 3, completedAt: "2026-08-08T00:00:00Z" },
    { skillId: "count", mastery: 1, completedAt: NOW },
  ] }, "count", { now: NOW });
  assert.equal(down.direction, "down");
  assert.equal(down.delta, -2);
  const steady = getMasteryTrend({ activityHistory: [
    { skillId: "count", mastery: 2, completedAt: "2026-08-08T00:00:00Z" },
    { skillId: "count", mastery: 2, completedAt: NOW },
  ] }, "count", { now: NOW });
  assert.equal(steady.direction, "steady");
});
