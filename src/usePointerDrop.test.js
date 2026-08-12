import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  DEFAULT_POINTER_DRAG_THRESHOLD,
  getPointerDelta,
  getPointerDropStyle,
  isBeyondPointerThreshold,
  isDropZoneAllowed,
  resolveDropZoneId,
} from "./usePointerDrop.js";

test("pointer delta and threshold use a six-pixel default", () => {
  assert.deepEqual(getPointerDelta({ x: 10, y: 20 }, { x: 14, y: 23 }), { x: 4, y: 3 });
  assert.equal(
    isBeyondPointerThreshold({ x: 0, y: 0 }, { x: DEFAULT_POINTER_DRAG_THRESHOLD, y: 0 }),
    false,
  );
  assert.equal(isBeyondPointerThreshold({ x: 0, y: 0 }, { x: 6.01, y: 0 }), true);
  assert.equal(isBeyondPointerThreshold({ x: 0, y: 0 }, { x: 5, y: 5 }), true);
});

test("pointer helpers reject malformed points defensively", () => {
  assert.equal(getPointerDelta(null, { x: 1, y: 1 }), null);
  assert.equal(isBeyondPointerThreshold({ x: 0, y: 0 }, { x: Number.NaN, y: 0 }), false);
  assert.equal(isBeyondPointerThreshold({ x: 0, y: 0 }, { x: 1, y: 1 }, -1), false);
});

test("resolveDropZoneId reads the closest data-drop-zone without a DOM", () => {
  const zone = { dataset: { dropZone: "forest-gate" } };
  const target = {
    closest(selector) {
      assert.equal(selector, "[data-drop-zone]");
      return zone;
    },
  };

  assert.equal(resolveDropZoneId(target), "forest-gate");
  assert.equal(resolveDropZoneId({ closest: () => ({ dataset: {} }) }), null);
  assert.equal(resolveDropZoneId(null), null);
});

test("drop-zone allowlists keep drag feedback and drops on valid targets", () => {
  assert.equal(isDropZoneAllowed("missing", ["missing"]), true);
  assert.equal(isDropZoneAllowed("other", ["missing"]), false);
  assert.equal(isDropZoneAllowed("2", [2]), true);
  assert.equal(isDropZoneAllowed("missing", []), false);
  assert.equal(isDropZoneAllowed("anywhere", null), true);
});

test("pointer drop style uses touchAction none and translate3d", () => {
  assert.deepEqual(getPointerDropStyle({ x: 12, y: -8 }), {
    touchAction: "none",
    transform: "translate3d(12px, -8px, 0)",
  });
  assert.equal(getPointerDropStyle(null).transform, "translate3d(0px, 0px, 0)");
  assert.equal(getPointerDropStyle({ x: Infinity }).transform, "translate3d(0px, 0px, 0)");
});

test("DragToken suppresses synthetic clicks for drops and cancelled drags", () => {
  const appSource = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const start = appSource.indexOf("function DragToken(");
  const end = appSource.indexOf("\nfunction MatchBoard", start);
  assert.ok(start >= 0 && end > start, "DragToken source contract must be present");

  const dragTokenSource = appSource.slice(start, end);
  assert.match(dragTokenSource, /onDrop\(zoneId, draggedPayload\)\s*\{\s*suppressSyntheticClick\(\);/);
  assert.match(dragTokenSource, /onCancel:\s*suppressSyntheticClick/);
  assert.match(dragTokenSource, /if \(!ignoreClickRef\.current\) onClick\?\.\(event\)/);
  assert.match(dragTokenSource, /const dragEnabled = !Array\.isArray\(validDropZones\) \|\| validDropZones\.length > 0/);
  assert.match(dragTokenSource, /const accessibleLabel = !dragEnabled/);
});
