import { test } from "node:test";
import assert from "node:assert/strict";

import {
  createLocalProgressStore,
  LOCAL_PROGRESS_PROVIDER,
} from "./services/progressStore.js";
import {
  createRuleBasedOracleProvider,
  getAdaptiveSupportPlan,
  LOCAL_ORACLE_PROVIDER,
  FALLBACK_HINT,
} from "./services/oracleProvider.js";
import {
  createLocalProfileStore,
  LOCAL_PROFILE_PROVIDER,
  normalizeChildProfile,
} from "./services/profileStore.js";
import {
  createLocalTelemetry,
  LOCAL_TELEMETRY_PROVIDER,
  TELEMETRY_TAXONOMY,
} from "./telemetry.js";

/** Minimal in-memory localStorage-like object. */
function memoryStorage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
  };
}

// --- progressStore: storage behavior ---

test("progress store: save/load roundtrip through storage", () => {
  const store = createLocalProgressStore({ storage: memoryStorage(), key: "k" });
  assert.equal(store.save({ shards: 3 }).status, "ok");
  const res = store.load();
  assert.equal(res.status, "ok");
  assert.deepEqual(res.data, { shards: 3 });
  assert.equal(store.clear().status, "ok");
  assert.equal(store.load().status, "empty", "cleared key reads back empty");
});

test("progress store: corrupt JSON yields error status, never throws", () => {
  const store = createLocalProgressStore({ storage: memoryStorage({ k: "{not json" }), key: "k" });
  const res = store.load();
  assert.equal(res.status, "error");
  assert.equal(res.data, null);
  assert.equal(res.message, "corrupt JSON");
});

test("progress store: throwing storage returns safe error statuses", () => {
  const boom = {
    getItem() {
      throw new Error("quota");
    },
    setItem() {
      throw new Error("full");
    },
    removeItem() {
      throw new Error("denied");
    },
  };
  const store = createLocalProgressStore({ storage: boom, key: "k" });
  assert.equal(store.load().status, "error");
  assert.equal(store.save({}).status, "error");
  assert.equal(store.clear().status, "error");
});

test("progress store: missing storage is a safe error, absent key is empty", () => {
  const noStore = createLocalProgressStore({ key: "k" });
  assert.equal(noStore.load().status, "error");
  assert.equal(noStore.save({}).status, "error");
  const empty = createLocalProgressStore({ storage: memoryStorage(), key: "k" });
  assert.equal(empty.load().status, "empty");
});

test("progress store: descriptor says local, offline, not Firebase", () => {
  assert.equal(LOCAL_PROGRESS_PROVIDER.local, true);
  assert.equal(LOCAL_PROGRESS_PROVIDER.offline, true);
  assert.equal(LOCAL_PROGRESS_PROVIDER.syncsToFirebase, false);
  assert.equal(LOCAL_PROGRESS_PROVIDER.remote, false);
});

// --- profileStore: privacy-minimal local profile boundary ---

test("profile store: normalizes and round-trips only the minimal child profile", () => {
  const store = createLocalProfileStore({ storage: memoryStorage(), key: "profile" });
  const saved = store.save({ id: " child-1 ", alias: "  Nubi   Nhỏ  ", ageBand: "7-8", ignored: "secret" });
  assert.equal(saved.status, "ok");
  assert.deepEqual(saved.data, { alias: "Nubi Nhỏ", ageBand: "7-8" });
  assert.deepEqual(store.load().data, saved.data);
});

test("profile store: rejects invalid/corrupt profiles and never throws", () => {
  assert.equal(normalizeChildProfile({ alias: "x" }), null);
  assert.equal(createLocalProfileStore({ storage: memoryStorage(), key: "p" }).save({ alias: "" }).status, "error");
  assert.equal(createLocalProfileStore({ storage: memoryStorage({ p: "{" }), key: "p" }).load().status, "error");
  assert.equal(createLocalProfileStore({ key: "p" }).load().status, "error");
});

