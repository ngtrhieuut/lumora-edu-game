import assert from "node:assert/strict";
import test from "node:test";
import { GAMEPLAY_FOCUS_VIEWS, isGameplayFocusView } from "./hudFocus.js";

test("gameplay focus registry is canonical and immutable", () => {
  assert.deepEqual(GAMEPLAY_FOCUS_VIEWS, ["first-session-oracle", "first-session-numeral", "mechanic-intro", "boss-tease", "play", "quest-play", "practice-play", "practice-puzzle"]);
  assert.equal(Object.isFrozen(GAMEPLAY_FOCUS_VIEWS), true);
  assert.throws(() => GAMEPLAY_FOCUS_VIEWS.push("map"), TypeError);
});

test("focus mode is limited to active child gameplay views", () => {
  for (const view of GAMEPLAY_FOCUS_VIEWS) assert.equal(isGameplayFocusView(view), true, view);
  for (const view of ["onboarding", "home", "map", "practice-intro", "practice-summary", "parent", "city", null, undefined, 7, {}]) {
    assert.equal(isGameplayFocusView(view), false, String(view));
  }
});
