import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MULTI_STAGE_CONFIG,
  getMultiStageConfig,
  validateMultiStageConfig,
  validateBossPrerequisites,
} from "./gameplayPhases.js";

// 12-node plan order: multi-stage nodes (mixed/challenge/boss) are the last three,
// so their phases must only reference nodes before them.
const ORDER = ["collect", "match", "bridge", "path", "subtract", "sort", "shape", "rune", "scenario", "mixed", "challenge", "boss"];
const MODES = ["mixed", "challenge", "boss"];
const signature = (config) => config.map((p) => `${p.mechanic}:${p.sourceNodeId}`).join("|");

test("each mode has exactly 3 phases with unique ids and required fields", () => {
  for (const mode of MODES) {
    const config = MULTI_STAGE_CONFIG[mode];
    assert.equal(config.length, 3, `${mode} must have exactly 3 phases`);
    assert.equal(new Set(config.map((p) => p.id)).size, 3, `${mode} phase ids must be unique`);
    for (const p of config) {
      assert.ok(p.id && p.label && p.mechanic && p.sourceNodeId && p.target && p.telemetryEvent, `${mode} phase missing a required field`);
      assert.equal(typeof p.target, "object", `${mode} phase target must be a JSON-safe object`);
    }
  }
});

test("every phase sources a node taught before its owning node in the 12-node order", () => {
  for (const mode of MODES) {
    const ownerIndex = ORDER.indexOf(mode);
    assert.ok(ownerIndex > 0, `${mode} must exist in the 12-node order`);
    for (const p of MULTI_STAGE_CONFIG[mode]) {
      const idx = ORDER.indexOf(p.sourceNodeId);
      assert.ok(idx !== -1, `${mode} phase ${p.id} sources unknown node ${p.sourceNodeId}`);
      assert.ok(idx < ownerIndex, `${mode} phase ${p.id} sources ${p.sourceNodeId} at/after ${mode}`);
    }
  }
});

test("getMultiStageConfig returns the mode config, null for unknown modes", () => {
  for (const mode of MODES) {
    assert.equal(getMultiStageConfig(mode), MULTI_STAGE_CONFIG[mode]);
  }
  assert.equal(getMultiStageConfig("unknown"), null);
});

test("all shipped configs pass validation", () => {
  for (const mode of MODES) {
    assert.deepEqual(validateMultiStageConfig(MULTI_STAGE_CONFIG[mode], ORDER), []);
  }
  assert.deepEqual(validateBossPrerequisites(MULTI_STAGE_CONFIG.boss, ORDER), []);
});

test("invalid configs are rejected with structured errors", () => {
  const [p] = MULTI_STAGE_CONFIG.mixed;
  // duplicate phase ids
  assert.ok(validateMultiStageConfig([p, p, p], ORDER).some((e) => e.includes("duplicate")), "duplicate ids must be flagged");
  // wrong phase count
  assert.ok(validateMultiStageConfig([p, p], ORDER).some((e) => e.includes("exactly 3")), "count != 3 must be flagged");
  // unknown mechanic
  const badMechanic = [{ ...p, mechanic: "aimbot" }, p, { ...p, id: "x" }];
  assert.ok(validateMultiStageConfig(badMechanic, ORDER).some((e) => e.includes("unknown mechanic")), "unknown mechanic must be flagged");
  // unknown source node
  const badSource = [{ ...p, sourceNodeId: "ghost" }, p, { ...p, id: "x" }];
  assert.ok(validateMultiStageConfig(badSource, ORDER).some((e) => e.includes("unknown source node")), "unknown source node must be flagged");
  // non-array config
  assert.ok(validateMultiStageConfig("nope", ORDER).length > 0, "non-array config must be flagged");
  // non-array node order
  assert.ok(validateMultiStageConfig(MULTI_STAGE_CONFIG.mixed).length > 0, "missing node order must be flagged");
});

test("boss rejected when a source node occurs at/after the boss node", () => {
  const bad = MULTI_STAGE_CONFIG.boss.map((p) => (p.sourceNodeId === "rune" ? { ...p, sourceNodeId: "boss" } : p));
  const errors = validateBossPrerequisites(bad, ORDER);
  assert.ok(errors.some((e) => e.includes("at/after boss")), "boss sourcing an untaught node must be flagged");
});

test("boss phase sequence differs from mixed and challenge", () => {
  const bossSig = signature(MULTI_STAGE_CONFIG.boss);
  assert.notEqual(bossSig, signature(MULTI_STAGE_CONFIG.mixed), "boss must not copy mixed");
  assert.notEqual(bossSig, signature(MULTI_STAGE_CONFIG.challenge), "boss must not copy challenge");
  // validator catches a boss that duplicates mixed
  const copy = MULTI_STAGE_CONFIG.mixed.map((p) => ({ ...p }));
  assert.ok(validateBossPrerequisites(copy, ORDER).some((e) => e.includes("duplicates mixed")), "copied sequence must be flagged");
});
