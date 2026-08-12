import assert from "node:assert/strict";
import test from "node:test";

import { getLevelById } from "../levelCatalog/index.js";
import { createRuleBasedOracleProvider } from "../services/oracleProvider.js";
import { getRendererForMechanic, auditRuntimeRendererRegistry } from "./levelRuntimeRegistry.js";
import { resolveLevelRuntime } from "./levelRuntimeAdapter.js";
import { getRuntimePhaseContent } from "./levelRuntimeAdapter.js";
import {
  completeRuntimePhase,
  createLevelRuntimeState,
  finishLevelRuntime,
  normalizeLevelResult,
  normalizeLevelRuntimeState,
  recordRuntimeAttempt,
  recordRuntimeSupport,
} from "./levelRuntimeEngine.js";
import {
  createCatalogProgress,
  getChapterProgress,
  getGradeProgress,
  getNextPlayableLevel,
  isLevelUnlocked,
  normalizeCatalogProgress,
  recordCatalogLevelResult,
} from "./catalogProgression.js";

const level = (id) => getLevelById(id);

test("runtime registry resolves all ten wired Grade 1 levels by mechanic family", () => {
  for (let order = 1; order <= 10; order += 1) {
    const resolved = resolveLevelRuntime(level(`g1-l${String(order).padStart(3, "0")}`));
    assert.equal(resolved.ok, true, `g1-l${order} should resolve`);
    assert.ok(resolved.rendererId);
  }
  const boss = resolveLevelRuntime(level("g1-l010"));
  assert.deepEqual(boss.phases.map((phase) => phase.mechanicId), ["collect", "path", "simulation", "observation"]);
  assert.equal(boss.phases.length, 4);
  assert.deepEqual(boss.phases.slice(1).map((phase) => Object.keys(getRuntimePhaseContent(phase, level("g1-l010"))).filter((key) => ["sequence", "splits", "scenes"].includes(key))), [["sequence"], ["splits"], ["scenes"]]);
  for (const grade of [1, 2, 3, 4, 5]) {
    const gradeBoss = resolveLevelRuntime(level(`g${grade}-l010`));
    assert.equal(gradeBoss.ok, true, `Grade ${grade} chapter boss should resolve`);
    assert.equal(gradeBoss.phases.length, 4);
    assert.ok(gradeBoss.phases.every((phase) => phase.rendererId));
  }
  assert.deepEqual(auditRuntimeRendererRegistry(), { valid: true, errors: [] });
});

test("unknown mechanics are rejected by the adapter and renderer lookup fails safe", () => {
  const unknown = resolveLevelRuntime({ id: "g1-unknown", mechanicId: "teleport" });
  assert.equal(unknown.ok, false);
  assert.match(unknown.errors[0], /unknown mechanic/);
  assert.deepEqual(getRendererForMechanic("teleport"), {
    mechanicId: null,
    rendererId: "fallback",
    supported: false,
    status: "unsupported",
    reason: "unknown-mechanic",
  });
});

test("catalog progression unlocks by prerequisite and never needs XP", () => {
  let progress = createCatalogProgress();
  assert.equal(isLevelUnlocked("g1-l001", progress), true);
  assert.equal(isLevelUnlocked("g1-l002", progress), false);
  assert.equal(isLevelUnlocked("g1-l010", progress), false);

  const first = recordCatalogLevelResult(progress, level("g1-l001"), { completed: true, attempts: 1, correctAttempts: 1, xp: 0 });
  progress = first.progress;
  assert.equal(isLevelUnlocked("g1-l002", progress), true);
  assert.equal(isLevelUnlocked("g1-l003", progress), false);
  assert.equal(progress.xp, 0);
  assert.equal(first.nextLevel.id, "g1-l002");
});

test("locked catalog levels cannot be completed by a forged result", () => {
  const attempt = recordCatalogLevelResult(createCatalogProgress(), level("g1-l010"), { completed: true, attempts: 1 });
  assert.equal(attempt.result.completed, false);
  assert.deepEqual(attempt.progress.completedLevelIds, []);
  assert.deepEqual(attempt.earnedRewards, { knowledgeEnergy: 0, knowledgeShards: 0 });
});

test("normalized completion exposes stable evidence and supports lower mastery", () => {
  const catalogLevel = level("g1-l001");
  const independent = normalizeLevelResult(catalogLevel, {
    completed: true,
    attempts: 1,
    correctAttempts: 1,
    actions: 4,
    durationSeconds: 12,
    completedAt: "2026-08-12T00:00:00.000Z",
  });
  assert.deepEqual(Object.keys(independent), [
    "levelId", "skillId", "mechanicId", "completed", "attempts", "supportsUsed", "guided",
    "actions", "durationSeconds", "accuracy", "errorCodes", "mastery", "completedPhaseCount", "completedAt",
  ]);
  assert.equal(independent.levelId, "g1-l001");
  assert.equal(independent.mastery, 3);

  const supported = normalizeLevelResult(catalogLevel, { completed: true, attempts: 2, correctAttempts: 1, supportsUsed: 1 });
  assert.equal(supported.mastery, 2);
  const guided = normalizeLevelResult(catalogLevel, { completed: true, attempts: 2, correctAttempts: 1, supportsUsed: 2, guided: true });
  assert.equal(guided.mastery, 1);
});

