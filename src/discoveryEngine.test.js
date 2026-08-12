import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildDiscoveryChallenge,
  isDiscoveryComplete,
  placeDiscoveryFragment,
} from "./discoveryEngine.js";

const appSource = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

const nodes = [
  { id: "collect", shortTitle: "Đếm ánh sáng", title: "Bãi Hạt Sáng", icon: "✦" },
  { id: "bridge", shortTitle: "Xây cầu", title: "Cầu Ánh Sáng", icon: "+" },
  { id: "shape", shortTitle: "Ghép hình", title: "Xưởng Hình Khối", icon: "△" },
];

test("discovery challenge is deterministic and preserves the practiced route", () => {
  const first = buildDiscoveryChallenge(["collect", "bridge", "shape"], nodes, { dateKey: "2026-08-11" });
  const second = buildDiscoveryChallenge(["collect", "bridge", "shape"], nodes, { dateKey: "2026-08-11" });

  assert.deepEqual(first, second);
  assert.equal(first.slots.length, 3);
  assert.equal(first.prompt, "Kéo 3 dấu sáng theo đúng hành trình con vừa luyện.");
  assert.deepEqual(first.slots.map((slot) => slot.expectedFragmentId), ["fragment-collect", "fragment-bridge", "fragment-shape"]);
  assert.deepEqual(new Set(first.fragments.map((fragment) => fragment.sourceNodeId)), new Set(["collect", "bridge", "shape"]));
});

test("discovery copy contract follows a shorter practice queue", () => {
  const challenge = buildDiscoveryChallenge(["collect", "bridge"], nodes, { dateKey: "2026-08-11" });
  assert.equal(challenge.prompt, "Kéo 2 dấu sáng theo đúng hành trình con vừa luyện.");
  assert.equal(challenge.slots.length, 2);
});

test("discovery placement rejects wrong slots and completes without mutating prior state", () => {
  const challenge = buildDiscoveryChallenge(["collect", "bridge", "shape"], nodes, { dateKey: "2026-08-11" });
  const placed = [];
  const wrong = placeDiscoveryFragment(placed, challenge, "slot-0", "fragment-bridge");
  assert.equal(wrong.accepted, false);
  assert.equal(wrong.reason, "wrong-slot");
  assert.deepEqual(placed, []);

  const first = placeDiscoveryFragment(placed, challenge, "slot-0", "fragment-collect");
  const second = placeDiscoveryFragment(first.placed, challenge, "slot-1", "fragment-bridge");
  const third = placeDiscoveryFragment(second.placed, challenge, "slot-2", "fragment-shape");
  assert.equal(first.complete, false);
  assert.equal(second.complete, false);
  assert.equal(third.complete, true);
  assert.equal(isDiscoveryComplete(third.placed, challenge), true);
  assert.deepEqual(placed, []);
});

test("discovery helpers fail closed for malformed input", () => {
  assert.equal(buildDiscoveryChallenge(null, nodes), null);
  assert.equal(buildDiscoveryChallenge(["unknown"], nodes), null);
  assert.deepEqual(placeDiscoveryFragment(null, null, "slot-0", "fragment-collect"), {
    placed: [],
    accepted: false,
    complete: false,
    reason: "invalid-challenge",
  });
  assert.equal(isDiscoveryComplete([], null), false);
});

test("Daily Adventure keeps drag feedback selectors and native fallback controls", () => {
  assert.match(
    styles,
    /\.game-board:has\(\.drag-token\.dragging\) \[data-drop-zone\]\[data-drag-hover="true"\],\s*\.discovery-board:has\(\.drag-token\.dragging\) \[data-drop-zone\]\[data-drag-hover="true"\],\s*\.daily-weave-board:has\(\.drag-token\.dragging\) \[data-drop-zone\]\[data-drag-hover="true"\] \{[^}]*animation: drop-ready/,
  );
  assert.match(
    styles,
    /\.game-board \[data-drop-landed="true"\],\s*\.discovery-board \[data-drop-landed="true"\],\s*\.daily-weave-board \[data-drop-landed="true"\] \{[^}]*animation: drop-landed/,
  );
  assert.match(
    styles,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*animation-duration: \.001ms !important[\s\S]*animation-iteration-count: 1 !important/,
  );

  const start = appSource.indexOf("function PracticeDiscoveryView(");
  const end = appSource.indexOf("\nfunction PracticeCheckpointView", start);
  assert.ok(start >= 0 && end > start, "Daily Adventure source contract must be present");
  const discoverySource = appSource.slice(start, end);
  assert.match(discoverySource, /<button[\s\S]*?type="button"[\s\S]*?data-drop-zone=\{slot\.id\}[\s\S]*?onClick=\{\(\) => place\(slot\.id\)\}/);
  assert.match(discoverySource, /onClick=\{\(\) => \{ setSelected\(fragment\.id\);/);
  assert.match(discoverySource, /slot\.expectedFragmentId === selected/);
});
