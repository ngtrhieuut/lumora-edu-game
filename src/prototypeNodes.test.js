import test from "node:test";
import assert from "node:assert/strict";
import { nodes } from "./gameData.js";
import { getInteractionSpec, validateInteractionSpec } from "./interactionSpecs.js";
import { getPrototypeNode, prototypeNodes } from "./prototypeNodes.js";

test("prototype registry is isolated from the 12-node campaign", () => {
  assert.equal(prototypeNodes.length, 3);
  assert.ok(prototypeNodes.every((node) => node.kind === "prototype" && node.approved === false));
  assert.ok(prototypeNodes.every((node) => !nodes.some((campaignNode) => campaignNode.id === node.id)));
  assert.equal(getPrototypeNode("order")?.id, "prototype-order");
  assert.equal(getPrototypeNode("compare-pair")?.id, "prototype-compare-pair");
  assert.equal(getPrototypeNode("numeral")?.id, "prototype-numeral");
});

test("ordering prototype has a complete interaction contract", () => {
  const prototype = getPrototypeNode("prototype-order");
  const spec = getInteractionSpec(prototype.type);
  const audit = validateInteractionSpec(spec);
  assert.equal(audit.valid, true);
  assert.deepEqual(spec.dropZoneIds, ["0", "1", "2"]);
  assert.equal(spec.primaryGesture, "drag");
  assert.ok(spec.gestures.includes("tap"));
  assert.ok(spec.gestures.includes("keyboard"));
});

test("pairwise comparison prototype has a drag and touch contract", () => {
  const prototype = getPrototypeNode("prototype-compare-pair");
  const spec = getInteractionSpec(prototype.type);
  const audit = validateInteractionSpec(spec);
  assert.equal(audit.valid, true);
  assert.deepEqual(spec.dropZoneIds, ["larger", "smaller"]);
  assert.equal(spec.primaryGesture, "drag");
  assert.ok(spec.gestures.includes("tap"));
  assert.ok(spec.gestures.includes("keyboard"));
});

test("numeral recognition prototype has a bounded drag contract", () => {
  const prototype = getPrototypeNode("prototype-numeral");
  const spec = getInteractionSpec(prototype.type);
  const audit = validateInteractionSpec(spec);
  assert.equal(audit.valid, true);
  assert.deepEqual(spec.dropZoneIds, ["core"]);
  assert.equal(spec.primaryGesture, "drag");
  assert.ok(spec.gestures.includes("tap"));
  assert.ok(spec.gestures.includes("keyboard"));
});