test("first-clear rewards are idempotent and replay improves evidence without farming", () => {
  const catalogLevel = level("g1-l001");
  const first = recordCatalogLevelResult(createCatalogProgress(), catalogLevel, { completed: true, attempts: 2, correctAttempts: 1, supportsUsed: 1 });
  const replay = recordCatalogLevelResult(first.progress, catalogLevel, { completed: true, attempts: 1, correctAttempts: 1, supportsUsed: 0 });
  assert.equal(first.firstClear, true);
  assert.equal(replay.firstClear, false);
  assert.deepEqual(replay.earnedRewards, { knowledgeEnergy: 0, knowledgeShards: 0 });
  assert.equal(replay.progress.knowledgeEnergy, first.progress.knowledgeEnergy);
  assert.equal(replay.progress.outcomes[catalogLevel.id].bestMastery, 3);
  assert.equal(replay.progress.outcomes[catalogLevel.id].replays, 1);
});

test("chapter and grade progress expose the Grade → Chapter → Level boundary", () => {
  let progress = createCatalogProgress();
  for (let order = 1; order <= 10; order += 1) {
    progress = recordCatalogLevelResult(progress, level(`g1-l${String(order).padStart(3, "0")}`), { completed: true, attempts: 1, correctAttempts: 1 }).progress;
  }
  assert.deepEqual(getChapterProgress(progress, 1, 1), {
    grade: 1,
    chapter: 1,
    chapterTitleVi: "Những Mảnh Sáng Đầu Tiên",
    completedCount: 10,
    totalCount: 10,
    percent: 100,
    bossId: "g1-l010",
    bossCompleted: true,
    complete: true,
  });
  assert.deepEqual(getGradeProgress(progress, 1), { grade: 1, completedCount: 10, totalCount: 100, percent: 10, complete: false });
  assert.equal(getNextPlayableLevel(progress, undefined, { grade: 1 }).id, "g1-l011");
});

test("boss phases checkpoint in order and do not reset the whole boss", () => {
  const boss = level("g1-l010");
  const resolved = resolveLevelRuntime(boss);
  let state = createLevelRuntimeState(boss, { phaseIds: resolved.phaseIds });
  for (const phaseId of resolved.phaseIds) {
    state = recordRuntimeAttempt(state, { correct: true });
    const transition = completeRuntimePhase(state, phaseId);
    assert.equal(transition.accepted, true);
    state = transition.state;
    assert.deepEqual(state.checkpoint.completedPhaseIds, state.completedPhaseIds);
  }
  assert.equal(state.status, "completed");
  assert.equal(state.completedPhaseIds.length, 4);
  assert.deepEqual(completeRuntimePhase(state, resolved.phaseIds[0]), { accepted: false, reason: "complete", state });
  const result = finishLevelRuntime(state, boss, { durationSeconds: 31, completedAt: "2026-08-12T00:00:00.000Z" });
  assert.equal(result.completed, true);
  assert.equal(result.completedPhaseCount, 4);
});

test("runtime state normalization preserves a checkpoint and fails closed on skipped phases", () => {
  const boss = level("g1-l010");
  const resolved = resolveLevelRuntime(boss);
  const normalized = normalizeLevelRuntimeState({ completedPhaseIds: [resolved.phaseIds[0], resolved.phaseIds[2]], recoveryMeter: 12 }, boss, { phaseIds: resolved.phaseIds });
  assert.deepEqual(normalized.completedPhaseIds, [resolved.phaseIds[0]]);
  assert.equal(normalized.phaseIndex, 1);
  assert.equal(normalized.recoveryMeter, 12);
  const supported = recordRuntimeSupport(normalized, { hintLevel: 2 });
  assert.equal(supported.supportsUsed, 1);
  assert.equal(supported.hintLevel, 2);
});

test("catalog boss checkpoint survives normalization and is cleared after first clear", () => {
  const boss = level("g1-l010");
  const checkpoint = { completedPhaseIds: ["g1-l010:phase-1"], phaseIndex: 1 };
  const resumed = normalizeCatalogProgress({ ...createCatalogProgress(), runtimeCheckpoints: { [boss.id]: checkpoint } });
  assert.deepEqual(resumed.runtimeCheckpoints[boss.id], checkpoint);
  let progress = createCatalogProgress();
  for (let order = 1; order <= 9; order += 1) {
    progress = recordCatalogLevelResult(progress, level(`g1-l${String(order).padStart(3, "0")}`), { completed: true }).progress;
  }
  progress = normalizeCatalogProgress({ ...progress, runtimeCheckpoints: { [boss.id]: checkpoint } });
  progress = recordCatalogLevelResult(progress, boss, { completed: true, completedPhaseCount: 4 }).progress;
  assert.equal(progress.runtimeCheckpoints[boss.id], undefined);
});

test("local Oracle fallback is available without network or secrets", () => {
  const local = createRuleBasedOracleProvider({ observation: ["Quan sát từng nhóm.", "Đếm từng vật.", "Chọn cảnh đủ đồ."] });
  const hint = local.getHint({ type: "observation", level: 3 });
  assert.equal(typeof hint.text, "string");
  assert.ok(hint.text.length > 0);
  assert.equal(local.descriptor.local, true);
  assert.equal(local.descriptor.remote, false);
});
