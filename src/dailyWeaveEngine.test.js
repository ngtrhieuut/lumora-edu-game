import test from "node:test";
import assert from "node:assert/strict";
import {
  DAILY_WEAVE_SCHEMA_VERSION,
  buildDailyWeaveChallenge,
  createDailyWeaveState,
  getDailyWeaveProgress,
  getDailyWeaveTargetIds,
  normalizeDailyWeaveConfig,
  normalizeDailyWeaveState,
  placeDailyWeaveToken,
} from "./dailyWeaveEngine.js";

const ENERGY_REGISTRY = {
  logic: { id: "logic", labelVi: "Năng lượng Logic", icon: "◇" },
  discovery: { id: "discovery", labelVi: "Năng lượng Khám phá", icon: "✦" },
  mastery: { id: "mastery", labelVi: "Năng lượng Làm chủ", icon: "◈" },
};

const NODE_DEFINITIONS = [
  { id: "collect", shortTitle: "Đếm ánh sáng", title: "Bãi Hạt Sáng", icon: "✦", energyTypes: ["logic"] },
  { id: "bridge", shortTitle: "Xây cầu", title: "Cầu Ánh Sáng", icon: "+", energyTypes: ["logic"] },
  { id: "shape", shortTitle: "Ghép hình", title: "Xưởng Hình Khối", icon: "△", energyTypes: ["discovery"] },
];

const CONFIG = buildDailyWeaveChallenge(
  ["collect", "bridge", "shape"],
  NODE_DEFINITIONS,
  ENERGY_REGISTRY,
);

test("builds a deterministic challenge with token energy types and counted lane capacity", () => {
  const second = buildDailyWeaveChallenge(["collect", "bridge", "shape"], NODE_DEFINITIONS, ENERGY_REGISTRY);

  assert.ok(CONFIG);
  assert.deepEqual(CONFIG, second);
  assert.equal(CONFIG.id, "daily-weave-collect-bridge-shape");
  assert.deepEqual(CONFIG.tokens.map(({ id, sourceNodeId, energyType }) => ({ id, sourceNodeId, energyType })), [
    { id: "token-collect", sourceNodeId: "collect", energyType: "logic" },
    { id: "token-bridge", sourceNodeId: "bridge", energyType: "logic" },
    { id: "token-shape", sourceNodeId: "shape", energyType: "discovery" },
  ]);
  assert.deepEqual(CONFIG.lanes.map(({ id, energyType, capacity }) => ({ id, energyType, capacity })), [
    { id: "lane-logic", energyType: "logic", capacity: 2 },
    { id: "lane-discovery", energyType: "discovery", capacity: 1 },
  ]);
});

test("config and initial state are deeply frozen and state is privacy-safe", () => {
  const state = createDailyWeaveState(CONFIG, { actions: 2, mistakes: 9, email: "child@example.com" });

  assert.equal(Object.isFrozen(CONFIG), true);
  assert.equal(Object.isFrozen(CONFIG.tokens), true);
  assert.equal(Object.isFrozen(state), true);
  assert.equal(Object.isFrozen(state.placedTokens), true);
  assert.deepEqual(state, {
    schemaVersion: DAILY_WEAVE_SCHEMA_VERSION,
    challengeId: CONFIG.id,
    placedTokens: {},
    actions: 2,
    mistakes: 2,
    phase: "active",
  });
  assert.equal(JSON.stringify(state).includes("child@example.com"), false);
});

test("target ids are matching, capacity-aware and reject unknown or placed tokens", () => {
  const initial = createDailyWeaveState(CONFIG);
  assert.deepEqual(getDailyWeaveTargetIds(CONFIG, "token-collect", initial), ["lane-logic"]);
  assert.deepEqual(getDailyWeaveTargetIds(CONFIG, "ghost", initial), []);

  const first = placeDailyWeaveToken(initial, CONFIG, "token-collect", "lane-logic");
  assert.deepEqual(getDailyWeaveTargetIds(CONFIG, "token-collect", first.state), []);
  assert.deepEqual(getDailyWeaveTargetIds(CONFIG, "token-bridge", first.state), ["lane-logic"]);
});