test("profile store: descriptor is local and explicitly not Firebase", () => {
  assert.equal(LOCAL_PROFILE_PROVIDER.local, true);
  assert.equal(LOCAL_PROFILE_PROVIDER.remote, false);
  assert.equal(LOCAL_PROFILE_PROVIDER.syncsToFirebase, false);
  assert.deepEqual(LOCAL_PROFILE_PROVIDER.personalDataFields, ["alias", "ageBand"]);
});

// --- oracleProvider: fallback and clamping ---

const HINTS = {
  count: ["Đếm lại từng con nhé.", "Thử gộp các con vật thành nhóm.", "Gợi ý: đếm theo hàng."],
  shape: ["Nhìn góc và cạnh của hình."],
};

test("oracle: returns ladder hint for the clamped level", () => {
  const oracle = createRuleBasedOracleProvider(HINTS);
  assert.deepEqual(oracle.getHint({ type: "count", level: 2 }), {
    type: "count",
    level: 2,
    text: HINTS.count[1],
    fallback: false,
  });
  assert.deepEqual(oracle.getHint({ type: "count", level: 99 }), {
    type: "count",
    level: 3,
    text: HINTS.count[2],
    fallback: false,
  });
  assert.deepEqual(oracle.getHint({ type: "count", level: -5 }), {
    type: "count",
    level: 1,
    text: HINTS.count[0],
    fallback: false,
  });
  assert.deepEqual(oracle.getHint({ type: "shape", level: 99 }), {
    type: "shape",
    level: 1,
    text: HINTS.shape[0],
    fallback: false,
  });
});

test("oracle: uses an error-specific ladder before the generic mechanic ladder", () => {
  const oracle = createRuleBasedOracleProvider(HINTS, {
    errorHints: {
      count: {
        "quantity-mismatch": ["Nhìn lại nhóm có cùng số lượng nhé.", "Đếm từng nhóm từ trái sang phải."] ,
      },
    },
  });
  assert.deepEqual(oracle.getHint({ type: "count", level: 1, errorCode: "quantity-mismatch" }), {
    type: "count",
    level: 1,
    text: "Nhìn lại nhóm có cùng số lượng nhé.",
    fallback: false,
    errorCode: "quantity-mismatch",
  });
  assert.deepEqual(oracle.getHint({ type: "count", level: 99, errorCode: "quantity-mismatch" }), {
    type: "count",
    level: 2,
    text: "Đếm từng nhóm từ trái sang phải.",
    fallback: false,
    errorCode: "quantity-mismatch",
  });
  assert.equal(oracle.getHint({ type: "count", level: 1, errorCode: "unknown" }).text, HINTS.count[0]);
});

test("oracle: level is truncated, non-numeric defaults to 1", () => {
  const oracle = createRuleBasedOracleProvider(HINTS);
  assert.equal(oracle.getHint({ type: "count", level: 2.7 }).level, 2);
  assert.equal(oracle.getHint({ type: "count", level: NaN }).level, 1);
  assert.equal(oracle.getHint({ type: "count", level: undefined }).level, 1);
});

test("oracle: unknown or empty type returns stable Vietnamese fallback", () => {
  const oracle = createRuleBasedOracleProvider({ ...HINTS, empty: [] });
  for (const req of [{ type: "nope", level: 3 }, { type: "empty", level: 2 }, {}]) {
    const a = oracle.getHint(req);
    const b = oracle.getHint(req);
    assert.equal(a.fallback, true);
    assert.equal(a.text, FALLBACK_HINT);
    assert.equal(a.text, b.text, "fallback is stable across calls");
    assert.ok(a.text.length > 0);
    assert.equal(a.level, 1);
  }
});

test("oracle: descriptor says local, rule-based, not Gemini", () => {
  assert.equal(LOCAL_ORACLE_PROVIDER.local, true);
  assert.equal(LOCAL_ORACLE_PROVIDER.usesGemini, false);
  assert.equal(LOCAL_ORACLE_PROVIDER.generativeAI, false);
});

