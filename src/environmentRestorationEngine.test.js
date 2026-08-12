import test from "node:test";
import assert from "node:assert/strict";
import {
  ENVIRONMENT_RESTORATION_SCHEMA_VERSION,
  applyRestorationAction,
  createEnvironmentRestorationState,
  getEnvironmentRestorationProgress,
  getEnvironmentRestorationTargetIds,
  normalizeEnvironmentRestorationConfig,
  normalizeEnvironmentRestorationState,
} from "./environmentRestorationEngine.js";

const RAW_CONFIG = {
  id: "  firefly-grove-restoration-v1 ",
  mode: " side ",
  sourceNodeId: " match ",
  variables: [
    { id: "water", label: " Nước ", icon: "≈", min: 0, max: 3, initial: 1, target: 2 },
    { id: "light", label: "Ánh sáng", icon: "✦", min: 0, max: 3, initial: 2, target: 1 },
  ],
  actions: [
    { id: "rain-drop", label: "Gọi mưa nhẹ", icon: "◆", variableId: "water", delta: 1, maxUses: 2 },
    { id: "drain-channel", label: "Mở rãnh thoát", icon: "⌁", variableId: "water", delta: -1, maxUses: 2 },
    { id: "sun-ray", label: "Mở vòm sáng", icon: "☀", variableId: "light", delta: 1, maxUses: 2 },
    { id: "shade-leaf", label: "Hạ lá che", icon: "◌", variableId: "light", delta: -1, maxUses: 2 },
  ],
  constraints: { maxActions: 6, softTimeLimit: 45 },
  cityFeatureId: "restored-firefly-grove",
};

const CONFIG = normalizeEnvironmentRestorationConfig(RAW_CONFIG);
const STARTED_AT = "2026-08-11T00:00:00.000Z";
const COMPLETED_AT = "2026-08-11T00:01:00.000Z";

test("normalizes valid config and creates deterministic deeply frozen state", () => {
  assert.ok(CONFIG);
  assert.equal(CONFIG.id, "firefly-grove-restoration-v1");
  assert.equal(CONFIG.mode, "side");
  assert.equal(CONFIG.variables[0].label, "Nước");
  assert.equal(Object.isFrozen(CONFIG), true);
  assert.equal(Object.isFrozen(CONFIG.variables), true);
  assert.equal(Object.isFrozen(CONFIG.variables[0]), true);
  assert.equal(Object.isFrozen(CONFIG.actions), true);
  assert.equal(Object.isFrozen(CONFIG.actions[0]), true);
  assert.equal(Object.isFrozen(CONFIG.constraints), true);

  const first = createEnvironmentRestorationState(CONFIG, {
    seed: 17,
    startedAt: STARTED_AT,
    email: "hidden@example.com",
  });
  const second = createEnvironmentRestorationState(CONFIG, { seed: 17, startedAt: STARTED_AT });
  assert.deepEqual(first, second);
  assert.equal(first.schemaVersion, ENVIRONMENT_RESTORATION_SCHEMA_VERSION);
  assert.deepEqual(first, {
    schemaVersion: 1,
    activityId: "firefly-grove-restoration-v1",
    mode: "side",
    seed: 17,
    phase: "active",
    values: { water: 1, light: 2 },
    usedActions: {},
    actions: 0,
    mistakes: 0,
    supportsUsed: 0,
    startedAt: STARTED_AT,
    completedAt: null,
  });
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.values), true);
  assert.equal(Object.isFrozen(first.usedActions), true);
});

