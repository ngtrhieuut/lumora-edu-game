import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceSessionCompass,
  continueForOneStage,
  createSessionCompassState,
  createSessionPreferenceStore,
  createSessionStateStore,
  getSessionCompassDisplay,
  normalizeSessionPreferences,
  pauseForSessionBreak,
  shouldPresentSessionBreak,
  startFreshSession,
} from "./sessionCompass.js";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, value),
    values,
  };
}

test("session preferences normalize to approved limits", () => {
  assert.deepEqual(normalizeSessionPreferences(), { enabled: true, limitMinutes: 20 });
  assert.deepEqual(normalizeSessionPreferences({ enabled: false, limitMinutes: "15" }), { enabled: false, limitMinutes: 15 });
  assert.deepEqual(normalizeSessionPreferences({ enabled: "yes", limitMinutes: 17 }), { enabled: true, limitMinutes: 20 });
});

test("session state is canonical and does not retain unrelated profile data", () => {
  assert.deepEqual(createSessionCompassState({ activeSeconds: 40.8, reminderCount: 2, childName: "hidden" }), {
    activeSeconds: 40,
    status: "active",
    reminderPending: false,
    reminderCount: 2,
  });
});

test("only active visible time advances and long ticks are clamped", () => {
  const prefs = { enabled: true, limitMinutes: 10 };
  const initial = createSessionCompassState(null, prefs);
  assert.equal(advanceSessionCompass(initial, 4, prefs, false).activeSeconds, 0);
  assert.equal(advanceSessionCompass(initial, 60, prefs, true).activeSeconds, 5);
  assert.equal(advanceSessionCompass({ ...initial, status: "paused" }, 1, prefs, true).activeSeconds, 0);
});

test("threshold creates a pending reminder without interrupting active play", () => {
  const prefs = { enabled: true, limitMinutes: 10 };
  const state = advanceSessionCompass({ activeSeconds: 599 }, 1, prefs, true);
  assert.equal(state.reminderPending, true);
  assert.equal(shouldPresentSessionBreak(state, "play", prefs), false);
  assert.equal(shouldPresentSessionBreak(state, "restoration", prefs), false);
  assert.equal(shouldPresentSessionBreak(state, "map", prefs), true);
  assert.equal(shouldPresentSessionBreak(state, "practice-checkpoint", prefs), true);
  assert.equal(shouldPresentSessionBreak({ ...state, status: "paused", reminderPending: false }, "home", prefs), true);
  assert.equal(shouldPresentSessionBreak({ ...state, status: "paused", reminderPending: false }, "home", { ...prefs, enabled: false }), false);
});

test("pause, one-stage grace, and fresh session preserve only reminder count", () => {
  const prefs = { enabled: true, limitMinutes: 20 };
  const paused = pauseForSessionBreak({ activeSeconds: 1200, reminderPending: true, reminderCount: 3 }, prefs);
  assert.deepEqual(paused, { activeSeconds: 1200, status: "paused", reminderPending: false, reminderCount: 4 });
  assert.deepEqual(continueForOneStage(paused, prefs), { activeSeconds: 900, status: "active", reminderPending: false, reminderCount: 4 });
  assert.deepEqual(startFreshSession(paused, prefs), { activeSeconds: 0, status: "active", reminderPending: false, reminderCount: 4 });
});

test("display stays qualitative and supports disabled, steady, soon, and pause states", () => {
  assert.equal(getSessionCompassDisplay({}, { enabled: false, limitMinutes: 20 }).tone, "off");
  assert.equal(getSessionCompassDisplay({ activeSeconds: 10 }, { enabled: true, limitMinutes: 20 }).tone, "steady");
  assert.equal(getSessionCompassDisplay({ activeSeconds: 1020 }, { enabled: true, limitMinutes: 20 }).tone, "soon");
  assert.equal(getSessionCompassDisplay({ status: "paused" }, { enabled: true, limitMinutes: 20 }).tone, "pause");
});

test("preference and tab-state stores round-trip canonical JSON", () => {
  const storage = memoryStorage();
  const preferenceStore = createSessionPreferenceStore({ storage, key: "prefs" });
  preferenceStore.save({ enabled: false, limitMinutes: 30, extra: "drop" });
  assert.deepEqual(preferenceStore.load().data, { enabled: false, limitMinutes: 30 });

  const stateStore = createSessionStateStore({ storage, key: "state", preferences: { enabled: true, limitMinutes: 10 } });
  stateStore.save({ activeSeconds: 120, reminderCount: 1, profile: { alias: "drop" } });
  assert.deepEqual(stateStore.load().data, { activeSeconds: 120, status: "active", reminderPending: false, reminderCount: 1 });
});

test("stores fail closed for corrupt or unavailable storage", () => {
  const corrupt = memoryStorage({ state: "{" });
  assert.equal(createSessionStateStore({ storage: corrupt, key: "state" }).load().status, "corrupt");
  assert.equal(createSessionPreferenceStore().load().status, "unavailable");
  const throwing = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
  assert.equal(createSessionPreferenceStore({ storage: throwing }).load().status, "corrupt");
  assert.equal(createSessionPreferenceStore({ storage: throwing }).save({}).status, "error");
});
