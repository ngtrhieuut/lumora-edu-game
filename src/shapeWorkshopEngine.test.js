import test from "node:test";
import assert from "node:assert/strict";
import { createShapeWorkshopState, getNextShape, normalizeShapeWorkshopState, placeShape } from "./shapeWorkshopEngine.js";

test("shape workshop starts with three repair modules", () => {
  const state = createShapeWorkshopState();
  assert.deepEqual(state, {
    shapeIds: ["circle", "triangle", "square"],
    placedShapeIds: [],
    poweredModules: 0,
    complete: false,
  });
  assert.equal(getNextShape(state), "circle");
});

test("placing each matching shape powers the machine", () => {
  const first = placeShape(createShapeWorkshopState(), "circle");
  const second = placeShape(first.state, "triangle");
  const third = placeShape(second.state, "square");
  assert.equal(first.state.poweredModules, 1);
  assert.equal(second.state.poweredModules, 2);
  assert.equal(third.state.poweredModules, 3);
  assert.equal(third.complete, true);
  assert.equal(getNextShape(third.state), null);
});

test("shape workshop rejects invalid, duplicate and post-completion placement immutably", () => {
  const original = createShapeWorkshopState();
  const placed = placeShape(original, "circle");
  const duplicate = placeShape(placed.state, "circle");
  const invalid = placeShape(placed.state, "hexagon");
  assert.equal(duplicate.reason, "already-placed");
  assert.equal(invalid.reason, "invalid-shape");
  assert.deepEqual(original.placedShapeIds, []);
  const complete = placeShape(placeShape(placed.state, "triangle").state, "square");
  assert.equal(placeShape(complete.state, "square").reason, "complete");
  assert.deepEqual(complete.state.placedShapeIds, ["circle", "triangle", "square"]);
});

test("shape workshop normalization keeps valid allowlisted data and fails closed", () => {
  const state = normalizeShapeWorkshopState({
    shapeIds: ["circle", "circle", "hexagon"],
    placedShapeIds: ["circle", "circle", "hexagon"],
  });
  assert.deepEqual(state.shapeIds, ["circle"]);
  assert.deepEqual(state.placedShapeIds, ["circle"]);
  assert.equal(state.poweredModules, 1);
  assert.equal(state.complete, true);
});

test("shape workshop treats null options as defaults", () => {
  assert.equal(createShapeWorkshopState(null).shapeIds.length, 3);
  assert.equal(normalizeShapeWorkshopState(null, null).poweredModules, 0);
});