test("oracle: adaptive support pacing protects discovery while helping weak skills sooner", () => {
  assert.deepEqual(getAdaptiveSupportPlan({ bestMastery: 3, ageBand: "5-6", completions: 2 }), {
    id: "independent-stretch",
    autoHintAfter: 3,
    pace: "self-discovery",
  });
  assert.equal(getAdaptiveSupportPlan({ bestMastery: 0, ageBand: "5-6" }).autoHintAfter, 1);
  assert.equal(getAdaptiveSupportPlan({ bestMastery: 1, ageBand: "7-8", completions: 1 }).autoHintAfter, 1);
  assert.equal(getAdaptiveSupportPlan({ bestMastery: 0, ageBand: "7-8", completions: 0 }).autoHintAfter, 2);
  assert.equal(getAdaptiveSupportPlan({ bestMastery: NaN, completions: -2 }).autoHintAfter, 2);
});

test("oracle: provider exposes the adaptive plan without changing hint output", () => {
  const oracle = createRuleBasedOracleProvider(HINTS);
  assert.equal(oracle.getSupportPlan({ bestMastery: 3 }).id, "independent-stretch");
  assert.deepEqual(oracle.getHint({ type: "shape", level: 1 }), {
    type: "shape",
    level: 1,
    text: HINTS.shape[0],
    fallback: false,
  });
});

// --- telemetry: taxonomy separation and caps ---

test("telemetry: learning vs gameplay events are separated by kind", () => {
  const t = createLocalTelemetry();
  t.trackLearning("hint-viewed", { hintLevel: 2 });
  t.trackGameplay("level-complete", { nodeId: "bridge" });
  const events = t.getEvents();
  assert.equal(events.length, 2);
  assert.deepEqual(events.map((e) => e.kind), ["learning", "gameplay"]);
  assert.deepEqual(events[0].payload, { hintLevel: 2 });
  assert.deepEqual(events[1].payload, { nodeId: "bridge" });
});

test("telemetry: taxonomy sets do not overlap and both are non-empty", () => {
  assert.ok(TELEMETRY_TAXONOMY.learning.length > 0);
  assert.ok(TELEMETRY_TAXONOMY.gameplay.length > 0);
  const overlap = TELEMETRY_TAXONOMY.learning.filter((n) => TELEMETRY_TAXONOMY.gameplay.includes(n));
  assert.deepEqual(overlap, []);
});

test("telemetry: Daily Adventure lifecycle events are accepted as gameplay", () => {
  const t = createLocalTelemetry();
  for (const name of ["practice-session-start", "practice-challenge-complete", "practice-puzzle-start", "practice-puzzle-complete", "practice-discovery-start", "practice-discovery-complete", "practice-session-complete"]) {
    assert.equal(t.trackGameplay(name, { mode: "practice" }), true);
  }
  assert.deepEqual(t.getEvents().map((event) => event.name), [
    "practice-session-start",
    "practice-challenge-complete",
    "practice-puzzle-start",
    "practice-puzzle-complete",
    "practice-discovery-start",
    "practice-discovery-complete",
    "practice-session-complete",
  ]);
});

test("telemetry: Knowledge City interactions are accepted as gameplay", () => {
  const t = createLocalTelemetry();
  assert.equal(t.trackGameplay("city-building-viewed", { buildingId: "logic" }), true);
  assert.equal(t.trackGameplay("cosmetic-equipped", { cosmeticId: "number-crown" }), true);
  assert.deepEqual(t.getEvents().map((event) => event.name), ["city-building-viewed", "cosmetic-equipped"]);
});

test("telemetry: League demo view is accepted without profile data", () => {
  const t = createLocalTelemetry();
  assert.equal(t.trackGameplay("league-viewed", { provider: "local-fictional-league" }), true);
  assert.deepEqual(t.getEvents()[0].payload, { provider: "local-fictional-league" });
});

test("telemetry: world preview view is accepted without activating curriculum", () => {
  const t = createLocalTelemetry();
  assert.equal(t.trackGameplay("world-preview-viewed", { worldId: "grade-1-world-2" }), true);
  assert.deepEqual(t.getEvents()[0].payload, { worldId: "grade-1-world-2" });
});

