import assert from "node:assert/strict";
import { test } from "node:test";
import { cityBuildings, cityCosmetics, cityRestorationFeatures, defaultWorldId, environmentRestorationScenarios, nodes, nubiEvolutionStages, optionalQuestIds, optionalQuests, orderedNodeIds, resourceRouteScenarios, worlds } from "./gameData.js";

const EXPECTED_IDS = ["collect", "match", "bridge", "path", "subtract", "sort", "shape", "rune", "scenario", "mixed", "challenge", "boss"];

test("vertical slice exposes the canonical 12-node order", () => {
  assert.deepEqual(orderedNodeIds, EXPECTED_IDS);
  assert.equal(nodes.length, 12);
  assert.deepEqual(nodes.map((node) => node.index), Array.from({ length: 12 }, (_, index) => index + 1));
});

test("campaign registry preserves the current world and reserves a non-playable boundary", () => {
  assert.equal(worlds.length, 2);
  assert.equal(worlds[0].id, defaultWorldId);
  assert.equal(worlds[0].availability, "playable");
  assert.deepEqual(worlds[0].nodeIds, EXPECTED_IDS);
  assert.deepEqual(worlds[0].optionalQuestIds, optionalQuestIds);
  assert.equal(worlds[1].availability, "preview");
  assert.equal(worlds[1].prerequisiteWorldId, defaultWorldId);
  assert.deepEqual(worlds[1].nodeIds, [], "preview must not invent curriculum content");
  assert.equal(worlds[1].preview.title, "Dòng Sông Pha Lê");
  assert.equal(worlds[1].preview.pillars.length, 3);
  assert.match(worlds[1].preview.gate, /curriculum evidence/i);
});

test("every node has explicit prototype safety and progression metadata", () => {
  for (const [index, node] of nodes.entries()) {
    assert.equal(node.approved, false, `${node.id} remains unapproved prototype curriculum`);
    assert.equal(typeof node.skillId, "string");
    assert.ok(node.objectiveVi.length > 0);
    assert.deepEqual(node.gameplayTemplates, [node.type]);
    assert.ok(node.masteryEvents.includes("level-solved"));
    assert.deepEqual(node.prerequisites, index === 0 ? [] : [nodes[index - 1].id]);
  }
});

test("new path and subtraction levels are direct-manipulation mechanics", () => {
  const path = nodes.find((node) => node.id === "path");
  const subtract = nodes.find((node) => node.id === "subtract");
  assert.equal(path.type, "path");
  assert.equal(path.skillId, "MATH_G1_ADD_ON_PATH");
  assert.equal(subtract.type, "subtract");
  assert.equal(subtract.skillId, "MATH_G1_SUBTRACT_VISUAL");
});

test("nodes and optional quests expose allowlisted energy categories", () => {
  assert.deepEqual(nodes.find((node) => node.id === "collect").energyTypes, ["logic"]);
  assert.deepEqual(nodes.find((node) => node.id === "shape").energyTypes, ["discovery"]);
  assert.deepEqual(nodes.find((node) => node.id === "boss").energyTypes, ["mastery"]);
  assert.ok(nodes.every((node) => Array.isArray(node.energyTypes)));
  assert.deepEqual(optionalQuests.map((quest) => quest.energyTypes), [
    ["logic", "discovery"],
    ["logic", "discovery"],
    ["discovery"],
  ]);
});

test("Knowledge City stays lightweight with four auto-build milestones and cosmetic-only rewards", () => {
  assert.equal(cityBuildings.length, 4);
  assert.deepEqual(cityBuildings.map((building) => building.unlockAt), [3, 7, 9, 12]);
  assert.deepEqual(cityBuildings.map((building) => building.masteryRequirement.minimum), [2, 2, 2, 2]);
  assert.deepEqual(cityBuildings.map((building) => building.masteryRequirement.nodeIds.length), [3, 7, 9, 12]);
  assert.equal(new Set(cityBuildings.map((building) => building.id)).size, cityBuildings.length);
  assert.equal(new Set(cityCosmetics.map((cosmetic) => cosmetic.id)).size, cityCosmetics.length);
  for (const building of cityBuildings) {
    assert.ok(cityCosmetics.some((cosmetic) => cosmetic.id === building.rewardCosmeticId));
  }
  assert.ok(cityCosmetics.every((cosmetic) => cosmetic.description && cosmetic.unlock));
});

