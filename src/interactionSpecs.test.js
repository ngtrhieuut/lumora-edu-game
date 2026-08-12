import test from "node:test";
import assert from "node:assert/strict";
import { nodes } from "./gameData.js";
import {
  INTERACTION_SPECS,
  auditInteractionSpecs,
  getInteractionSpec,
  validateInteractionSpec,
} from "./interactionSpecs.js";
import { MULTI_STAGE_CONFIG } from "./gameplayPhases.js";

test("every shipped node has a valid canonical interaction spec", () => {
  const audit = auditInteractionSpecs(nodes);
  assert.equal(audit.valid, true);
  assert.equal(audit.nodeCount, 12);
  assert.equal(audit.coveredCount, 12);
  assert.deepEqual(audit.errors, []);
});

test("object-placement mechanics explicitly declare drag and drop zones", () => {
  for (const mechanic of ["collect", "match", "bridge", "path", "subtract", "sort", "shape", "rune", "scenario", "restore", "compare-pair", "numeral"]) {
    const spec = getInteractionSpec(mechanic);
    assert.equal(spec.primaryGesture, "drag", mechanic);
    assert.ok(spec.dropZoneIds.length > 0, mechanic);
    assert.ok(spec.gestures.includes("tap"), mechanic);
    assert.ok(spec.gestures.includes("keyboard"), mechanic);
  }
});

test("environmental route declares bounded drop destinations and touch fallback", () => {
  const spec = getInteractionSpec("route");
  assert.equal(spec.primaryGesture, "drag");
  assert.deepEqual(spec.dropZoneIds, ["shallow-bank", "deep-bank"]);
  assert.ok(spec.gestures.includes("tap"));
  assert.ok(spec.gestures.includes("keyboard"));
});

test("environmental restoration declares variable destinations and touch fallback", () => {
  const spec = getInteractionSpec("restore");
  assert.equal(spec.primaryGesture, "drag");
  assert.deepEqual(spec.dropZoneIds, ["water", "light"]);
  assert.ok(spec.gestures.includes("tap"));
  assert.ok(spec.gestures.includes("keyboard"));
});

test("each spec has exactly three hints and a bounded mastery/audio contract", () => {
  for (const spec of Object.values(INTERACTION_SPECS)) {
    assert.equal(spec.hintLadder.length, 3, spec.id);
    assert.deepEqual(spec.masteryEvents, ["attempt", "hint-requested", "support-used", "level-solved"], spec.id);
    assert.ok(spec.audioCues.length >= 2, spec.id);
    assert.ok(spec.animationCue.length > 0, spec.id);
  }
});

test("multi-stage interaction contracts match the runtime phase registry", () => {
  for (const mode of ["mixed", "challenge", "boss"]) {
    assert.deepEqual(
      getInteractionSpec(mode).phaseMechanics,
      MULTI_STAGE_CONFIG[mode].map((phase) => phase.mechanic),
      `${mode} phase mechanics must match runtime`,
    );
  }
});

test("spec validator catches incomplete drag contracts", () => {
  const invalid = {
    ...getInteractionSpec("collect"),
    gestures: ["drag"],
    dropZoneIds: [],
    hintLadder: ["only one"],
  };
  const audit = validateInteractionSpec(invalid);
  assert.equal(audit.valid, false);
  assert.ok(audit.errors.some((message) => message.includes("hintLadder")));
  assert.ok(audit.errors.some((message) => message.includes("dropZoneIds")));
});

test("coverage audit reports missing specs without throwing", () => {
  const audit = auditInteractionSpecs([{ id: "unknown", type: "not-a-mechanic" }]);
  assert.equal(audit.valid, false);
  assert.equal(audit.errors[0].code, "SPEC_MISSING");
});
