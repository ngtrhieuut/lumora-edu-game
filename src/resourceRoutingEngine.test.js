import test from "node:test";
import assert from "node:assert/strict";
import {
  RESOURCE_ROUTE_SCHEMA_VERSION,
  createResourceRouteState,
  getResourceRouteProgress,
  getResourceRouteTargetIds,
  normalizeResourceRouteConfig,
  normalizeResourceRouteState,
  placeResource,
} from "./resourceRoutingEngine.js";

const RAW_CONFIG = {
  id: "  seed-route-v1 ",
  mode: " side ",
  sourceNodeId: " source ",
  resources: [
    { id: "small-a", kind: " small ", label: "Hạt nhỏ 1" },
    { id: "small-b", kind: "small", label: "Hạt nhỏ 2" },
    { id: "large-a", kind: "large", label: "Hạt lớn 1" },
  ],
  nodes: [
    { id: "source", role: "source", accepts: ["small", "large"], capacity: 3 },
    { id: "shallow", role: "destination", accepts: ["small"], capacity: 2 },
    { id: "deep", role: "destination", accepts: ["large"], capacity: 1 },
    { id: "wrong", role: "destination", accepts: ["small"], capacity: 2 },
  ],
  connections: [
    { from: "source", to: "shallow" },
    { from: "source", to: "deep" },
  ],
  constraints: { maxActions: 8, softTimeLimit: 45 },
};

const CONFIG = normalizeResourceRouteConfig(RAW_CONFIG);
const STARTED_AT = "2026-08-11T00:00:00.000Z";
const COMPLETED_AT = "2026-08-11T00:01:00.000Z";

test("normalizes a valid route and creates a deterministic privacy-safe state", () => {
  assert.ok(CONFIG);
  assert.equal(CONFIG.id, "seed-route-v1");
  assert.equal(CONFIG.resources[0].kind, "small");
  assert.equal(CONFIG.nodes[1].capacity, 2);
  assert.deepEqual(CONFIG.connections, [
    { from: "source", to: "shallow" },
    { from: "source", to: "deep" },
  ]);

  const first = createResourceRouteState(CONFIG, { seed: 17, startedAt: STARTED_AT, email: "hidden@example.com" });
  const second = createResourceRouteState(CONFIG, { seed: 17, startedAt: STARTED_AT });
  assert.deepEqual(first, second);
  assert.equal(first.schemaVersion, RESOURCE_ROUTE_SCHEMA_VERSION);
  assert.deepEqual(first, {
    schemaVersion: 1,
    activityId: "seed-route-v1",
    mode: "side",
    seed: 17,
    phase: "active",
    placedResources: {},
    actions: 0,
    mistakes: 0,
    supportsUsed: 0,
    startedAt: STARTED_AT,
    completedAt: null,
  });
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.keys(first).includes("email"), false);
  assert.equal(JSON.stringify(first).includes("hidden@example.com"), false);
});

test("filters targets to connected, accepting and non-full destinations", () => {
  const initial = createResourceRouteState(CONFIG, { seed: "fixed" });
  assert.deepEqual(getResourceRouteTargetIds(CONFIG, "small-a", initial), ["shallow"]);
  assert.deepEqual(getResourceRouteTargetIds(CONFIG, "large-a", initial), ["deep"]);
  assert.deepEqual(getResourceRouteTargetIds(CONFIG, "unknown", initial), []);

  const capacityConfig = normalizeResourceRouteConfig({
    ...RAW_CONFIG,
    nodes: RAW_CONFIG.nodes.map((node) => node.id === "shallow" ? { ...node, capacity: 1 } : node),
  });
  const shallowFull = placeResource(initial, capacityConfig, "small-a", "shallow").state;
  assert.deepEqual(getResourceRouteTargetIds(capacityConfig, "small-b", shallowFull), []);
  assert.deepEqual(getResourceRouteTargetIds(capacityConfig, "large-a", shallowFull), ["deep"]);
});

test("wrong route is immutable for placements and records a mistake", () => {
  const original = createResourceRouteState(CONFIG, { seed: 3 });
  const wrong = placeResource(original, CONFIG, "small-a", "deep");
  assert.equal(wrong.accepted, false);
  assert.equal(wrong.reason, "wrong-route");
  assert.equal(wrong.complete, false);
  assert.equal(wrong.state.mistakes, 1);
  assert.equal(wrong.state.actions, 1);
  assert.deepEqual(wrong.state.placedResources, {});
  assert.deepEqual(original, createResourceRouteState(CONFIG, { seed: 3 }));

  const correct = placeResource(wrong.state, CONFIG, "small-a", "shallow");
  assert.equal(correct.accepted, true);
  assert.equal(correct.state.mistakes, 1);
  assert.deepEqual(wrong.state.placedResources, {});
  assert.deepEqual(correct.state.placedResources, { "small-a": "shallow" });
});