test("telemetry: optional quest lifecycle is accepted without currency or profile data", () => {
  const telemetry = createLocalTelemetry({ clock: () => 31 });
  assert.equal(telemetry.trackGameplay("quest-discovered", { questId: "moon-rune", kind: "secret" }), true);
  assert.equal(telemetry.trackGameplay("quest-start", { questId: "moon-rune", kind: "secret" }), true);
  assert.equal(telemetry.trackGameplay("quest-complete", { questId: "moon-rune", firstClear: true, mastery: 3 }), true);
  assert.equal(telemetry.getEvents().some((event) => "alias" in event.payload || "shards" in event.payload), false);
});

test("telemetry: first-session continuation lifecycle is accepted as gameplay", () => {
  const t = createLocalTelemetry();
  const names = [
    "first-session-oracle-continue",
    "mechanic-intro-viewed",
    "mechanic-intro-started",
    "mechanic-intro-skipped",
    "boss-tease-viewed",
    "boss-tease-dismissed",
  ];
  for (const name of names) assert.equal(t.trackGameplay(name, { nodeId: "match" }), true, name);
  assert.deepEqual(t.getEvents().map((event) => event.name), names);
  assert.equal(t.getEvents().some((event) => "alias" in event.payload || "email" in event.payload), false);
});

test("telemetry: rejects unknown names and cross-taxonomy names", () => {
  const t = createLocalTelemetry();
  assert.equal(t.trackLearning("not-a-real-event", {}), false);
  assert.equal(t.trackLearning("level-complete", {}), false, "gameplay name under learning");
  assert.equal(t.trackGameplay("hint-viewed", {}), false, "learning name under gameplay");
  assert.equal(t.trackGameplay("session-start"), true, "legit gameplay name records");
  assert.deepEqual(t.getEvents().map((e) => e.name), ["session-start"]);
});

test("telemetry: queue is capped at maxEvents, oldest dropped first", () => {
  const t = createLocalTelemetry({ maxEvents: 3 });
  for (const name of ["session-start", "level-start", "level-complete", "session-end"]) {
    t.trackGameplay(name);
  }
  const events = t.getEvents();
  assert.equal(events.length, 3);
  assert.deepEqual(events.map((e) => e.name), ["level-start", "level-complete", "session-end"]);
});

test("telemetry: payloads are cloned in and out, not shared", () => {
  const payload = { attempts: 1 };
  const t = createLocalTelemetry();
  t.trackGameplay("level-start", payload);
  payload.attempts = 99; // mutating caller's object must not leak in
  const ev = t.getEvents()[0];
  assert.deepEqual(ev.payload, { attempts: 1 });
  ev.payload.attempts = 5; // mutating the snapshot must not leak out
  assert.deepEqual(t.getEvents()[0].payload, { attempts: 1 });
});

test("telemetry: clear empties the queue", () => {
  const t = createLocalTelemetry();
  t.trackGameplay("session-start");
  t.clear();
  assert.equal(t.getEvents().length, 0);
});

test("telemetry: events carry no personal data by default and descriptor is local", () => {
  const t = createLocalTelemetry({ clock: () => 1234 });
  t.trackLearning("hint-viewed", { hintLevel: 1 });
  const e = t.getEvents()[0];
  assert.deepEqual(Object.keys(e).sort(), ["at", "kind", "name", "payload"]);
  assert.equal(e.at, 1234);
  assert.deepEqual(e.payload, { hintLevel: 1 });
  assert.equal(LOCAL_TELEMETRY_PROVIDER.local, true);
  assert.equal(LOCAL_TELEMETRY_PROVIDER.syncsToCloud, false);
});

test("telemetry: maxEvents below 1 clamps to a working cap", () => {
  const t = createLocalTelemetry({ maxEvents: 0 });
  t.trackGameplay("session-start");
  t.trackGameplay("level-start");
  assert.equal(t.getEvents().length, 1);
});
