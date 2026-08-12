import assert from "node:assert/strict";
import { test } from "node:test";
import {
  auditCampaignRegistry,
  auditOptionalQuestRegistry,
  getActiveWorld,
  getNextWorld,
  getNextWorldNode,
  getWorldById,
  getWorldNodes,
  getWorldProgress,
  getWorldStatus,
  isWorldComplete,
  isWorldPlayable,
  normalizeCampaignProgress,
  selectActiveWorld,
} from "./campaignEngine.js";
import { cityCosmetics, cityRestorationFeatures, defaultWorldId, environmentRestorationScenarios, nodes, optionalQuestIds, optionalQuests, orderedNodeIds, resourceRouteScenarios, worlds } from "./gameData.js";

const firstWorld = worlds[0];
const previewWorld = worlds[1];
const optionalContext = {
  optionalQuests,
  resourceRouteScenarios,
  environmentRestorationScenarios,
  cityRestorationFeatures,
  cityCosmetics,
};

test("campaign registry maps the canonical slice to one playable world", () => {
  assert.deepEqual(auditCampaignRegistry(worlds, nodes, optionalContext), { ok: true, errors: [] });
  assert.deepEqual(auditOptionalQuestRegistry(worlds, optionalQuests, { ...optionalContext, nodes }), { ok: true, errors: [] });
  assert.equal(firstWorld.id, defaultWorldId);
  assert.deepEqual(firstWorld.nodeIds, orderedNodeIds);
  assert.deepEqual(firstWorld.optionalQuestIds, optionalQuestIds);
  assert.equal(firstWorld.bossNodeId, "boss");
  assert.equal(previewWorld.availability, "preview");
  assert.deepEqual(previewWorld.nodeIds, []);
});

test("optional quest registry rejects orphaned links and cross-world references", () => {
  const invalidWorlds = worlds.map((world) => ({ ...world, optionalQuestIds: [...(world.optionalQuestIds ?? [])] }));
  invalidWorlds[0].optionalQuestIds[0] = "missing-quest";
  const invalidQuests = optionalQuests.map((quest) => ({ ...quest, prerequisites: [...quest.prerequisites] }));
  invalidQuests[1].routeScenarioId = "firefly-grove-restoration-v1";
  const audit = auditOptionalQuestRegistry(invalidWorlds, invalidQuests, {
    ...optionalContext,
    nodes,
    resourceRouteScenarios,
    environmentRestorationScenarios,
  });
  assert.equal(audit.ok, false);
  assert.ok(audit.errors.some((error) => error.includes("unknown optional quest")));
  assert.ok(audit.errors.some((error) => error.includes("Route quest seed-ferry")));
});

test("registry audit rejects duplicate cross-world nodes and invalid bosses", () => {
  const invalid = [
    { id: "one", availability: "playable", nodeIds: ["collect"], bossNodeId: "missing", prerequisiteWorldId: null },
    { id: "two", availability: "playable", nodeIds: ["collect"], bossNodeId: "collect", prerequisiteWorldId: "one" },
  ];
  const audit = auditCampaignRegistry(invalid, nodes);
  assert.equal(audit.ok, false);
  assert.ok(audit.errors.some((error) => error.includes("boss")));
  assert.ok(audit.errors.some((error) => error.includes("more than one world")));
});

test("registry audit detects prerequisite cycles", () => {
  const cyclic = [
    { id: "one", availability: "preview", nodeIds: [], bossNodeId: null, prerequisiteWorldId: "two" },
    { id: "two", availability: "preview", nodeIds: [], bossNodeId: null, prerequisiteWorldId: "one" },
  ];
  const audit = auditCampaignRegistry(cyclic, nodes);
  assert.equal(audit.ok, false);
  assert.ok(audit.errors.some((error) => error.includes("cycle")));
});

test("legacy progress migrates to the first world without losing data", () => {
  const legacy = { completed: ["collect", "match"], shards: 7, questState: { completedIds: ["firefly-pairs"] } };
  const migrated = normalizeCampaignProgress(legacy, worlds, nodes);
  assert.equal(migrated.campaignState.activeWorldId, defaultWorldId);
  assert.deepEqual(migrated.campaignState.completedWorldIds, []);
  assert.equal(migrated.shards, 7);
  assert.deepEqual(migrated.questState, legacy.questState);
});

