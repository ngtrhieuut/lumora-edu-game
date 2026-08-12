import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildRestorationProjection,
  getRestorationFeatureState,
  getRestoredFeatureIds,
} from "./restorationProjectionEngine.js";

const FEATURES = [
  {
    id: "restored-firefly-grove",
    questId: "firefly-pairs",
    title: "Vạt Cỏ Đom Đóm hồi sinh",
    description: "Những đốm sáng nhỏ trở lại bên Nubi.",
    icon: "✣",
    projection: {
      visualCue: "firefly-grove",
      energyTypes: ["nature", "discovery"],
      dormantDescription: "Vạt cỏ còn tối.",
      restoredDescription: "Đom đóm đã trở lại.",
    },
  },
  {
    id: "restored-river-bank",
    questId: "seed-ferry",
    title: "Bờ Suối Hai Màu",
    description: "Dòng suối giữ lại nhịp sáng mới.",
    icon: "≈",
    projection: {
      visualCue: "river-bank",
      energyTypes: ["logic", "nature"],
      dormantDescription: "Bờ suối đang chờ.",
      restoredDescription: "Dòng suối đã nối hai bờ.",
    },
  },
];

test("projection derives restored features and canonical Nubi energy deterministically", () => {
  const projection = buildRestorationProjection({
    questState: { completedIds: ["firefly-pairs", "unknown", "firefly-pairs"] },
    features: FEATURES,
  });

  assert.deepEqual(projection.restoredFeatureIds, ["restored-firefly-grove"]);
  assert.equal(projection.restoredCount, 1);
  assert.equal(projection.hasRestoredFeatures, true);
  assert.deepEqual(projection.nubiEnergyTypes, ["nature", "discovery"]);
  assert.deepEqual(projection.featureStates, [
    { id: "restored-firefly-grove", state: "restored" },
    { id: "restored-river-bank", state: "dormant" },
  ]);
  assert.equal(getRestorationFeatureState(projection, "restored-river-bank"), "dormant");
  assert.deepEqual(getRestoredFeatureIds(projection), ["restored-firefly-grove"]);
});

test("malformed state, unknown ids, cues, and energy types fail closed", () => {
  const projection = buildRestorationProjection({
    questState: { completedIds: [null, 42, " unknown ", "firefly-pairs"] },
    features: [
      FEATURES[0],
      { ...FEATURES[0], title: "duplicate must be ignored" },
      { id: "malformed", questId: "malformed", projection: { visualCue: "<script>", energyTypes: ["answer", "logic"] } },
      null,
    ],
  });

  assert.equal(projection.features.length, 2);
  assert.equal(projection.features[1].visualCue, "quiet-grove");
  assert.deepEqual(projection.features[1].energyTypes, ["logic"]);
  assert.deepEqual(projection.nubiEnergyTypes, ["nature", "discovery"]);
  assert.deepEqual(projection.restoredFeatureIds, ["restored-firefly-grove"]);
});

test("projection is immutable and does not mutate input", () => {
  const questState = { completedIds: ["firefly-pairs"] };
  const features = structuredClone(FEATURES);
  const projection = buildRestorationProjection({ questState, features });

  assert.equal(Object.isFrozen(projection), true);
  assert.equal(Object.isFrozen(projection.features), true);
  assert.equal(Object.isFrozen(projection.features[0]), true);
  assert.equal(Object.isFrozen(projection.featureStates[0]), true);
  assert.throws(() => { projection.features[0].state = "dormant"; }, TypeError);
  assert.throws(() => { projection.nubiEnergyTypes.push("mastery"); }, TypeError);
  assert.deepEqual(questState, { completedIds: ["firefly-pairs"] });
  assert.deepEqual(features, FEATURES);
});

test("projection does not copy raw answers, PII, or unknown feature fields", () => {
  const projection = buildRestorationProjection({
    questState: {
      completedIds: ["firefly-pairs"],
      alias: "private-alias",
      rawAnswer: "private-answer",
    },
    features: [{
      ...FEATURES[0],
      rawAnswer: "feature-answer",
      childAlias: "feature-alias",
      projection: { ...FEATURES[0].projection, privateNote: "do-not-copy" },
    }],
  });

  const serialized = JSON.stringify(projection);
  assert.equal(serialized.includes("private-alias"), false);
  assert.equal(serialized.includes("private-answer"), false);
  assert.equal(serialized.includes("feature-answer"), false);
  assert.equal(serialized.includes("feature-alias"), false);
  assert.equal(serialized.includes("do-not-copy"), false);
  assert.deepEqual(Object.keys(projection.features[0]).sort(), [
    "description",
    "dormantDescription",
    "energyTypes",
    "icon",
    "id",
    "questId",
    "restored",
    "restoredDescription",
    "state",
    "title",
    "visualCue",
  ]);
});

test("empty or malformed input returns a calm, stable projection", () => {
  const projection = buildRestorationProjection({ questState: "bad", features: "bad" });

  assert.deepEqual(projection.features, []);
  assert.deepEqual(projection.featureStates, []);
  assert.deepEqual(projection.restoredFeatureIds, []);
  assert.equal(projection.restoredCount, 0);
  assert.equal(projection.hasRestoredFeatures, false);
  assert.deepEqual(projection.nubiEnergyTypes, []);
  assert.equal(getRestorationFeatureState(projection, "missing"), "dormant");
});