test("wrong lane records one bounded mistake without losing prior placements", () => {
  const original = createDailyWeaveState(CONFIG);
  const placed = placeDailyWeaveToken(original, CONFIG, "token-collect", "lane-logic");
  const wrong = placeDailyWeaveToken(placed.state, CONFIG, "token-shape", "lane-logic");

  assert.equal(wrong.accepted, false);
  assert.equal(wrong.complete, false);
  assert.equal(wrong.reason, "wrong-lane");
  assert.equal(wrong.state.actions, 2);
  assert.equal(wrong.state.mistakes, 1);
  assert.deepEqual(wrong.state.placedTokens, { "token-collect": "lane-logic" });
  assert.deepEqual(original.placedTokens, {});
  assert.deepEqual(placed.state.placedTokens, { "token-collect": "lane-logic" });
});

test("matching placements complete the challenge and expose the UI progress contract", () => {
  let state = createDailyWeaveState(CONFIG);
  state = placeDailyWeaveToken(state, CONFIG, "token-collect", "lane-logic").state;
  state = placeDailyWeaveToken(state, CONFIG, "token-bridge", "lane-logic").state;
  const final = placeDailyWeaveToken(state, CONFIG, "token-shape", "lane-discovery");

  assert.equal(final.accepted, true);
  assert.equal(final.complete, true);
  assert.equal(final.reason, "complete");
  assert.equal(final.state.phase, "complete");
  assert.deepEqual(final.state.placedTokens, {
    "token-collect": "lane-logic",
    "token-bridge": "lane-logic",
    "token-shape": "lane-discovery",
  });
  assert.deepEqual(getDailyWeaveProgress(final.state, CONFIG), {
    placedCount: 3,
    total: 3,
    remaining: 0,
    complete: true,
    lanes: [
      { id: "lane-logic", count: 2, capacity: 2 },
      { id: "lane-discovery", count: 1, capacity: 1 },
    ],
  });
});

test("normalizes persisted placements fail-closed, clamps counters and drops PII/raw answers", () => {
  const state = normalizeDailyWeaveState({
    challengeId: "spoofed",
    email: "child@example.com",
    rawAnswer: "token-shape -> lane-logic",
    placedTokens: [
      { tokenId: "token-collect", laneId: "lane-logic" },
      { tokenId: "token-collect", laneId: "lane-discovery" },
      { tokenId: "token-bridge", laneId: "lane-logic" },
      { tokenId: "token-shape", laneId: "lane-logic" },
      { tokenId: "ghost", laneId: "lane-logic" },
    ],
    actions: -4,
    mistakes: 999,
  }, CONFIG);

  assert.deepEqual(state.placedTokens, { "token-bridge": "lane-logic" });
  assert.equal(state.challengeId, CONFIG.id);
  assert.equal(state.actions, 1);
  assert.equal(state.mistakes, 1);
  assert.equal(state.phase, "active");
  assert.deepEqual(Object.keys(state).sort(), ["actions", "challengeId", "mistakes", "phase", "placedTokens", "schemaVersion"].sort());
  assert.equal(JSON.stringify(state).includes("child@example.com"), false);
  assert.equal(JSON.stringify(state).includes("rawAnswer"), false);
});

test("rejects duplicate and malformed config while clamping valid lane capacity", () => {
  assert.equal(normalizeDailyWeaveConfig(null), null);
  assert.equal(normalizeDailyWeaveConfig({ id: "bad", tokens: [], lanes: [] }), null);
  assert.equal(normalizeDailyWeaveConfig({
    id: "bad",
    tokens: [{ id: "token-a", energyType: "logic" }],
    lanes: [{ id: "lane-a", energyType: "logic", capacity: Infinity }],
  }), null);
  assert.equal(normalizeDailyWeaveConfig({
    id: "bad",
    tokens: [{ id: "token-a", energyType: "logic" }, { id: "token-a", energyType: "logic" }],
    lanes: [{ id: "lane-a", energyType: "logic", capacity: 1 }],
  }), null);

  const clamped = normalizeDailyWeaveConfig({
    id: "clamped",
    tokens: [{ id: "token-a", energyType: "logic" }],
    lanes: [{ id: "lane-a", energyType: "logic", capacity: -5 }],
  });
  assert.equal(clamped.lanes[0].capacity, 0);
});

