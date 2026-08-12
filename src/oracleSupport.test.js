import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");

function sliceBetween(startMarker, endMarker) {
  const start = appSource.indexOf(startMarker);
  const end = appSource.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1, `missing source marker: ${startMarker}`);
  assert.notEqual(end, -1, `missing source marker: ${endMarker}`);
  return appSource.slice(start, end);
}

test("practice views reuse the canonical Oracle support dock", () => {
  assert.match(appSource, /function OracleSupportDock\(/);
  const daily = sliceBetween("function DailyWeaveView", "function PracticeDiscoveryView");
  const discovery = sliceBetween("function PracticeDiscoveryView", "function PracticeCheckpointView");

  for (const viewSource of [daily, discovery]) {
    assert.match(viewSource, /<OracleSupportDock/);
    assert.match(viewSource, /transitionOraclePresence\(current, \{ type: "soft-fail" \}\)/);
    assert.match(viewSource, /transitionOraclePresence\(current, \{ type: "auto-hint", hintLevel: 1 \}\)/);
    assert.match(viewSource, /transitionOraclePresence\(current, \{ type: "level-success" \}\)/);
    assert.match(viewSource, /transitionOraclePresence\(current, \{ type: "dissolve" \}\)/);
    assert.match(viewSource, /allowGuided=\{false\}/);
  }

  assert.match(daily, /type: "daily-weave"/);
  assert.match(daily, /"wrong-lane"/);
  assert.match(daily, /"max-actions"/);
  assert.match(discovery, /type: "discovery"/);
  assert.match(discovery, /"wrong-slot"/);
});