test("rejects duplicate, capacity and unknown actions without losing valid placements", () => {
  const capacityConfig = normalizeResourceRouteConfig({
    ...RAW_CONFIG,
    nodes: RAW_CONFIG.nodes.map((node) => node.id === "shallow" ? { ...node, capacity: 1 } : node),
  });
  const initial = createResourceRouteState(capacityConfig);
  const placed = placeResource(initial, capacityConfig, "small-a", "shallow").state;
  const duplicate = placeResource(placed, capacityConfig, "small-a", "shallow");
  const full = placeResource(placed, capacityConfig, "small-b", "shallow");
  const unknownResource = placeResource(placed, capacityConfig, "ghost", "shallow");
  const unknownTarget = placeResource(placed, capacityConfig, "large-a", "ghost");

  assert.equal(duplicate.reason, "already-placed");
  assert.equal(full.reason, "full");
  assert.equal(unknownResource.reason, "invalid-resource");
  assert.equal(unknownTarget.reason, "invalid-target");
  for (const result of [duplicate, full, unknownResource, unknownTarget]) {
    assert.equal(result.accepted, false);
    assert.deepEqual(result.state.placedResources, { "small-a": "shallow" });
    assert.equal(result.state.mistakes, 0);
  }
});

test("valid placements complete once, preserve timestamps and report progress", () => {
  let state = createResourceRouteState(CONFIG, { seed: 9, startedAt: STARTED_AT });
  state = placeResource(state, CONFIG, "small-a", "shallow").state;
  state = placeResource(state, CONFIG, "large-a", "deep").state;
  const final = placeResource(state, CONFIG, "small-b", "shallow", { completedAt: COMPLETED_AT });

  assert.equal(final.accepted, true);
  assert.equal(final.complete, true);
  assert.equal(final.reason, "placed");
  assert.equal(final.state.phase, "complete");
  assert.equal(final.state.completedAt, COMPLETED_AT);
  assert.deepEqual(final.state.placedResources, {
    "small-a": "shallow",
    "small-b": "shallow",
    "large-a": "deep",
  });
  assert.deepEqual(getResourceRouteProgress(final.state, CONFIG), {
    placedCount: 3,
    total: 3,
    remaining: 0,
    percent: 100,
    complete: true,
    byNode: { shallow: 2, deep: 1, wrong: 0 },
  });

  const after = placeResource(final.state, CONFIG, "small-a", "shallow");
  assert.equal(after.reason, "complete");
  assert.deepEqual(after.state, final.state);
});

test("normalization fails closed for malformed config and state", () => {
  assert.equal(normalizeResourceRouteConfig(null), null);
  assert.equal(normalizeResourceRouteConfig({ ...RAW_CONFIG, sourceNodeId: "ghost" }), null);
  assert.equal(normalizeResourceRouteConfig({
    ...RAW_CONFIG,
    resources: [...RAW_CONFIG.resources, { id: " small-a ", kind: "small" }],
  }), null);
  assert.equal(normalizeResourceRouteConfig({
    ...RAW_CONFIG,
    nodes: [...RAW_CONFIG.nodes, { id: "shallow", role: "destination", accepts: ["small"], capacity: 1 }],
  }), null);
  assert.equal(normalizeResourceRouteConfig({
    ...RAW_CONFIG,
    connections: [...RAW_CONFIG.connections, { from: "source", to: "shallow" }],
  }), null);
  assert.equal(normalizeResourceRouteConfig({
    ...RAW_CONFIG,
    connections: [...RAW_CONFIG.connections, { from: "ghost", to: "deep" }],
  }), null);

  const state = normalizeResourceRouteState({
    activityId: "spoofed",
    email: "child@example.com",
    rawAnswer: "small-a -> deep",
    placedResources: [
      { resourceId: "small-a", targetNodeId: "deep" },
      { resourceId: "small-a", targetNodeId: "shallow" },
      { resourceId: "ghost", targetNodeId: "shallow" },
      { resourceId: "large-a", targetNodeId: "deep" },
    ],
    actions: -4,
    mistakes: 99,
    supportsUsed: "bad",
    completedAt: COMPLETED_AT,
  }, CONFIG);
  assert.deepEqual(state.placedResources, { "large-a": "deep" });
  assert.equal(state.activityId, "seed-route-v1");
  assert.equal(state.actions, 1);
  assert.equal(state.mistakes, 1);
  assert.equal(state.completedAt, null);
  assert.deepEqual(Object.keys(state).sort(), [
    "actions", "activityId", "completedAt", "mistakes", "mode", "phase", "placedResources",
    "schemaVersion", "seed", "startedAt", "supportsUsed",
  ].sort());
  assert.equal(Object.isFrozen(state), true);
});