test("clamps persisted values and fails closed on malformed config/state data", () => {
  assert.equal(normalizeEnvironmentRestorationConfig(null), null);
  assert.equal(normalizeEnvironmentRestorationConfig({ ...RAW_CONFIG, variables: [{ ...RAW_CONFIG.variables[0], initial: Infinity }, RAW_CONFIG.variables[1]] }), null);
  assert.equal(normalizeEnvironmentRestorationConfig({ ...RAW_CONFIG, actions: [{ ...RAW_CONFIG.actions[0], delta: 0 }, ...RAW_CONFIG.actions.slice(1)] }), null);

  const state = normalizeEnvironmentRestorationState({
    activityId: "spoofed",
    email: "child@example.com",
    rawAnswer: "water=3",
    values: { water: 99, light: -99, ghost: 123 },
    usedActions: { "rain-drop": 99, ghost: 4 },
    actions: 99,
    mistakes: 99,
    supportsUsed: "bad",
    completedAt: COMPLETED_AT,
  }, CONFIG);

  assert.deepEqual(state.values, { water: 3, light: 0 });
  assert.deepEqual(state.usedActions, { "rain-drop": 2 });
  assert.equal(state.actions, 6);
  assert.equal(state.mistakes, 6);
  assert.equal(state.completedAt, null);
  assert.equal(JSON.stringify(state).includes("child@example.com"), false);
  assert.equal(JSON.stringify(state).includes("water=3"), false);
  assert.equal(Object.keys(state).includes("email"), false);
  assert.equal(Object.isFrozen(state), true);
});

test("target allowlist exposes only the active action variable", () => {
  const initial = createEnvironmentRestorationState(CONFIG);
  assert.deepEqual(getEnvironmentRestorationTargetIds(CONFIG, "rain-drop", initial), ["water"]);
  assert.deepEqual(getEnvironmentRestorationTargetIds(CONFIG, "unknown", initial), []);
  assert.deepEqual(getEnvironmentRestorationTargetIds(CONFIG, null, initial), []);

  const usedOnce = applyRestorationAction(initial, CONFIG, "rain-drop").state;
  const usedTwice = applyRestorationAction(usedOnce, CONFIG, "rain-drop").state;
  assert.deepEqual(getEnvironmentRestorationTargetIds(CONFIG, "rain-drop", usedTwice), []);

  const exhausted = normalizeEnvironmentRestorationState({ ...initial, actions: 6 }, CONFIG);
  assert.deepEqual(getEnvironmentRestorationTargetIds(CONFIG, "shade-leaf", exhausted), []);
});

test("adjusted and drift actions are immutable and classify distance changes", () => {
  const original = createEnvironmentRestorationState(CONFIG);
  const adjusted = applyRestorationAction(original, CONFIG, "rain-drop");
  assert.equal(adjusted.accepted, true);
  assert.equal(adjusted.reason, "adjusted");
  assert.equal(adjusted.complete, false);
  assert.deepEqual(adjusted.state.values, { water: 2, light: 2 });
  assert.equal(adjusted.state.mistakes, 0);
  assert.deepEqual(original.values, { water: 1, light: 2 });

  const drift = applyRestorationAction(adjusted.state, CONFIG, "sun-ray");
  assert.equal(drift.accepted, true);
  assert.equal(drift.reason, "drift");
  assert.equal(drift.state.mistakes, 1);
  assert.deepEqual(adjusted.state.values, { water: 2, light: 2 });
  assert.deepEqual(drift.state.values, { water: 2, light: 3 });
  assert.equal(Object.isFrozen(drift.state), true);
  assert.equal(Object.isFrozen(drift.state.values), true);
});

test("rejects unknown and duplicate/max-use actions without mutating state", () => {
  const initial = createEnvironmentRestorationState(CONFIG);
  const first = applyRestorationAction(initial, CONFIG, "rain-drop");
  const second = applyRestorationAction(first.state, CONFIG, "rain-drop");
  const duplicate = applyRestorationAction(second.state, CONFIG, "rain-drop");
  const unknown = applyRestorationAction(second.state, CONFIG, "ghost-action");

  assert.equal(first.accepted, true);
  assert.equal(second.accepted, true);
  assert.equal(duplicate.accepted, false);
  assert.equal(duplicate.reason, "max-uses");
  assert.deepEqual(duplicate.state, second.state);
  assert.equal(unknown.accepted, false);
  assert.equal(unknown.reason, "invalid-action");
  assert.deepEqual(unknown.state, second.state);
  assert.deepEqual(initial.values, { water: 1, light: 2 });
});