test("invalid builder inputs and invalid state fail closed without throwing", () => {
  assert.equal(buildDailyWeaveChallenge(null, NODE_DEFINITIONS, ENERGY_REGISTRY), null);
  assert.equal(buildDailyWeaveChallenge(["collect"], NODE_DEFINITIONS, null), null);
  assert.equal(buildDailyWeaveChallenge(["unknown"], NODE_DEFINITIONS, ENERGY_REGISTRY), null);

  const invalid = createDailyWeaveState(null, { actions: 4, mistakes: 99 });
  assert.deepEqual(invalid, {
    schemaVersion: DAILY_WEAVE_SCHEMA_VERSION,
    challengeId: "",
    placedTokens: {},
    actions: 4,
    mistakes: 4,
    phase: "active",
  });
  assert.deepEqual(getDailyWeaveProgress(invalid, null), {
    placedCount: 0,
    total: 0,
    remaining: 0,
    complete: false,
    lanes: [],
  });
});

test("duplicate, full and post-completion actions preserve canonical state", () => {
  const singleLaneConfig = normalizeDailyWeaveConfig({
    id: "single-lane",
    tokens: [
      { id: "token-a", energyType: "logic" },
      { id: "token-b", energyType: "logic" },
    ],
    lanes: [{ id: "lane-logic", energyType: "logic", capacity: 1 }],
  });
  let state = createDailyWeaveState(singleLaneConfig);
  const first = placeDailyWeaveToken(state, singleLaneConfig, "token-a", "lane-logic");
  state = first.state;
  const duplicate = placeDailyWeaveToken(state, singleLaneConfig, "token-a", "lane-logic");
  const full = placeDailyWeaveToken(state, singleLaneConfig, "token-b", "lane-logic");

  assert.equal(duplicate.reason, "already-placed");
  assert.equal(full.reason, "full");
  assert.equal(duplicate.state.actions, 1);
  assert.equal(full.state.mistakes, 0);
  assert.deepEqual(full.state.placedTokens, { "token-a": "lane-logic" });

  const completeConfig = normalizeDailyWeaveConfig({
    id: "one-token",
    tokens: [{ id: "token-a", energyType: "logic" }],
    lanes: [{ id: "lane-logic", energyType: "logic", capacity: 1 }],
  });
  const complete = placeDailyWeaveToken(createDailyWeaveState(completeConfig), completeConfig, "token-a", "lane-logic");
  const after = placeDailyWeaveToken(complete.state, completeConfig, "token-a", "lane-logic");
  assert.equal(after.reason, "complete");
  assert.deepEqual(after.state, complete.state);
});

test("action budget closes the puzzle without allowing infinite wrong guesses", () => {
  const config = normalizeDailyWeaveConfig({
    id: "budgeted",
    maxActions: 2,
    tokens: [
      { id: "token-a", energyType: "logic" },
      { id: "token-b", energyType: "discovery" },
    ],
    lanes: [
      { id: "lane-logic", energyType: "logic", capacity: 1 },
      { id: "lane-discovery", energyType: "discovery", capacity: 1 },
    ],
  });
  let state = createDailyWeaveState(config);
  state = placeDailyWeaveToken(state, config, "token-a", "lane-discovery").state;
  const secondWrong = placeDailyWeaveToken(state, config, "token-a", "lane-discovery");
  const exhausted = placeDailyWeaveToken(secondWrong.state, config, "token-a", "lane-discovery");
  assert.equal(secondWrong.reason, "wrong-lane");
  assert.equal(exhausted.reason, "max-actions");
  assert.deepEqual(getDailyWeaveTargetIds(config, "token-b", exhausted.state), []);
  assert.equal(exhausted.state.actions, 2);
  assert.equal(exhausted.state.mistakes, 2);
});