test("optional world branches are data-driven, non-blocking, and reuse taught drag-friendly mechanics", () => {
  assert.equal(optionalQuests.length, 3);
  assert.equal(new Set(optionalQuestIds).size, optionalQuests.length);
  assert.deepEqual(new Set(optionalQuests.map((quest) => quest.kind)), new Set(["side", "secret"]));
  const allowedTypes = new Set(["match", "restore", "route", "rune"]);
  for (const quest of optionalQuests) {
    assert.ok(allowedTypes.has(quest.type));
    if (quest.type === "restore") {
      assert.equal(quest.restorationScenarioId, "firefly-grove-restoration-v1");
      assert.ok(environmentRestorationScenarios.some((scenario) => scenario.id === quest.restorationScenarioId && scenario.questId === quest.id));
      assert.ok(cityRestorationFeatures.some((feature) => feature.id === "restored-firefly-grove" && feature.questId === quest.id));
    } else if (quest.type === "route") {
      assert.equal(quest.routeScenarioId, "seed-ferry-route-v1");
      assert.ok(resourceRouteScenarios.some((scenario) => scenario.id === quest.routeScenarioId && scenario.questId === quest.id));
    } else {
      assert.ok(nodes.some((node) => node.id === quest.sourceNodeId && node.type === quest.type));
    }
    assert.ok(quest.prerequisites.every((id) => orderedNodeIds.includes(id)));
    assert.ok(cityCosmetics.some((cosmetic) => cosmetic.id === quest.rewardCosmeticId && cosmetic.unlock.questId === quest.id));
    assert.equal("reward" in quest, false, "optional quests do not grant shard currency");
  }
});

test("environment restoration scenarios stay finite, deterministic, and city-linked", () => {
  assert.equal(new Set(environmentRestorationScenarios.map((scenario) => scenario.id)).size, environmentRestorationScenarios.length);
  for (const scenario of environmentRestorationScenarios) {
    assert.equal(scenario.mode, "side");
    assert.ok(scenario.variables.length >= 2);
    assert.ok(scenario.actions.length >= scenario.variables.length * 2);
    assert.ok(scenario.constraints.maxActions > 0);
    assert.ok(cityRestorationFeatures.some((feature) => feature.id === scenario.cityFeatureId));
    assert.ok(scenario.actions.every((action) => scenario.variables.some((variable) => variable.id === action.variableId)));
  }
  assert.equal(new Set(cityRestorationFeatures.map((feature) => feature.id)).size, cityRestorationFeatures.length);
});

test("city restoration features expose bounded visual projection cues", () => {
  const allowedCues = new Set(["firefly-grove", "river-bank"]);
  const allowedEnergy = new Set(["logic", "nature", "discovery", "mastery"]);
  assert.ok(cityRestorationFeatures.every((feature) => allowedCues.has(feature.projection?.visualCue)));
  assert.ok(cityRestorationFeatures.every((feature) => Array.isArray(feature.projection?.energyTypes)));
  assert.ok(cityRestorationFeatures.every((feature) => feature.projection.energyTypes.every((type) => allowedEnergy.has(type))));
  assert.ok(cityRestorationFeatures.every((feature) => feature.projection.dormantDescription.length > 20));
  assert.ok(cityRestorationFeatures.every((feature) => feature.projection.restoredDescription.length > 20));
});

test("Nubi evolution stages have ordered identity-preserving visual assets", () => {
  assert.deepEqual(nubiEvolutionStages.map((stage) => stage.stage), [1, 2]);
  assert.equal(new Set(nubiEvolutionStages.map((stage) => stage.id)).size, nubiEvolutionStages.length);
  assert.equal(new Set(nubiEvolutionStages.map((stage) => stage.sprite)).size, nubiEvolutionStages.length);
  for (const stage of nubiEvolutionStages) {
    assert.ok(stage.sprite.startsWith("/assets/nubi-"));
    assert.ok(stage.name.length > 0);
    assert.ok(stage.description.length > 20);
    assert.ok(stage.traits.length >= 3);
  }
});