test("rejects actions after the global action budget", () => {
  const exhausted = normalizeEnvironmentRestorationState({
    values: { water: 1, light: 2 },
    actions: 6,
  }, CONFIG);
  const result = applyRestorationAction(exhausted, CONFIG, "rain-drop");
  assert.equal(result.accepted, false);
  assert.equal(result.reason, "max-actions");
  assert.deepEqual(result.state, exhausted);
});

test("marks completion and accepts only an explicit completion timestamp", () => {
  const started = createEnvironmentRestorationState(CONFIG, { startedAt: STARTED_AT });
  const waterDone = applyRestorationAction(started, CONFIG, "rain-drop");
  const completed = applyRestorationAction(waterDone.state, CONFIG, "shade-leaf", { completedAt: COMPLETED_AT });

  assert.equal(completed.accepted, true);
  assert.equal(completed.complete, true);
  assert.equal(completed.reason, "complete");
  assert.equal(completed.state.phase, "complete");
  assert.deepEqual(completed.state.values, { water: 2, light: 1 });
  assert.equal(completed.state.startedAt, STARTED_AT);
  assert.equal(completed.state.completedAt, COMPLETED_AT);

  const afterDone = applyRestorationAction(completed.state, CONFIG, "rain-drop", { completedAt: "later" });
  assert.equal(afterDone.accepted, false);
  assert.equal(afterDone.reason, "complete");
  assert.deepEqual(afterDone.state, completed.state);
});

test("reports bounded per-variable and overall health", () => {
  const initial = createEnvironmentRestorationState(CONFIG);
  const progress = getEnvironmentRestorationProgress(initial, CONFIG);
  assert.deepEqual(progress.values, { water: 1, light: 2 });
  assert.deepEqual(progress.target, { water: 2, light: 1 });
  assert.deepEqual(progress.health, { water: 67, light: 67 });
  assert.equal(progress.overallHealth, 67);
  assert.equal(progress.complete, false);
  for (const health of Object.values(progress.health)) assert.ok(health >= 0 && health <= 100);
  assert.equal(Object.isFrozen(progress), true);
  assert.equal(Object.isFrozen(progress.health), true);

  const complete = applyRestorationAction(
    applyRestorationAction(initial, CONFIG, "rain-drop").state,
    CONFIG,
    "shade-leaf",
  );
  const completedProgress = getEnvironmentRestorationProgress(complete.state, CONFIG);
  assert.equal(completedProgress.overallHealth, 100);
  assert.deepEqual(completedProgress.health, { water: 100, light: 100 });
  assert.equal(completedProgress.complete, true);
});

test("privacy boundary excludes PII and raw answers from every canonical output", () => {
  const config = normalizeEnvironmentRestorationConfig({
    ...RAW_CONFIG,
    email: "parent@example.com",
    rawAnswer: "rain-drop",
    variables: RAW_CONFIG.variables.map((variable) => ({ ...variable, email: "child@example.com", rawAnswer: "1" })),
  });
  const state = createEnvironmentRestorationState(config, {
    seed: "safe-seed",
    startedAt: STARTED_AT,
    email: "child@example.com",
    rawAnswer: "water=3",
  });
  const result = applyRestorationAction(state, config, "rain-drop", {
    rawAnswer: "water=3",
    email: "child@example.com",
  });
  const progress = getEnvironmentRestorationProgress(result.state, config);
  const serialized = JSON.stringify({ config, state, result, progress });

  assert.equal(serialized.includes("@example.com"), false);
  assert.equal(serialized.includes("rawAnswer"), false);
  assert.equal(serialized.includes("water=3"), false);
  assert.equal(Object.keys(config).includes("email"), false);
  assert.equal(Object.keys(result.state).includes("rawAnswer"), false);
});