test("corrupt campaign ids fall back safely and unknown completions are stripped", () => {
  const normalized = normalizeCampaignProgress({ completed: [], campaignState: { activeWorldId: "unknown", completedWorldIds: ["unknown", previewWorld.id] } }, worlds, nodes);
  assert.deepEqual(normalized.campaignState, { activeWorldId: defaultWorldId, completedWorldIds: [] });
  assert.equal(getActiveWorld(normalized, worlds)?.id, defaultWorldId);
});

test("world completion requires every node inside its own boundary", () => {
  assert.equal(isWorldComplete(firstWorld, { completed: orderedNodeIds }), true);
  assert.equal(isWorldComplete(firstWorld, { completed: ["boss"] }), false);
  assert.equal(isWorldComplete(previewWorld, { completed: orderedNodeIds }), false);

  const normalized = normalizeCampaignProgress({ completed: orderedNodeIds }, worlds, nodes);
  assert.deepEqual(normalized.campaignState.completedWorldIds, [defaultWorldId]);
  assert.equal(getWorldStatus(firstWorld, normalized, worlds), "completed");
  assert.equal(getWorldStatus(previewWorld, normalized, worlds), "preview");
});

test("preview world remains non-playable even after its prerequisite is complete", () => {
  const complete = normalizeCampaignProgress({ completed: orderedNodeIds }, worlds, nodes);
  assert.equal(isWorldPlayable(previewWorld, complete, worlds), false);
  const selected = selectActiveWorld(complete, previewWorld.id, worlds, nodes);
  assert.equal(selected.campaignState.activeWorldId, defaultWorldId);
});

test("a valid active playable world survives normalization after its prerequisite is complete", () => {
  const secondWorld = { id: "second", name: "Second", availability: "playable", nodeIds: ["second-a", "second-boss"], bossNodeId: "second-boss", prerequisiteWorldId: defaultWorldId };
  const registry = [firstWorld, secondWorld];
  const fakeNodes = [...nodes, { id: "second-a" }, { id: "second-boss" }];
  const normalized = normalizeCampaignProgress({
    completed: [...orderedNodeIds, "second-a"],
    campaignState: { activeWorldId: "second", completedWorldIds: ["forged"] },
  }, registry, fakeNodes);
  assert.equal(normalized.campaignState.activeWorldId, "second");
  assert.deepEqual(normalized.campaignState.completedWorldIds, [defaultWorldId]);
  assert.equal(getNextWorldNode(secondWorld, normalized, fakeNodes)?.id, "second-boss");
});

test("cross-world ids cannot inflate another world's progress", () => {
  const isolatedWorlds = [
    firstWorld,
    { id: "other", name: "Other", availability: "playable", nodeIds: ["other-a", "other-boss"], bossNodeId: "other-boss", prerequisiteWorldId: null },
  ];
  const fakeNodes = [...nodes, { id: "other-a" }, { id: "other-boss" }];
  const foreignOnly = normalizeCampaignProgress({ completed: ["other-a", "other-boss"] }, isolatedWorlds, fakeNodes);
  assert.equal(isWorldComplete(firstWorld, foreignOnly), false);
  assert.deepEqual(getWorldProgress(firstWorld, foreignOnly), { completedCount: 0, totalCount: 12, percent: 0 });
  assert.deepEqual(foreignOnly.campaignState.completedWorldIds, ["other"]);
});

test("world lookup and next-node resolution preserve registry order", () => {
  assert.equal(getWorldById(worlds, defaultWorldId), firstWorld);
  assert.equal(getWorldById(worlds, "missing"), null);
  assert.deepEqual(getWorldNodes(firstWorld, nodes).map((node) => node.id), orderedNodeIds);
  assert.equal(getNextWorld(firstWorld, worlds), previewWorld);
  assert.equal(getNextWorldNode(firstWorld, { completed: ["collect", "match"] }, nodes)?.id, "bridge");
  assert.equal(getNextWorldNode(firstWorld, { completed: orderedNodeIds }, nodes)?.id, "boss");
});
